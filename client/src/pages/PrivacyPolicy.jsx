import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaShieldAlt,
  FaDatabase,
  FaUserShield,
  FaEnvelope,
  FaGlobeAfrica,
  FaBalanceScale,
  FaEye,
  FaLock,
  FaSyncAlt,
  FaChild,
} from 'react-icons/fa';
import { nawiriBrand } from '../config/brand';

const LAST_UPDATED = '19 September 2026';
const CONTACT_EMAIL = nawiriBrand.email;

const Section = ({ icon: Icon, title, children }) => (
  <section className="mb-8">
    <h2 className="mb-3 flex items-center gap-2.5 text-lg font-bold text-charcoal dark:text-white">
      {Icon && <Icon className="shrink-0 text-plum-700 dark:text-gold-300" size={18} />}
      {title}
    </h2>
    <div className="space-y-3 text-[15px] leading-relaxed text-brown-700 dark:text-white/70">
      {children}
    </div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-plum-700 text-white shadow-sm">
            <FaShieldAlt size={22} />
          </div>
          <h1 className="text-3xl font-extrabold text-charcoal dark:text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-brown-500 dark:text-white/55">
            {nawiriBrand.companyName} · {nawiriBrand.websiteUrl.replace('https://', '')}
          </p>
          <p className="mt-1 text-xs text-brown-400 dark:text-white/40">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        {/* Intro */}
        <div className="mb-10 rounded-card border border-brown-100 bg-white p-5 dark:border-dm-border dark:bg-dm-card">
          <p className="text-[15px] leading-relaxed text-brown-700 dark:text-white/70">
            {nawiriBrand.shortName} ("we", "us", "our") operates {nawiriBrand.websiteUrl} and sells
            hair products, wigs, extensions and accessories online and in store. This policy explains
            what personal data we collect, why we collect it, how we protect it, and the rights you
            have over it. It applies to every visitor and customer, wherever you are in the world.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-brown-700 dark:text-white/70">
            We wrote it in plain language on purpose. If anything is unclear, contact us — details
            are at the bottom.
          </p>
        </div>

        {/* 1. Who we are */}
        <Section icon={FaBalanceScale} title="1. Who is responsible for your data (the data controller)">
          <p>
            The controller is <strong>{nawiriBrand.companyName}</strong>, {nawiriBrand.location}.
            Reach our privacy contact at{' '}
            <a className="font-semibold text-plum-700 underline underline-offset-2 dark:text-gold-300" href={`mailto:${nawiriBrand.email}`}>
              {nawiriBrand.email}
            </a>{' '}
            or {nawiriBrand.phoneDisplay}.
          </p>
        </Section>

        {/* 2. What we collect */}
        <Section icon={FaDatabase} title="2. What data we collect">
          <p>We only collect what we need to run a hair shop online:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li><strong>Account data</strong> — your name, email address, phone number, and (if you sign in with Google) your Google name, email and profile photo.</li>
            <li><strong>Order data</strong> — what you buy, order value, delivery address, and delivery instructions.</li>
            <li><strong>Payment data</strong> — for M-Pesa, your phone number and the transaction reference from Safaricom; for card payments via our processor, a payment token/reference. <strong>We never see or store your card number or M-Pesa PIN.</strong></li>
            <li><strong>Loyalty data</strong> — your Royal Card tier, points balance, and community-perk participation, if you join those programmes.</li>
            <li><strong>Support messages</strong> — what you send us on WhatsApp, Instagram, TikTok or email.</li>
            <li><strong>Basic technical logs</strong> — our servers keep short-lived security logs (IP address, browser type, timestamps) to prevent fraud and abuse.</li>
          </ul>
          <p>
            <strong>We do not run advertising trackers.</strong> There are no Google Analytics, Meta
            Pixel, TikTok Pixel or similar third-party trackers on this site. We do not sell or rent
            your personal data to anyone.
          </p>
        </Section>

        {/* 3. Why (lawful bases) */}
        <Section icon={FaBalanceScale} title="3. Why we use your data (lawful bases)">
          <ul className="ml-5 list-disc space-y-2">
            <li><strong>To fulfil your order</strong> (contract) — process purchases, arrange delivery or pickup, handle returns and exchanges.</li>
            <li><strong>To take payment</strong> (contract + legal obligation) — process M-Pesa/card payments and keep accounting records as Kenyan tax law requires.</li>
            <li><strong>To run your account</strong> (contract) — sign you in, including via "Sign in with Google", and keep your basket and addresses.</li>
            <li><strong>Loyalty programmes</strong> (contract / your consent) — Royal Card points, tiers and community perks.</li>
            <li><strong>Security and fraud prevention</strong> (legitimate interests) — protect you, us and our staff from fraudulent orders.</li>
            <li><strong>Marketing</strong> (consent only) — occasional offers and product news. Every message includes an opt-out, and you can withdraw consent any time.</li>
          </ul>
        </Section>

        {/* 4. Google sign-in */}
        <Section icon={FaUserShield} title="4. Signing in with Google">
          <p>
            If you use "Sign in with Google", Google shares your name, email address and profile
            picture with us — nothing more. We use these only to create and identify your account.
            We never post to your Google account, never read your email, and never see your Google
            password.
          </p>
          <p>
            Google's handling of that sign-in is covered by{' '}
            <a className="font-semibold text-plum-700 underline underline-offset-2 dark:text-gold-300" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Google's Privacy Policy
            </a>. You can revoke our access any time at{' '}
            <a className="font-semibold text-plum-700 underline underline-offset-2 dark:text-gold-300" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              Google Account → Security → Third-party access
            </a>.
          </p>
        </Section>

        {/* 5. Payments */}
        <Section icon={FaLock} title="5. Payments">
          <p>
            M-Pesa payments are processed by Safaricom's payment gateway; card payments are processed
            by our PCI-DSS-compliant card processor. We receive only a confirmation and a transaction
            reference — never your PIN, full card number, or CVV. Payment references are stored with
            your order so we can reconcile and refund correctly.
          </p>
        </Section>

        {/* 6. Sharing */}
        <Section icon={FaGlobeAfrica} title="6. Who we share data with">
          <p>We share the minimum necessary, only with:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li><strong>Delivery partners</strong> — your name, phone and delivery address, so your order reaches you.</li>
            <li><strong>Payment processors</strong> — Safaricom (M-Pesa) and our card processor, to take and verify payment.</li>
            <li><strong>Infrastructure providers</strong> — our website and database hosting (Vercel, Render, MongoDB Atlas), bound by their own data-protection commitments.</li>
            <li><strong>Authorities</strong> — where Kenyan law compels us (e.g. a valid police or court request).</li>
          </ul>
          <p>Nobody else. No advertisers, no data brokers, no "partners".</p>
        </Section>

        {/* 7. Storage & retention */}
        <Section icon={FaDatabase} title="7. Where data lives and how long we keep it">
          <ul className="ml-5 list-disc space-y-2">
            <li><strong>Account and order records</strong> — kept while your account is active, then up to 7 years for Kenyan tax and audit obligations, then deleted or anonymised.</li>
            <li><strong>Security logs</strong> — short-lived, typically 90 days.</li>
            <li><strong>Marketing consent records</strong> — kept until you withdraw consent, plus a short proof period.</li>
          </ul>
        </Section>

        {/* 8. Security */}
        <Section icon={FaLock} title="8. How we protect your data">
          <ul className="ml-5 list-disc space-y-2">
            <li>All traffic runs over HTTPS/TLS encryption.</li>
            <li>Passwords are stored only as modern salted hashes — never in plain text.</li>
            <li>Access to customer data is limited to trained staff who need it to serve you (cashiers see orders, not your password; admins see what their role requires).</li>
            <li>Payment credentials never touch our systems — they go straight to Safaricom or our card processor.</li>
          </ul>
        </Section>

        {/* 9. Your rights */}
        <Section icon={FaEye} title="9. Your rights">
          <p>Wherever you live, you can ask us to:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li><strong>Access</strong> — a copy of the personal data we hold about you.</li>
            <li><strong>Correct</strong> — fix anything inaccurate.</li>
            <li><strong>Delete</strong> — erase your data ("right to be forgotten"), subject to tax-record retention we must keep.</li>
            <li><strong>Port</strong> — receive your data in a machine-readable file.</li>
            <li><strong>Object / restrict</strong> — stop a particular use, such as marketing.</li>
            <li><strong>Withdraw consent</strong> — at any time, without affecting past processing.</li>
          </ul>
          <p>
            These rights mirror the <strong>Kenya Data Protection Act, 2019</strong>, the EU/UK{' '}
            <strong>GDPR</strong>, and the California <strong>CCPA/CPRA</strong>. We never charge for
            a request and respond within 30 days (Kenya DPA / GDPR timeline). Email{' '}
            <a className="font-semibold text-plum-700 underline underline-offset-2 dark:text-gold-300" href={`mailto:${nawiriBrand.email}`}>
              {nawiriBrand.email}
            </a>{' '}
            to exercise any of them. If you are unsatisfied, you may complain to the{' '}
            <strong>Office of the Data Protection Commissioner (Kenya)</strong> or your local
            authority.
          </p>
        </Section>

        {/* 10. Children */}
        <Section icon={FaChild} title="10. Children">
          <p>
            This store is not directed at children under 18, and we do not knowingly collect their
            data. If you believe a child gave us personal data, contact us and we will delete it.
          </p>
        </Section>

        {/* 11. International transfers */}
        <Section icon={FaGlobeAfrica} title="11. International data transfers">
          <p>
            Our infrastructure providers may store or process data outside Kenya (for example in the
            EU, the United States or South Africa). Where that happens, we rely on their
            certified safeguards and contract terms that meet the standard the Kenya Data Protection
            Act and GDPR require.
          </p>
        </Section>

        {/* 12. Changes */}
        <Section icon={FaSyncAlt} title="12. Changes to this policy">
          <p>
            If we change anything material, we will update this page, change the "Last updated" date
            above, and — for significant changes — notify account holders by email or a notice on
            the site.
          </p>
        </Section>

        {/* 13. Contact */}
        <Section icon={FaEnvelope} title="13. Contact us about privacy">
          <div className="rounded-card border border-brown-100 bg-blush-50 p-4 dark:border-dm-border dark:bg-dm-card-2">
            <p className="font-semibold text-charcoal dark:text-white">{nawiriBrand.companyName}</p>
            <p className="mt-1 text-sm">{nawiriBrand.location}</p>
            <p className="mt-1 text-sm">
              Email:{' '}
              <a className="font-semibold text-plum-700 underline underline-offset-2 dark:text-gold-300" href={`mailto:${nawiriBrand.email}`}>
                {nawiriBrand.email}
              </a>
            </p>
            <p className="text-sm">Phone: {nawiriBrand.phoneDisplay}</p>
            <p className="mt-2 text-xs text-brown-400 dark:text-white/40">Response time: within 30 days, usually much sooner.</p>
          </div>
        </Section>

        <footer className="mt-12 border-t border-brown-100 pt-6 text-center dark:border-dm-border">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-pill border border-brown-200 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-plum-50 dark:border-dm-border dark:text-white dark:hover:bg-dm-card-2"
          >
            ← Back to shop
          </Link>
          <p className="mt-6 text-xs text-brown-400 dark:text-white/35">
            © {new Date().getFullYear()} {nawiriBrand.companyName}. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;