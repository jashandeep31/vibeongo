import React from "react";
import { LegalDocument } from "@/components/landing-page/legal-document";
import type { Metadata } from "next";
import { LEGAL_LAST_UPDATED, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms for using VibeOnGo: acceptable use, wallet and billing, warranties, limitation of liability and termination.",
  path: "/terms",
});

export default function TermsOfService() {
  return (
    <LegalDocument
      title="Terms of Service"
      sections={[
        { id: "section-1", label: "Acceptance of Terms" },
        { id: "section-2", label: "Prohibited Uses" },
        { id: "section-3", label: "Wallet and Billing" },
        { id: "section-4", label: "No Warranties and Limitation of Liability" },
        { id: "section-5", label: "Termination" },
      ]}
    >
      <div className="legal-copy">
        <p>
          Last updated:{" "}
          <time dateTime={LEGAL_LAST_UPDATED.terms}>
            {new Date(LEGAL_LAST_UPDATED.terms).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </p>

        <section id="section-1">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing VibeOnGo, you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use our
            platform.
          </p>
        </section>

        <section id="section-2">
          <h2>2. Prohibited Uses</h2>
          <p>
            Our platform provides dedicated EC2 instances for development and
            code fixing. The following activities are strictly prohibited:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Cryptocurrency mining.</li>
            <li>Bulk mailing or spamming.</li>
            <li>Deployment of illegal content or applications.</li>
            <li>Any activity that violates AWS Acceptable Use policies.</li>
          </ul>
          <p className="mt-4">
            Failure to comply with these rules will result in immediate
            termination of your instances and account without refund.
          </p>
        </section>

        <section id="section-3">
          <h2>3. Wallet and Billing</h2>
          <p>VibeOnGo operates on a wallet-based top-up system:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Users must top up their wallet to use services.</li>
            <li>
              Costs are deducted from your wallet based on the resources used.
            </li>
            <li>
              <strong>
                All top-ups are final. No refunds are provided for any reason.
              </strong>
            </li>
          </ul>
        </section>

        <section id="section-4">
          <h2>4. No Warranties and Limitation of Liability</h2>
          <p>
            VibeOnGo provides a platform &ldquo;as is&rdquo; without any
            promises or warranties.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>AI-Generated Code:</strong> We take no responsibility for
              any code changes, bugs, or security vulnerabilities introduced by
              our AI assistants. Users are solely responsible for reviewing and
              validating all code.
            </li>
            <li>
              <strong>Uptime:</strong> We do not guarantee continuous
              availability of the platform or the provisioned instances.
            </li>
            <li>
              <strong>Data Loss:</strong> We are not liable for any data loss
              that occurs on your provisioned instances.
            </li>
          </ul>
        </section>

        <section id="section-5">
          <h2>5. Termination</h2>
          <p>
            We reserve the right to terminate or suspend access to our service
            immediately, without prior notice or liability, for any reason
            whatsoever, including breach of the Terms.
          </p>
        </section>
      </div>
    </LegalDocument>
  );
}
