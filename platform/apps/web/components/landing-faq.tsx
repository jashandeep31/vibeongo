"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";

const faqs = [
  {
    question: "What is VibeOnGo?",
    answer:
      "VibeOnGo spins up cloud development workspaces with your repository, tools, terminal, previews, and AI coding agents ready to use.",
  },
  {
    question: "Which AI agents are supported?",
    answer:
      "VibeOnGo is built around agents like Claude Code, Codex, OpenCode, and T3 so you can choose the workflow that fits your project.",
  },
  {
    question: "Can I access my workspace over SSH?",
    answer:
      "Yes. You can add SSH keys and connect to your cloud workspace from your own machine or SSH clients like Termius.",
  },
  {
    question: "Can I preview dev servers over HTTPS?",
    answer:
      "Yes. VibeOnGo provides dedicated proxy routes so running dev servers can be opened through HTTPS connections.",
  },
  {
    question: "Do I need to set up tools locally?",
    answer:
      "No. The workspace is designed to start with the project environment, terminal, and common development tooling already available.",
  },
  {
    question: "How does billing work?",
    answer:
      "VibeOnGo is intended for usage-based cloud development, so you pay for the resources you actively use rather than maintaining a local setup.",
  },
];

export function LandingFaq() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            Questions, answered
          </h2>
          <p className="text-muted-foreground mt-5 max-w-md text-lg leading-8">
            Everything you need to know before starting a cloud workspace.
          </p>
        </div>

        <Accordion type="single" collapsible className="border-border border-t">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-foreground py-5 text-base font-semibold hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 text-base leading-7">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
