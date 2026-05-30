'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calculator,
  RotateCcw,
  Plus,
  Trash2,
  Globe,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { PricingConfigData } from '@/types';

const EXAMPLE_DISTANCES = [200, 400, 600, 1000, 1500, 2500];

interface SurchargeData {
  id?: string;
  countryCode: string;
  countryName: string;
  surchargeType: 'FIXED' | 'PERCENTAGE';
  amount: number;
  label: string;
  appliesTo: 'DEPARTURE' | 'ARRIVAL' | 'BOTH';
  isActive: boolean;
}

export default function PricingPage() {
  const [config, setConfig] = useState<PricingConfigData>({
    shortFlightThresholdNm: 400,
    shortFlightMultiplier: 18.9,
    longFlightMultiplier: 8.5,
    minimumPrice: 1700,
    roundToNearest: 100,
  });
  const [originalConfig, setOriginalConfig] = useState<PricingConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Surcharges state
  const [surcharges, setSurcharges] = useState<SurchargeData[]>([]);
  const [showAddSurcharge, setShowAddSurcharge] = useState(false);
  const [newSurcharge, setNewSurcharge] = useState<SurchargeData>({
    countryCode: '',
    countryName: '',
    surchargeType: 'FIXED',
    amount: 0,
    label: '',
    appliesTo: 'BOTH',
    isActive: true,
  });
  const [surchargeLoading, setSurchargeLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pricingRes, surchargeRes] = await Promise.all([
        fetch('/api/admin/pricing'),
        fetch('/api/admin/surcharges'),
      ]);
      if (!pricingRes.ok) throw new Error('Failed to load pricing config');
      const pricingData = await pricingRes.json();
      if (pricingData.config) {
        const c: PricingConfigData = {
          shortFlightThresholdNm: pricingData.config.shortFlightThresholdNm,
          shortFlightMultiplier: pricingData.config.shortFlightMultiplier,
          longFlightMultiplier: pricingData.config.longFlightMultiplier,
          minimumPrice: pricingData.config.minimumPrice,
          roundToNearest: pricingData.config.roundToNearest,
        };
        setConfig(c);
        setOriginalConfig(c);
      }
      if (surchargeRes.ok) {
        const surchargeData = await surchargeRes.json();
        setSurcharges(surchargeData.surcharges || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleAddSurcharge = async () => {
    setSurchargeLoading(true);
    try {
      const res = await fetch('/api/admin/surcharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSurcharge),
      });
      if (!res.ok) throw new Error('Failed to add surcharge');
      const data = await res.json();
      setSurcharges((prev) => [...prev, data.surcharge]);
      setNewSurcharge({
        countryCode: '',
        countryName: '',
        surchargeType: 'FIXED',
        amount: 0,
        label: '',
        appliesTo: 'BOTH',
        isActive: true,
      });
      setShowAddSurcharge(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add surcharge');
    } finally {
      setSurchargeLoading(false);
    }
  };

  const handleToggleSurcharge = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/surcharges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      if (!res.ok) throw new Error('Failed to update surcharge');
      setSurcharges((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDeleteSurcharge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this surcharge?')) return;
    try {
      const res = await fetch('/api/admin/surcharges', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete surcharge');
      setSurcharges((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ? JSON.stringify(data.error) : 'Failed to save');
      }
      setOriginalConfig({ ...config });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig({ ...originalConfig });
    }
  };

  const calculatePrice = (distanceNm: number): number => {
    const multiplier =
      distanceNm <= config.shortFlightThresholdNm
        ? config.shortFlightMultiplier
        : config.longFlightMultiplier;
    const raw = distanceNm * multiplier;
    const rounded =
      Math.ceil(raw / config.roundToNearest) * config.roundToNearest;
    return Math.max(rounded, config.minimumPrice);
  };

  const hasChanges =
    originalConfig &&
    JSON.stringify(config) !== JSON.stringify(originalConfig);

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
        <h1 className="text-2xl font-bold text-white">Pricing Configuration</h1>
        <p className="text-sm text-muted">
          Configure pricing parameters for empty leg flights
        </p>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Pricing configuration saved successfully
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Config form */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="mb-6 font-semibold text-white">Parameters</h3>
          <div className="space-y-5">
            {/* Short flight threshold */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Short Flight Threshold (nm)
              </label>
              <input
                type="number"
                value={config.shortFlightThresholdNm}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    shortFlightThresholdNm: Number(e.target.value),
                  }))
                }
                min={1}
                className="input-dark w-full rounded-lg px-4 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-muted">
                Flights shorter than this use the short flight multiplier
              </p>
            </div>

            {/* Short flight multiplier */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Short Flight Multiplier (EUR/nm)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.shortFlightMultiplier}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    shortFlightMultiplier: Number(e.target.value),
                  }))
                }
                min={0}
                className="input-dark w-full rounded-lg px-4 py-2.5 text-sm"
              />
            </div>

            {/* Long flight multiplier */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Long Flight Multiplier (EUR/nm)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.longFlightMultiplier}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    longFlightMultiplier: Number(e.target.value),
                  }))
                }
                min={0}
                className="input-dark w-full rounded-lg px-4 py-2.5 text-sm"
              />
            </div>

            {/* Minimum price */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Minimum Price (EUR)
              </label>
              <input
                type="number"
                value={config.minimumPrice}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    minimumPrice: Number(e.target.value),
                  }))
                }
                min={0}
                className="input-dark w-full rounded-lg px-4 py-2.5 text-sm"
              />
            </div>

            {/* Round to nearest */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Round to Nearest (EUR)
              </label>
              <input
                type="number"
                value={config.roundToNearest}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    roundToNearest: Number(e.target.value),
                  }))
                }
                min={1}
                className="input-dark w-full rounded-lg px-4 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-muted">
                Prices are rounded up to the nearest multiple of this value
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="btn-gold inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:bg-surface-light hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-6 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-gold" />
            <h3 className="font-semibold text-white">Example Calculations</h3>
          </div>
          <p className="mb-4 text-xs text-muted">
            Preview how prices are calculated with the current parameters.
            Threshold: {config.shortFlightThresholdNm} nm
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Distance
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Multiplier
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Raw
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Final Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {EXAMPLE_DISTANCES.map((dist) => {
                  const isShort = dist <= config.shortFlightThresholdNm;
                  const mult = isShort
                    ? config.shortFlightMultiplier
                    : config.longFlightMultiplier;
                  const raw = dist * mult;
                  const price = calculatePrice(dist);
                  return (
                    <tr key={dist} className="hover:bg-surface-light">
                      <td className="px-3 py-2.5 text-sm text-white">
                        {dist} nm
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            isShort
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {isShort ? 'Short' : 'Long'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted">
                        x{mult}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted">
                        {formatPrice(Math.round(raw))}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gold">
                        {formatPrice(price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted">
            Formula: distance x multiplier, rounded up to nearest{' '}
            {formatPrice(config.roundToNearest)}, minimum{' '}
            {formatPrice(config.minimumPrice)}
          </p>
        </div>
      </div>

      {/* Country Surcharges Section */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gold" />
            <h3 className="font-semibold text-white">Country Surcharges (Add-ons)</h3>
          </div>
          <button
            onClick={() => setShowAddSurcharge(!showAddSurcharge)}
            className="btn-gold inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Surcharge
          </button>
        </div>

        <p className="mb-4 text-xs text-muted">
          Surcharges are automatically added to the flight price when departure or arrival is in the configured country.
          After changes, run a Sync to recalculate all prices.
        </p>

        {/* Add Surcharge Form */}
        {showAddSurcharge && (
          <div className="mb-6 rounded-lg border border-gold/30 bg-gold/5 p-4">
            <h4 className="mb-4 text-sm font-medium text-gold">New Surcharge</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Country Name</label>
                <input
                  type="text"
                  placeholder="e.g. Italy"
                  value={newSurcharge.countryName}
                  onChange={(e) => setNewSurcharge(s => ({ ...s, countryName: e.target.value }))}
                  className="input-dark w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Country Code</label>
                <input
                  type="text"
                  placeholder="e.g. IT"
                  maxLength={3}
                  value={newSurcharge.countryCode}
                  onChange={(e) => setNewSurcharge(s => ({ ...s, countryCode: e.target.value.toUpperCase() }))}
                  className="input-dark w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Label</label>
                <input
                  type="text"
                  placeholder="e.g. Italian Luxury Tax"
                  value={newSurcharge.label}
                  onChange={(e) => setNewSurcharge(s => ({ ...s, label: e.target.value }))}
                  className="input-dark w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Type</label>
                <select
                  value={newSurcharge.surchargeType}
                  onChange={(e) => setNewSurcharge(s => ({ ...s, surchargeType: e.target.value as 'FIXED' | 'PERCENTAGE' }))}
                  className="input-dark w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="FIXED">Fixed Amount (EUR)</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Amount ({newSurcharge.surchargeType === 'FIXED' ? 'EUR' : '%'})
                </label>
                <input
                  type="number"
                  step={newSurcharge.surchargeType === 'PERCENTAGE' ? '0.1' : '1'}
                  value={newSurcharge.amount}
                  onChange={(e) => setNewSurcharge(s => ({ ...s, amount: Number(e.target.value) }))}
                  className="input-dark w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Applies to</label>
                <select
                  value={newSurcharge.appliesTo}
                  onChange={(e) => setNewSurcharge(s => ({ ...s, appliesTo: e.target.value as 'DEPARTURE' | 'ARRIVAL' | 'BOTH' }))}
                  className="input-dark w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="BOTH">Departure &amp; Arrival</option>
                  <option value="DEPARTURE">Departure only</option>
                  <option value="ARRIVAL">Arrival only</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleAddSurcharge}
                disabled={surchargeLoading || !newSurcharge.countryName || !newSurcharge.countryCode || !newSurcharge.label || newSurcharge.amount <= 0}
                className="btn-gold inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                {surchargeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Surcharge
              </button>
              <button
                onClick={() => setShowAddSurcharge(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Surcharges Table */}
        {surcharges.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">
            No country surcharges configured. Click &quot;Add Surcharge&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Country</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Label</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Applies to</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Active</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {surcharges.map((s) => (
                  <tr key={s.id} className={`hover:bg-surface-light ${!s.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-3 text-sm">
                      <span className="font-medium text-white">{s.countryName}</span>
                      <span className="ml-2 text-xs text-muted">({s.countryCode})</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-white">{s.label}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.surchargeType === 'FIXED'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {s.surchargeType === 'FIXED' ? 'Fixed' : 'Percentage'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gold">
                      {s.surchargeType === 'FIXED' ? formatPrice(s.amount) : `${s.amount}%`}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted">
                      {s.appliesTo === 'BOTH' ? 'Dep & Arr' : s.appliesTo === 'DEPARTURE' ? 'Departure' : 'Arrival'}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleSurcharge(s.id!, !s.isActive)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          s.isActive ? 'bg-gold' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          s.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleDeleteSurcharge(s.id!)}
                        className="rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
