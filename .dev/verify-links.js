const response = await fetch('https://vbqijqcveavjycsfoszy.supabase.co/storage/v1/object/public/staging-data-cache/all-data.json');
const data = await response.json();

console.log('Checking service links in cache...\n');

// Check Waymo Phoenix
const waymoPhoenix = data.service_areas.find(s => s.company === 'Waymo' && s.name === 'Phoenix' && !s.endDate);
console.log('Waymo Phoenix:');
console.log('  companyLink:', waymoPhoenix?.companyLink);
console.log('  bookingPlatformLink:', waymoPhoenix?.bookingPlatformLink);

// Check May Mobility Atlanta
const mayMobility = data.service_areas.find(s => s.company === 'May Mobility' && !s.endDate);
console.log('\nMay Mobility Atlanta:');
console.log('  companyLink:', mayMobility?.companyLink);
console.log('  bookingPlatformLink:', mayMobility?.bookingPlatformLink);

// Check Zoox Las Vegas
const zoox = data.service_areas.find(s => s.company === 'Zoox' && !s.endDate);
console.log('\nZoox Las Vegas:');
console.log('  companyLink:', zoox?.companyLink);
console.log('  bookingPlatformLink:', zoox?.bookingPlatformLink || '(none)');
