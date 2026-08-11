"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpAction } from "@/app/actions";
import { Button } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);

      const result = await signUpAction(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSignUpSuccess(true);
        // Show success message for 3 seconds then redirect
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (signUpSuccess) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-12">
        <div className="space-y-2">
          <div className="text-4xl">✓</div>
          <h1 className="text-2xl font-bold">Account created!</h1>
          <p className="mt-2 text-sm text-ink-3">
            Check your email for a verification link. It expires in 24 hours.
          </p>
        </div>

        <div className="rounded bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p className="font-medium">What's next?</p>
          <p className="mt-2">
            1. Check your inbox (and spam folder) for an email from Travel Intelligence Hub
          </p>
          <p className="mt-2">
            2. Click the verification link in the email
          </p>
          <p className="mt-2">
            3. Sign in and start planning your trips
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-ink-3">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <div>
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="mt-2 text-sm text-ink-3">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
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
          <p className="mt-1 text-xs text-ink-4">Must be at least 8 characters</p>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink-2">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="rounded bg-sunken px-4 py-3 text-sm text-ink-3">
        <p>Passwords are hashed and stored securely. Only you can access your trips.</p>
      </div>
    </div>
  );
}
