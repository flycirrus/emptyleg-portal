import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/flights");
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-border/30">
        <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
          <img src="/logo.png" alt="HYPE Private Jets" className="h-12 w-auto object-contain" />
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-8">
          <p className="text-sm font-medium tracking-[0.3em] uppercase text-gold">
            HYPE Private Jets
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Exclusive
            <br />
            <span className="text-gold">Empty Leg</span> Flights
          </h1>
          <p className="max-w-xl mx-auto text-lg text-muted leading-relaxed">
            Experience the ultimate in luxury aviation. Access premium private
            jet travel worldwide at a fraction of the cost.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link
              href="/login"
              className="btn-gold px-12 py-4 rounded-lg text-lg w-full sm:min-w-[240px] font-semibold tracking-wide"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-24 max-w-4xl w-full">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <h3 className="font-semibold">Save Up to 75%</h3>
            <p className="text-sm text-muted">
              Empty leg flights offer massive savings on private aviation
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>
            <h3 className="font-semibold">Verified Operators</h3>
            <p className="text-sm text-muted">
              Every flight operator is vetted by HYPE Private Jets
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-gold"
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
            <h3 className="font-semibold">Real-Time Updates</h3>
            <p className="text-sm text-muted">
              New empty legs added daily with instant notifications
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted border-t border-border/30">
        <p>&copy; {new Date().getFullYear()} HYPE Private Jets. All rights reserved.</p>
      </footer>
    </div>
  );
}
