'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bug,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  EyeOff,
  WifiOff,
  ShieldAlert,
  Database,
  Plane,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface OrphanFlight {
  id: string;
  leonFlightId: string;
  flightNo: string;
  depDatetimeUtc: string;
  depAirportIata: string;
  depCity: string;
  arrAirportIata: string;
  arrCity: string;
  aircraftType: string;
  isVisible: boolean;
  syncedAt: string | null;
  _count: { inquiries: number };
}

interface DebugData {
  totalInDb: number;
  totalInLeon: number;
  orphanCount: number;
  orphans: OrphanFlight[];
  leonError: string | null;
}

export default function DebugPage() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/debug/orphan-flights');
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load debug data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removeOrphan = async (flight: OrphanFlight) => {
    setRemovingId(flight.id);
    try {
      const res = await fetch('/api/admin/debug/orphan-flights', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId: flight.id }),
      });
      if (!res.ok) throw new Error('Failed to remove flight');
      const result = await res.json();
      flash(
        result.action === 'deleted'
          ? `✓ Flight ${flight.flightNo} deleted.`
          : `✓ Flight ${flight.flightNo} hidden (has inquiries).`
      );
      await fetchData();
    } catch {
      setError(`Failed to remove flight ${flight.flightNo}`);
    } finally {
      setRemovingId(null);
    }
  };

  const bulkRemove = async () => {
    if (!confirm(`Remove all ${data?.orphanCount} orphan flights? Flights with inquiries will only be hidden.`)) return;
    setBulkRemoving(true);
    try {
      const res = await fetch('/api/admin/debug/orphan-flights', { method: 'POST' });
      if (!res.ok) throw new Error('Bulk remove failed');
      const result = await res.json();
      flash(`✓ Done — ${result.deleted} deleted, ${result.hidden} hidden.`);
      await fetchData();
    } catch {
      setError('Bulk remove failed. Please try again.');
    } finally {
      setBulkRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bug className="h-5 w-5 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Flight Debug</h1>
          </div>
          <p className="text-sm text-muted">
            Orphan flights — in database but no longer returned by Leon
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-muted transition-colors hover:border-gold/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Leon error warning */}
      {data?.leonError && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Could not reach Leon API</p>
            <p className="mt-0.5 text-xs text-amber-400/70">{data.leonError}</p>
          </div>
        </div>
      )}

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : data ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-muted" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted">In Database</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.totalInDb}</p>
              <p className="text-xs text-muted mt-0.5">future flights</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="h-4 w-4 text-muted" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted">In Leon</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.leonError ? <span className="text-amber-400">—</span> : data.totalInLeon}
              </p>
              <p className="text-xs text-muted mt-0.5">empty legs returned</p>
            </div>
            <div className={`rounded-xl border p-4 ${data.orphanCount > 0 ? 'border-red-500/40 bg-red-500/10' : 'border-border bg-surface'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className={`h-4 w-4 ${data.orphanCount > 0 ? 'text-red-400' : 'text-muted'}`} />
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Orphans</span>
              </div>
              <p className={`text-2xl font-bold ${data.orphanCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {data.orphanCount}
              </p>
              <p className="text-xs text-muted mt-0.5">not in Leon</p>
            </div>
          </div>

          {/* Orphan table */}
          {data.orphanCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16 gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <p className="text-white font-medium">No orphan flights found</p>
              <p className="text-sm text-muted">All database flights match Leon&apos;s current empty-leg list.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-red-500/20 bg-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  <h3 className="font-semibold text-white">
                    Orphan Flights
                    <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                      {data.orphanCount}
                    </span>
                  </h3>
                </div>
                {data.orphanCount > 1 && (
                  <button
                    onClick={bulkRemove}
                    disabled={bulkRemoving || !!data.leonError}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {bulkRemoving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Remove All
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Leon ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Flight</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Route</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Departure</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Last Synced</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Inq.</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Visible</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.orphans.map((flight) => (
                      <tr key={flight.id} className="hover:bg-surface-light transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-amber-400">{flight.leonFlightId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-white">{flight.flightNo}</span>
                          <div className="text-xs text-muted">{flight.aircraftType}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-white">
                            <span className="font-medium">{flight.depAirportIata}</span>
                            <span className="mx-1 text-gold">→</span>
                            <span className="font-medium">{flight.arrAirportIata}</span>
                          </div>
                          <div className="text-xs text-muted">{flight.depCity} → {flight.arrCity}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-white">{formatDate(flight.depDatetimeUtc)}</div>
                          <div className="text-xs text-muted">{formatTime(flight.depDatetimeUtc)} UTC</div>
                        </td>
                        <td className="px-4 py-3">
                          {flight.syncedAt ? (
                            <>
                              <div className="text-sm text-white">{formatDate(flight.syncedAt)}</div>
                              <div className="text-xs text-muted">{formatTime(flight.syncedAt)} UTC</div>
                            </>
                          ) : (
                            <span className="text-xs text-muted">Never</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            flight._count.inquiries > 0 ? 'bg-gold/20 text-gold' : 'bg-surface-light text-muted'
                          }`}>
                            {flight._count.inquiries}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {flight.isVisible ? (
                            <span className="text-xs text-green-400">Yes</span>
                          ) : (
                            <span className="text-xs text-red-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeOrphan(flight)}
                            disabled={removingId === flight.id}
                            title={flight._count.inquiries > 0 ? 'Has inquiries — will be hidden' : 'Delete flight'}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {removingId === flight.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : flight._count.inquiries > 0 ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            {flight._count.inquiries > 0 ? 'Hide' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border px-5 py-3 text-xs text-muted">
                💡 Flights with inquiries will be <strong className="text-white">hidden</strong> (not deleted). Flights without inquiries will be <strong className="text-white">permanently deleted</strong>.
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
