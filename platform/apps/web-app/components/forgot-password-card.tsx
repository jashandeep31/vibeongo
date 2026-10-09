"use client";
import type { EmailOtpChallenge } from "@repo/api-client";
import { useForgotPassword } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { AuthFrame, EmailOtpFlow, emailFlowError } from "./email-otp-flow";

export function ForgotPasswordCard() {
  const request = useForgotPassword();
  const [pending, setPending] = useState<{
    email: string;
    challenge: EmailOtpChallenge;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.isPending) return;
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setError(null);
    try {
      const challenge = await request.mutateAsync({ email });
      form.reset();
      setPending({ email, challenge });
    } catch (failure) {
      setError(emailFlowError(failure, "send"));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      request.reset();
    }
  }
  if (pending)
    return (
      <EmailOtpFlow
        email={pending.email}
        initialChallenge={pending.challenge}
        purpose="reset"
        onBack={() => {
          setPending(null);
          setError(null);
        }}
      />
    );
  return (
    <AuthFrame
      title="Forgot your password?"
      description="Enter your email to request a reset code."
    >
      <form
        onSubmit={submit}
        className="space-y-5"
        aria-busy={request.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={255}
            placeholder="you@example.com"
            required
            disabled={request.isPending}
            className="h-11"
          />
        </div>
        {error && (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="text-destructive text-sm outline-none"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={request.isPending}
        >
          {request.isPending && (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {request.isPending ? "Requesting code…" : "Send reset code"}
        </Button>
      </form>
      <Link
        href="/login"
        className="text-muted-foreground mt-6 block rounded-sm py-2 text-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Back to login
      </Link>
    </AuthFrame>
  );
}
