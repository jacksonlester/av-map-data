#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

// Load environment variables
config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addChandlerToStaging() {
  console.log('🚀 Adding Chandler Flex service to staging...\n')

  // Step 1: Insert event into av_events_staging
  const event = {
    event_type: 'service_created',
    aggregate_type: 'service_area',
    aggregate_id: 'waymo-chandler',
    event_date: '2025-09-18',
    event_data: {
      name: 'Chandler',
      company: 'Waymo',
      city: 'Chandler',
      geometry_name: 'waymo-chandler-september-18-2025-boundary.geojson',
      vehicle_types: 'Jaguar I-Pace',
      platform: 'Chandler Flex',
      fares: 'Yes',
      direct_booking: 'No',
      supervision: 'Autonomous',
      access: 'Public'
    },
    source: 'https://www.chandleraz.gov/news-center/city-chandler-partners-waymo-and-bring-avs-chandler-flex'
  }

  console.log('📝 Inserting event into av_events_staging...')
  const { data: eventData, error: eventError } = await supabase
    .from('av_events_staging')
    .insert(event)
    .select()

  if (eventError) {
    console.error('❌ Failed to insert event:', eventError)
    return
  }

  console.log('✅ Event inserted successfully!')

  // Step 2: Upload geometry file to staging storage
  console.log('\n📦 Uploading geometry file to staging storage...')

  const geometryPath = 'geometries/waymo-chandler-september-18-2025-boundary.geojson'
  const geometryData = readFileSync(geometryPath, 'utf8')
  const geometryJson = JSON.parse(geometryData)

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('staging-service-area-boundaries')
    .upload('waymo-chandler-september-18-2025-boundary.geojson', geometryData, {
      contentType: 'application/json',
      upsert: true
    })

  if (uploadError) {
    console.error('❌ Failed to upload geometry:', uploadError)
    return
  }

  console.log('✅ Geometry uploaded successfully!')

  // Step 3: Add metadata to service_area_geometries_staging
  console.log('\n📝 Adding geometry metadata to service_area_geometries_staging...')

  const { data: publicUrlData } = supabase
    .storage
    .from('staging-service-area-boundaries')
    .getPublicUrl('waymo-chandler-september-18-2025-boundary.geojson')

  const geometryMeta = {
    geometry_name: 'waymo-chandler-september-18-2025-boundary.geojson',
    display_name: 'Waymo Chandler - September 18, 2025',
    storage_url: publicUrlData.publicUrl,
    file_size: Buffer.from(geometryData).length
  }

  const { data: metaData, error: metaError } = await supabase
    .from('service_area_geometries_staging')
    .insert(geometryMeta)
    .select()

  if (metaError) {
    console.error('❌ Failed to insert geometry metadata:', metaError)
    return
  }

  console.log('✅ Geometry metadata inserted successfully!')
  console.log('\n🎉 Chandler Flex service added to staging!')
  console.log('\n📋 Next steps:')
  console.log('   1. Run: STAGING=true node rebuild-cache.js')
  console.log('   2. Check staging site to verify Chandler appears')
}

addChandlerToStaging().catch(console.error)
