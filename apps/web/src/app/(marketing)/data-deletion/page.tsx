import type { Metadata } from "next";
import { Legal } from "@/features/marketing/legal";

export const metadata: Metadata = {
  title: "Data Deletion",
  description: "How to delete your data from Flappy.",
};

const CONTACT = "support@khareedlow.com";

// Required by Meta (and useful for every platform): a public page explaining
// how users can delete the data Flappy holds about them.
export default function DataDeletionPage() {
  return (
    <Legal title="Data Deletion Instructions" updated="July 30, 2026">
      <section>
        <p>
          You are always in control of the data Flappy stores. There are three levels of deletion, depending on what
          you want removed:
        </p>
      </section>

      <section>
        <h2>1. Disconnect a social account</h2>
        <p>
          To remove a connected social account (YouTube, TikTok, Instagram, Facebook, X, or LinkedIn) and its access
          tokens:
        </p>
        <ul>
          <li>Open any clip in Flappy → <strong>Publish</strong> → hover the account chip → click the <strong>×</strong> to disconnect.</li>
          <li>The stored tokens are deleted immediately and any scheduled auto-posts to that account will no longer run.</li>
          <li>
            You can additionally revoke Flappy from the platform's side: Google{" "}
            <a href="https://myaccount.google.com/permissions">security settings</a>, Facebook/Instagram{" "}
            <em>Settings → Apps and websites</em>, TikTok <em>Settings → Security → Apps</em>, X{" "}
            <em>Settings → Security → Apps and sessions</em>, LinkedIn <em>Settings → Data privacy → Permitted services</em>.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Delete individual content</h2>
        <p>
          Projects, clips jobs, uploads, and scheduled posts can each be deleted inside the app (delete buttons on
          project cards, clip job rows, and posting-queue entries). Deleting a job removes its stored source video,
          clips, and transcripts from our storage.
        </p>
      </section>

      <section>
        <h2>3. Delete your entire account</h2>
        <p>
          Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address associated with your account with the
          subject <strong>"Delete my account"</strong>. We will delete your account and all associated data — profile,
          projects, media, transcripts, connected-account tokens, and scheduled posts — within 30 days, and confirm by
          email when it is done. Billing records may be retained longer where legally required.
        </p>
        <p>
          Note: content you already published to social platforms lives on those platforms and is not deleted by
          removing your Flappy data — manage it on the platform directly.
        </p>
      </section>
    </Legal>
  );
}
