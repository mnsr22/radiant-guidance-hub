import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Halal Connect" },
      {
        name: "description",
        content:
          "How Halal Connect collects, uses, shares, retains and protects your personal data on our mobile app and website.",
      },
      { property: "og:title", content: "Privacy Policy — Halal Connect" },
      {
        property: "og:description",
        content:
          "Learn what data Halal Connect collects, why, and the controls you have — including account deletion.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPage,
});

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Halal Connect</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/delete-account" className="hover:text-foreground">Delete account</Link>
            <Link to="/help" className="hover:text-foreground">Support</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
      <footer className="border-t mt-16">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} Halal Connect</span>
          <span>Contact: privacy@halalconnect.space</span>
        </div>
      </footer>
    </div>
  );
}

function H({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-xl font-semibold mt-8 mb-3 scroll-mt-24">
      {children}
    </h2>
  );
}

function PrivacyPage() {
  const updated = "July 6, 2026";
  return (
    <PublicShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: {updated}</p>
      </div>

      <Card className="p-6 shadow-elegant leading-relaxed text-sm">
        <p>
          This Privacy Policy describes how Halal Connect ("we", "us", "our") collects, uses,
          shares, stores, and protects information about you when you use our mobile
          application and website (the "Service"). By using the Service you agree to the
          practices described here.
        </p>

        <H id="data">1. Information we collect</H>
        <p>We collect the following categories of information:</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>
            <strong>Account data:</strong> name, email, phone number, date of birth, gender,
            password (hashed), and authentication provider IDs (Google / Apple).
          </li>
          <li>
            <strong>Profile data:</strong> photos, bio, location (city/country), education,
            profession, height, ethnicity, languages, marital status, and Islamic practice
            answers you submit during the one-time profile setup (madhab, prayer frequency,
            hijab/beard preference, wali contact, etc.).
          </li>
          <li>
            <strong>Activity data:</strong> matches, messages you send in-app, tasbih /
            dhikr sessions and streaks, reports you file, and support tickets.
          </li>
          <li>
            <strong>Device data:</strong> device model, OS version, app version, language,
            time zone, push-notification token, IP address, and crash/diagnostics logs.
          </li>
          <li>
            <strong>Payment data:</strong> subscription status and transaction IDs from the
            App Store or Google Play. We do <em>not</em> receive or store your card number.
          </li>
        </ul>

        <H id="use">2. How we use your information</H>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>To create and secure your account, and authenticate you.</li>
          <li>To match you with other users based on the criteria you provide.</li>
          <li>To enable chat, tasbih streaks, notifications, and other features.</li>
          <li>To moderate content, detect abuse, and enforce our Community Guidelines.</li>
          <li>To provide customer support and respond to your requests.</li>
          <li>To send service messages and — with your consent — marketing messages.</li>
          <li>To comply with legal obligations and defend legal claims.</li>
        </ul>

        <H id="legal">3. Legal bases (GDPR / UK GDPR)</H>
        <p>
          We rely on: (a) <strong>performance of a contract</strong> to provide the Service;
          (b) <strong>consent</strong> for sensitive data (religion, orientation, marketing);
          (c) <strong>legitimate interests</strong> for safety, fraud prevention, and product
          improvement; and (d) <strong>legal obligation</strong> where required.
        </p>

        <H id="share">4. How we share information</H>
        <p>
          Your public profile is visible to other users of the Service. We also share limited
          data with the following categories of processors, under contract and only for the
          purposes below:
        </p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Cloud hosting and databases (e.g. AWS, Cloudflare).</li>
          <li>Push notifications (Firebase Cloud Messaging, Apple Push Notification service).</li>
          <li>Analytics and crash reporting.</li>
          <li>Payment processors (Apple, Google, Stripe).</li>
          <li>Email / SMS delivery providers.</li>
          <li>Law enforcement when required by valid legal process.</li>
        </ul>
        <p className="mt-2">We do not sell your personal information.</p>

        <H id="children">5. Children</H>
        <p>
          The Service is intended for users aged <strong>18 and older</strong>. We do not
          knowingly collect data from anyone under 18. If we learn that we have collected
          such data, we will delete it.
        </p>

        <H id="retention">6. Data retention</H>
        <p>
          We retain your account data while your account is active. When you delete your
          account we remove or anonymise your personal data within <strong>30 days</strong>,
          except where we must retain records to meet legal obligations, resolve disputes,
          or enforce our agreements (in which case we keep the minimum necessary and delete
          it after the retention period).
        </p>

        <H id="security">7. Security</H>
        <p>
          We use encryption in transit (TLS), encryption at rest, hashed passwords, access
          controls, and monitoring. No system is 100% secure, so we cannot guarantee absolute
          security.
        </p>

        <H id="transfers">8. International transfers</H>
        <p>
          Your data may be processed in countries outside your own. Where required we use
          Standard Contractual Clauses or equivalent safeguards.
        </p>

        <H id="rights">9. Your rights</H>
        <p>Depending on your jurisdiction you may have the right to:</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Access, correct, export, or delete your data.</li>
          <li>Restrict or object to certain processing.</li>
          <li>Withdraw consent at any time.</li>
          <li>Lodge a complaint with your data-protection authority.</li>
        </ul>
        <p className="mt-2">
          You can exercise most of these rights from within the app (Settings → Privacy) or
          by contacting <a className="text-primary underline" href="mailto:privacy@halalconnect.space">privacy@halalconnect.space</a>.
          To delete your account, use the in-app option or the{" "}
          <Link to="/delete-account" className="text-primary underline">public deletion form</Link>.
        </p>

        <H id="permissions">10. App permissions</H>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Camera / Photos:</strong> to upload profile pictures.</li>
          <li><strong>Location:</strong> to show approximate distance to matches (city-level only).</li>
          <li><strong>Notifications:</strong> to alert you to new matches, messages and streaks.</li>
          <li><strong>Microphone:</strong> only if you record a voice note.</li>
        </ul>

        <H id="changes">11. Changes</H>
        <p>
          We will notify you of material changes in-app or by email at least 7 days before
          they take effect.
        </p>

        <H id="contact">12. Contact</H>
        <p>
          Halal Connect — Data Protection Officer<br />
          Email: <a className="text-primary underline" href="mailto:privacy@halalconnect.space">privacy@halalconnect.space</a><br />
          Support: <Link to="/help" className="text-primary underline">/help</Link>
        </p>
      </Card>
    </PublicShell>
  );
}

export { PublicShell };