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
  Search,
  Trash2,
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

interface LeonFlight {
  flightNid: string | number;
  flightNo: string;
  startTimeUTC: string;
  route: string;
  from: string;
  to: string;
  status?: string | null;
  isCnl?: boolean | null;
  isActive?: boolean | null;
  isConfirmed?: boolean | null;
  [key: string]: unknown;
}

interface DbFlight {
  id: string;
  leonFlightId: string;
  flightNo: string;
  depDatetimeUtc: string;
  depAirportIata: string;
  arrAirportIata: string;
  depCity: string;
  arrCity: string;
  isVisible: boolean;
  syncedAt: string;
  presentInLeon: boolean;
}

interface DebugResult {
  leonFlightCount: number;
  dbFlightCount: number;
  missingFromLeonCount: number;
  schemaFields: string[];
  queryErrors: string[];
  leonFlightsRaw: Record<string, unknown>[];
  leonFlights: LeonFlight[];
  dbFlights: DbFlight[];
  missingFromLeon: DbFlight[];
  // Target flight 70435186
  targetFlightId: string;
  specificFlight: Record<string, unknown> | null;
  specificFlightError: string | null;
  specificFlightRawResponse: unknown;
  targetInEmptyLegList: Record<string, unknown> | null;
  targetFoundInEmptyLegList: boolean;
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
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ purged: number; removedFlights: { route: string }[] } | null>(null);

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

  const handleDebug = async () => {
    setDebugLoading(true);
    setDebugError(null);
    setDebugResult(null);
    try {
      const res = await fetch('/api/admin/leon-debug');
      if (!res.ok) throw new Error('Failed to fetch Leon debug info');
      const data = await res.json();
      setDebugResult(data);
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleHideFlight = async (flightId: string) => {
    setHidingId(flightId);
    try {
      const res = await fetch('/api/admin/flights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId, isVisible: false }),
      });
      if (!res.ok) throw new Error('Failed to hide flight');
      await handleDebug();
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setHidingId(null);
    }
  };

  const handleForcePurge = async () => {
    setPurging(true);
    setPurgeResult(null);
    setDebugError(null);
    try {
      const res = await fetch('/api/admin/leon-debug', { method: 'POST' });
      if (!res.ok) throw new Error('Purge failed');
      const data = await res.json();
      setPurgeResult(data);
      // Refresh the debug view
      await handleDebug();
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPurging(false);
    }
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

      {/* Leon Diagnose */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-gold" />
          <h3 className="font-semibold text-white">Leon API Diagnose</h3>
          <span className="ml-auto text-xs text-muted">Vergleich: Leon vs. Datenbank</span>
        </div>

        <p className="text-sm text-muted mb-4">
          Zeigt welche Flüge Leon aktuell zurückgibt und welche in der Datenbank
          noch existieren aber bei Leon fehlen.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDebug}
            disabled={debugLoading || purging}
            className="btn-gold inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm disabled:opacity-50"
          >
            <Search className={`h-4 w-4 ${debugLoading ? 'animate-pulse' : ''}`} />
            {debugLoading ? 'Prüfe Leon...' : 'Leon jetzt prüfen'}
          </button>

          <button
            onClick={handleForcePurge}
            disabled={purging || debugLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            <Trash2 className={`h-4 w-4 ${purging ? 'animate-spin' : ''}`} />
            {purging ? 'Bereinige...' : 'Veraltete Flüge jetzt löschen'}
          </button>
        </div>

        {debugError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {debugError}
          </div>
        )}

        {purgeResult && (
          <div className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            purgeResult.purged > 0
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-border bg-surface text-muted'
          }`}>
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              {purgeResult.purged > 0
                ? <><strong>{purgeResult.purged} veraltete(r) Flug/Flüge</strong> wurden entfernt: {purgeResult.removedFlights.map(f => f.route).join(', ')}</>
                : 'Kein veralteter Flug gefunden — alles ist aktuell.'}
            </div>
          </div>
        )}

        {debugResult && (
          <div className="mt-4 space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="text-xs text-muted uppercase tracking-wider">Leon gibt zurück</div>
                <div className="text-2xl font-bold text-white mt-1">{debugResult.leonFlightCount}</div>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="text-xs text-muted uppercase tracking-wider">In Datenbank (Zukunft)</div>
                <div className="text-2xl font-bold text-white mt-1">{debugResult.dbFlightCount}</div>
              </div>
              <div className={`rounded-lg border px-4 py-3 ${
                debugResult.missingFromLeon.length > 0
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-green-500/40 bg-green-500/10'
              }`}>
                <div className="text-xs text-muted uppercase tracking-wider">Fehlen bei Leon</div>
                <div className={`text-2xl font-bold mt-1 ${
                  debugResult.missingFromLeon.length > 0 ? 'text-red-400' : 'text-green-400'
                }`}>{debugResult.missingFromLeon.length}</div>
              </div>
            </div>

            {/* Missing flights (stale) */}
            {debugResult.missingFromLeon.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-400 mb-2">
                  ⚠️ Diese Flüge sind in der DB, fehlen aber bei Leon (veraltet):
                </h4>
                <div className="space-y-2">
                  {debugResult.missingFromLeon.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {f.depAirportIata} → {f.arrAirportIata}
                          <span className="ml-2 text-muted font-normal">{f.depCity} → {f.arrCity}</span>
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {new Date(f.depDatetimeUtc).toLocaleString('de-DE', { timeZone: 'UTC' })} UTC
                          {' · '} Leon ID: {f.leonFlightId}
                          {' · '} Sichtbar: {f.isVisible ? '✅ Ja' : '❌ Nein'}
                        </div>
                      </div>
                      {f.isVisible && (
                        <button
                          onClick={() => handleHideFlight(f.id)}
                          disabled={hidingId === f.id}
                          className="ml-4 inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                        >
                          {hidingId === f.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />}
                          Verstecken
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugResult.missingFromLeon.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Alle Datenbankflüge sind auch bei Leon vorhanden. Kein veralteter Flug gefunden.
              </div>
            )}

            {/* ── Spotlight: Flug 70435186 (BROKLAO→MADRID) ─────────────────── */}
            <div className={`rounded-lg border p-4 ${
              debugResult.specificFlight || debugResult.targetFoundInEmptyLegList
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-red-500/40 bg-red-500/5'
            }`}>
              <h4 className="text-sm font-semibold text-amber-400 mb-3">
                🎯 Spotlight: Flug ID {debugResult.targetFlightId} (BROKLAO→MADRID)
              </h4>

              <div className="flex flex-wrap gap-3 mb-3 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${
                  debugResult.targetFoundInEmptyLegList
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  emptyLegList: {debugResult.targetFoundInEmptyLegList ? '✓ gefunden' : '✗ NICHT gefunden'}
                </span>
                <span className={`rounded-full px-2.5 py-1 font-medium ${
                  debugResult.specificFlight
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  leg(nid) Query: {debugResult.specificFlight ? '✓ gefunden' : '✗ NICHT gefunden / Fehler'}
                </span>
              </div>

              {debugResult.specificFlightError && (
                <p className="text-xs text-red-400 mb-2">⚠ leg query error: {debugResult.specificFlightError}</p>
              )}

              {/* Raw data from direct leg query */}
              {debugResult.specificFlight && (
                <details open>
                  <summary className="cursor-pointer text-xs text-amber-400/80 hover:text-amber-400 mb-2">
                    Vollständige Rohdaten (leg query) — alle Felder
                  </summary>
                  <pre className="text-xs text-muted bg-background rounded p-3 overflow-x-auto max-h-96">
                    {JSON.stringify(debugResult.specificFlight, null, 2)}
                  </pre>
                </details>
              )}

              {/* Raw data from emptyLegList if found there */}
              {debugResult.targetInEmptyLegList && (
                <details open>
                  <summary className="cursor-pointer text-xs text-amber-400/80 hover:text-amber-400 mb-2 mt-2">
                    Rohdaten aus emptyLegList
                  </summary>
                  <pre className="text-xs text-muted bg-background rounded p-3 overflow-x-auto max-h-64">
                    {JSON.stringify(debugResult.targetInEmptyLegList, null, 2)}
                  </pre>
                </details>
              )}

              {/* Raw API response for leg query (always show for debugging) */}
              <details>
                <summary className="cursor-pointer text-xs text-muted hover:text-white mt-2">
                  Rohe API-Antwort der leg() Abfrage
                </summary>
                <pre className="text-xs text-muted bg-background rounded p-3 overflow-x-auto max-h-48 mt-2">
                  {JSON.stringify(debugResult.specificFlightRawResponse, null, 2)}
                </pre>
              </details>
            </div>

            {/* Schema fields from introspection */}
            {debugResult.schemaFields.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted hover:text-white transition-colors">
                  Leon EmptyLeg Schema — alle {debugResult.schemaFields.length} verfügbaren Felder
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {debugResult.schemaFields.map((field) => (
                    <span key={field} className="rounded bg-surface-light px-2 py-0.5 text-xs font-mono text-gold">
                      {field}
                    </span>
                  ))}
                </div>
              </details>
            )}

            {/* Query errors (if full field list caused errors) */}
            {debugResult.queryErrors?.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-400 hover:text-red-300">
                  ⚠ {debugResult.queryErrors.length} Felder nicht verfügbar (GraphQL-Fehler)
                </summary>
                <div className="mt-2 space-y-1">
                  {debugResult.queryErrors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400/70 font-mono">{e}</p>
                  ))}
                </div>
              </details>
            )}

            {/* What Leon currently returns */}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted hover:text-white transition-colors">
                Alle {debugResult.leonFlightCount} Flüge von Leon anzeigen
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[600px] text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left text-muted">Route</th>
                      <th className="px-3 py-2 text-left text-muted">Datum (UTC)</th>
                      <th className="px-3 py-2 text-left text-muted">Leon ID</th>
                      <th className="px-3 py-2 text-left text-muted">isCnl</th>
                      <th className="px-3 py-2 text-left text-muted">isActive</th>
                      <th className="px-3 py-2 text-left text-muted">status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {debugResult.leonFlights.map((f) => (
                      <tr
                        key={String(f.flightNid)}
                        className={`${
                          String(f.flightNid) === debugResult.targetFlightId
                            ? 'bg-amber-500/10'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2 text-white">
                          {f.route} <span className="text-muted">({f.from} → {f.to})</span>
                          {String(f.flightNid) === debugResult.targetFlightId && (
                            <span className="ml-2 text-amber-400 font-bold">← 70435186</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted">{new Date(String(f.startTimeUTC)).toLocaleString('de-DE', { timeZone: 'UTC' })}</td>
                        <td className="px-3 py-2 text-muted font-mono">{String(f.flightNid)}</td>
                        <td className={`px-3 py-2 font-mono ${
                          f.isCnl === true ? 'text-red-400' : f.isCnl === false ? 'text-green-400' : 'text-muted'
                        }`}>{f.isCnl === null || f.isCnl === undefined ? '—' : String(f.isCnl)}</td>
                        <td className={`px-3 py-2 font-mono ${
                          f.isActive === false ? 'text-red-400' : f.isActive === true ? 'text-green-400' : 'text-muted'
                        }`}>{f.isActive === null || f.isActive === undefined ? '—' : String(f.isActive)}</td>
                        <td className="px-3 py-2 text-muted font-mono">{f.status !== null && f.status !== undefined ? String(f.status) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}

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
