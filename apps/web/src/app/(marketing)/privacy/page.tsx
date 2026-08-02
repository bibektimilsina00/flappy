import type { Metadata } from "next";
import { Legal } from "@/features/marketing/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Riocut collects, uses, and protects your data.",
};

const CONTACT = "support@riocut.com";

export default function PrivacyPage() {
  return (
    <Legal title="Privacy Policy" updated="July 30, 2026">
      <section>
        <p>
          This Privacy Policy explains how Riocut ("Riocut", "we", "us") collects, uses, and protects your
          information when you use our website and the Riocut application (together, the "Service"). By using the
          Service you agree to this policy. If you have any questions, contact us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>

      <section>
        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account information.</strong> Your name, email address, and password hash when you sign up, or your
            basic profile (name, email) when you sign in with Google or Discord.
          </li>
          <li>
            <strong>Content you provide.</strong> Videos, images, and audio you upload; video links you submit for
            processing; prompts, titles, and captions you write; and the projects, timelines, and clips the Service
            creates from them at your request.
          </li>
          <li>
            <strong>Connected social accounts.</strong> If you choose to connect a social account (YouTube, TikTok,
            Instagram, Facebook, X, or LinkedIn), we store the account's display name, avatar, platform user ID, and
            the OAuth access tokens the platform issues. We never see or store your social media passwords.
          </li>
          <li>
            <strong>Usage and billing data.</strong> Credit balance and usage records (which features consumed
            credits), plan information, and basic technical logs (IP address, browser type, timestamps) needed to
            operate and secure the Service.
          </li>
          <li>
            <strong>Cookies and local storage.</strong> We use them to keep you signed in and to remember preferences
            such as drafts and templates. We do not use third-party advertising cookies.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <ul>
          <li>To provide the Service: storing your media, generating and editing videos, transcribing audio, and creating clips.</li>
          <li>
            To process your content with AI: audio may be transcribed and transcripts may be sent to third-party AI
            model providers (for example via OpenRouter, Google, OpenAI, or Replicate) solely to perform the feature
            you requested, such as selecting clip highlights or generating captions. Your content is not used by us to
            train AI models.
          </li>
          <li>
            To publish on your behalf: when you explicitly click publish (or schedule a post), we upload the selected
            clip and caption to the social platform you chose, using the tokens from your connected account. We never
            post without an action you initiated.
          </li>
          <li>To manage credits, prevent abuse, provide support, and improve the Service.</li>
        </ul>
      </section>

      <section>
        <h2>3. Connected platforms</h2>
        <p>
          Publishing uses each platform's official API, and your use of those platforms remains governed by their own
          terms and privacy policies:
        </p>
        <ul>
          <li>
            <strong>YouTube.</strong> Riocut uses YouTube API Services. By connecting a YouTube account you also agree
            to the <a href="https://www.youtube.com/t/terms">YouTube Terms of Service</a>, and Google's{" "}
            <a href="https://policies.google.com/privacy">Privacy Policy</a> applies. Riocut's use of information
            received from Google APIs adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We use the YouTube upload permission only to upload videos you
            explicitly ask us to publish, and the read permission only to display your channel name and avatar. You can
            revoke Riocut's access at any time via <a href="https://myaccount.google.com/permissions">Google security settings</a>.
          </li>
          <li>
            <strong>Meta (Instagram and Facebook).</strong> We use the tokens only to list your pages/accounts and to
            publish the posts you request. Revoke access any time in your Facebook or Instagram settings.
          </li>
          <li>
            <strong>TikTok, X, LinkedIn.</strong> Same principle: identity display and user-initiated publishing only.
            Access can be revoked in each platform's app/security settings.
          </li>
        </ul>
        <p>
          Disconnecting an account in Riocut deletes its stored tokens immediately. See also our{" "}
          <a href="/data-deletion">data deletion instructions</a>.
        </p>
      </section>

      <section>
        <h2>4. How we share information</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> that host our infrastructure (cloud compute, storage, databases) and
            process payments, under agreements that limit their use of your data to providing those services.
          </li>
          <li>
            <strong>AI model providers</strong>, limited to the content needed to fulfil the specific request you made
            (for example a transcript sent for highlight selection).
          </li>
          <li>
            <strong>Social platforms</strong> you connected, when you publish or schedule a post.
          </li>
          <li>
            <strong>Authorities</strong>, if required by law, or to protect the rights, safety, and security of Riocut
            and its users.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Data retention and deletion</h2>
        <ul>
          <li>Your content and projects are kept while your account is active so you can keep working with them.</li>
          <li>Social account tokens are kept until you disconnect the account or delete your Riocut account.</li>
          <li>
            You can request deletion of your account and all associated data at any time by emailing{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a> — see <a href="/data-deletion">data deletion</a> for details. We
            complete deletion within 30 days, except where a longer retention is legally required (for example billing
            records).
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          Data is encrypted in transit (TLS). Access tokens and credentials are stored server-side and never exposed to
          other users or third parties. Access to production systems is restricted. No method of storage is 100%
          secure, but we work to protect your data with industry-standard measures and will notify affected users of
          any breach as required by law.
        </p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>
          Depending on where you live (including under GDPR and CCPA), you may have the right to access, correct,
          export, or delete your personal data, to object to or restrict certain processing, and to lodge a complaint
          with a supervisory authority. To exercise any of these rights, email{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>
          The Service is not directed to children under 13 (or the minimum age in your jurisdiction), and we do not
          knowingly collect data from them. If you believe a child has provided us data, contact us and we will delete
          it.
        </p>
      </section>

      <section>
        <h2>9. Changes to this policy</h2>
        <p>
          We may update this policy as the Service evolves. We will post the new version here and update the date
          above; material changes will be announced in the app or by email. Continued use of the Service after changes
          take effect means you accept the updated policy.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Questions or requests about privacy: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>
    </Legal>
  );
}
