#!/usr/bin/env node

/**
 * Import CSV to Supabase
 *
 * This script reads events.csv and syncs it to the Supabase database.
 * It will create/update events in the database based on the CSV.
 *
 * Usage:
 *   node import-csv.js              # Import to production
 *   STAGING=true node import-csv.js # Import to staging
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'
import { parse } from 'csv-parse/sync'

// Load .env file
if (!process.env.GITHUB_ACTIONS) {
  config()
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!')
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const isStaging = process.env.STAGING === 'true'
const environment = isStaging ? 'staging' : 'production'
const eventsTable = isStaging ? 'av_events_staging' : 'av_events'

console.log(`🌍 Environment: ${environment.toUpperCase()}`)
console.log(`📋 Events table: ${eventsTable}`)
console.log('')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map CSV column names to database field names
const FIELD_MAPPING = {
  'date': 'event_date',
  'event_type': 'event_type',
  'company': 'company',
  'city': 'city',
  'geometry_file': 'geometry_name',
  'vehicles': 'vehicle_types',
  'platform': 'platform',
  'fares': 'fares',
  'direct_booking': 'direct_booking',
  'service_model': 'service_model',
  'supervision': 'supervision',
  'access': 'access',
  'fleet_partner': 'fleet_partner',
  'expected_launch': 'expected_launch',
  'company_link': 'company_link',
  'booking_platform_link': 'booking_platform_link',
  'source_url': 'event_url',
  'notes': 'notes'
}

function csvRowToEvent(row) {
  const company = row.company?.trim()
  const city = row.city?.trim()
  const date = row.date?.trim()

  if (!company || !city || !date) {
    throw new Error('Missing required fields: company, city, or date')
  }

  // Create aggregate_id (unique identifier for the service)
  const aggregateId = `${company.toLowerCase().replace(/\s+/g, '-')}-${city.toLowerCase().replace(/\s+/g, '-')}`

  // Build event_data object with all service attributes
  const eventData = {
    name: city,  // city becomes "name" in event_data
    company: company  // company goes in event_data too
  }

  // Determine which fields to include in event_data based on event type
  const isUpdateEvent = [
    'fares_policy_changed',
    'access_policy_changed',
    'supervision_updated',
    'platform_updated',
    'vehicle_types_updated',
    'fleet_partner_changed',
    'service_model_updated',
    'geometry_updated',
    'direct_booking_updated'
  ].includes(row.event_type)

  const isServiceCreated = row.event_type === 'service_created'
  const isServiceTesting = row.event_type === 'service_testing'
  const isServiceAnnounced = row.event_type === 'service_announced'

  // Map all CSV fields to event_data
  Object.keys(row).forEach(csvKey => {
    const value = row[csvKey]?.trim()
    if (!value) return // Skip empty values

    const dbKey = FIELD_MAPPING[csvKey]
    if (dbKey && !['event_date', 'event_type'].includes(dbKey)) {
      // Convert geometry_file to geometry_name format
      if (csvKey === 'geometry_file') {
        // Check if it's inline coordinates (lng,lat format)
        if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(value)) {
          // Store inline coordinates directly as geometry_name
          eventData.geometry_name = value
        } else {
          // Remove .geojson extension from filename
          eventData.geometry_name = value.replace(/\.geojson$/, '')
        }
      }
      // For service_created, service_testing, service_announced include all fields
      // For update events, skip the field being updated (will be added as new_* below)
      // Always include company, city, notes, and source_url
      else if (isServiceCreated ||
               isServiceTesting ||
               isServiceAnnounced ||
               csvKey === 'company' ||
               csvKey === 'city' ||
               csvKey === 'notes' ||
               csvKey === 'source_url' ||
               csvKey === 'expected_launch') {
        eventData[dbKey] = value
      }
      // For update events, only include fields that aren't being updated
      else if (isUpdateEvent) {
        const isFieldBeingUpdated =
          (row.event_type === 'fares_policy_changed' && csvKey === 'fares') ||
          (row.event_type === 'access_policy_changed' && csvKey === 'access') ||
          (row.event_type === 'supervision_updated' && csvKey === 'supervision') ||
          (row.event_type === 'platform_updated' && csvKey === 'platform') ||
          (row.event_type === 'vehicle_types_updated' && csvKey === 'vehicles') ||
          (row.event_type === 'fleet_partner_changed' && csvKey === 'fleet_partner') ||
          (row.event_type === 'service_model_updated' && csvKey === 'service_model') ||
          (row.event_type === 'direct_booking_updated' && csvKey === 'direct_booking')

        if (!isFieldBeingUpdated) {
          eventData[dbKey] = value
        }
      }
    }
  })

  // Add the new_* fields for update events
  if (row.event_type === 'fares_policy_changed' && row.fares) {
    eventData.new_fares = row.fares
  } else if (row.event_type === 'access_policy_changed' && row.access) {
    eventData.new_access = row.access
  } else if (row.event_type === 'supervision_updated' && row.supervision) {
    eventData.new_supervision = row.supervision
  } else if (row.event_type === 'platform_updated' && row.platform) {
    eventData.new_platform = row.platform
  } else if (row.event_type === 'vehicle_types_updated' && row.vehicles) {
    eventData.new_vehicle_types = row.vehicles
  } else if (row.event_type === 'fleet_partner_changed' && row.fleet_partner) {
    eventData.new_fleet_partner = row.fleet_partner
  } else if (row.event_type === 'service_model_updated' && row.service_model) {
    eventData.new_service_model = row.service_model
  } else if (row.event_type === 'direct_booking_updated' && row.direct_booking) {
    eventData.new_direct_booking = row.direct_booking
  }

  return {
    aggregate_id: aggregateId,
    aggregate_type: 'service_area',
    event_date: date,
    event_type: row.event_type,
    event_data: eventData
  }
}

async function importCSV() {
  console.log('📖 Reading events.csv...')

  try {
    // Read CSV file
    const csvContent = fs.readFileSync('./events.csv', 'utf-8')
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true  // Allow rows with different column counts
    })

    console.log(`   Found ${records.length} events in CSV\n`)

    // Convert CSV rows to event objects
    console.log('🔄 Converting CSV to event format...')
    const events = records.map((row, index) => {
      try {
        return csvRowToEvent(row)
      } catch (error) {
        console.error(`   ❌ Error on row ${index + 2}:`, error.message)
        throw error
      }
    })
    console.log(`   ✅ Converted ${events.length} events\n`)

    // Clear existing events in the table
    console.log(`🗑️  Clearing ${eventsTable} table...`)
    const { error: deleteError } = await supabase
      .from(eventsTable)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) throw deleteError
    console.log('   ✅ Table cleared\n')

    // Insert events in batches
    console.log('📥 Importing events to database...')
    const BATCH_SIZE = 50
    let imported = 0

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE)
      const { error: insertError } = await supabase
        .from(eventsTable)
        .insert(batch)

      if (insertError) {
        console.error(`   ❌ Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, insertError)
        throw insertError
      }

      imported += batch.length
      console.log(`   Progress: ${imported}/${events.length} events`)
    }

    console.log(`   ✅ Imported ${imported} events\n`)

    // Verify count
    console.log('🔍 Verifying import...')
    const { count, error: countError } = await supabase
      .from(eventsTable)
      .select('id', { count: 'exact', head: true })

    if (countError) throw countError

    console.log(`   CSV events: ${events.length}`)
    console.log(`   Database events: ${count}\n`)

    if (count === events.length) {
      console.log('✅ Import complete! All events synced successfully.')
      console.log('\n📝 Next steps:')
      console.log(`   Run: ${isStaging ? 'STAGING=true ' : ''}node rebuild-cache.js`)
    } else {
      console.error('❌ Count mismatch! Import may have failed.')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  }
}

importCSV()
