import React from "react";
import { Mail, Twitter, Github } from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui/components/button";

export default function ContactPage() {
  const contactMethods = [
    {
      name: "Email",
      value: "hi@jashan.dev",
      href: "mailto:hi@jashan.dev",
      icon: Mail,
      label: "Send an email"
    },
    {
      name: "Twitter",
      value: "@Jashandeep31",
      href: "https://x.com/Jashandeep31",
      icon: Twitter,
      label: "Follow on X"
    },
    {
      name: "GitHub",
      value: "jashandeep31",
      href: "https://github.com/jashandeep31",
      icon: Github,
      label: "Check out projects"
    }
  ];

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] flex items-center justify-center py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-6">
          Get in Touch
        </h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
          Have questions, feedback, or need support? Reach out through any of the channels below.
        </p>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {contactMethods.map((method) => (
            <div key={method.name} className="p-8 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm flex flex-col items-center group hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <method.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{method.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{method.value}</p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={method.href} target="_blank" rel="noopener noreferrer">
                  {method.label}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
