import Link from "next/link";
import { Plane } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/flights");
  }

  return (
    <div className="space-y-8">
      <div className="text-center flex flex-col items-center space-y-2">
        <Link href="/" className="flex items-center justify-center gap-2.5 transition-transform hover:scale-105">
          <Plane className="h-8 w-8 text-gold" />
          <span className="text-2xl sm:text-3xl font-bold tracking-wide flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-none text-left">
            <span className="text-gold">HYPE</span>
            <span className="text-[0.7rem] sm:text-2xl sm:mt-1 text-white uppercase tracking-widest sm:tracking-wide">Private Jets</span>
          </span>
        </Link>
        <p className="text-muted pt-4">Login to your account</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8 space-y-6">
        {/* Email/Password Login */}
        <LoginForm />
      </div>

      {/* Self-registration is closed. Accounts are created by an admin only. */}
      <p className="text-center text-sm text-muted">
        Access is by invitation only. Contact us at{" "}
        <a
          href="mailto:fly@hypejets.com"
          className="text-gold hover:text-gold-light"
        >
          fly@hypejets.com
        </a>
        .
      </p>
    </div>
  );
}
