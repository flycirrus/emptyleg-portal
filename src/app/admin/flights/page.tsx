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
  Info,
  Pencil,
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
  manualPrice: number | null;
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

  // Manual price editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceText, setPriceText] = useState('');

  const [selectedFlightPrice, setSelectedFlightPrice] = useState<string | null>(null);
  const [priceBreakdownData, setPriceBreakdownData] = useState<any | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const fetchPriceBreakdown = async (flightId: string) => {
    setSelectedFlightPrice(flightId);
    setLoadingBreakdown(true);
    setPriceBreakdownData(null);
    try {
      const res = await fetch(`/api/admin/flights/${flightId}/price-breakdown`);
      if (!res.ok) throw new Error('Failed to load breakdown');
      const data = await res.json();
      setPriceBreakdownData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

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

  const saveManualPrice = async (flightId: string) => {
    const parsed = priceText.trim() === '' ? null : parseInt(priceText.replace(/[^0-9]/g, ''), 10);
    if (priceText.trim() !== '' && (isNaN(parsed as number) || (parsed as number) <= 0)) {
      setError('Invalid price. Enter a positive number or leave empty to reset.');
      return;
    }
    setSavingId(flightId + '-price');
    try {
      const res = await fetch('/api/admin/flights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId, manualPrice: parsed }),
      });
      if (!res.ok) throw new Error('Failed to save price');
      setFlights((prev) =>
        prev.map((f) =>
          f.id === flightId ? { ...f, manualPrice: parsed } : f
        )
      );
      setEditingPriceId(null);
      setPriceText('');
    } catch {
      setError('Failed to save manual price');
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
        cmp = (a.manualPrice ?? a.calculatedPrice) - (b.manualPrice ?? b.calculatedPrice);
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
        <p className="text-red-400 text-center max-w-md text-sm">{error}</p>
        <button
          onClick={() => { setError(null); fetchFlights(); }}
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
          Manage empty leg flights, visibility, notes and prices
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

                  {/* Price cell with manual edit */}
                  <td className="px-4 py-3">
                    {editingPriceId === flight.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted">€</span>
                        <input
                          type="number"
                          min="1"
                          value={priceText}
                          onChange={(e) => setPriceText(e.target.value)}
                          className="input-dark w-24 rounded px-2 py-1 text-xs"
                          placeholder="e.g. 3500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveManualPrice(flight.id);
                            if (e.key === 'Escape') {
                              setEditingPriceId(null);
                              setPriceText('');
                            }
                          }}
                        />
                        <button
                          onClick={() => saveManualPrice(flight.id)}
                          disabled={savingId === flight.id + '-price'}
                          className="rounded p-1 text-green-400 hover:bg-green-400/10"
                          title="Save"
                        >
                          {savingId === flight.id + '-price' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPriceId(null);
                            setPriceText('');
                          }}
                          className="rounded p-1 text-red-400 hover:bg-red-400/10"
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col">
                          <button
                            onClick={() => fetchPriceBreakdown(flight.id)}
                            className="group flex items-center gap-1 text-sm font-medium transition-colors hover:text-[#e5c587]"
                          >
                            <span className={flight.manualPrice ? 'text-amber-400' : 'text-gold'}>
                              {formatPrice(flight.manualPrice ?? flight.calculatedPrice)}
                            </span>
                            {!flight.manualPrice && (
                              <Info className="h-3 w-3 text-gold/60 opacity-60 transition-opacity group-hover:opacity-100" />
                            )}
                          </button>
                          {flight.manualPrice && (
                            <span className="text-[10px] text-amber-400/70 leading-none">manual</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingPriceId(flight.id);
                            setPriceText(flight.manualPrice ? String(flight.manualPrice) : '');
                          }}
                          className="rounded p-1 text-muted hover:bg-surface-light hover:text-white transition-colors"
                          title="Set manual price (leave empty to reset)"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
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

      {/* Price Breakdown Modal */}
      {selectedFlightPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Price Breakdown</h3>
              <button
                onClick={() => setSelectedFlightPrice(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {loadingBreakdown ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#c9a96e]" />
              </div>
            ) : priceBreakdownData ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Base Price</p>
                  {priceBreakdownData.basePriceCalculation.mode === 'TIME' ? (
                    <div className="flex justify-between text-gray-300">
                      <span>{priceBreakdownData.basePriceCalculation.flightHours.toFixed(2)} hrs &times; {formatPrice(priceBreakdownData.basePriceCalculation.flightHourPrice)}/hr</span>
                      <span>{formatPrice(priceBreakdownData.basePriceCalculation.rawBasePrice)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-gray-300">
                      <span>{priceBreakdownData.basePriceCalculation.distanceNm} nm &times; {priceBreakdownData.basePriceCalculation.multiplierUsed}€/nm</span>
                      <span>{formatPrice(priceBreakdownData.basePriceCalculation.rawBasePrice)}</span>
                    </div>
                  )}
                  {priceBreakdownData.minimumPriceApplied && (
                    <div className="mt-2 text-xs text-[#c9a96e]">
                      * Adjusted to minimum price: {formatPrice(priceBreakdownData.configUsed.minimumPrice)}
                    </div>
                  )}
                  <div className="mt-2 border-t border-gray-700 pt-2 flex justify-between font-semibold text-white">
                    <span>Rounded Base Price</span>
                    <span>{formatPrice(priceBreakdownData.roundedBasePrice)}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-800/50 p-4">
                  <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Luxury Taxes / Surcharges (per pax)</p>
                  {priceBreakdownData.surcharges.length === 0 ? (
                    <p className="text-gray-500 italic">No surcharges apply to this route.</p>
                  ) : (
                    <div className="space-y-2">
                      {priceBreakdownData.surcharges.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-gray-300">
                          <span>{s.label}</span>
                          <span>{formatPrice(s.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-2 flex justify-between font-semibold text-white">
                        <span>Total Surcharges</span>
                        <span>{formatPrice(priceBreakdownData.totalTaxPerPax)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-red-400">Failed to load breakdown.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
