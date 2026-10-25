# Pulse - a new tab page

My custom browser new-tab page: big clock, a personal greeting, Google search,
and a quick-links grid you can edit (add/remove, saved in localStorage).
Keyboard-first: `/` focuses search, `N` adds a link, `T` flips 12/24-hour
time. Dark by default, with a subtle animated starfield "pulse" background
that runs cheap on canvas.

Built for the Hack Club Stardance mission "Give Your Website a Pulse".
No frameworks, no build step, works offline.

## NASA picture of the day

Real feature, not a stub: the page calls the NASA APOD API
(`api.nasa.gov/planetary/apod`, the endpoint the mission guide uses) and shows
today's picture as a card; "View" opens the full explanation, a date picker
for past days, and full-resolution links. Image days show a thumbnail; video
days embed the YouTube video (or a `<video>` player for direct files).

- It ships with NASA's public `DEMO_KEY` so it works out of the box, but that
  key is shared and rate-limited (HTTP 429 later in the day). Paste your own
  free key from api.nasa.gov into `NASA_API_KEY` at the top of `script.js`
  for a reliable supply.
- Each day's payload is cached in localStorage, so on rate-limit or offline
  days the card falls back to the last saved picture and says so. Failed
  fetches retry automatically after 90 seconds and whenever the browser
  comes back online.

## Deploy

The code is pushed to github.com/draarivpatel-ui/pulse-new-tab (plain static
files - no build step, so no CI workflow is needed). Remaining manual step:
repo Settings → Pages → deploy from branch `main`.

## Try it

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`)
and visit it. To make it your real new-tab page: Chrome Settings → On startup →
Open a specific page → add the file URL (or use a new-tab extension that loads
a local file).

## Why I built this

I open a new tab maybe two hundred times a day, so the mission to build one
was really a mission to build something I would actually keep installed. The
NASA picture of the day and the editable quick links are the parts I use most.

## Honest AI note

Built by AI coding agents (ZCode) under Aariv Patel's direction: Aariv set the
requirements and reviewed the result; the agents wrote the code. The mission's
AI declaration says exactly this.

## License

MIT.
