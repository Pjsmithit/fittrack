# FitTrack (PWA) — Setup Notes

## What this is

A installable Progressive Web App version of the exercise-program app —
program generator wizard, in-app YouTube video per exercise, workout
logging, and progress charts — built to run entirely on your iPhone
with **no Mac, no Xcode, no Apple Developer account, and no cost**.

It's a direct port of the native Swift version: same data model, same
program-generation logic, same screens. The trade-offs from going PWA
instead of native are listed at the bottom.

## You need to host this somewhere (can't just open the file)

For "Add to Home Screen" to install a real, offline-capable app icon,
iOS requires the site to be served over **HTTPS** — opening
`index.html` directly from a file on your phone won't let the offline
service worker register, and some storage will be unreliable. You need
a real (free) URL. Easiest option, no account needed on your phone:

### Option 1 — GitHub Pages (recommended, fully free)

1. Create a free GitHub account if you don't have one: github.com.
2. Create a new repository (e.g. `fittrack`), and upload every file
   in this folder to it — GitHub's web UI lets you drag-and-drop
   files/folders directly from a browser, so you can do this from
   your phone or any PC, no git command line needed.
   - Make sure the folder structure is preserved: `index.html` at the
     repo root, alongside `css/`, `js/`, `data/`, `icons/`,
     `manifest.webmanifest`, `service-worker.js`.
3. In the repo, go to **Settings → Pages**. Under "Build and
   deployment", set **Source: Deploy from a branch**, branch
   `main`, folder `/ (root)`. Save.
4. GitHub gives you a URL like
   `https://<your-username>.github.io/fittrack/` — that's live in
   a minute or two.

### Option 2 — Netlify Drop

Go to app.netlify.com/drop in a browser and drag the whole
`FitTrackPWA` folder onto the page. It gives you an instant HTTPS
URL, no account required for a temporary link (create a free account
if you want it to stay permanently).

Either option works identically for what follows.

## Installing on your iPhone

1. Open the hosted URL in **Safari** (must be Safari — Chrome/Firefox
   on iOS can't install PWAs to the home screen).
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. A FitTrack icon appears on your home screen. Opening it launches
   full-screen, no browser address bar — behaves like an installed app.

From then on it works offline (program, logging, progress, charts) —
only the embedded exercise videos need a live connection, which is
inherent to embedding YouTube and matches the original spec.

## Adding real content later

Replace the contents of `data/exercise-library.json` with the full
~40-exercise dumbbell/bodyweight library and real YouTube video IDs.
Same schema as before (`id`, `name`, `description`, `equipment`,
`primaryMuscle`, `secondaryMuscles`, `pattern`, `restrictionsToAvoid`,
`youtubeVideoID`, `defaultSets`, `defaultRepRange`,
`defaultRestSeconds`). Re-upload the file to your hosting (GitHub web
UI lets you edit/replace a single file directly in the browser), and
the app picks up new entries automatically on next load — existing
IDs are never duplicated, so you can add to the file incrementally.

If you update the file after already installing the app, you may need
to force a refresh once (pull down to refresh, or remove and re-add
the home screen icon) since the service worker caches aggressively for
offline use — this is a one-time thing per content update, not a
recurring hassle.

## What's different from the native Swift version

- **Storage**: IndexedDB (browser database) instead of SwiftData.
  Same data model, fully on-device, nothing sent anywhere.
- **Charts**: Chart.js (loaded once, then cached for offline) instead
  of Swift Charts. Visually similar; same three chart types.
- **No CloudKit path**: the native version had a `BackupService`
  extension point for future iCloud sync. A PWA has no equivalent
  native sync story — if you want backup later, the realistic option
  is exporting/importing a JSON blob of your IndexedDB data, which
  isn't built yet but would be a small addition.
- **Performance/feel**: modern iOS PWAs installed via "Add to Home
  Screen" run in a full-screen standalone WebView with no browser
  chrome — in daily use it's very close to native for an app built
  from forms, lists, and charts like this one. Where you'd notice a
  difference is things this app doesn't do anyway (complex animations,
  background processing, system-level integrations).
- **iOS storage eviction**: Safari can, in rare low-storage
  situations, clear website data for sites you haven't opened in a
  while (roughly 7+ days of non-use is the usual threshold). Opening
  the app periodically avoids this. This is the one real durability
  trade-off versus native local storage — worth knowing, not a
  reason to avoid the approach.

## Update log

**Update 2** — fixes two issues reported after first install:

1. **Full exercise library.** Replaced the 2 placeholder entries with
   36 real exercises with real, currently-live YouTube videos, covering
   push, pull, legs, core, and treadmill work across dumbbell,
   bodyweight, bench, and treadmill equipment. Bench-requiring moves
   (bench press, incline/decline fly, seated curls, etc.) are tagged
   `equipment: "bench"` rather than `"dumbbell"` — toggle "Bench" on
   in the setup wizard if you have one, otherwise the generator sticks
   to true dumbbell-only and bodyweight moves.
2. **Logging discoverability.** Logging already existed but was only
   reachable by drilling into a specific day first. Now there's a
   direct **"Log" pill on every day row** in the Program tab (one tap,
   no drill-down needed), plus a **"+ Log" button in the Progress
   tab's header** that opens a day picker from anywhere.

### How to apply this update

1. Re-upload every file in this folder to your GitHub repo (or drag
   the whole folder into Netlify again) — same process as the initial
   setup, just overwriting what's there.
2. **Important**: because the exercise library changed, any program
   you already generated was built from the 2 old placeholder
   exercises repeated throughout — regenerate it (Program tab → **+
   New**) so it draws from the real 36-exercise library instead. Past
   logged workouts and bodyweight entries are untouched either way.
3. Fully close the installed app (swipe it away from the app switcher)
   and reopen it once. The service worker's cache version was bumped
   specifically so the update is picked up on next launch rather than
   silently serving the old cached files — a normal in-app refresh
   isn't always enough for a service-worker-cached PWA, but a full
   close-and-reopen is reliable.

## Known limitations / not yet built

- Exercise library content itself (currently 2 placeholder entries,
  same as the native version left off).
- No data export/import yet (see CloudKit note above).
- No lb/kg toggle — weights are stored and entered in kilograms.
