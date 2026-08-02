# Get TikTok publishing live — TikTok for Developers setup

Publishing a finished Riocut video straight to a user's TikTok. TikTok is
stricter than YouTube: OAuth + posting work in a **sandbox** immediately, but
posting **publicly** to real users requires passing TikTok's **Content Posting
API audit**.

## At a glance

| | |
|---|---|
| **Redirect URI (prod)** | `https://riocut.com/api/v1/social/tiktok/callback` |
| **Redirect URI (local)** | `http://localhost:8000/api/v1/social/tiktok/callback` |
| **Env vars** | `TIKTOK_CLIENT_KEY` · `TIKTOK_CLIENT_SECRET` — ✅ already set in prod |
| **Products needed** | Login Kit **+** Content Posting API |
| **Scopes** | `user.info.basic` · `video.publish` |
| **Auth** | PKCE (handled in code) |

> ⚠️ **Code gotcha — read this first.** Our publisher currently posts with
> `privacy_level: PUBLIC_TO_EVERYONE`. **Unaudited apps cannot post publicly** —
> TikTok only allows `SELF_ONLY` (private) until the audit passes, and only to
> the developer's own registered test accounts. So **as-is, a test post will be
> rejected.** For sandbox testing I need to switch it to `SELF_ONLY` (and for the
> audit, add the required `creator_info` pre-check). Tell me and I'll make that
> change — see "Code changes needed" at the bottom.

---

## Track A — Sandbox (works today, private posts only)

1. **Create the app.** Go to [developers.tiktok.com](https://developers.tiktok.com/)
   → **Manage apps → Connect an app** (or open your existing one — the client
   key is already in prod). Give it the Riocut name, logo (`brand/social/riocut-appicon-1024.png`),
   and description.

2. **Add two products** to the app:
   - **Login Kit** — the OAuth flow.
   - **Content Posting API** — the actual video publishing.

3. **Register the redirect URI.** Under **Login Kit → Redirect URI**, add both
   URIs from the table above. TikTok requires you to also **verify the domain**
   (`riocut.com`) — it gives you a verification file or `<meta>` tag / DNS record
   to prove ownership. Do that for the prod domain.

4. **Add scopes.** Request `user.info.basic` and `video.publish` for the app.

5. **Add yourself as a sandbox test user.** In the app's **Sandbox**, add the
   TikTok account you'll post to as a **target user**. Only listed accounts can
   authorize an unaudited app.

6. **Connect & test (private).** In Riocut → **Settings → Connections → Connect
   TikTok** (or the editor Export panel → Connect). Authorize, then publish — with
   the `SELF_ONLY` change, the video lands as a **private** post on your test
   account (visible only to you). That confirms the whole pipeline works.

---

## Track B — Content Posting API audit (to post publicly, for real users)

This is the gate. Direct public posting (`PUBLIC_TO_EVERYONE`) and access for
users beyond your sandbox test accounts both require passing TikTok's audit.

1. **Meet the UX / compliance rules.** TikTok's Content Posting API guidelines
   require, before a public post, that the app:
   - calls **`/v2/post/publish/creator_info/query/`** first and respects the
     returned allowed privacy levels and posting limits,
   - lets the creator set the **caption** and **privacy level**,
   - shows the required **"Posting on behalf of…" / commercial-content** disclosures,
   - links to TikTok's content-sharing guidelines.

   (This is the second half of "Code changes needed" below.)

2. **Submit the app for review** with the `video.publish` scope, a completed app
   listing, and a **demo video** showing: connect → choose caption/privacy →
   publish → the post appearing on TikTok.

3. **Wait for approval.** Audits take days to a couple of weeks. Until then you
   stay in sandbox (private posts, test accounts only).

---

## Code changes needed (I'll do these when you say go)

1. **Now, to test at all:** change the TikTok publisher's `privacy_level` from
   `PUBLIC_TO_EVERYONE` to `SELF_ONLY` (or make it configurable per post). Without
   this, every sandbox post is rejected.

2. **For the audit:** add the `creator_info/query` pre-check and surface the
   allowed privacy options in the publish UI, so the flow is compliant. This is
   required for TikTok to approve public posting.

---

## What to send me

- **Reusing the existing app** (keys already in prod): once you've added the
  products, redirect URI, domain verification, scopes, and a sandbox test user,
  tell me and I'll flip the code to `SELF_ONLY` so you can test end-to-end.
- **New app:** send the new `Client key` and `Client secret` and I'll set them in
  prod and redeploy.
- **If connect or publish errors:** paste the message and I'll pull the worker
  logs and fix.

_Redirect URI, scopes, and endpoints above match Riocut's code
(`apps/api/app/features/social/oauth.py` and `publishers.py`)._
