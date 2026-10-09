"use client";

import type { EmailOtpChallenge } from "@repo/api-client";
import {
  useForgotPassword,
  useResendVerification,
  useResetPassword,
  useVerifyEmail,
} from "@repo/api-hooks";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { isAxiosError } from "axios";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
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
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm break-words">
            {description}
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}

export function emailFlowError(
  error: unknown,
  action: "send" | "verify" | "resend",
) {
  if (!isAxiosError(error) || !error.response)
    return "Couldn’t reach the server. Check your connection and try again.";
  if (error.response.status === 429)
    return "Too many attempts. Wait a few minutes and try again.";
  if (error.response.status === 400) {
    if (action === "resend")
      return "This signup request is no longer available. Choose Change signup details to request a new code.";
    return action === "verify"
      ? "The code is incorrect, expired, or no longer available. Try again or request a new code."
      : "Enter a valid email address.";
  }
  if (error.response.status === 403)
    return "This request is unavailable. Please try again from the app.";
  return action === "verify"
    ? "Couldn’t complete this request. Please try again shortly."
    : "Couldn’t send the email. Please try again shortly.";
}

export function EmailOtpFlow({
  email,
  initialChallenge,
  purpose,
  onBack,
}: {
  email: string;
  initialChallenge: EmailOtpChallenge;
  purpose: "verification" | "reset";
  onBack: () => void;
}) {
  const verification = purpose === "verification";
  const verify = useVerifyEmail();
  const reset = useResetPassword();
  const resendVerification = useResendVerification();
  const forgot = useForgotPassword();
  const [challenge, setChallenge] = useState(initialChallenge);
  const [resendAt, setResendAt] = useState(
    () => Date.now() + initialChallenge.resendAfterSeconds * 1000,
  );
  const [expiresAt, setExpiresAt] = useState(
    () => Date.now() + initialChallenge.expiresInSeconds * 1000,
  );
  const [now, setNow] = useState(() => Date.now());
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const busy =
    verify.isPending ||
    reset.isPending ||
    resendVerification.isPending ||
    forgot.isPending;
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = now >= expiresAt;
  useEffect(() => {
    if (complete) return;
    codeRef.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [complete]);
  const showError = (message: string) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || complete) return;
    setError(null);
    setNotice(null);
    if (!/^\d{6}$/.test(otp)) {
      showError("Enter the six-digit code from your email.");
      return;
    }
    if (expired) {
      showError("This code has expired. Request a new code.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    if (!verification) {
      const length = Array.from(newPassword).length;
      if (length < 8 || length > 20 || /\s/u.test(newPassword)) {
        showError("Enter a password of 8–20 characters without spaces.");
        return;
      }
      if (newPassword !== data.get("confirmPassword")) {
        showError("Your passwords don’t match.");
        return;
      }
    }
    try {
      const payload = { email, challengeId: challenge.challengeId, otp };
      if (verification) await verify.mutateAsync(payload);
      else await reset.mutateAsync({ ...payload, newPassword });
      form.reset();
      setOtp("");
      setComplete(true);
    } catch (failure) {
      showError(emailFlowError(failure, "verify"));
    } finally {
      verify.reset();
      reset.reset();
    }
  }

  async function resend() {
    if (busy || wait > 0 || complete) return;
    setError(null);
    setNotice(null);
    try {
      const next = verification
        ? await resendVerification.mutateAsync({
            email,
            challengeId: challenge.challengeId,
          })
        : await forgot.mutateAsync({ email });
      const sentAt = Date.now();
      setChallenge(next);
      setResendAt(sentAt + next.resendAfterSeconds * 1000);
      setExpiresAt(sentAt + next.expiresInSeconds * 1000);
      setNow(sentAt);
      setOtp("");
      setNotice(
        verification
          ? "A new code has been sent."
          : "If your account is eligible, a new code has been sent.",
      );
      codeRef.current?.focus();
    } catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 429) {
        const seconds = Number(failure.response.headers["retry-after"]);
        if (Number.isFinite(seconds) && seconds > 0)
          setResendAt(Date.now() + seconds * 1000);
      }
      showError(emailFlowError(failure, verification ? "resend" : "send"));
    } finally {
      resendVerification.reset();
      forgot.reset();
    }
  }

  if (complete)
    return (
      <AuthFrame
        title={verification ? "Email verified" : "Password updated"}
        description={
          verification
            ? "Your account is ready. Sign in to get started."
            : "Sign in with your new password."
        }
      >
        <div role="status" className="sr-only">
          {verification
            ? "Email verified successfully."
            : "Password updated successfully."}
        </div>
        <Link
          href="/login"
          className={buttonVariants({ className: "h-11 w-full" })}
        >
          Continue to login
        </Link>
      </AuthFrame>
    );

  return (
    <AuthFrame
      title={verification ? "Verify your email" : "Reset your password"}
      description={
        verification
          ? `Enter the code sent to ${email}.`
          : `If ${email} has a verified password account, we’ve sent a reset code.`
      }
    >
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        <div className="space-y-2">
          <Label htmlFor="email-otp">Verification code</Label>
          <Input
            ref={codeRef}
            id="email-otp"
            name="otp"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={busy}
            className="h-11 text-center text-lg tracking-[0.3em]"
          />
          <p
            className="text-muted-foreground text-xs"
            role={expired ? "status" : undefined}
          >
            {expired
              ? "This code has expired. Request a new one."
              : "Codes expire after 10 minutes. Check your spam folder too."}
          </p>
        </div>
        {!verification && (
          <>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                  className="h-11 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-1 my-auto size-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={busy}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>
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
          </>
        )}
        {error && (
          <p
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="text-destructive text-sm outline-none"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-muted-foreground text-sm">
            {notice}
          </p>
        )}
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={busy || expired}
        >
          {busy && (
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {verification ? "Verify email" : "Update password"}
        </Button>
      </form>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => void resend()}
          disabled={busy || wait > 0}
        >
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full"
          onClick={onBack}
          disabled={busy}
        >
          {verification ? "Change signup details" : "Use another email"}
        </Button>
        {!verification && (
          <Link
            href="/login"
            className="text-muted-foreground rounded-sm py-2 text-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Back to login
          </Link>
        )}
      </div>
    </AuthFrame>
  );
}
