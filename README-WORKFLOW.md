# AV Map Data Workflow

## When you update data (events.csv or geometries/)

1. **Update your data files** in `/Users/jacksonlester/Documents/GitHub/av-map-data`
   - Edit `events.csv` to add/modify events
   - Add new geometry files to `geometries/` folder

2. **Regenerate the cache**
   ```bash
   cd /Users/jacksonlester/Documents/GitHub/av-map-data
   node rebuild-cache.js
   ```

   This will:
   - Fetch all events from Supabase `av_events` table
   - Load all geometries from Supabase storage
   - Process them with the FIXED event sourcing logic (`.filter().pop()` not `.find()`)
   - Upload the bundle to: `https://vbqijqcveavjycsfoszy.supabase.co/storage/v1/object/public/data-cache/all-data.json`

3. **Test locally** 
   ```bash
   cd /Users/jacksonlester/Documents/GitHub/avmap.io
   npm run dev
   ```
   
   Hard refresh your browser (Cmd+Shift+R) to clear the cached all-data.json

4. **Deploy to production**
   - The deployed site will automatically fetch the new all-data.json
   - Users may need to hard refresh to see changes

## Critical Bug Fix Applied

The `.find()` bug has been fixed in `rebuild-cache.js`:
- **OLD (buggy)**: `const lastState = allStates.find(s => s.serviceId === serviceId && !s.endDate)`
- **NEW (fixed)**: `const lastState = allStates.filter(s => s.serviceId === serviceId && !s.endDate).pop()`

This ensures we close the LAST (most recent) state, not the FIRST one.

## Files

- `/Users/jacksonlester/Documents/GitHub/av-map-data/rebuild-cache.js` - Cache generation script (FIXED)
- `/Users/jacksonlester/Documents/GitHub/avmap.io/src/services/preloadService.ts` - Frontend data loader (FIXED)
