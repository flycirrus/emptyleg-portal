'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plane,
  MessageSquare,
  DollarSign,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import SignOutButton from '@/components/SignOutButton';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Flights', href: '/admin/flights', icon: Plane },
  { label: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare },
  { label: 'Pricing', href: '/admin/pricing', icon: DollarSign },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-gold" />
            <span className="text-lg font-bold text-white">
              HYPE <span className="text-gold">Admin</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gold/10 text-gold'
                    : 'text-muted hover:bg-surface-light hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-gold' : ''}`} />
                {item.label}
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-4">
          <Link
            href="/flights"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-light hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Portal
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-light hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-muted">
              HYPE Private Jets Administration
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-gold">A</span>
              </div>
              <span className="text-sm text-muted">Admin</span>
            </div>
            <SignOutButton className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-light hover:text-white">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </SignOutButton>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
