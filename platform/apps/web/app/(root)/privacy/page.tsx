import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="bg-background py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-2xl font-bold text-foreground">1. Information We Collect</h2>
            <p>
              When you use VibeOnGo, we collect limited information necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Profile Information:</strong> Your name and email address from your GitHub account.</li>
              <li><strong>Repository Names:</strong> We store the names of the repositories you select to deploy to our platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">2. Code Privacy</h2>
            <p>
              Your source code is <strong>never</strong> accessed, stored, or processed by VibeOnGo's central servers. When you start an environment:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The code is cloned directly from GitHub onto your dedicated EC2 instance.</li>
              <li>All code resides exclusively on that instance.</li>
              <li>When the instance is terminated, all code and data on that instance are permanently deleted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">3. How We Use Your Information</h2>
            <p>
              We use your information strictly for managing your EC2 instances and your user session. We do not use your data for marketing updates or newsletters at this time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">4. Third Parties</h2>
            <p>
              We do not share your personal data with third parties. EC2 instances are provisioned using our own infrastructure credentials; no client data is shared with AWS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">5. Data Deletion</h2>
            <p>
              While we do not currently have an automated account deletion feature, we can process data deletion requests on a case-by-case basis. Please contact support for special requests.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
