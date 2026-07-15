import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Offroad Parks",
  description:
    "How Offroad Parks collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <article>
      <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Effective {LEGAL.effectiveDate}
      </p>

      <p>
        This Privacy Policy explains how {LEGAL.companyName} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects, uses, and shares information when you use{" "}
        {LEGAL.siteName} (the &ldquo;Service&rdquo;). By using the Service, you
        agree to the practices described here.
      </p>

      <h2>Information we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>
          <strong>Account information</strong> — when you sign in, our
          authentication provider (Google) shares your name, email address, and
          profile image with us.
        </li>
        <li>
          <strong>Content you submit</strong> — parks you add, reviews and
          ratings, trip reports, trail-condition reports, saved routes and
          favorites, and park-claim requests (including the business name and
          contact details you provide).
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Usage &amp; device data</strong> — via Vercel Analytics, we
          collect privacy-friendly, aggregated usage metrics. We do not use
          cross-site tracking cookies for advertising.
        </li>
        <li>
          <strong>Approximate location</strong> — only if you use the
          &ldquo;Parks Near Me&rdquo; feature and grant your browser&rsquo;s
          geolocation permission. Your coordinates are used to sort nearby parks
          and are not stored.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To operate, maintain, and improve the Service.</li>
        <li>To display your submitted content (reviews, conditions, parks).</li>
        <li>
          To communicate with you about your account, claims, and (if you opt
          in) notifications.
        </li>
        <li>
          To detect, prevent, and address abuse, spam, and security issues.
        </li>
      </ul>

      <h2>How we share information</h2>
      <p>
        We do not sell your personal information. We share it only with service
        providers that help us run the Service, including: Google (sign-in),
        Vercel (hosting, database, and analytics), and Mapbox (maps). Content
        you post publicly (such as reviews and trail conditions) is visible to
        other users. We may disclose information if required by law.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain your account and content for as long as your account is active
        or as needed to provide the Service. You may request deletion of your
        account and associated personal data by contacting us.
      </p>

      <h2>Your rights &amp; choices</h2>
      <p>
        Depending on where you live (for example, under the GDPR or CCPA), you
        may have the right to access, correct, delete, or export your personal
        information, and to object to certain processing. To exercise these
        rights, email us at {LEGAL.contactEmail}. You can control cookie
        preferences through the cookie banner and manage location sharing in
        your browser settings.
      </p>

      <h2>Children&rsquo;s privacy</h2>
      <p>
        The Service is not directed to children under 13, and we do not
        knowingly collect personal information from them.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we will revise
        the effective date above and, where appropriate, provide additional
        notice.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Contact us at{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </article>
  );
}
