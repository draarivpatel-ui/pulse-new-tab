# Pulse build log (2026-10-24)

Built in one session by an AI agent under Aariv's direction, then verified in a
real browser (screenshot.png).

1. Read the mission page + guide (stardance.hackclub.com/missions/nasa-page).
2. Scaffolded index.html / style.css / script.js, no dependencies.
3. Clock + date + "Welcome back, Aariv" greeting.
4. Google search box, `/` keyboard shortcut.
5. Quick-links grid: defaults (Google, YouTube, GitHub, Gmail, Wikipedia,
   Hack Club, Stardance), per-link remove, add dialog, localStorage persistence.
6. `N` shortcut to add a link.
7. Animated starfield canvas background, dark theme, one accent color.
8. Verified: loaded locally, clock ticking, links removable/addable.

Devlog moments for the Stardance project: each numbered step above is a
devlog-sized chunk; attach screenshot.png (and later ones) to each.

## 2026-10-24 - guide reconciliation pass

9. Checked the build against the mission guide section by section. The APOD
   feature turned out to be already real (fetch + card + dialog + date
   picker + localStorage cache + offline fallback), not a cosmetic toggle -
   but two gaps showed up: one fallback endpoint is dead, and video days
   were only a link.
10. Removed the go-apod.herokuapp.com fallback (it now 404s - Heroku free
    tier shut down in 2022). api.nasa.gov with DEMO_KEY is the single
    endpoint, retried 3x with backoff; during today's live test it returned
    429 OVER_RATE_LIMIT, which is exactly the case the new card states
    cover: "Loading…" while fetching, "APOD unavailable right now - will
    retry automatically" after a total failure with no cache, one scheduled
    retry after 90 s, instant retry when the browser comes back online.
11. Video handling now matches the guide (media_type image/video, plus the
    YouTube extra challenge): YouTube URLs embed in an iframe with
    watch?v=, youtu.be and embed/ all normalized; direct video files get a
    `<video controls>` player; CSS covers both media shapes.
12. README updated: APOD feature documented honestly (incl. DEMO_KEY rate
    limits and how to swap in a personal key), deploy steps added.

Verified this pass: `node --check script.js` clean; all 39 DOM ids referenced
by the script exist in index.html; embed-URL helper tested against the three
YouTube URL shapes; api.nasa.gov and go-apod probed live with curl (429 and
404 respectively, as described above). Not verified in a real browser yet -
worth a fresh screenshot once DEMO_KEY cools down.
