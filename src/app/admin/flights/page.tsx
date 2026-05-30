'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Search,
  StickyNote,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  X,
  Check,
  MessageSquare,
} from 'lucide-react';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';

interface Flight {
  id: string;
  flightNo: string;
  depDatetimeUtc: string;
  aircraftType: string;
  depAirportIata: string;
  depCity: string;
  arrAirportIata: string;
  arrCity: string;
  distanceNm: number;
  paxCapacity: number;
  calculatedPrice: number;
  isVisible: boolean;
  adminNotes: string | null;
  _count: { inquiries: number };
}

type SortField = 'depDatetimeUtc' | 'flightNo' | 'calculatedPrice' | 'paxCapacity';
type SortDir = 'asc' | 'desc';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('depDatetimeUtc');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/flights');
      if (!res.ok) throw new Error('Failed to load flights');
      const data = await res.json();
      setFlights(data.flights || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const toggleVisibility = async (flight: Flight) => {
    setSavingId(flight.id);
    try {
      const res = await fetch('/api/admin/flights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightId: flight.id,
          isVisible: !flight.isVisible,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setFlights((prev) =>
        prev.map((f) =>
          f.id === flight.id ? { ...f, isVisible: !f.isVisible } : f
        )
      );
    } catch {
      setError('Failed to update visibility');
    } finally {
      setSavingId(null);
    }
  };

  const saveNote = async (flightId: string) => {
    setSavingId(flightId);
    try {
      const res = await fetch('/api/admin/flights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId, adminNotes: noteText }),
      });
      if (!res.ok) throw new Error('Failed to save note');
      setFlights((prev) =>
        prev.map((f) =>
          f.id === flightId ? { ...f, adminNotes: noteText } : f
        )
      );
      setEditingNoteId(null);
      setNoteText('');
    } catch {
      setError('Failed to save note');
    } finally {
      setSavingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...flights];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.flightNo.toLowerCase().includes(q) ||
          f.depCity.toLowerCase().includes(q) ||
          f.arrCity.toLowerCase().includes(q) ||
          f.depAirportIata.toLowerCase().includes(q) ||
          f.arrAirportIata.toLowerCase().includes(q) ||
          f.aircraftType.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'depDatetimeUtc') {
        cmp =
          new Date(a.depDatetimeUtc).getTime() -
          new Date(b.depDatetimeUtc).getTime();
      } else if (sortField === 'flightNo') {
        cmp = a.flightNo.localeCompare(b.flightNo);
      } else if (sortField === 'calculatedPrice') {
        cmp = a.calculatedPrice - b.calculatedPrice;
      } else if (sortField === 'paxCapacity') {
        cmp = a.paxCapacity - b.paxCapacity;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [flights, searchQuery, sortField, sortDir]);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-muted hover:text-white"
    >
      {children}
      <ArrowUpDown
        className={`h-3 w-3 ${sortField === field ? 'text-gold' : ''}`}
      />
    </button>
  );

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
          onClick={fetchFlights}
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
        <h1 className="text-2xl font-bold text-white">Flight Management</h1>
        <p className="text-sm text-muted">
          Manage empty leg flights, visibility, and notes
        </p>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search flights, cities, aircraft..."
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
          {filtered.length} flight{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left">
                <SortButton field="flightNo">Flight</SortButton>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Route
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton field="depDatetimeUtc">Date</SortButton>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Aircraft
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton field="paxCapacity">Seats</SortButton>
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton field="calculatedPrice">Price</SortButton>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                Visible
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                <span className="flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Inq.
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-muted"
                >
                  No flights found
                </td>
              </tr>
            ) : (
              filtered.map((flight) => (
                <tr
                  key={flight.id}
                  className={`transition-colors hover:bg-surface-light ${
                    !flight.isVisible ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-white">
                      {flight.flightNo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">
                      <span className="font-medium">
                        {flight.depAirportIata}
                      </span>{' '}
                      <span className="text-gold">&rarr;</span>{' '}
                      <span className="font-medium">
                        {flight.arrAirportIata}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      {flight.depCity} &rarr; {flight.arrCity}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">
                      {formatDate(flight.depDatetimeUtc)}
                    </div>
                    <div className="text-xs text-muted">
                      {formatTime(flight.depDatetimeUtc)} UTC
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    {flight.aircraftType}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    {flight.paxCapacity}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gold">
                      {formatPrice(flight.calculatedPrice)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleVisibility(flight)}
                      disabled={savingId === flight.id}
                      className={`rounded-lg p-1.5 transition-colors ${
                        flight.isVisible
                          ? 'text-green-400 hover:bg-green-400/10'
                          : 'text-red-400 hover:bg-red-400/10'
                      }`}
                      title={flight.isVisible ? 'Visible' : 'Hidden'}
                    >
                      {savingId === flight.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : flight.isVisible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        flight._count.inquiries > 0
                          ? 'bg-gold/20 text-gold'
                          : 'bg-surface-light text-muted'
                      }`}
                    >
                      {flight._count.inquiries}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingNoteId === flight.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="input-dark w-32 rounded px-2 py-1 text-xs"
                          placeholder="Add note..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveNote(flight.id);
                            if (e.key === 'Escape') {
                              setEditingNoteId(null);
                              setNoteText('');
                            }
                          }}
                        />
                        <button
                          onClick={() => saveNote(flight.id)}
                          disabled={savingId === flight.id}
                          className="rounded p-1 text-green-400 hover:bg-green-400/10"
                        >
                          {savingId === flight.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingNoteId(null);
                            setNoteText('');
                          }}
                          className="rounded p-1 text-red-400 hover:bg-red-400/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingNoteId(flight.id);
                          setNoteText(flight.adminNotes || '');
                        }}
                        className={`rounded-lg p-1.5 transition-colors hover:bg-surface-light ${
                          flight.adminNotes ? 'text-gold' : 'text-muted'
                        }`}
                        title={flight.adminNotes || 'Add note'}
                      >
                        <StickyNote className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
