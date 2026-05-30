'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface SyncLog {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  flightsSynced: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  FAILED: <XCircle className="h-4 w-4 text-red-400" />,
  RUNNING: <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />,
};

const STATUS_TEXT_STYLE: Record<string, string> = {
  SUCCESS: 'text-green-400',
  FAILED: 'text-red-400',
  RUNNING: 'text-yellow-400',
};

export default function SettingsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/sync');
      if (!res.ok) throw new Error('Failed to load sync logs');
      const data = await res.json();
      setLogs((data.logs || []).slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
      await fetchLogs();
    } catch {
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const lastSync = logs[0] || null;

  const getDuration = (log: SyncLog): string => {
    if (!log.completedAt) return '-';
    const start = new Date(log.startedAt).getTime();
    const end = new Date(log.completedAt).getTime();
    const diff = Math.round((end - start) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-muted">
          Sync configuration and system logs
        </p>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {syncSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Sync completed successfully
        </div>
      )}

      {/* Sync status card */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-6">
          <Database className="h-5 w-5 text-gold" />
          <h3 className="font-semibold text-white">Flight Sync</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Last sync status */}
          <div className="rounded-lg border border-border bg-background p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Last Sync Status
            </span>
            {lastSync ? (
              <div className="mt-2 flex items-center gap-2">
                {STATUS_ICON[lastSync.status]}
                <span
                  className={`text-sm font-medium ${STATUS_TEXT_STYLE[lastSync.status]}`}
                >
                  {lastSync.status}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No sync history</p>
            )}
          </div>

          {/* Last sync time */}
          <div className="rounded-lg border border-border bg-background p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Last Sync Time
            </span>
            {lastSync ? (
              <p className="mt-2 text-sm text-white">
                {formatDate(lastSync.startedAt)}{' '}
                {formatTime(lastSync.startedAt)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">-</p>
            )}
          </div>

          {/* Flights synced */}
          <div className="rounded-lg border border-border bg-background p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Flights Synced (Last)
            </span>
            <p className="mt-2 text-sm text-white">
              {lastSync ? lastSync.flightsSynced : '-'}
            </p>
          </div>
        </div>

        {lastSync?.errorMessage && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {lastSync.errorMessage}
          </div>
        )}

        {/* Sync button */}
        <div className="mt-6">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-gold inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
            />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <p className="mt-2 text-xs text-muted">
            Manually trigger a flight sync from Leon API
          </p>
        </div>
      </div>

      {/* Sync history */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Clock className="h-4 w-4 text-gold" />
          <h3 className="font-semibold text-white">Sync History</h3>
          <span className="ml-auto text-xs text-muted">Last 10 entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Flights
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-muted"
                  >
                    No sync logs available
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-surface-light"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {STATUS_ICON[log.status]}
                        <span
                          className={`text-xs font-medium ${STATUS_TEXT_STYLE[log.status]}`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">
                        {formatDate(log.startedAt)}
                      </div>
                      <div className="text-xs text-muted">
                        {formatTime(log.startedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {getDuration(log)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {log.flightsSynced}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400">
                      {log.errorMessage ? (
                        <span className="line-clamp-1" title={log.errorMessage}>
                          {log.errorMessage}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
