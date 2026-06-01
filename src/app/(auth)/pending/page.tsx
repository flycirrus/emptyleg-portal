"use client";

import { signOut } from "next-auth/react";

export default function PendingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gold">HYPE</h1>
        <p className="text-sm tracking-widest uppercase text-muted">
          Private Jets
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-6">
        {/* Clock icon */}
        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
          <svg
            className="w-10 h-10 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Awaiting Approval</h2>
          <p className="text-muted text-sm leading-relaxed max-w-sm mx-auto">
            Your account is pending admin approval. You will receive a
            notification once your account has been activated.
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-gold-outline rounded-lg px-8 py-3 text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
