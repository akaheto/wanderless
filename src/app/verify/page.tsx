"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { verifyEmailAction, resendVerificationAction } from "@/app/actions";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error" | "expired">("verifying");
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const formData = new FormData();
        formData.set("token", token);
        const result = await verifyEmailAction(formData);

        if ("error" in result) {
          if (result.error.includes("expired")) {
            setStatus("expired");
          } else {
            setStatus("error");
          }
        } else {
          setStatus("success");
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        }
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [token, router]);

  const handleResendClick = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    setIsResending(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      const result = await resendVerificationAction(formData);

      if ("error" in result) {
        alert(result.error);
      } else {
        alert("Verification email sent! Check your inbox.");
        setEmail("");
      }
    } catch {
      alert("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      {status === "verifying" && (
        <>
          <div>
            <h1 className="text-2xl font-bold">Verifying your email…</h1>
            <p className="mt-2 text-sm text-ink-3">
              Please wait while we verify your email address.
            </p>
          </div>

          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-accent"></div>
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div className="space-y-2">
            <div className="text-4xl">✓</div>
            <h1 className="text-2xl font-bold">Email verified!</h1>
            <p className="mt-2 text-sm text-ink-3">
              Your email has been verified successfully. Redirecting to sign in…
            </p>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="space-y-2">
            <div className="text-4xl">✕</div>
            <h1 className="text-2xl font-bold">Verification failed</h1>
            <p className="mt-2 text-sm text-ink-3">
              We couldn&apos;t verify your email. The link may be invalid or you can request a new one below.
            </p>
          </div>

          <form onSubmit={handleResendClick} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink-2">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 w-full rounded border border-line bg-surface-1 px-3 py-2 text-sm text-ink-2"
                disabled={isResending}
              />
            </label>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isResending || !email}
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </Button>
          </form>

          <p className="text-center text-sm text-ink-3">
            <Link href="/login" className="text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}

      {status === "expired" && (
        <>
          <div className="space-y-2">
            <div className="text-4xl">⏱️</div>
            <h1 className="text-2xl font-bold">Link expired</h1>
            <p className="mt-2 text-sm text-ink-3">
              Your verification link has expired. Please request a new one below.
            </p>
          </div>

          <form onSubmit={handleResendClick} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink-2">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 w-full rounded border border-line bg-surface-1 px-3 py-2 text-sm text-ink-2"
                disabled={isResending}
              />
            </label>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isResending || !email}
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </Button>
          </form>

          <p className="text-center text-sm text-ink-3">
            <Link href="/login" className="text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
