# Pulse Build Log

My development notes for building **Pulse** for the Hack Club Stardance "Give Your Website a Pulse" mission.

## Session 1 - Core New-Tab Dashboard (`index.html`, `style.css`, `script.js`)

1. Read through the Stardance mission guide and planned a fast, zero-dependency new-tab page that I would genuinely keep installed in my browser.
2. Built the live clock, formatted date display, and dynamic time-of-day greeting (`"Good morning / afternoon / evening, Aariv"`), plus the `T` shortcut to toggle between 12-hour and 24-hour time.
3. Added the Google search bar with the `/` keyboard shortcut to focus immediately on load.
4. Built the customizable Quick Links grid backed by `localStorage` with default pins (Google, YouTube, GitHub, Gmail, Wikipedia, Hack Club, Stardance), per-card deletion, and the `N` shortcut modal to add new links.
5. Created the animated HTML5 `<canvas>` starfield background that gently pulses behind the UI cards.

## Session 2 - NASA APOD Explorer, Video Embeds & Offline Caching

6. Wired the live NASA Astronomy Picture of the Day API (`https://api.nasa.gov/planetary/apod`) into the dashboard card and built the full-resolution modal inspector with a historical date picker (`1995-06-16` to today).
7. Tested fallback behavior against `HTTP 429` rate limits on NASA's public `DEMO_KEY`: removed the dead `go-apod.herokuapp.com` endpoint, added 3-try backoff, and implemented a `localStorage` snapshot cache so rate-limited or offline loads fall back cleanly to the last saved astronomy entry and retry automatically after 90 seconds (or when the browser fires `online`).
8. Added full video support for NASA APOD video days by normalizing `youtube.com/watch?v=`, `youtu.be/`, and `youtube.com/embed/` URLs into responsive iframes and supporting `<video controls>` for direct media files.
