'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

type InquiryStatus = 'NEW' | 'READ' | 'REPLIED' | 'CLOSED';

interface Inquiry {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  message: string;
  status: InquiryStatus;
  adminNotes: string | null;
  createdAt: string;
  handledBy: { name: string | null; email: string } | null;
  flight: {
    depCity: string;
    arrCity: string;
    depAirportIata: string;
    arrAirportIata: string;
    depDatetimeUtc: string;
  };
}

const STATUS_OPTIONS: InquiryStatus[] = ['NEW', 'READ', 'REPLIED', 'CLOSED'];

const STATUS_STYLES: Record<InquiryStatus, string> = {
  NEW: 'bg-red-500/20 text-red-400 border-red-500/30',
  READ: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  REPLIED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CLOSED: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/inquiries');
      if (!res.ok) throw new Error('Failed to load inquiries');
      const data = await res.json();
      setInquiries(data.inquiries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const updateStatus = async (inquiryId: string, status: InquiryStatus) => {
    setUpdatingId(inquiryId);
    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, status } : i))
      );
    } catch {
      setError('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveNote = async (inquiryId: string) => {
    setSavingNoteId(inquiryId);
    try {
      const adminNotes = noteTexts[inquiryId] ?? '';
      const res = await fetch('/api/admin/inquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, adminNotes }),
      });
      if (!res.ok) throw new Error('Failed to save note');
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, adminNotes } : i))
      );
    } catch {
      setError('Failed to save note');
    } finally {
      setSavingNoteId(null);
    }
  };

  const filtered = useMemo(() => {
    let result = [...inquiries];

    if (filterStatus) {
      result = result.filter((i) => i.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.customerName.toLowerCase().includes(q) ||
          i.customerEmail.toLowerCase().includes(q) ||
          i.flight.depCity.toLowerCase().includes(q) ||
          i.flight.arrCity.toLowerCase().includes(q) ||
          i.flight.depAirportIata.toLowerCase().includes(q) ||
          i.flight.arrAirportIata.toLowerCase().includes(q)
      );
    }

    return result;
  }, [inquiries, filterStatus, searchQuery]);

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
          onClick={fetchInquiries}
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
        <h1 className="text-2xl font-bold text-white">Inquiry Management</h1>
        <p className="text-sm text-muted">
          Track and manage customer inquiries
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or route..."
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
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as InquiryStatus | '')
            }
            className="input-dark rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted">
          {filtered.length} inquir{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Flight Route
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Handler
              </th>
            </tr>
          </thead>
          {filtered.length === 0 ? (
            <tbody>
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-muted"
                >
                  No inquiries found
                </td>
              </tr>
            </tbody>
          ) : (
            filtered.map((inq) => {
              const isExpanded = expandedId === inq.id;
              return (
                <tbody key={inq.id} className="border-b border-border last:border-b-0">
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-surface-light ${
                      isExpanded ? 'bg-surface-light' : ''
                    }`}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : inq.id)
                    }
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">
                        {formatDate(inq.createdAt)}
                      </div>
                      <div className="text-xs text-muted">
                        {formatTime(inq.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      {inq.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {inq.customerEmail}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">
                        {inq.flight.depAirportIata}{' '}
                        <span className="text-gold">&rarr;</span>{' '}
                        {inq.flight.arrAirportIata}
                      </div>
                      <div className="text-xs text-muted">
                        {formatDate(inq.flight.depDatetimeUtc)}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={inq.status}
                        onChange={(e) =>
                          updateStatus(
                            inq.id,
                            e.target.value as InquiryStatus
                          )
                        }
                        disabled={updatingId === inq.id}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[inq.status]} bg-transparent cursor-pointer`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option
                            key={s}
                            value={s}
                            className="bg-surface text-foreground"
                          >
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {inq.handledBy?.name || inq.handledBy?.email || '-'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-surface-light/50">
                      <td colSpan={7} className="px-8 py-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Message */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                              Customer Message
                            </h4>
                            <div className="rounded-lg border border-border bg-surface p-4 text-sm text-white">
                              {inq.message}
                            </div>
                            {inq.customerPhone && (
                              <p className="mt-2 text-xs text-muted">
                                Phone: {inq.customerPhone}
                              </p>
                            )}
                          </div>

                          {/* Admin notes */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                              Admin Notes
                            </h4>
                            <textarea
                              value={
                                noteTexts[inq.id] !== undefined
                                  ? noteTexts[inq.id]
                                  : inq.adminNotes || ''
                              }
                              onChange={(e) =>
                                setNoteTexts((prev) => ({
                                  ...prev,
                                  [inq.id]: e.target.value,
                                }))
                              }
                              placeholder="Add internal notes..."
                              rows={4}
                              className="input-dark w-full rounded-lg px-4 py-3 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveNote(inq.id);
                              }}
                              disabled={savingNoteId === inq.id}
                              className="btn-gold mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
                            >
                              {savingNoteId === inq.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Save Notes
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })
          )}
        </table>
      </div>
    </div>
  );
}
