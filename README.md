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

**Update 11** — fix for "Import does nothing." The restore
confirmation was using the browser's native `confirm()` dialog,
triggered from several async steps after your actual tap (file picker
→ file read → parse) — iOS Safari can be unreliable about native
dialogs that aren't tied directly to a user gesture, which likely
caused it to silently fail to appear. Replaced with the app's own
confirmation sheet instead, which doesn't have that dependency. Also
added a "Reading backup file…" toast the moment a file is picked, and
if a restore genuinely fails partway, the error now names exactly
which part of the data failed and why (via the red error banner)
instead of a generic, misleading "couldn't read that file" message.

**Update 10** — the Program/Progress tab bar at the bottom is now
visible on every screen, not just the two top-level tabs. Previously
it disappeared the moment you drilled into a day, an exercise, logging,
or any edit screen; now it's always there so you can jump straight to
Program or Progress from anywhere. Worth knowing: on screens with
unsaved changes (building or editing a program, logging a workout),
tapping away via the tab bar discards them without asking — same as
tapping that screen's own Cancel button. Say if you'd rather the tab
bar step aside on those specific screens to prevent that.

**Fix** — added a `.nojekyll` file at the repo root. GitHub Pages
tries to process every site through Jekyll by default, which can fail
or misbehave for a plain JS app like this one. This file tells it to
skip that and serve the files as-is — standard practice for any
non-Jekyll static site. Because it's a hidden dotfile, it may not
show up if you upload via Safari's file picker — the reliable way to
add it is **GitHub's web UI → Add file → Create new file**, name it
`.nojekyll` exactly, leave it empty, commit. One-time fix, no need to
repeat on future updates.

**Update 9** — manual backup/restore. In **Progress → Data & Storage**,
there's now a **Backup** card:

- **Export Backup** builds a single JSON file with everything —
  programs, logged workouts, bodyweight entries, exercise library —
  and opens the native share sheet so you can save it straight to
  iCloud Drive, email it to yourself, AirDrop it, or whatever else you
  normally use. (If the share sheet isn't available for some reason,
  it falls back to a plain file download instead.)
- **Import Backup** picks a previously exported file and restores it.
  This is a full replace, not a merge — it shows you what's in the
  file (program/workout/bodyweight counts, export date) and asks for
  confirmation before doing anything, since it's not reversible.

Worth doing before an iOS update, before switching phones, or any
time you haven't opened the app in a while — see the note about iOS
storage eviction below. This was tested end-to-end (export → JSON →
validate → restore) before shipping to make sure a restored backup
comes back byte-for-byte identical to what was exported.

**Update 8** — added a version number and last-updated date, visible
in two places: a small footer at the bottom of the Program tab, and
a card at the top of the **Data & Storage** sheet (Progress tab).
Useful for confirming an update actually landed after re-uploading —
if the number on screen doesn't match what you expect, the upload
didn't take and it's worth re-checking GitHub's Actions tab for the
deploy status.

**Update 7** — four improvements to the manual program creator (and
its Edit screen, which shares the same builder):

1. **Supersets / visual grouping.** Each exercise except the last in a
   day now has a **"⚭ Superset with next"** toggle. Turn it on between
   two (or more) exercises and they're grouped into one visually
   distinct block wherever you view that day — building, following,
   and logging all show a clear "Superset × N" box around linked
   exercises, with a proper break between that and whatever comes
   next. Standalone exercises get their own clearly separated card as
   before.
2. **"Repeat for X days" instead of manually building every week.**
   The old "Weeks" stepper is gone — you now set **"Repeat for: N
   days total"**, and the day-cycle you build (e.g. a 3-day Push/Pull/
   Legs rotation) repeats automatically to fill that many training
   days exactly, with a live "= your 3-day cycle repeated 10 times"
   readout so it's clear what you're getting. You still only build
   each day once.
3. **Reorder and insert exercises anywhere when editing.** Every
   exercise now has **↑ / ↓** buttons to move it, and there's a **"+
   Add exercise here"** divider before, between, and after every
   exercise in a day — so adding a warm-up walk at the very start (or
   anywhere else) is one tap at that exact spot, not just appending
   to the end.
4. **Exercise library review.** Added 10 exercises that were genuine
   gaps for a push/pull routine: Arnold Press, Lying Triceps
   Extension, Close-Grip Push-Up, Pike Push-Up, Renegade Row, and —
   new **Full Gym** category, previously empty — Chin-Up, Inverted
   Row, Lat Pulldown, Seated Cable Row, and Face Pull. Library's now
   48 exercises across all 5 equipment types.

Existing programs are unaffected — the day-template editor changes
only show up when you open Edit or Build Custom, and old programs
without a superset link or day-count field just behave as before
until you touch them.

**Update 6** — major change: multiple programs, custom-built from
scratch.

- **Program tab is now a list of every program you've made** — not
  just one "active" one. Tap **+ New** and choose **Auto-Generate**
  (the existing wizard) or **Build Custom**.
- **Build Custom** lets you build a program entirely yourself: name
  it, set how many weeks it runs, add training days, and for each day
  pick exercises straight from the library (grouped by muscle) with
  your own sets and rep range. That day structure repeats every week.
- **Tap any program** in the list to open it — from there you can
  follow it day-by-day and log workouts exactly as before, or use the
  **⋯** menu in the top right to **Edit** or **Delete** it. Editing
  opens the same day-builder used for custom programs — add, remove,
  or reorder exercises and days, rename it, change the week count.
  One thing worth knowing: saving an edit rebuilds every week from
  that one template, so if an auto-generated program had different
  exercises in a later rotation week, editing replaces that variation
  with a consistent structure across all weeks.
- **Deleting a program never deletes your logged workouts** — history,
  the Log Grid, and your bodyweight entries are all independent of
  which programs still exist.
- Progress tab's Adherence chart and the Log Grid now have their own
  **program picker**, since "the" active program no longer exists as
  a concept — pick whichever program you want to look at.

No action needed on your existing program — it still works exactly as
before, just reachable by tapping into it from the new list instead of
it being the only thing shown.

**Update 5** — three additions:

1. **More treadmill exercises + walking breaks.** The treadmill library
   grew from 3 to 5 entries: Treadmill Walking, Incline Treadmill
   Walking, Beginner Incline Walking Intervals, Treadmill Jogging, and
   Treadmill Running. Separately, the setup wizard now has a **"Cardio
   Breaks"** toggle — turn it on and every generated day gets a short
   walking entry inserted before the first exercise and between every
   exercise after that (Walk → Ex1 → Walk → Ex2 → Walk → Ex3...). This
   works independently of your main equipment selection, so you can
   train dumbbell/bodyweight and still get walking breaks woven in.
   Regenerate your program (Program tab → **+ New**) to pick this up.
2. **Edit and delete log entries.** Tap any entry in the Progress
   tab's History list, or any filled-in cell in the Log Grid, to open
   it for editing — change reps, weight, add or remove sets, adjust
   RPE/notes/status, or delete the whole entry. Changes save back in
   place; nothing about it being "already logged" is locked.
3. **Data & Storage confirmation.** New card at the top of the
   Progress tab (tap **View**) that shows exactly where your data
   lives — this device only, in this browser's local storage, tied to
   this exact installed URL, nothing uploaded anywhere — plus live
   counts of what's currently stored (workouts, bodyweight entries,
   programs, library exercises).

**Update 4** — diagnostic fix for "buttons stop working." If a file
fails to load after an update (most often because an upload to
GitHub missed a file, or GitHub Pages hadn't finished propagating
yet), the app used to just go silently blank with no way to tell
why — especially bad on iPhone, since Safari has no JS console
without a Mac plugged in. Now a **red banner appears at the top of
the screen** naming the actual error the moment something fails to
load or render, instead of the screen just looking unresponsive.

If you hit this again: screenshot the red banner and send it over —
that tells me exactly what broke instead of guessing. Two likely
causes if it happens again:
- **An upload was incomplete.** Each update adds new files (this one
  added `js/views/logGrid.js`); if GitHub's mobile upload flow drops
  one, the whole app fails to start, since a missing file breaks the
  entire module chain. Safest fix: delete everything in your GitHub
  repo and re-upload this zip's contents fresh, rather than adding
  files incrementally on top of what's there.
- **GitHub Pages hadn't finished redeploying yet.** It usually takes
  under 2 minutes after a commit, occasionally longer — check the
  repo's **Actions** tab for a green checkmark on the latest "pages
  build and deployment" run before testing.

You can also directly check whether a specific file made it up by
opening its URL in Safari, e.g.
`https://<you>.github.io/fittrack/js/views/logGrid.js` — it should
show JavaScript source text, not a 404 page.

**Update 3** — new Log Grid view: a spreadsheet-style table with
exercises down the left (in the order they appear in your active
program) and every logged session across the top, each cell showing
weight×reps per set. A Week / Month / All toggle controls how many
sessions show as columns, so you can scan a single week's work or
scroll back across a whole month at a glance. Reach it via the new
**"Log Grid"** card at the top of the Progress tab. The table scrolls
horizontally for older sessions while the exercise names and header
row stay pinned in place.

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
2. Fully close the installed app (swipe it away from the app switcher)
   and reopen it once. The service worker's cache version is bumped
   with each update specifically so it's picked up on next launch
   rather than silently serving old cached files — a normal in-app
   refresh isn't always enough for a service-worker-cached PWA, but a
   full close-and-reopen is reliable.

## Known limitations / not yet built

- Exercise library content itself (currently 2 placeholder entries,
  same as the native version left off).
- No data export/import yet (see CloudKit note above).
- No lb/kg toggle — weights are stored and entered in kilograms.
