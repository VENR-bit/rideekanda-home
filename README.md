# rideekanda-home

Landing page for [rideekanda.org](https://rideekanda.org) — a tile-based hub linking to the monastery's online resources.

## Stack
- Static HTML/CSS/JS (no build step)
- Hosted on GitHub Pages
- Tiles stored in Supabase (table: `tiles`)
- Admin panel at `/admin.html` uses Supabase email/password auth

## Editing tiles
Visit `/admin.html`, log in with the Supabase admin account, then add/edit/delete/reorder tiles. No code changes required.
