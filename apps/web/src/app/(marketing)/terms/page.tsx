import type { Metadata } from "next";
import { Legal } from "@/features/marketing";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Riocut.",
};

const CONTACT = "support@riocut.com";

export default function TermsPage() {
  return (
    <Legal title="Terms of Service" updated="July 30, 2026">
      <section>
        <p>
          These Terms of Service ("Terms") govern your access to and use of the Riocut website and application (the
          "Service"), operated by Riocut ("we", "us"). By creating an account or using the Service you agree to these
          Terms and to our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>1. The Service</h2>
        <p>
          Riocut is an AI video studio: it generates media with third-party AI models, provides a canvas and video
          editor, repurposes long-form videos into short clips, and can publish or schedule posts to social accounts
          you connect. Features may change, improve, or be discontinued as the Service evolves.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <ul>
          <li>You must provide accurate information and keep your credentials secure; you are responsible for all activity under your account.</li>
          <li>You must be at least 13 years old (or the minimum digital-consent age in your jurisdiction) and old enough to agree to these Terms.</li>
          <li>We may suspend or terminate accounts that violate these Terms or put the Service or other users at risk.</li>
        </ul>
      </section>

      <section>
        <h2>3. Your content and permissions</h2>
        <ul>
          <li>
            <strong>You own your content.</strong> Videos, images, audio, and text you upload or create remain yours.
            You grant us a limited license to store, process, transcode, transcribe, and display that content solely to
            operate the Service for you (including sending necessary parts to AI providers to fulfil your requests).
          </li>
          <li>
            <strong>Only import what you have rights to.</strong> You may only upload or link content that you own or
            are licensed to use. Importing someone else's video without permission may infringe copyright, and you are
            solely responsible for the content you process.
          </li>
          <li>
            <strong>AI output.</strong> Subject to the third-party model providers' terms, we claim no ownership over
            the output generated for you. AI output may be inaccurate or similar to output generated for others; review
            it before you rely on or publish it.
          </li>
          <li>
            <strong>Prohibited content.</strong> You may not use the Service to create or distribute content that is
            illegal, infringing, deceptive (including undisclosed deepfakes of real people), harassing, sexually
            exploitative, or that violates any platform's rules you publish to.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Connected social accounts and publishing</h2>
        <ul>
          <li>Connecting a social account authorizes Riocut to publish to that account only when you initiate a post or configure a posting schedule.</li>
          <li>You are responsible for the content you publish and for complying with each platform's terms (YouTube, TikTok, Meta, X, LinkedIn).</li>
          <li>Platforms may rate-limit, reject, or remove posts; we surface their errors but cannot control their decisions.</li>
          <li>You can disconnect an account at any time, which deletes its stored tokens and stops future scheduled posts to it.</li>
        </ul>
      </section>

      <section>
        <h2>5. Credits, plans, and payment</h2>
        <ul>
          <li>Some features consume credits. Credit costs are shown before you start a job; consumed credits are not refundable once processing has begun.</li>
          <li>Free-plan output may include a Riocut watermark.</li>
          <li>Paid plans and credit purchases are billed as described at checkout. Except where required by law, payments are non-refundable.</li>
          <li>We may adjust pricing and credit costs prospectively; changes never apply retroactively to credits you already purchased.</li>
        </ul>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <ul>
          <li>No reverse engineering, scraping, or abusive automation against the Service.</li>
          <li>No attempts to bypass usage limits, credit accounting, or security measures.</li>
          <li>No uploading of malware or content designed to disrupt the Service or its users.</li>
        </ul>
      </section>

      <section>
        <h2>7. Intellectual property</h2>
        <p>
          The Service — including its software, design, and branding — is owned by us and our licensors and is
          protected by law. These Terms grant you a personal, non-exclusive, non-transferable right to use the Service;
          they do not transfer any ownership of the Service to you.
        </p>
      </section>

      <section>
        <h2>8. Copyright complaints</h2>
        <p>
          If you believe content on the Service infringes your copyright, email{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a> with the content location, proof of ownership, and your contact
          details. We will remove infringing content and may terminate repeat infringers' accounts.
        </p>
      </section>

      <section>
        <h2>9. Disclaimers</h2>
        <p>
          The Service is provided <strong>"as is" and "as available"</strong> without warranties of any kind, express
          or implied, including fitness for a particular purpose, non-infringement, or that the Service will be
          uninterrupted or error-free. AI-generated content may contain errors — you are responsible for reviewing it
          before use.
        </p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, we will not be liable for indirect, incidental, special,
          consequential, or punitive damages, or for lost profits, data, or goodwill. Our total liability for any claim
          relating to the Service is limited to the greater of the amount you paid us in the 12 months before the claim
          or USD 100.
        </p>
      </section>

      <section>
        <h2>11. Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or terminate your access
          for violation of these Terms, with notice where practicable. Sections that by their nature should survive
          (content responsibility, disclaimers, liability limits) survive termination.
        </p>
      </section>

      <section>
        <h2>12. Changes to these Terms</h2>
        <p>
          We may update these Terms as the Service evolves. We will post the updated Terms here and update the date
          above; material changes will be announced in the app or by email. Continued use after changes take effect
          constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          Questions about these Terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>
    </Legal>
  );
}
