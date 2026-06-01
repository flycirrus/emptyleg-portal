import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/flights");
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <h1 className="text-3xl font-bold tracking-tight text-gold">HYPE</h1>
          <p className="text-sm tracking-widest uppercase text-muted mt-1">Private Jets</p>
        </Link>
        <p className="text-muted pt-4">Login to your account</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8 space-y-6">
        {/* Email/Password Login */}
        <LoginForm />
      </div>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gold hover:text-gold-light">Sign Up</Link>
      </p>
    </div>
  );
}
