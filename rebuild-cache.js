#!/usr/bin/env node

/**
 * Production cache rebuild script
 *
 * This script:
 * 1. Fetches all data from Supabase database
 * 2. Loads all geometry files from storage
 * 3. Processes service areas using timeline logic
 * 4. Uploads combined JSON blob to storage
 *
 * Run this whenever you update av_events or service_area_geometries data
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vbqijqcveavjycsfoszy.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWlqcWN2ZWF2anljc2Zvc3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEzMTYxNSwiZXhwIjoyMDczNzA3NjE1fQ.legscbAoD66eAJNAhTFsO2ZzvUoZeGcarevOQzrj9Us'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function rebuildCache() {
  const startTime = Date.now()
  console.log('🚀 Starting cache rebuild...')

  try {
    // STEP 1: Fetch all database data
    console.log('📡 Fetching database data...')
    const [eventsResult, geometriesResult] = await Promise.all([
      supabase
        .from('av_events')
        .select('*')
        .eq('aggregate_type', 'service_area')
        .order('event_date', { ascending: true }),

      supabase
        .from('service_area_geometries')
        .select('*')
        .order('created_at', { ascending: false })
    ])

    if (eventsResult.error) throw eventsResult.error
    if (geometriesResult.error) throw geometriesResult.error

    const events = eventsResult.data
    const geometriesMeta = geometriesResult.data

    console.log(`📊 Database data: ${events.length} events, ${geometriesMeta.length} geometries`)

    // STEP 2: Load all geometry files
    console.log('🌐 Loading geometry files...')
    const BATCH_SIZE = 8
    const geometriesWithData = []

    for (let i = 0; i < geometriesMeta.length; i += BATCH_SIZE) {
      const batch = geometriesMeta.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i/BATCH_SIZE) + 1
      const totalBatches = Math.ceil(geometriesMeta.length/BATCH_SIZE)

      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} files)`)

      const batchResults = await Promise.all(
        batch.map(async (meta) => {
          try {
            const response = await fetch(meta.storage_url)
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
            const geojsonData = await response.json()

            return {
              geometry_name: meta.geometry_name,
              display_name: meta.display_name,
              file_size: meta.file_size,
              created_at: meta.created_at,
              storage_url: meta.storage_url,
              geojson_data: geojsonData
            }
          } catch (error) {
            console.warn(`⚠️ Failed: ${meta.geometry_name}`)
            return {
              geometry_name: meta.geometry_name,
              display_name: meta.display_name,
              file_size: meta.file_size,
              created_at: meta.created_at,
              storage_url: meta.storage_url,
              geojson_data: null,
              error: error.message
            }
          }
        })
      )

      geometriesWithData.push(...batchResults)
    }

    const successful = geometriesWithData.filter(g => g.geojson_data)
    const failed = geometriesWithData.filter(g => !g.geojson_data)

    console.log(`✅ Geometries: ${successful.length} loaded, ${failed.length} failed`)

    // STEP 3: Process service areas
    console.log('⚙️ Processing service areas...')
    const serviceAreas = buildServiceAreasFromEvents(events)

    // STEP 4: Create final data structure
    const cacheData = {
      metadata: {
        generated_at: new Date().toISOString(),
        version: Date.now(),
        export_stats: {
          total_events: events.length,
          total_geometries: geometriesMeta.length,
          loaded_geometries: successful.length,
          failed_geometries: failed.length,
          total_service_areas: serviceAreas.length,
          export_time_ms: Date.now() - startTime
        }
      },
      events: events,
      geometries: geometriesWithData,
      service_areas: serviceAreas,
      date_range: {
        start: '2017-04-25T00:00:00+00:00',
        end: new Date().toISOString()
      }
    }

    // STEP 5: Upload to storage
    console.log('⬆️ Uploading to storage...')
    console.log(`   About to upload ${serviceAreas.length} service areas`)
    const jsonData = JSON.stringify(cacheData)
    const sizeMB = (jsonData.length / 1024 / 1024).toFixed(2)

    // Use timestamped filename to avoid caching issues
    const timestamp = Date.now();
    const filename = `all-data-${timestamp}.json`;

    const { error: uploadError } = await supabase.storage
      .from('data-cache')
      .upload(filename, jsonData, {
        contentType: 'application/json',
        cacheControl: 'max-age=0, no-cache'
      })

    if (uploadError) throw uploadError

    // Also upload as all-data.json for backwards compatibility
    await supabase.storage.from('data-cache').remove(['all-data.json'])
    const { error: mainUploadError } = await supabase.storage
      .from('data-cache')
      .upload('all-data.json', jsonData, {
        contentType: 'application/json',
        cacheControl: 'max-age=0, no-cache'
      })

    if (uploadError) throw uploadError

    const totalTime = Date.now() - startTime
    console.log(`🎉 Cache rebuild complete!`)
    console.log(`   Size: ${sizeMB}MB`)
    console.log(`   Time: ${totalTime}ms`)
    console.log(`   URL: https://vbqijqcveavjycsfoszy.supabase.co/storage/v1/object/public/data-cache/all-data.json`)

    if (failed.length > 0) {
      console.log(`⚠️ ${failed.length} geometries failed to load`)
    }

    return true

  } catch (error) {
    console.error('❌ Cache rebuild failed:', error)
    throw error
  }
}

// Service area processing logic
function buildServiceAreasFromEvents(events) {
  const currentServiceStates = new Map()
  const allStates = []

  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )

  for (const event of sortedEvents) {
    const serviceId = event.aggregate_id
    const eventDate = new Date(event.event_date)
    const currentState = currentServiceStates.get(serviceId) || { isActive: false }

    if (event.event_type === 'service_created') {
      const newState = {
        ...event.event_data,
        id: `${serviceId}-${event.event_date}`,
        serviceId: serviceId,
        effectiveDate: eventDate,
        lastUpdated: eventDate,
        isActive: true,
        geojsonPath: event.event_data.geometry_name
      }

      currentServiceStates.set(serviceId, newState)
      allStates.push(newState)

    } else if (event.event_type === 'service_ended') {
      if (currentState.isActive) {
        const lastState = allStates.filter(s => s.serviceId === serviceId && !s.endDate).pop()
        if (lastState) {
          lastState.endDate = eventDate
        }
        currentServiceStates.set(serviceId, { ...currentState, isActive: false })
      }

    } else if (event.event_type === 'geometry_updated' || event.event_type === 'Service Area Change') {
      if (currentState.isActive) {
        // Check if last state has same effectiveDate - if so, update in place instead of creating new state
        const lastState = allStates.filter(s => s.serviceId === serviceId && !s.endDate).pop()
        const lastStateDate = lastState ? new Date(lastState.effectiveDate).getTime() : 0
        const currentEventDate = eventDate.getTime()

        if (lastState && lastStateDate === currentEventDate) {
          // Same date - update existing state in place
          lastState.geojsonPath = event.event_data.geometry_name || event.event_data.new_geometry_name || lastState.geojsonPath
          lastState.lastUpdated = eventDate
          currentServiceStates.set(serviceId, lastState)
        } else {
          // Different date - create new state
          const newState = {
            ...currentState,
            id: `${serviceId}-${event.event_date}`,
            effectiveDate: eventDate,
            lastUpdated: eventDate,
            geojsonPath: event.event_data.geometry_name || event.event_data.new_geometry_name || currentState.geojsonPath
          }

          if (lastState) {
            lastState.endDate = eventDate
          }

          currentServiceStates.set(serviceId, newState)
          allStates.push(newState)
        }
      }

    } else if (['service_updated', 'fares_policy_changed', 'access_policy_changed', 'vehicle_types_updated', 'platform_updated', 'supervision_updated', 'fleet_partner_changed'].includes(event.event_type)) {
      if (currentState.isActive) {
        const shouldCreateNewState = ['fares_policy_changed', 'access_policy_changed', 'vehicle_types_updated', 'platform_updated', 'supervision_updated', 'fleet_partner_changed'].includes(event.event_type)

        if (shouldCreateNewState) {
          // Check if last state has same effectiveDate - if so, update in place instead of creating new state
          const lastState = allStates.filter(s => s.serviceId === serviceId && !s.endDate).pop()
          const lastStateDate = lastState ? new Date(lastState.effectiveDate).getTime() : 0
          const currentEventDate = eventDate.getTime()

          if (lastState && lastStateDate === currentEventDate) {
            // Same date - update existing state in place
            if (event.event_type === 'fares_policy_changed') {
              lastState.fares = event.event_data.new_fares
            } else if (event.event_type === 'access_policy_changed') {
              lastState.access = event.event_data.new_access
            } else if (event.event_type === 'vehicle_types_updated') {
              lastState.vehicleTypes = event.event_data.new_vehicle_types
            } else if (event.event_type === 'platform_updated') {
              lastState.platform = event.event_data.new_platform
            } else if (event.event_type === 'supervision_updated') {
              lastState.supervision = event.event_data.new_supervision
            } else if (event.event_type === 'fleet_partner_changed') {
              lastState.fleet_partner = event.event_data.new_fleet_partner
            }
            lastState.lastUpdated = eventDate
            currentServiceStates.set(serviceId, lastState)
          } else {
            // Different date - create new state
            const newState = {
              ...currentState,
              id: `${serviceId}-${event.event_date}`,
              effectiveDate: eventDate,
              lastUpdated: eventDate
            }

            // Apply field updates
            if (event.event_type === 'fares_policy_changed') {
              newState.fares = event.event_data.new_fares
            } else if (event.event_type === 'access_policy_changed') {
              newState.access = event.event_data.new_access
            } else if (event.event_type === 'vehicle_types_updated') {
              newState.vehicleTypes = event.event_data.new_vehicle_types
            } else if (event.event_type === 'platform_updated') {
              newState.platform = event.event_data.new_platform
            } else if (event.event_type === 'supervision_updated') {
              newState.supervision = event.event_data.new_supervision
            } else if (event.event_type === 'fleet_partner_changed') {
              newState.fleet_partner = event.event_data.new_fleet_partner
            }

            if (lastState) {
              lastState.endDate = eventDate
            }

            currentServiceStates.set(serviceId, newState)
            allStates.push(newState)
          }
        }
      }
    }
  }

  console.log(`   Created ${allStates.length} service area states from ${sortedEvents.length} events`)
  return allStates
}

// Run the rebuild
rebuildCache().catch(console.error)