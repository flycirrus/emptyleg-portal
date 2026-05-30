'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plane,
  Eye,
  MessageSquare,
  Users,
  Clock,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface Stats {
  totalFlights: number;
  activeFlights: number;
  newInquiries: number;
  totalUsers: number;
  pendingUsers: number;
}

interface RecentInquiry {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  createdAt: string;
  flight: {
    depCity: string;
    arrCity: string;
    depAirportIata: string;
    arrAirportIata: string;
    depDatetimeUtc: string;
  };
}

interface SyncLog {
  id: string;
  status: string;
  flightsSynced: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [inquiries, setInquiries] = useState<RecentInquiry[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [flightsRes, inquiriesRes, usersRes, syncRes] = await Promise.all([
        fetch('/api/admin/flights'),
        fetch('/api/admin/inquiries'),
        fetch('/api/admin/users'),
        fetch('/api/admin/sync'),
      ]);

      if (!flightsRes.ok || !inquiriesRes.ok || !usersRes.ok || !syncRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const [flightsData, inquiriesData, usersData, syncData] =
        await Promise.all([
          flightsRes.json(),
          inquiriesRes.json(),
          usersRes.json(),
          syncRes.json(),
        ]);

      const flights = flightsData.flights || [];
      const allInquiries = inquiriesData.inquiries || [];
      const users = usersData.users || [];
      const logs = syncData.logs || [];

      const now = new Date();
      setStats({
        totalFlights: flights.length,
        activeFlights: flights.filter(
          (f: { isVisible: boolean; depDatetimeUtc: string }) =>
            f.isVisible && new Date(f.depDatetimeUtc) > now
        ).length,
        newInquiries: allInquiries.filter(
          (i: { status: string }) => i.status === 'NEW'
        ).length,
        totalUsers: users.length,
        pendingUsers: users.filter(
          (u: { role: string }) => u.role === 'PENDING'
        ).length,
      });

      setInquiries(allInquiries.slice(0, 5));
      setLastSync(logs[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      await fetchData();
    } catch {
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="btn-gold rounded-lg px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Flights',
      value: stats?.totalFlights ?? 0,
      icon: Plane,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Active Flights',
      value: stats?.activeFlights ?? 0,
      icon: Eye,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      label: 'New Inquiries',
      value: stats?.newInquiries ?? 0,
      icon: MessageSquare,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
    },
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Pending Users',
      value: stats?.pendingUsers ?? 0,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
  ];

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NEW: 'bg-red-500/20 text-red-400',
      READ: 'bg-yellow-500/20 text-yellow-400',
      REPLIED: 'bg-blue-500/20 text-blue-400',
      CLOSED: 'bg-green-500/20 text-green-400',
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-500/20 text-gray-400'}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-muted">
          Overview of your Empty Leg portal
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{card.label}</span>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent inquiries */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-white">Recent Inquiries</h3>
            <Link
              href="/admin/inquiries"
              className="flex items-center gap-1 text-sm text-gold hover:text-gold-light"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {inquiries.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                No inquiries yet
              </div>
            ) : (
              inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {inq.customerName}
                    </p>
                    <p className="text-xs text-muted">
                      {inq.flight.depAirportIata} &rarr;{' '}
                      {inq.flight.arrAirportIata} &middot;{' '}
                      {formatDate(inq.createdAt)}
                    </p>
                  </div>
                  {statusBadge(inq.status)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sync status + quick actions */}
        <div className="space-y-6">
          {/* Last sync */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-4 font-semibold text-white">Last Sync</h3>
            {lastSync ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {lastSync.status === 'SUCCESS' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : lastSync.status === 'RUNNING' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      lastSync.status === 'SUCCESS'
                        ? 'text-green-400'
                        : lastSync.status === 'RUNNING'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {lastSync.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted">Started</span>
                    <p className="text-white">
                      {formatDate(lastSync.startedAt)}{' '}
                      {formatTime(lastSync.startedAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Flights Synced</span>
                    <p className="text-white">{lastSync.flightsSynced}</p>
                  </div>
                </div>
                {lastSync.errorMessage && (
                  <p className="text-xs text-red-400">
                    {lastSync.errorMessage}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">No sync history available</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-4 font-semibold text-white">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-gold inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <Link
                href="/admin/inquiries"
                className="btn-gold-outline inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                View Inquiries
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
