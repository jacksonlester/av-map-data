#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteChandler() {
  console.log('Deleting Chandler Flex service from staging...\n')

  // Delete event from av_events_staging
  console.log('Deleting event from av_events_staging...')
  const { error: eventError } = await supabase
    .from('av_events_staging')
    .delete()
    .eq('aggregate_id', 'waymo-chandler')

  if (eventError) {
    console.error('Failed to delete event:', eventError)
  } else {
    console.log('Event deleted successfully')
  }

  // Delete geometry metadata
  console.log('\nDeleting geometry metadata...')
  const { error: metaError } = await supabase
    .from('service_area_geometries_staging')
    .delete()
    .eq('geometry_name', 'waymo-chandler-september-18-2025-boundary.geojson')

  if (metaError) {
    console.error('Failed to delete metadata:', metaError)
  } else {
    console.log('Metadata deleted successfully')
  }

  // Delete geometry file from storage
  console.log('\nDeleting geometry file from storage...')
  const { error: storageError } = await supabase
    .storage
    .from('staging-service-area-boundaries')
    .remove(['waymo-chandler-september-18-2025-boundary.geojson'])

  if (storageError) {
    console.error('Failed to delete geometry file:', storageError)
  } else {
    console.log('Geometry file deleted successfully')
  }

  console.log('\nChandler Flex deleted from staging!')
}

deleteChandler().catch(console.error)
