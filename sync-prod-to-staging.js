#!/usr/bin/env node

/**
 * Sync Production Data to Staging
 *
 * This script copies current production data to staging tables:
 * - av_events → av_events_staging
 * - service_area_geometries → service_area_geometries_staging
 *
 * Run this when you want to refresh staging with the latest production data.
 *
 * Usage: node sync-prod-to-staging.js
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function syncProdToStaging() {
  console.log('🔄 Syncing production data to staging...\n')

  try {
    // Step 1: Fetch production data
    console.log('📡 Fetching production data...')
    const [eventsResult, geometriesResult] = await Promise.all([
      supabase
        .from('av_events')
        .select('*')
        .order('created_at', { ascending: true }),

      supabase
        .from('service_area_geometries')
        .select('*')
        .order('created_at', { ascending: true })
    ])

    if (eventsResult.error) throw eventsResult.error
    if (geometriesResult.error) throw geometriesResult.error

    const prodEvents = eventsResult.data
    const prodGeometries = geometriesResult.data

    console.log(`   Found ${prodEvents.length} events`)
    console.log(`   Found ${prodGeometries.length} geometries\n`)

    // Step 2: Clear staging tables
    console.log('🗑️  Clearing staging tables...')
    const [deleteEventsResult, deleteGeomsResult] = await Promise.all([
      supabase.from('av_events_staging').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('service_area_geometries_staging').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ])

    if (deleteEventsResult.error) throw deleteEventsResult.error
    if (deleteGeomsResult.error) throw deleteGeomsResult.error

    console.log('   Staging tables cleared\n')

    // Step 3: Insert production data into staging
    console.log('📥 Copying to staging tables...')

    // Insert events
    const { error: eventsInsertError } = await supabase
      .from('av_events_staging')
      .insert(prodEvents)

    if (eventsInsertError) throw eventsInsertError
    console.log(`   ✅ Copied ${prodEvents.length} events`)

    // Insert geometries
    const { error: geometriesInsertError } = await supabase
      .from('service_area_geometries_staging')
      .insert(prodGeometries)

    if (geometriesInsertError) throw geometriesInsertError
    console.log(`   ✅ Copied ${prodGeometries.length} geometries\n`)

    // Step 4: Verify counts match
    console.log('🔍 Verifying sync...')
    const [stagingEventsResult, stagingGeomsResult] = await Promise.all([
      supabase.from('av_events_staging').select('id', { count: 'exact', head: true }),
      supabase.from('service_area_geometries_staging').select('id', { count: 'exact', head: true })
    ])

    const stagingEventsCount = stagingEventsResult.count
    const stagingGeomsCount = stagingGeomsResult.count

    console.log(`   Production events: ${prodEvents.length}`)
    console.log(`   Staging events: ${stagingEventsCount}`)
    console.log(`   Production geometries: ${prodGeometries.length}`)
    console.log(`   Staging geometries: ${stagingGeomsCount}\n`)

    if (stagingEventsCount === prodEvents.length && stagingGeomsCount === prodGeometries.length) {
      console.log('✅ Sync complete! Staging data matches production.')
      console.log('\n📝 Next steps:')
      console.log('   1. Run: node copy-geometries.js (to sync geometry files)')
      console.log('   2. Run: STAGING=true node rebuild-cache.js (to rebuild staging cache)')
    } else {
      console.error('❌ Count mismatch! Sync may have failed.')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

syncProdToStaging()
