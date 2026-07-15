import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service · Offroad Parks",
  description:
    "The terms and conditions for using the Offroad Parks discovery platform.",
};

export default function TermsOfServicePage() {
  return (
    <article>
      <h1 className="text-3xl font-extrabold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Effective {LEGAL.effectiveDate}
      </p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of{" "}
        {LEGAL.siteName} (the &ldquo;Service&rdquo;), operated by{" "}
        {LEGAL.companyName}. By accessing or using the Service, you agree to be
        bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>Using the Service</h2>
      <p>
        You must be at least 13 years old to use the Service. You are
        responsible for the activity on your account and for keeping your
        sign-in secure.
      </p>

      <h2>User content</h2>
      <p>
        You retain ownership of the content you submit (reviews, parks, trail
        conditions, routes, photos). By submitting content, you grant us a
        non-exclusive, worldwide, royalty-free license to host, display, and
        distribute it in connection with operating and promoting the Service.
        You represent that you have the rights to the content you submit and
        that it does not violate any law or third-party right.
      </p>
      <h3>Acceptable use</h3>
      <ul>
        <li>
          Do not post false, misleading, defamatory, or infringing content.
        </li>
        <li>Do not spam, scrape, or abuse the Service or its APIs.</li>
        <li>
          Do not attempt to gain unauthorized access to any system or data.
        </li>
      </ul>
      <p>
        We may remove content or suspend accounts that violate these Terms, at
        our discretion.
      </p>

      <h2>Park information &amp; trail conditions</h2>
      <p>
        Park details, pricing, hours, weather, and trail-condition reports are
        provided for general information only and may be incomplete, outdated,
        or inaccurate. <strong>Off-road recreation is inherently risky.</strong>{" "}
        Always verify conditions, access, and rules directly with the park or
        land manager before you travel or ride. You are solely responsible for
        your own safety and decisions.
      </p>

      <h2>Operator claims</h2>
      <p>
        If you claim a park as an operator, you represent that you are
        authorized to act on behalf of that park or business. Approved operators
        may manage certain listing information subject to our review.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available,&rdquo; without warranties of any kind, express or implied,
        including fitness for a particular purpose and non-infringement. We do
        not warrant that the Service will be uninterrupted, secure, or
        error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {LEGAL.companyName} will not be
        liable for any indirect, incidental, special, consequential, or punitive
        damages, or any loss of profits or data, arising from your use of the
        Service — including any reliance on park information or trail
        conditions.
      </p>

      <h2>Changes to the Service and Terms</h2>
      <p>
        We may modify or discontinue the Service, and we may update these Terms,
        at any time. Material changes will be reflected in the effective date
        above. Continued use after changes take effect constitutes acceptance.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of {LEGAL.jurisdiction}, without
        regard to its conflict-of-laws rules.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </article>
  );
}
