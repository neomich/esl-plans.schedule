# Setup guide

Do these in order.

## 1. Database (Supabase) — already done ✅

You've already run `supabase/schema.sql` in your new Supabase project.
Nothing more to do here.

## 2. Get the code into GitHub

Copy every file from this project into your `esl-plans.schedule`
repository (GitHub website → "Add file → Upload files", keeping the
folder structure intact — including the hidden `.github` folder,
which holds the automation that builds and publishes the site).
Commit it to the `main` branch.

## 3. Turn on GitHub Pages for this repo

1. In the repo, go to **Settings → Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**
   (not "Deploy from a branch").

That's it for this step — the workflow file already in the repo
(`.github/workflows/deploy.yml`) will build and publish the site
automatically every time you push to `main`.

## 4. Add your Supabase keys as repository secrets

The build needs these to talk to your database, but they should never
be typed directly into a workflow file.

1. Go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add:
   - Name: `VITE_SUPABASE_URL` → Value: your Supabase project URL
   - Name: `VITE_SUPABASE_ANON_KEY` → Value: your Supabase anon key

## 5. Point your domain at it

The app is set up to live at **schedule.esl-plans.com**.

1. Wherever you manage esl-plans.com's DNS (your domain registrar),
   add a new **CNAME record**:
   - Host/name: `schedule`
   - Value/target: `neomich.github.io`
2. In the repo's **Settings → Pages**, under "Custom domain", enter
   `schedule.esl-plans.com` and save. (The repo already includes a
   `CNAME` file with this value, so this may already be filled in —
   just confirm it, and once GitHub verifies the DNS, tick **Enforce
   HTTPS**.)

DNS changes can take anywhere from a few minutes to a few hours to
take effect.

## 6. Trigger the first deploy

Any push to `main` triggers a build. If you've already pushed all the
files, go to the repo's **Actions** tab and confirm a "Deploy to
GitHub Pages" run completed successfully (green check). If nothing
ran automatically, you can trigger it manually from the Actions tab
("Run workflow").

Once it's live, `schedule.esl-plans.com` lets a teacher create a
schedule; they land on `/their-slug` (their private settings page) and
their students use `/their-slug/schedule`.

## 7. Telegram notifications (only if you want them)

This needs three small server-side functions deployed once, from
Supabase's dashboard — no command line needed:

1. In Supabase, go to **Edge Functions → Create a new function**.
2. Create three functions, named **exactly**:
   - `notify-booking`
   - `register-telegram-webhook`
   - `telegram-webhook`
3. For each one, paste in the matching file's contents from
   `supabase/functions/<name>/index.ts` in this project, and deploy.

You don't need to set any extra secrets for these — Supabase
automatically gives every function access to your project's URL and
service role key.

Once deployed, a teacher can turn on Telegram notifications from their
settings page, paste their bot token, hit Save, then message their own
bot once — after that, bookings will trigger a Telegram message
automatically.

## 8. Try it end to end

1. Visit `schedule.esl-plans.com` → create a test schedule (e.g. slug
   `test`, code `123`).
2. You'll land on `/test` — the settings/admin page. Try changing a
   color or the headline and hit **Save changes**.
3. Open `/test/schedule` in a different browser (or incognito window)
   to see the student side. Enter code `123`, book a slot, then delete
   it.
4. If you enabled Telegram, message your bot and confirm you get a
   "You're connected!" reply, then book a test lesson and check you
   get an alert.

## Notes on the security model

- Nobody but you can see your `admin_token` or your Telegram bot
  token — they're only ever checked server-side, never sent to
  browsers other than your own (stored in your browser's local
  storage after you create your schedule).
- Student booking stays fully open, no login — same trade-off your
  original app already made. Anyone with your public link and access
  code can book or cancel any slot.
- The `admin_token` is currently the only thing protecting a
  teacher's settings page. Down the line, wiring this up to
  esl-plans.com's own login (so a Friend-tier subscriber is routed
  here automatically) will make this stronger — worth doing before
  this is fully public.
- The URLs are currently `/abc` and `/abc/schedule` on
  `schedule.esl-plans.com`. If you later want the exact
  `esl-plans.com/abc/schedule` shape, that means merging this code
  into the same repo/site as esl-plans.com itself — a deliberate,
  separate step, not something two independent GitHub Pages sites can
  do on their own.
