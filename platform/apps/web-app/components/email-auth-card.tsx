"use client";

import type { EmailOtpChallenge } from "@repo/api-client";
import { EmailOtpFlow } from "./email-otp-flow";
import { useSigninWithPassword, useSignupWithPassword } from "@repo/api-hooks";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Github, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { BACKEND_URL } from "@/lib/constants";

function authError(error: unknown, signup: boolean) {
  if (!isAxiosError(error) || !error.response) {
    return "We couldn’t reach the server. Check your connection and try again.";
  }
  switch (error.response.status) {
    case 400:
      return "Check your email and password, then try again.";
    case 401:
      return "The email or password is incorrect, or password login is unavailable for this account.";
    case 409:
      return "An account may already use this email. Try logging in instead.";
    case 429:
      return "Too many attempts. Please wait a few minutes before trying again.";
    case 403:
      if (error.response.data?.code === "EMAIL_NOT_VERIFIED")
        return "Verify your email before logging in. Open signup, enter your details, and request a verification code.";
      return "Login is unavailable from this address. Please contact support.";
    default:
      return signup
        ? "We couldn’t create your account. Please try again shortly."
        : "We couldn’t log you in. Please try again shortly.";
  }
}

export function EmailAuthCard({
  mode = "login",
}: {
  mode?: "login" | "signup";
}) {
  const isSignup = mode === "signup";
  const signup = useSignupWithPassword();
  const signin = useSigninWithPassword();
  const [pendingVerification, setPendingVerification] = useState<{
    email: string;
    challenge: EmailOtpChallenge;
  } | null>(null);
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const busy = signup.isPending || signin.isPending || isRedirecting;

  const showError = (message: string) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setEmailUnverified(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("firstName") ?? "").trim();
    if (isSignup && (!firstName || firstName.length > 100)) {
      showError("Enter your name.");
      return;
    }
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const length = Array.from(password).length;
    if (length < 8 || length > 20 || /\s/u.test(password)) {
      showError("Enter a password of 8–20 characters without spaces.");
      return;
    }
    if (isSignup && password !== data.get("confirmPassword")) {
      showError("Your passwords don’t match. Please enter them again.");
      return;
    }
    try {
      if (isSignup) {
        const challenge = await signup.mutateAsync({
          email,
          password,
          firstName,
        });
        form.reset();
        setPendingVerification({ email, challenge });
        return;
      } else {
        await signin.mutateAsync({ email, password });
      }
      setIsRedirecting(true);
      form.reset();
      // A fresh document reads the new HTTP-only cookie and clears account-specific UI state.
      window.location.replace("/");
    } catch (failure) {
      if (
        isAxiosError(failure) &&
        failure.response?.data?.code === "EMAIL_NOT_VERIFIED"
      )
        setEmailUnverified(true);
      showError(authError(failure, isSignup));
    } finally {
      // Remove password-bearing mutation variables once the request finishes.
      signup.reset();
      signin.reset();
    }
  };

  if (pendingVerification)
    return (
      <EmailOtpFlow
        email={pendingVerification.email}
        initialChallenge={pendingVerification.challenge}
        purpose="verification"
        onBack={() => {
          setPendingVerification(null);
          setError(null);
        }}
      />
    );

  return (
    <main className="bg-background flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/vibeongologo.png"
            alt="VibeOnGo"
            width={40}
            height={40}
            className="mb-6 size-10 rounded-lg"
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isSignup
              ? "Start building in AI Playground."
              : "Log in to your AI Playground."}
          </p>
        </div>

        <a
          href={`${BACKEND_URL}/api/v1/auth/github?client_id=vibeongo-next`}
          aria-disabled={busy}
          tabIndex={busy ? -1 : undefined}
          onClick={(event) => {
            if (busy) event.preventDefault();
          }}
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "min-h-12 w-full flex-wrap gap-2 py-3",
            busy && "pointer-events-none opacity-50",
          )}
        >
          <Github aria-hidden="true" /> Continue with GitHub
          <span className="bg-primary-foreground/15 rounded-full px-2 py-0.5 text-[11px] font-medium">
            Recommended
          </span>
        </a>
        <div className="my-6 flex items-center gap-3">
          <div className="bg-border h-px flex-1" aria-hidden="true" />
          <span className="text-muted-foreground text-xs">
            Or {isSignup ? "try with email" : "continue with email"}
          </span>
          <div className="bg-border h-px flex-1" aria-hidden="true" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={busy}>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                name="firstName"
                autoComplete="name"
                placeholder="Your name"
                maxLength={100}
                required
                disabled={busy}
                className="h-11"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              maxLength={255}
              required
              disabled={busy}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                disabled={busy}
                className="h-11 pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-1 my-auto size-10"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={busy}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                disabled={busy}
                className="h-11"
              />
            </div>
          )}
          {!isSignup && (
            <Link
              href="/forgot-password"
              className="text-muted-foreground block rounded-sm text-right text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Forgot password?
            </Link>
          )}
          {emailUnverified && (
            <Link
              href="/signup"
              className="text-foreground block rounded-sm text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Finish signup and verify email
            </Link>
          )}
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="text-destructive text-sm leading-relaxed outline-none"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="h-11 w-full"
            disabled={busy}
          >
            {busy && (
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {isRedirecting
              ? "Opening your workspace…"
              : busy
                ? isSignup
                  ? "Creating your account…"
                  : "Logging in…"
                : isSignup
                  ? "Create account"
                  : "Log in"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="text-foreground rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}
