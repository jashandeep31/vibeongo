import React from "react";

export default function TermsOfService() {
  return (
    <div className="bg-background py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-8">
          Terms of Service
        </h1>
        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing VibeOnGo, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">2. Prohibited Uses</h2>
            <p>
              Our platform provides dedicated EC2 instances for development and code fixing. The following activities are strictly prohibited:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cryptocurrency mining.</li>
              <li>Bulk mailing or spamming.</li>
              <li>Deployment of illegal content or applications.</li>
              <li>Any activity that violates AWS Acceptable Use policies.</li>
            </ul>
            <p className="mt-4">
              Failure to comply with these rules will result in immediate termination of your instances and account without refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">3. Wallet and Billing</h2>
            <p>
              VibeOnGo operates on a wallet-based top-up system:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Users must top up their wallet to use services.</li>
              <li>Costs are deducted from your wallet based on the resources used.</li>
              <li><strong>All top-ups are final. No refunds are provided for any reason.</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">4. No Warranties and Limitation of Liability</h2>
            <p>
              VibeOnGo provides a platform "as is" without any promises or warranties.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>AI-Generated Code:</strong> We take no responsibility for any code changes, bugs, or security vulnerabilities introduced by our AI assistants. Users are solely responsible for reviewing and validating all code.</li>
              <li><strong>Uptime:</strong> We do not guarantee continuous availability of the platform or the provisioned instances.</li>
              <li><strong>Data Loss:</strong> We are not liable for any data loss that occurs on your provisioned instances.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">5. Termination</h2>
            <p>
              We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including breach of the Terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
