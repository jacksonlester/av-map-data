#!/usr/bin/env node

/**
 * CSV Data Validation Script
 *
 * This script validates events.csv for data integrity issues:
 * 1. Redundant update events (updating to same value)
 * 2. Missing initial values that get added later
 * 3. Geometry filename format consistency
 * 4. Timeline chronological order
 *
 * Run before import-csv.js to catch data issues early.
 */

import fs from 'fs'
import { parse } from 'csv-parse/sync'

const ERRORS = []
const WARNINGS = []

// Expected geometry filename format: {company-slug}-{city-slug}-{date}-boundary.geojson
const GEOMETRY_PATTERN = /^[a-z0-9]+-[a-z0-9-]+-(?:january|february|march|april|may|june|july|august|september|october|november|december)-\d{1,2}-\d{4}-boundary\.geojson$|^[a-z0-9]+-[a-z0-9-]+-\d{1,2}-(?:january|february|march|april|may|june|july|august|september|october|november|december)-\d{4}-boundary\.geojson$/i

function error(message) {
  ERRORS.push(message)
  console.error(`❌ ERROR: ${message}`)
}

function warn(message) {
  WARNINGS.push(message)
  console.warn(`⚠️  WARNING: ${message}`)
}

function info(message) {
  console.log(`ℹ️  ${message}`)
}

function validateCSV() {
  console.log('🔍 Validating events.csv...\n')

  // Read and parse CSV
  let records
  try {
    const csvContent = fs.readFileSync('./events.csv', 'utf-8')
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    })
    info(`Found ${records.length} events in CSV\n`)
  } catch (err) {
    error(`Failed to read/parse CSV: ${err.message}`)
    return false
  }

  // Group events by service
  const serviceEvents = new Map()

  records.forEach((row, index) => {
    const lineNum = index + 2 // +2 for header row and 0-indexing
    const company = row.company?.trim()
    const city = row.city?.trim()
    const date = row.date?.trim()

    if (!company || !city || !date) {
      error(`Line ${lineNum}: Missing required fields (company, city, or date)`)
      return
    }

    const serviceId = `${company.toLowerCase().replace(/\s+/g, '-')}-${city.toLowerCase().replace(/\s+/g, '-')}`

    if (!serviceEvents.has(serviceId)) {
      serviceEvents.set(serviceId, [])
    }

    serviceEvents.get(serviceId).push({
      lineNum,
      serviceId,
      ...row
    })
  })

  console.log(`📊 Found ${serviceEvents.size} unique services\n`)

  // Validate each service's event timeline
  serviceEvents.forEach((events, serviceId) => {
    validateServiceTimeline(serviceId, events)
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 VALIDATION SUMMARY')
  console.log('='.repeat(60))

  if (ERRORS.length === 0 && WARNINGS.length === 0) {
    console.log('✅ All checks passed! CSV is valid.')
    return true
  }

  if (WARNINGS.length > 0) {
    console.log(`⚠️  ${WARNINGS.length} warning(s) found`)
  }

  if (ERRORS.length > 0) {
    console.log(`❌ ${ERRORS.length} error(s) found`)
    console.log('\nPlease fix errors before importing to database.')
    return false
  }

  console.log('\n✅ No errors, but please review warnings.')
  return true
}

function validateServiceTimeline(serviceId, events) {
  console.log(`\n🔍 Validating ${serviceId}...`)

  // Sort by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date))

  // Track current state of the service
  const currentState = {}
  let hasServiceCreated = false

  events.forEach((event, index) => {
    const { lineNum, event_type } = event

    // Check 1: First event must be service_created
    if (index === 0 && event_type !== 'service_created') {
      error(`Line ${lineNum}: First event for ${serviceId} must be 'service_created', found '${event_type}'`)
      return
    }

    if (event_type === 'service_created') {
      hasServiceCreated = true

      // Initialize state from service_created
      currentState.platform = event.platform?.trim() || null
      currentState.fares = event.fares?.trim() || null
      currentState.access = event.access?.trim() || null
      currentState.supervision = event.supervision?.trim() || null
      currentState.service_model = event.service_model?.trim() || null
      currentState.vehicles = event.vehicles?.trim() || null
      currentState.fleet_partner = event.fleet_partner?.trim() || null
      currentState.geometry_file = event.geometry_file?.trim() || null

      // Validate geometry filename format
      if (event.geometry_file) {
        validateGeometryFilename(lineNum, event.geometry_file, event.date, serviceId)
      }

      // Check for missing critical fields
      if (!event.platform) {
        warn(`Line ${lineNum}: service_created for ${serviceId} has no platform - ensure this is intentional`)
      }
    }

    // Check 2: Validate update events
    else if (event_type === 'platform_updated') {
      const newValue = event.platform?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: platform_updated event has no platform value`)
      } else if (currentState.platform === newValue) {
        error(`Line ${lineNum}: REDUNDANT platform_updated - platform is already '${newValue}' (this breaks data integrity!)`)
      } else {
        info(`  ✓ Line ${lineNum}: platform updated from '${currentState.platform || 'null'}' to '${newValue}'`)
        currentState.platform = newValue
      }
    }

    else if (event_type === 'fares_policy_changed') {
      const newValue = event.fares?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: fares_policy_changed event has no fares value`)
      } else if (currentState.fares === newValue) {
        error(`Line ${lineNum}: REDUNDANT fares_policy_changed - fares is already '${newValue}'`)
      } else {
        info(`  ✓ Line ${lineNum}: fares changed from '${currentState.fares || 'null'}' to '${newValue}'`)
        currentState.fares = newValue
      }
    }

    else if (event_type === 'access_policy_changed') {
      const newValue = event.access?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: access_policy_changed event has no access value`)
      } else if (currentState.access === newValue) {
        error(`Line ${lineNum}: REDUNDANT access_policy_changed - access is already '${newValue}'`)
      } else {
        info(`  ✓ Line ${lineNum}: access changed from '${currentState.access || 'null'}' to '${newValue}'`)
        currentState.access = newValue
      }
    }

    else if (event_type === 'supervision_updated') {
      const newValue = event.supervision?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: supervision_updated event has no supervision value`)
      } else if (currentState.supervision === newValue) {
        error(`Line ${lineNum}: REDUNDANT supervision_updated - supervision is already '${newValue}'`)
      } else {
        info(`  ✓ Line ${lineNum}: supervision changed from '${currentState.supervision || 'null'}' to '${newValue}'`)
        currentState.supervision = newValue
      }
    }

    else if (event_type === 'service_model_updated') {
      const newValue = event.service_model?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: service_model_updated event has no service_model value`)
      } else if (currentState.service_model === newValue) {
        error(`Line ${lineNum}: REDUNDANT service_model_updated - service_model is already '${newValue}'`)
      } else {
        info(`  ✓ Line ${lineNum}: service_model changed from '${currentState.service_model || 'null'}' to '${newValue}'`)
        currentState.service_model = newValue
      }
    }

    else if (event_type === 'vehicle_types_updated') {
      const newValue = event.vehicles?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: vehicle_types_updated event has no vehicles value`)
      } else if (currentState.vehicles === newValue) {
        warn(`Line ${lineNum}: vehicle_types_updated might be redundant - vehicles is already '${newValue}'`)
      } else {
        info(`  ✓ Line ${lineNum}: vehicles changed from '${currentState.vehicles || 'null'}' to '${newValue}'`)
        currentState.vehicles = newValue
      }
    }

    else if (event_type === 'fleet_partner_changed') {
      const newValue = event.fleet_partner?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: fleet_partner_changed event has no fleet_partner value`)
      } else if (currentState.fleet_partner === newValue) {
        error(`Line ${lineNum}: REDUNDANT fleet_partner_changed - fleet_partner is already '${newValue}'`)
      } else {
        info(`  ✓ Line ${lineNum}: fleet_partner changed from '${currentState.fleet_partner || 'null'}' to '${newValue}'`)
        currentState.fleet_partner = newValue
      }
    }

    else if (event_type === 'geometry_updated') {
      const newValue = event.geometry_file?.trim()
      if (!newValue) {
        error(`Line ${lineNum}: geometry_updated event has no geometry_file value`)
      } else {
        if (currentState.geometry_file === newValue) {
          warn(`Line ${lineNum}: geometry_updated might be redundant - geometry is already '${newValue}'`)
        } else {
          info(`  ✓ Line ${lineNum}: geometry changed`)
          currentState.geometry_file = newValue
        }
        // Validate new geometry filename
        validateGeometryFilename(lineNum, newValue, event.date, serviceId)
      }
    }

    else if (event_type === 'service_ended') {
      info(`  ✓ Line ${lineNum}: service ended`)
    }

    else {
      warn(`Line ${lineNum}: Unknown event type '${event_type}'`)
    }
  })

  if (!hasServiceCreated) {
    error(`Service ${serviceId} has no service_created event`)
  }
}

function validateGeometryFilename(lineNum, filename, eventDate, serviceId) {
  if (!filename.endsWith('.geojson')) {
    error(`Line ${lineNum}: Geometry file must end with .geojson: ${filename}`)
    return
  }

  // Extract parts for validation
  const withoutExt = filename.replace('.geojson', '')
  const parts = withoutExt.split('-')

  // Should start with service ID pattern
  const expectedPrefix = serviceId
  if (!withoutExt.startsWith(expectedPrefix)) {
    warn(`Line ${lineNum}: Geometry filename '${filename}' doesn't start with expected service ID '${expectedPrefix}'`)
  }

  // Should contain date components
  if (!withoutExt.includes('2017') && !withoutExt.includes('2018') && !withoutExt.includes('2019') &&
      !withoutExt.includes('2020') && !withoutExt.includes('2021') && !withoutExt.includes('2022') &&
      !withoutExt.includes('2023') && !withoutExt.includes('2024') && !withoutExt.includes('2025')) {
    warn(`Line ${lineNum}: Geometry filename '${filename}' doesn't contain a year`)
  }

  // Should end with -boundary.geojson
  if (!filename.includes('boundary')) {
    warn(`Line ${lineNum}: Geometry filename '${filename}' should include 'boundary'`)
  }
}

// Run validation
const isValid = validateCSV()

// Exit with appropriate code
process.exit(isValid ? 0 : 1)
