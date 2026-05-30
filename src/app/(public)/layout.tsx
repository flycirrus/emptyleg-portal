"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Plane, LogOut, User, Menu, X } from "lucide-react";
import { useState } from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/flights" className="flex items-center gap-2.5">
            <Plane className="h-6 w-6 text-[#c9a96e]" />
            <span className="text-xl font-bold tracking-wide">
              <span className="text-[#c9a96e]">HYPE</span>{" "}
              <span className="hidden text-white sm:inline">Private Jets</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/flights"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-[#c9a96e]"
            >
              Flights
            </Link>

            {session?.user && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1.5">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">
                    {session.user.name || session.user.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-800 bg-[#0a0a0a] px-4 pb-4 pt-2 md:hidden">
            <Link
              href="/flights"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-[#c9a96e]"
            >
              Flights
            </Link>
            {session?.user && (
              <>
                <div className="my-2 border-t border-gray-800" />
                <div className="flex items-center gap-2 px-3 py-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">
                    {session.user.name || session.user.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#111827]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-[#c9a96e]" />
              <span className="text-sm font-semibold tracking-wide text-gray-300">
                HYPE Private Jets
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center sm:items-end">
              <p className="text-xs text-gray-500">
                info@hypejets.com &middot; +49 30 1234567
              </p>
              <p className="text-xs text-gray-500">
                &copy; 2024 HYPE Private Jets GmbH. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
