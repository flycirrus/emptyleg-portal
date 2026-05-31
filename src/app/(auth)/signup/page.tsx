"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <h1 className="text-3xl font-bold tracking-tight text-gold">HYPE</h1>
            <p className="text-sm tracking-widest uppercase text-muted mt-1">
              Private Jets
            </p>
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Account Created</h2>
          <p className="text-muted text-sm leading-relaxed">
            Please wait for admin approval. You will be notified once your
            account has been activated.
          </p>
          <Link
            href="/login"
            className="btn-gold inline-block rounded-lg px-8 py-3 text-sm mt-2"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <h1 className="text-3xl font-bold tracking-tight text-gold">HYPE</h1>
          <p className="text-sm tracking-widest uppercase text-muted mt-1">
            Private Jets
          </p>
        </Link>
        <p className="text-muted pt-4">Create your account</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-surface p-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="input-dark w-full rounded-lg px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input-dark w-full rounded-lg px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="input-dark w-full rounded-lg px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-foreground"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={8}
              className="input-dark w-full rounded-lg px-4 py-3 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full rounded-lg py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-gold hover:text-gold-light">
          Login
        </Link>
      </p>
    </div>
  );
}
