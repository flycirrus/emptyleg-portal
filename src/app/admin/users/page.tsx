'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Shield,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

type UserRole = 'PENDING' | 'BASIC' | 'BROKER' | 'MANAGER' | 'ADMIN';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  image: string | null;
  createdAt: string;
}

interface CleanupSample {
  email: string;
  name: string | null;
  role: string;
}

const PAGE_SIZE = 50;

const ROLE_OPTIONS: UserRole[] = ['PENDING', 'BASIC', 'BROKER', 'MANAGER', 'ADMIN'];

// Display labels. The BASIC role is used as the "ID Traveller" tier
// (sees flights, but prices only "on request") — see src/lib/utils.ts.
const ROLE_LABELS: Record<UserRole, string> = {
  PENDING: 'PENDING',
  BASIC: 'ID Traveller',
  BROKER: 'BROKER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
};

const ROLE_STYLES: Record<UserRole, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  BASIC: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BROKER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MANAGER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ADMIN: 'bg-gold/20 text-gold border-gold/30',
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- Bulk cleanup by name/email -----------------------------------------
  const [cleanupTerm, setCleanupTerm] = useState('pj-assessment');
  const [cleanupPreview, setCleanupPreview] = useState<{
    count: number;
    sample: CleanupSample[];
  } | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanupDone, setCleanupDone] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (appliedSearch) qs.set('search', appliedSearch);
      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPendingTotal(data.pendingUsers || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch]);

  // Debounce the search box -> applied search (and reset to page 1).
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setAppliedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (userId: string, role: UserRole) => {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch {
      setError('Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setConfirmDeleteId(null);
      await fetchUsers();
    } catch {
      setError('Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  // --- Bulk cleanup actions ------------------------------------------------
  const previewCleanup = async () => {
    const term = cleanupTerm.trim();
    setCleanupError(null);
    setCleanupDone(null);
    setCleanupPreview(null);
    if (term.length < 3) {
      setCleanupError('Bitte mindestens 3 Zeichen eingeben.');
      return;
    }
    setCleanupBusy(true);
    try {
      const res = await fetch(
        `/api/admin/users/cleanup?term=${encodeURIComponent(term)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Suche fehlgeschlagen');
      setCleanupPreview({ count: data.count, sample: data.sample || [] });
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setCleanupBusy(false);
    }
  };

  const runCleanup = async () => {
    const term = cleanupTerm.trim();
    setCleanupError(null);
    setCleanupBusy(true);
    try {
      const res = await fetch('/api/admin/users/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Löschen fehlgeschlagen');
      setCleanupDone(data.deleted ?? 0);
      setCleanupPreview(null);
      await fetchUsers();
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setCleanupBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-sm text-muted">Manage user accounts and roles</p>
      </div>

      {/* Bulk cleanup by name/email */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="mb-1 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-semibold text-white">
            Bulk-Löschen nach Name / E-Mail
          </h3>
        </div>
        <p className="mb-4 text-xs text-muted">
          Löscht alle passenden Accounts auf einmal, ohne die ganze Liste zu
          laden. Admins, Manager und dein eigener Account werden nie gelöscht.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={cleanupTerm}
            onChange={(e) => setCleanupTerm(e.target.value)}
            placeholder="z. B. pj-assessment"
            className="input-dark w-full max-w-xs rounded-lg px-4 py-2.5 text-sm"
          />
          <button
            onClick={previewCleanup}
            disabled={cleanupBusy}
            className="btn-gold-outline inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {cleanupBusy && cleanupPreview === null ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Suchen
          </button>

          {cleanupPreview && cleanupPreview.count > 0 && (
            <button
              onClick={runCleanup}
              disabled={cleanupBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {cleanupBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {cleanupPreview.count} Account
              {cleanupPreview.count !== 1 ? 's' : ''} löschen
            </button>
          )}
        </div>

        {cleanupError && (
          <p className="mt-3 text-xs text-red-400">{cleanupError}</p>
        )}

        {cleanupDone !== null && (
          <p className="mt-3 text-xs text-green-400">
            ✅ {cleanupDone} Account{cleanupDone !== 1 ? 's' : ''} gelöscht.
          </p>
        )}

        {cleanupPreview && (
          <div className="mt-3 text-xs text-muted">
            {cleanupPreview.count === 0 ? (
              <span>Keine passenden Accounts gefunden.</span>
            ) : (
              <>
                <span className="text-yellow-400">
                  {cleanupPreview.count} Treffer
                </span>{' '}
                — Beispiele:
                <ul className="mt-1 space-y-0.5">
                  {cleanupPreview.sample.map((s, i) => (
                    <li key={i}>
                      {s.email}
                      {s.name ? ` (${s.name})` : ''} · {s.role}
                    </li>
                  ))}
                  {cleanupPreview.count > cleanupPreview.sample.length && (
                    <li>
                      … und{' '}
                      {cleanupPreview.count - cleanupPreview.sample.length}{' '}
                      weitere
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pending alert */}
      {pendingTotal > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <UserCheck className="h-5 w-5 text-yellow-400" />
          <p className="text-sm text-yellow-400">
            <span className="font-semibold">{pendingTotal}</span> user
            {pendingTotal !== 1 ? 's' : ''} awaiting approval
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted">
          {total} user{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Registered
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                    <button
                      onClick={fetchUsers}
                      className="btn-gold rounded-lg px-4 py-2 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`transition-colors hover:bg-surface-light ${
                    user.role === 'PENDING' ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-light">
                          <span className="text-xs font-medium text-muted">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-white">
                        {user.name || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateRole(user.id, e.target.value as UserRole)
                      }
                      disabled={updatingId === user.id}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${ROLE_STYLES[user.role]} bg-transparent cursor-pointer`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option
                          key={r}
                          value={r}
                          className="bg-surface text-foreground"
                        >
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    {updatingId === user.id && (
                      <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-gold" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {confirmDeleteId === user.id ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs text-red-400">Delete?</span>
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={deletingId === user.id}
                          className="rounded px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Yes'
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-light"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(user.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-400/10 hover:text-red-400"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-light hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-light hover:text-white disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-gold" />
          <h4 className="text-sm font-semibold text-white">Role Permissions</h4>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-yellow-500/20 px-2 py-0.5 text-yellow-400">
              PENDING
            </span>
            <span className="text-muted">No access until approved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-teal-500/20 px-2 py-0.5 text-teal-400">
              ID Traveller
            </span>
            <span className="text-muted">View flights · price on request</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-blue-400">
              BROKER
            </span>
            <span className="text-muted">View flights + prices</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-400">
              MANAGER
            </span>
            <span className="text-muted">Admin panel (read/write)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-gold/20 px-2 py-0.5 text-gold">
              ADMIN
            </span>
            <span className="text-muted">Full access including config</span>
          </div>
        </div>
      </div>
    </div>
  );
}
