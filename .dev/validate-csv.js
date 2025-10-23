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

  // STEP 1: Validate CSV structure (field count and column alignment)
  console.log('🔍 Validating CSV structure...\n')
  validateCSVStructure(records)

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

function validateCSVStructure(records) {
  // Expected column count (18 fields in CSV)
  const EXPECTED_FIELD_COUNT = 18
  const EXPECTED_COLUMNS = [
    'date', 'event_type', 'company', 'city', 'geometry_file', 'vehicles', 'platform',
    'fares', 'direct_booking', 'service_model', 'supervision', 'access', 'fleet_partner',
    'expected_launch', 'company_link', 'booking_platform_link', 'source_url', 'notes'
  ]

  records.forEach((row, index) => {
    const lineNum = index + 2 // +2 for header row and 0-indexing
    const fieldCount = Object.keys(row).length
    const eventType = row.event_type?.trim()

    // Check 1: Field count must be exactly 18
    if (fieldCount !== EXPECTED_FIELD_COUNT) {
      error(`Line ${lineNum}: Has ${fieldCount} fields, expected ${EXPECTED_FIELD_COUNT}`)
    }

    // Check 2: Validate URL fields (company_link, booking_platform_link, source_url)
    const companyLink = row.company_link?.trim()
    const bookingLink = row.booking_platform_link?.trim()
    const sourceUrl = row.source_url?.trim()

    // company_link and booking_platform_link should always be URLs or empty
    if (companyLink && !companyLink.startsWith('http://') && !companyLink.startsWith('https://')) {
      error(`Line ${lineNum}: company_link should be a URL or empty, found: ${companyLink.substring(0, 60)}`)
    }

    if (bookingLink && !bookingLink.startsWith('http://') && !bookingLink.startsWith('https://')) {
      error(`Line ${lineNum}: booking_platform_link should be a URL or empty, found: ${bookingLink.substring(0, 60)}`)
    }

    // source_url should be a URL for service_created, service_announced, service_testing
    // For update events, it's optional and can contain notes if no source URL is available
    const isCreateOrAnnounce = ['service_created', 'service_announced', 'service_testing'].includes(eventType)
    if (isCreateOrAnnounce && sourceUrl && !sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
      warn(`Line ${lineNum}: source_url should be a URL for ${eventType} events, found: ${sourceUrl.substring(0, 60)}`)
    }

    // Check 3: Notes field should NOT be a URL
    const notes = row.notes?.trim()
    if (notes && (notes.startsWith('http://') || notes.startsWith('https://'))) {
      error(`Line ${lineNum}: notes field contains a URL - this indicates column misalignment! Notes should be descriptive text, not URLs.`)
    }

    // Check 4: expected_launch validation
    const expectedLaunch = row.expected_launch?.trim()

    if (eventType && !['service_announced', 'service_testing'].includes(eventType)) {
      // For non-announced/testing events, expected_launch should be empty
      if (expectedLaunch) {
        warn(`Line ${lineNum}: expected_launch should be empty for event type '${eventType}' (only announced/testing events should have this)`)
      }
    } else if (eventType && ['service_announced', 'service_testing'].includes(eventType) && expectedLaunch) {
      // For announced/testing events, if expected_launch exists, it should be a date/year format, not a URL
      if (expectedLaunch.startsWith('http://') || expectedLaunch.startsWith('https://')) {
        error(`Line ${lineNum}: expected_launch contains a URL - this indicates column misalignment! Expected a year or date like "2026" or "Q2 2026"`)
      }
    }
  })
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

    // Check 1: First event must be service_created, service_testing, or service_announced
    if (index === 0 && !['service_created', 'service_testing', 'service_announced'].includes(event_type)) {
      error(`Line ${lineNum}: First event for ${serviceId} must be 'service_created', 'service_testing', or 'service_announced', found '${event_type}'`)
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

    else if (event_type === 'service_testing') {
      if (hasServiceCreated) {
        error(`Line ${lineNum}: service_testing cannot occur after service_created for ${serviceId}`)
      } else {
        info(`  ✓ Line ${lineNum}: service testing event recorded`)
        currentState.status = 'testing'
        // Update state with any provided fields
        if (event.vehicles) currentState.vehicles = event.vehicles.trim()
        if (event.platform) currentState.platform = event.platform.trim()
        if (event.supervision) currentState.supervision = event.supervision.trim()
        if (event.geometry_file) {
          currentState.geometry_file = event.geometry_file.trim()
          validateGeometryFilename(lineNum, event.geometry_file, event.date, serviceId)
        }
      }
    }

    else if (event_type === 'service_announced') {
      if (hasServiceCreated) {
        error(`Line ${lineNum}: service_announced cannot occur after service_created for ${serviceId}`)
      } else {
        info(`  ✓ Line ${lineNum}: service announcement recorded`)
        currentState.status = 'announced'
        // Update state with any provided fields
        if (event.vehicles) currentState.vehicles = event.vehicles.trim()
        if (event.platform) currentState.platform = event.platform.trim()
        if (event.supervision) currentState.supervision = event.supervision.trim()
        if (event.fares) currentState.fares = event.fares.trim()
        if (event.access) currentState.access = event.access.trim()
        if (event.service_model) currentState.service_model = event.service_model.trim()
        if (event.geometry_file) {
          currentState.geometry_file = event.geometry_file.trim()
          validateGeometryFilename(lineNum, event.geometry_file, event.date, serviceId)
        }
      }
    }

    else if (event_type === 'service_ended') {
      info(`  ✓ Line ${lineNum}: service ended`)
    }

    else {
      warn(`Line ${lineNum}: Unknown event type '${event_type}'`)
    }
  })

  // Note: We don't require service_created anymore since services can be in testing/announced status
  // without being fully operational yet
}

function validateGeometryFilename(lineNum, filename, eventDate, serviceId) {
  // Check if it's inline coordinates (lng,lat format)
  if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(filename)) {
    info(`  ✓ Line ${lineNum}: Using inline coordinates: ${filename}`)
    return
  }

  if (!filename.endsWith('.geojson')) {
    error(`Line ${lineNum}: Geometry file must end with .geojson or be inline coordinates (lng,lat): ${filename}`)
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
