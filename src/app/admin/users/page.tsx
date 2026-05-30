'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Shield,
  UserCheck,
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

const ROLE_OPTIONS: UserRole[] = ['PENDING', 'BASIC', 'BROKER', 'MANAGER', 'ADMIN'];

const ROLE_STYLES: Record<UserRole, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  BASIC: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  BROKER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MANAGER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ADMIN: 'bg-gold/20 text-gold border-gold/30',
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDeleteId(null);
    } catch {
      setError('Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const sorted = useMemo(() => {
    let result = [...users];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }

    // Sort: PENDING first, then by creation date
    result.sort((a, b) => {
      if (a.role === 'PENDING' && b.role !== 'PENDING') return -1;
      if (a.role !== 'PENDING' && b.role === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [users, searchQuery]);

  const pendingCount = users.filter((u) => u.role === 'PENDING').length;

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
          onClick={fetchUsers}
          className="btn-gold rounded-lg px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-sm text-muted">
          Manage user accounts and roles
        </p>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <UserCheck className="h-5 w-5 text-yellow-400" />
          <p className="text-sm text-yellow-400">
            <span className="font-semibold">{pendingCount}</span> user
            {pendingCount !== 1 ? 's' : ''} awaiting approval
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
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
          {sorted.length} user{sorted.length !== 1 ? 's' : ''}
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
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted"
                >
                  No users found
                </td>
              </tr>
            ) : (
              sorted.map((user) => (
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
                            {(user.name || user.email)
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-white">
                        {user.name || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {user.email}
                  </td>
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
                          {r}
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
            <span className="inline-flex rounded-full bg-gray-500/20 px-2 py-0.5 text-gray-400">
              BASIC
            </span>
            <span className="text-muted">View flights only</span>
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
