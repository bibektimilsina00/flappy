# Get YouTube publishing live — Google Cloud setup

Everything to take Riocut from "can't connect" to publishing clips as YouTube
Shorts on real users' channels — from a 15-minute test setup to a fully
verified, public Google app.

## At a glance

| | |
|---|---|
| **Redirect URI (prod)** | `https://riocut.com/api/v1/social/youtube/callback` |
| **Redirect URI (local)** | `http://localhost:8000/api/v1/social/youtube/callback` |
| **Env vars** | `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` — ✅ already set in prod |
| **API needed** | YouTube Data API v3 |
| **Scopes used** | `youtube.upload` · `youtube.readonly` (both "sensitive") |

> **Reuse your existing app.** Your Google client (the one that already powers
> "Sign in with Google") is set in production. You do **not** need a new app or
> new keys — just add the redirect URI above, turn on the API, and add the two
> scopes. Only make a brand-new client if you want publishing separated from
> login; if you do, send me the new ID + secret and I'll deploy them.

---

## Track A — Working today (Testing mode, ~15 min)

Gets **you** publishing immediately, before any Google review. Anyone you add as
a test user works too (up to 100).

1. **Open the right project.** Go to
   [console.cloud.google.com](https://console.cloud.google.com/) and select the
   project your Google login already uses (top project picker). Everything below
   happens in that one project.

2. **Enable the YouTube Data API v3.** *APIs & Services → Library* → search
   "YouTube Data API v3" → **Enable**. This is what the upload calls hit;
   without it every publish returns a 403.

3. **Add the scopes to the consent screen.** *APIs & Services → OAuth consent
   screen → Data access → Add or remove scopes → Manually add scopes*. You must
   paste the **full URL** (starting with `https://`) — the `.../auth/...`
   shorthand Google shows is display-only and is rejected as invalid. Add both,
   one per line:

   ```
   https://www.googleapis.com/auth/youtube.upload
   https://www.googleapis.com/auth/youtube.readonly
   ```

   Then **Add to table** and **Save**. These are "sensitive" scopes — fine in
   Testing mode now; they're what triggers verification in Track B.

   > Do **not** add the broader `.../auth/youtube` ("Manage your YouTube
   > account") scope — the app only uploads and reads the channel, so those two
   > are all it needs, and fewer scopes means an easier verification.

   > You'll also see `openid`, `.../auth/userinfo.email`, and
   > `.../auth/userinfo.profile` already listed — those power **Sign in with
   > Google** (login uses scope `openid email profile`), not publishing. Leave
   > them; they belong there.

4. **Register the redirect URI.** *APIs & Services → Credentials → your OAuth
   2.0 Client ID (Web application)*. Under **Authorized redirect URIs**, click
   **Add URI** and paste:

   ```
   https://riocut.com/api/v1/social/youtube/callback
   ```

   Keep your existing login URI too — a client can hold several. Save.

5. **Add yourself as a test user.** *OAuth consent screen → Audience* → under
   **Test users**, add the Google account whose YouTube channel you'll publish
   to. In Testing mode only listed test users can authorize.

6. **Connect & publish in Riocut.** *Settings → Connections → Connect YouTube* →
   approve the Google screen (you'll see an "unverified app" warning — expected
   in Testing, click *Advanced → continue*). Then open a finished clips job and
   **Publish** a clip. It should land as a Short on your channel.

> ⚠️ **Testing-mode catch — 7-day tokens.** While the app is in **Testing**,
> Google expires refresh tokens after **7 days**. So a connected channel stops
> working after a week and needs reconnecting. This is normal and disappears the
> moment the app is published (Track B) — don't chase it as a bug.

---

## Track B — Publishing the app publicly

Required before *other people* can connect their channels without the scary
warning or the 7-day limit. This is Google's OAuth verification.

1. **Fill in Branding.** *OAuth consent screen → Branding.* Google verifies
   these against a domain you own:
   - App name **Riocut**, plus your support email and a logo
   - App home page: `https://riocut.com`
   - Privacy policy: `https://riocut.com/privacy`
   - Terms of service: `https://riocut.com/terms`
   - Authorized domain: `riocut.com`

2. **Publish the app.** *Audience → Publishing status → Publish app.* This flips
   it from Testing to **In production** and lifts the 100-user / 7-day-token
   limits.

3. **Submit for verification.** Because you use sensitive YouTube scopes, Google
   prompts **Prepare for verification**. You'll justify each scope ("publish
   user-recorded clips to their own channel as Shorts") and record a short
   **demo video** showing the OAuth consent screen and what the app does with
   the data. Submit.

> **Timeline.** Sensitive-scope verification typically takes a few days to a few
> weeks, with back-and-forth. Meanwhile you and your test users keep working via
> Track A — verification only gates *public* access, not your own use.

---

## Track C — The real ceiling: API quota

The one people miss. It's separate from OAuth verification and matters more for
a publishing product.

> 🚨 **Default quota ≈ 6 uploads/day — total.** The YouTube Data API gives every
> project **10,000 units/day** by default, and a single video upload costs
> **1,600 units**. That's about **6 published clips per day across all of
> Riocut's users combined** — not per user. You'll hit this almost immediately
> at any real scale.

To lift it you file the **YouTube API Services — Audit and Quota Extension**
request (a compliance review of how your app uses the API, plus the quota bump).
It's a separate form from OAuth verification and also takes weeks, so **start it
early**, in parallel with Track B.

- Find it under *APIs & Services → YouTube Data API v3 → Quotas*, or via Google's
  "YouTube API Services Audit and Quota Extension Form".
- They'll want your app to comply with YouTube's API Terms and Developer
  Policies — publishing user clips to their own channel is a clean, in-policy
  use case.
- Until it's granted, treat YouTube as capacity-limited: the publish job already
  records per-post status, so over-quota posts surface as failures rather than
  silently dropping.

---

## What to send me

- **Reusing the existing app** (recommended): nothing — just tell me once
  "YouTube connects and publishes," and I'll confirm it end-to-end and move us to
  the next platform.
- **New dedicated app:** send the new `Client ID` and `Client secret` — I'll set
  them as prod secrets and redeploy.
- **If anything errors:** paste the exact message from the connect popup or the
  publish result, and I'll pull the worker logs and fix.

_Redirect URI, env var names, scopes, and quota numbers above match Riocut's
current code (`apps/api/app/features/social/oauth.py` and `publishers.py`).
Google console labels shift occasionally; the section names are the stable
landmarks._
