import React from "react";
import { LegalDocument } from "@/components/landing-page/legal-document";
import type { Metadata } from "next";
import { LEGAL_LAST_UPDATED, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "What VibeOnGo collects, how your code stays private, which third parties are involved and how to delete your data.",
  path: "/privacy",
});

export default function PrivacyPolicy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      sections={[
        { id: "section-1", label: "Information We Collect" },
        { id: "section-2", label: "Code Privacy" },
        { id: "section-3", label: "How We Use Your Information" },
        { id: "section-4", label: "Third Parties" },
        { id: "section-5", label: "Data Deletion" },
      ]}
    >
      <div className="legal-copy">
        <p>
          Last updated:{" "}
          <time dateTime={LEGAL_LAST_UPDATED.privacy}>
            {new Date(LEGAL_LAST_UPDATED.privacy).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </p>

        <section id="section-1">
          <h2>1. Information We Collect</h2>
          <p>
            When you use VibeOnGo, we collect limited information necessary to
            provide our services:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Profile Information:</strong> Your name and email address
              from your GitHub account.
            </li>
            <li>
              <strong>Repository Names:</strong> We store the names of the
              repositories you select to deploy to our platform.
            </li>
          </ul>
        </section>

        <section id="section-2">
          <h2>2. Code Privacy</h2>
          <p>
            Your source code is <strong>never</strong> accessed, stored, or
            processed by VibeOnGo&apos;s central servers. When you start an
            environment:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              The code is cloned directly from GitHub onto your dedicated EC2
              instance.
            </li>
            <li>All code resides exclusively on that instance.</li>
            <li>
              When the instance is terminated, all code and data on that
              instance are permanently deleted.
            </li>
          </ul>
        </section>

        <section id="section-3">
          <h2>3. How We Use Your Information</h2>
          <p>
            We use your information strictly for managing your EC2 instances and
            your user session. We do not use your data for marketing updates or
            newsletters at this time.
          </p>
        </section>

        <section id="section-4">
          <h2>4. Third Parties</h2>
          <p>
            We do not share your personal data with third parties. EC2 instances
            are provisioned using our own infrastructure credentials; no client
            data is shared with AWS.
          </p>
        </section>

        <section id="section-5">
          <h2>5. Data Deletion</h2>
          <p>
            While we do not currently have an automated account deletion
            feature, we can process data deletion requests on a case-by-case
            basis. Please contact support for special requests.
          </p>
        </section>
      </div>
    </LegalDocument>
  );
}
