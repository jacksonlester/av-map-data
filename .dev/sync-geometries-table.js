#!/usr/bin/env node

/**
 * Sync Geometries Table with Storage Bucket
 *
 * This script ensures all GeoJSON files in the storage bucket are registered
 * in the service_area_geometries table with proper metadata.
 *
 * Usage:
 *   STAGING=true node sync-geometries-table.js  (syncs staging)
 *   node sync-geometries-table.js               (syncs production)
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

// Determine environment
const isStaging = process.env.STAGING === 'true'
const bucket = isStaging ? 'staging-service-area-boundaries' : 'service-area-boundaries'
const table = isStaging ? 'service_area_geometries_staging' : 'service_area_geometries'
const env = isStaging ? 'STAGING' : 'PRODUCTION'

console.log(`🌍 Environment: ${env}`)
console.log(`📦 Bucket: ${bucket}`)
console.log(`📋 Table: ${table}\n`)

async function syncGeometriesTable() {
  // Step 1: List all files in storage bucket
  console.log('📡 Fetching files from storage bucket...')
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list('', { limit: 1000 })

  if (listError) {
    console.error('❌ Error listing files:', listError)
    process.exit(1)
  }

  const geojsonFiles = files.filter(f => f.name.endsWith('.geojson'))
  console.log(`   Found ${geojsonFiles.length} geometry files in bucket\n`)

  // Step 2: Get existing entries in database table
  console.log('📊 Fetching existing entries from database...')
  const { data: existingEntries, error: dbError } = await supabase
    .from(table)
    .select('geometry_name')

  if (dbError) {
    console.error('❌ Error fetching from database:', dbError)
    process.exit(1)
  }

  const existingNames = new Set(existingEntries?.map(e => e.geometry_name) || [])
  console.log(`   Found ${existingNames.size} existing entries in table\n`)

  // Step 3: Insert missing entries
  console.log('📝 Syncing table with storage...')

  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const file of geojsonFiles) {
    const geometryName = file.name.replace('.geojson', '')

    if (existingNames.has(geometryName)) {
      console.log(`   ⏭️  ${geometryName} (already exists)`)
      skipped++
      continue
    }

    // Create public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(file.name)

    // Insert into table
    const { error: insertError } = await supabase
      .from(table)
      .insert({
        geometry_name: geometryName,
        display_name: geometryName.replace(/-/g, ' '),
        storage_url: publicUrl,
        file_size: file.metadata?.size || 0,
        created_at: file.created_at || new Date().toISOString()
      })

    if (insertError) {
      console.error(`   ❌ ${geometryName}: ${insertError.message}`)
      failed++
    } else {
      console.log(`   ✅ ${geometryName} (inserted)`)
      inserted++
    }
  }

  console.log('\n📊 Sync Summary:')
  console.log(`   ✅ Inserted: ${inserted}`)
  console.log(`   ⏭️  Skipped (existing): ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📁 Total files: ${geojsonFiles.length}`)

  if (failed === 0) {
    console.log('\n✅ Geometries table synced successfully!')
    console.log('\n📝 Next steps:')
    console.log(`   Run: ${isStaging ? 'STAGING=true ' : ''}node rebuild-cache.js`)
  } else {
    console.log('\n⚠️  Some entries failed to insert. Please check errors above.')
    process.exit(1)
  }
}

syncGeometriesTable().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
