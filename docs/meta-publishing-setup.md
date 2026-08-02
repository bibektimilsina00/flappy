# Facebook + Instagram publishing — step-by-step Meta setup

A complete, first-timer walkthrough to let Riocut publish a finished video to a
user's **Facebook Page** and their **Instagram** (as a Reel).

**There are two connect paths, and Riocut offers both:**

1. **Connect Facebook** (*Facebook Login for Business* product) — for users who
   have a **Facebook Page**. One connect finds their Page *and* the Instagram
   business account linked to it. Covers **Facebook + Instagram**.
2. **Connect Instagram** (*Instagram API with Instagram login* product,
   standalone) — for creators who have **no Facebook Page**, just a professional
   Instagram account. Covers **Instagram only**.

You set up **both** in the *same* Meta app. Facebook posting always needs a Page
(Meta only lets the API post to Pages, never personal profiles) — so page-less
users go through path 2 and reach Instagram directly. Phases 1–6 cover the
Facebook path; **Phase 5b** adds the standalone Instagram path.

## Values you'll paste (keep this handy)

| Field | Value |
|---|---|
| Facebook redirect URI | `https://riocut.com/api/v1/social/facebook/callback` |
| Instagram redirect URI (standalone) | `https://riocut.com/api/v1/social/instagram/callback` |
| App display name | `Riocut` |
| App domain | `riocut.com` |
| Privacy policy URL | `https://riocut.com/privacy` |
| Terms of Service URL | `https://riocut.com/terms` |
| Data deletion URL | `https://riocut.com/data-deletion` |
| Contact email | an inbox you actually read (e.g. `support@riocut.com`) |
| App icon file | `brand/social/riocut-appicon-1024.png` (in your repo) |
| Category | Utilities and Productivity |
| Permissions to request | `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish` |

---

## Before you start — the accounts

Do this in the normal Facebook / Instagram apps, **not** the developer console.
These are the accounts you'll test with (they can be Riocut-branded — you'll want
that anyway). Videos ultimately publish to each end-user's *own* accounts, so
Riocut doesn't need its own — but you need one Page + one linked IG **you admin**
to test.

**A. Create the Facebook Page**
1. Go to **facebook.com**, log in.
2. Click the **grid / ☰ menu** (top right) → **Pages** → **Create new Page**.
3. **Page name:** `Riocut`
4. **Category:** type `Software` and select it (add up to 3, e.g. Software, Video
   Creator, Product/Service).
5. **Bio:** "AI video studio — create and edit videos, turn long clips into
   shorts, and publish to social."
6. Click **Create Page**. You're now an admin of this Page.

**B. Make your Instagram a professional account**
1. Open the **Instagram app** → your **Profile** → tap the **☰ menu** (top right).
2. **Settings and privacy → For professionals → Account type and tools → Switch
   to professional account**.
3. Choose **Business**, pick a category, finish the prompts. IG is now a Business
   account (required for API publishing).

**C. Link the Instagram account to the Facebook Page**
- **Via Accounts Center (easiest):** go to **accountscenter.facebook.com** (or IG
  app → Settings → **Accounts Center**) → **Accounts → Add accounts** → add
  **both** your Facebook Page and Instagram.
- **Or via the Page:** Facebook Page → **Settings → Linked accounts → Instagram →
  Connect account**.
- **Confirm:** Page → Settings → Linked accounts → Instagram should show your IG
  connected. That link is what lets Riocut find your Instagram when you Connect
  Facebook.

---

## Phase 1 — Developer account + create the app

**Step 1.** Go to **developers.facebook.com** and click **Log in** (top right) with
your Facebook account.

**Step 2.** If it's your first time, it asks you to **register as a developer** —
accept the terms, verify your email/phone if prompted. This is a one-time thing.

**Step 3.** Click **My Apps** (top nav) → **Create App**.

**Step 4.** On "What do you want your app to do?", choose **Other** → **Next**.

**Step 5.** For app type, choose **Business** → **Next**.

**Step 6.** Fill the create form:
- **App name:** `Riocut`
- **App contact email:** your inbox
- **Business portfolio:** pick one if you have it, or leave "No business portfolio
  selected" for now (you'll attach one later for verification).
- Click **Create app** (may re-prompt your Facebook password).

You're now on the app **Dashboard**.

---

## Phase 2 — App settings → Basic

**Step 7.** Left sidebar → **App settings → Basic**.

**Step 8.** Fill each field, then **Save changes** at the bottom:
- **Display name:** `Riocut`
- **App domains:** type `riocut.com` and press enter
- **Contact email:** your inbox
- **Privacy policy URL:** `https://riocut.com/privacy`
- **Terms of Service URL:** `https://riocut.com/terms` (replace the facebook.com
  placeholder if it's prefilled)
- **User data deletion:** choose **Data deletion instructions URL** and enter
  `https://riocut.com/data-deletion`
- **App icon:** upload `brand/social/riocut-appicon-1024.png` from your repo
- **Category:** **Utilities and Productivity**
- Leave **Namespace** and **Data Protection Officer** blank.

**Step 9.** Copy the **App ID** and (click **Show** →) the **App secret** from the
top of this page — you'll send these to me in Phase 5.

---

## Phase 3 — Add "Facebook Login for Business"

You add **two** products: *Facebook Login for Business* (the login) and
*Instagram* (set up in **Facebook-login mode** so it reaches IG through the Page).
Both come from one "Connect Facebook" in Riocut.

**Step 10.** On the **Available products** list, find **Facebook Login for
Business** → click **Set up**.

**Step 10b.** Also find **Instagram** → **Set up** → when it asks how, choose
**"API setup with Facebook login"** (NOT "Instagram login"). This unlocks
`instagram_basic` + `instagram_content_publish` through your linked Page. Skip all
other products (Messenger, WhatsApp, Marketing API, etc.).

**Step 11.** _(Facebook Login for Business.)_

**Step 12.** Skip the quickstart wizard if it appears (you don't need code
snippets). Go to the **Facebook Login for Business → Settings** (in the left
sidebar).

**Step 13.** In **Client OAuth settings**, make sure **Client OAuth login** and
**Web OAuth login** are **ON**.

**Step 14.** In **Valid OAuth Redirect URIs**, paste:
```
https://riocut.com/api/v1/social/facebook/callback
```
(and optionally `http://localhost:8000/api/v1/social/facebook/callback` for local
testing). Click **Save changes**.

---

## Phase 4 — Request the permissions

**Step 15.** Left sidebar → **App Review → Permissions and Features** (in newer
consoles it's under **Use cases** → your use case → **Permissions**).

**Step 16.** Find each of these and click **Request advanced access** (or make sure
you at least have **Standard access**, which is enough to test with your own
account):
- `pages_show_list`
- `pages_manage_posts`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_content_publish`

> During development, **Standard access** already works for people who have a role
> on the app (Phase 5). **Advanced access** is only needed for the public, and
> that's the App Review track (Phase 7).

---

## Phase 5 — Add yourself as a tester + send me the keys

**Step 17.** Left sidebar → **App roles → Roles** → **Add People** → add your own
Facebook account as **Administrator** (or Tester). Accept the invite.

**Step 18.** Send me the two values you copied in Step 9:
- **App ID**
- **App secret**

I'll set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in production and redeploy.
**Until I do this, Connect Facebook in Riocut will fail** (the old app is deleted).

---

## Phase 5b — Standalone Instagram (for creators with no Facebook Page)

This adds the second connect button so a user with **only a professional
Instagram account** can post — no Page required. Same Meta app, a second product.

**Step 5b-1.** Left sidebar → **Products → Add product** → find **Instagram** →
**Set up**. (If Instagram is already added from Phase 3 in Facebook-login mode,
open it — it has both setup modes; you're now configuring the *other* one.)

**Step 5b-2.** Inside the Instagram product, choose **API setup with Instagram
login** (the standalone mode, NOT "Facebook login"). This section has its own
credentials and its own redirect settings, separate from the Facebook app.

**Step 5b-3.** Under **Business login settings** (a.k.a. "Set up Instagram
business login"), find **Instagram app ID** and **Instagram app secret** — copy
both. These are *different* from the Facebook App ID/secret.

**Step 5b-4.** In the same **Business login settings**, set **OAuth redirect
URIs** to:
```
https://riocut.com/api/v1/social/instagram/callback
```
Save.

**Step 5b-5.** Confirm the permissions listed include **`instagram_business_basic`**
and **`instagram_business_content_publish`** (they're the defaults for this
product). No page permissions here.

**Step 5b-6.** Under the Instagram product → **Roles / Instagram testers**, add
your professional Instagram account as a **tester**, then accept the invite from
inside the Instagram app (**Settings → Website permissions / Apps and websites →
Tester invites**). Standalone IG needs the account added here to test in dev mode.

**Step 5b-7.** Send me the **Instagram app ID + secret** from Step 5b-3. I'll set
`INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` in production. Then Riocut shows
**both** "Connect Facebook" and "Connect Instagram."

> **Which button does a user pick?** Has a Facebook Page → **Connect Facebook**
> (gets FB + IG together). Only an Instagram account → **Connect Instagram**.
> Both work; they're just two doors to the same publish flow.

---

## Phase 6 — Test it in Riocut

**Step 19.** After I confirm the keys are deployed, open a project on
**riocut.com** → **Export**.

**Step 20.** Click **Connect Facebook** → approve the Facebook dialog (choose your
Page and, when asked, allow the Instagram permissions).

**Step 21.** You should now see your **Facebook Page** and your **Instagram**
listed as channels. Select one (or both), add a caption, and click **Publish**.
Each row shows the status and a **View** link when it's posted.

If anything errors, copy the message from the channel row and send it to me — I'll
pull the server logs and fix.

---

## Phase 7 — Go public (later, in parallel)

Development mode only lets people with a role on your app connect. To open it to
everyone:

**Step 22.** **Business Verification** — App Dashboard → the verification prompt →
verify the business that owns the app (business documents or domain). Meta gates
the advanced permissions behind this.

**Step 23.** **App Review** — App Review → submit each permission for **Advanced
access** with a **screencast** showing: user connects Facebook → picks a caption →
publishes → the post appears on the Page / Instagram. Use-case note: "Users publish
videos they created in Riocut to their own Facebook Page and Instagram."

**Step 24.** Once approved, flip the app to **Live** (toggle at the top of the
dashboard). Now any user can connect.

This takes days to a couple of weeks. Meanwhile you and your role-holders keep
working from Phase 6.

---

## Troubleshooting

- **"URL blocked / redirect URI not whitelisted"** → the URI in Step 14 doesn't
  exactly match. It must be `https://riocut.com/api/v1/social/facebook/callback`,
  no trailing slash.
- **Instagram doesn't appear after connecting** → the IG account isn't a
  professional account, or isn't linked to the Page (redo the "Before you start"
  steps), or you didn't grant the `instagram_*` permissions in the dialog.
- **"App not active" / only you can log in** → that's development mode; expected
  until App Review (Phase 7). You (and added roles) can still use it.
- **Facebook post works but Instagram fails** → IG publishing needs the video to
  be fetched from a public URL; Riocut hands it a presigned link and polls — a
  slow first post (~10–60s) is normal, not an error.

_Redirect URI, permissions, and flow match Riocut's code
(`apps/api/app/features/social/oauth.py`, `publishers.py`)._
