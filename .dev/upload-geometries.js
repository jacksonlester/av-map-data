#!/usr/bin/env node

/**
 * Upload Geometry Files to Supabase Storage
 *
 * This script uploads all GeoJSON files from the local geometries/ folder to Supabase storage.
 * It compares with existing files and only uploads new or changed files.
 *
 * Usage:
 *   STAGING=true node upload-geometries.js  (uploads to staging)
 *   node upload-geometries.js               (uploads to production)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

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
const env = isStaging ? 'STAGING' : 'PRODUCTION'

console.log(`🌍 Environment: ${env}`)
console.log(`📦 Bucket: ${bucket}\n`)

async function uploadGeometries() {
  console.log('📂 Reading local geometry files...')

  const geometriesPath = './geometries'
  const localFiles = readdirSync(geometriesPath).filter(f => f.endsWith('.geojson'))

  console.log(`   Found ${localFiles.length} local geometry files\n`)

  // Get list of existing files in bucket
  console.log('📡 Fetching existing files from bucket...')
  const { data: existingFiles, error: listError } = await supabase.storage
    .from(bucket)
    .list('', { limit: 1000 })

  if (listError) {
    console.error('❌ Error listing files:', listError)
    process.exit(1)
  }

  const existingFileNames = new Set(existingFiles?.map(f => f.name) || [])
  console.log(`   Found ${existingFileNames.size} existing files in bucket\n`)

  // Upload files
  console.log('📤 Uploading geometry files...')

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const filename of localFiles) {
    const filePath = join(geometriesPath, filename)
    const fileContent = readFileSync(filePath)

    try {
      // Upload or update file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, fileContent, {
          contentType: 'application/json',
          upsert: true  // Overwrite if exists
        })

      if (uploadError) {
        console.error(`   ❌ ${filename}: ${uploadError.message}`)
        failed++
      } else {
        const action = existingFileNames.has(filename) ? 'Updated' : 'New'
        console.log(`   ✅ ${filename} (${action})`)
        uploaded++
      }
    } catch (error) {
      console.error(`   ❌ ${filename}: ${error.message}`)
      failed++
    }
  }

  console.log('\n📊 Upload Summary:')
  console.log(`   ✅ Uploaded/Updated: ${uploaded}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📁 Total: ${localFiles.length}`)

  if (failed === 0) {
    console.log('\n✅ All geometry files uploaded successfully!')
    console.log('\n📝 Next steps:')
    console.log(`   Run: ${isStaging ? 'STAGING=true ' : ''}node rebuild-cache.js`)
  } else {
    console.log('\n⚠️  Some files failed to upload. Please check errors above.')
    process.exit(1)
  }
}

uploadGeometries().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
