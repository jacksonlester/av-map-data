#!/usr/bin/env node

/**
 * Copy Geometry Files from Production to Staging
 *
 * This script copies all GeoJSON files from the production bucket to staging:
 * - service-area-boundaries → staging-service-area-boundaries
 *
 * Run this after sync-prod-to-staging.js to ensure staging has all geometry files.
 *
 * Usage: node copy-geometries.js
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

const PROD_BUCKET = 'service-area-boundaries'
const STAGING_BUCKET = 'staging-service-area-boundaries'

async function copyGeometries() {
  console.log('🔄 Copying geometry files from production to staging...\n')

  try {
    // Step 1: List all files in production bucket
    console.log(`📡 Listing files in ${PROD_BUCKET}...`)
    const { data: files, error: listError } = await supabase.storage
      .from(PROD_BUCKET)
      .list('', { limit: 1000 })

    if (listError) throw listError

    const geojsonFiles = files.filter(f => f.name.endsWith('.geojson'))
    console.log(`   Found ${geojsonFiles.length} geometry files\n`)

    if (geojsonFiles.length === 0) {
      console.log('✅ No files to copy')
      return
    }

    // Step 2: Copy each file
    console.log(`📥 Copying files to ${STAGING_BUCKET}...`)
    let successCount = 0
    let failCount = 0

    for (const file of geojsonFiles) {
      try {
        // Download from production
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(PROD_BUCKET)
          .download(file.name)

        if (downloadError) throw downloadError

        // Upload to staging
        const { error: uploadError } = await supabase.storage
          .from(STAGING_BUCKET)
          .upload(file.name, fileData, {
            contentType: 'application/json',
            upsert: true  // Overwrite if exists
          })

        if (uploadError) throw uploadError

        console.log(`   ✅ ${file.name}`)
        successCount++

      } catch (error) {
        console.error(`   ❌ ${file.name}: ${error.message}`)
        failCount++
      }
    }

    console.log(`\n📊 Copy Summary:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    console.log(`   📁 Total: ${geojsonFiles.length}`)

    if (failCount === 0) {
      console.log('\n✅ All geometry files copied successfully!')
      console.log('\n📝 Next steps:')
      console.log('   Run: STAGING=true node rebuild-cache.js')
    } else {
      console.error('\n⚠️  Some files failed to copy. Check errors above.')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Copy failed:', error)
    process.exit(1)
  }
}

copyGeometries()
