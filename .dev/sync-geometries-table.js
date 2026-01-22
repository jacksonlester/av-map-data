#!/usr/bin/env node

/**
 * Sync Geometries Table with Storage Bucket
 *
 * This script ensures the geometries table matches the storage bucket exactly:
 * - Inserts new entries for files that exist in bucket but not in table
 * - Updates entries with incorrect storage_url (e.g., pointing to wrong bucket)
 * - Removes orphaned entries for files that no longer exist in bucket
 * - Removes orphaned files from bucket that don't exist locally
 *
 * Usage:
 *   STAGING=true node sync-geometries-table.js  (syncs staging)
 *   node sync-geometries-table.js               (syncs production)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readdirSync } from 'fs'

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

  // Step 3: Upsert entries (insert new, update existing with correct URLs)
  console.log('📝 Syncing table with storage...')

  let inserted = 0
  let updated = 0
  let unchanged = 0
  let failed = 0

  // Get full existing entries to compare URLs
  const { data: fullExistingEntries } = await supabase
    .from(table)
    .select('geometry_name, storage_url')

  const existingUrlMap = new Map(
    (fullExistingEntries || []).map(e => [e.geometry_name, e.storage_url])
  )

  for (const file of geojsonFiles) {
    const geometryName = file.name.replace('.geojson', '')

    // Create correct public URL for this environment's bucket
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(file.name)

    const existingUrl = existingUrlMap.get(geometryName)

    if (existingUrl === publicUrl) {
      // URL is already correct, skip
      unchanged++
      continue
    }

    if (existingNames.has(geometryName)) {
      // Entry exists but URL is wrong - update it
      const { error: updateError } = await supabase
        .from(table)
        .update({
          storage_url: publicUrl,
          file_size: file.metadata?.size || 0
        })
        .eq('geometry_name', geometryName)

      if (updateError) {
        console.error(`   ❌ ${geometryName}: ${updateError.message}`)
        failed++
      } else {
        console.log(`   🔄 ${geometryName} (updated URL)`)
        updated++
      }
    } else {
      // New entry - insert it
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
  }

  // Step 4: Read local geometry files to determine what should exist
  console.log('\n📂 Reading local geometry files...')
  let localFiles
  try {
    localFiles = readdirSync('./geometries')
      .filter(f => f.endsWith('.geojson'))
      .map(f => f.replace('.geojson', ''))
  } catch (err) {
    console.log('   ⚠️  Could not read local geometries folder (running in CI?)')
    localFiles = null
  }

  const localFileSet = localFiles ? new Set(localFiles) : null
  if (localFileSet) {
    console.log(`   Found ${localFileSet.size} local geometry files`)
  }

  // Step 5: Clean up orphans (in table but not in local files)
  let deletedFromTable = 0
  let deletedFromBucket = 0

  if (localFileSet) {
    console.log('\n🧹 Cleaning up orphaned entries...')

    // Find orphans in table
    const bucketFileNames = new Set(geojsonFiles.map(f => f.name.replace('.geojson', '')))
    const tableOrphans = [...existingNames].filter(name => !localFileSet.has(name))
    const bucketOrphans = [...bucketFileNames].filter(name => !localFileSet.has(name))

    // Delete orphans from table
    if (tableOrphans.length > 0) {
      console.log(`   Found ${tableOrphans.length} orphaned table entries`)
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .in('geometry_name', tableOrphans)

      if (deleteError) {
        console.error(`   ❌ Error deleting from table: ${deleteError.message}`)
      } else {
        deletedFromTable = tableOrphans.length
        for (const orphan of tableOrphans) {
          console.log(`   🗑️  ${orphan} (removed from table)`)
        }
      }
    }

    // Delete orphans from bucket
    if (bucketOrphans.length > 0) {
      console.log(`   Found ${bucketOrphans.length} orphaned bucket files`)
      const filesToDelete = bucketOrphans.map(name => name + '.geojson')
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove(filesToDelete)

      if (storageError) {
        console.error(`   ❌ Error deleting from bucket: ${storageError.message}`)
      } else {
        deletedFromBucket = bucketOrphans.length
        for (const orphan of bucketOrphans) {
          console.log(`   🗑️  ${orphan} (removed from bucket)`)
        }
      }
    }

    if (tableOrphans.length === 0 && bucketOrphans.length === 0) {
      console.log('   ✅ No orphans found')
    }
  }

  console.log('\n📊 Sync Summary:')
  console.log(`   ✅ Inserted: ${inserted}`)
  console.log(`   🔄 Updated: ${updated}`)
  console.log(`   ⏭️  Unchanged: ${unchanged}`)
  console.log(`   🗑️  Deleted from table: ${deletedFromTable}`)
  console.log(`   🗑️  Deleted from bucket: ${deletedFromBucket}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📁 Local files: ${localFileSet ? localFileSet.size : 'N/A'}`)

  if (failed > 0) {
    console.log('\n⚠️  Some entries failed to insert. Please check errors above.')
    process.exit(1)
  }

  // Verify all writes are visible before exiting (prevents race condition with rebuild-cache.js)
  if (inserted > 0 || updated > 0 || deletedFromTable > 0) {
    console.log('\n🔍 Verifying database writes are visible...')
    const expectedCount = localFileSet ? localFileSet.size : geojsonFiles.length

    // Retry up to 5 times with 1 second delay
    for (let attempt = 1; attempt <= 5; attempt++) {
      const { data: verifyData, error: verifyError } = await supabase
        .from(table)
        .select('geometry_name', { count: 'exact' })

      if (verifyError) {
        console.error(`   ❌ Verification query failed: ${verifyError.message}`)
        break
      }

      const actualCount = verifyData?.length || 0
      if (actualCount === expectedCount) {
        console.log(`   ✅ Verified: ${actualCount} entries in table (expected ${expectedCount})`)
        break
      }

      if (attempt < 5) {
        console.log(`   ⏳ Attempt ${attempt}: Found ${actualCount} entries, expected ${expectedCount}. Waiting...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        console.log(`   ⚠️  Final count: ${actualCount} entries (expected ${expectedCount}) - proceeding anyway`)
      }
    }
  }

  console.log('\n✅ Geometries table synced successfully!')
  console.log('\n📝 Next steps:')
  console.log(`   Run: ${isStaging ? 'STAGING=true ' : ''}node rebuild-cache.js`)
}

syncGeometriesTable().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
