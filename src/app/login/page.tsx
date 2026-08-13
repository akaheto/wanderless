"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInAction, resendVerificationAction } from "@/app/actions";
import { Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/trips";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);

      const result = await signInAction(formData);
      if ("error" in result) {
        setError(result.error);
        setRequiresVerification(result.requiresVerification || false);
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsResending(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("email", email);
      const result = await resendVerificationAction(formData);

      if ("error" in result) {
        setError(result.error);
      } else {
        alert("Verification email sent! Check your inbox.");
      }
    } catch (err) {
      setError("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-ink-3">
          Don't have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>

      {redirectTo !== "/trips" && (
        <div className="rounded bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Sign in to access that page.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{error}</p>
            {requiresVerification && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="mt-2 text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-ink-2">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-1 w-full rounded border border-line bg-surface-1 px-3 py-2 text-sm text-ink-2"
            disabled={isLoading}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink-2">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1 w-full rounded border border-line bg-surface-1 px-3 py-2 text-sm text-ink-2"
            disabled={isLoading}
          />
        </label>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="rounded bg-sunken px-4 py-3 text-sm text-ink-3">
        <p className="font-medium text-ink-2">Demo credentials</p>
        <p className="mt-1">Use any email and password (8+ characters) to create an account.</p>
      </div>
    </div>
  );
}
