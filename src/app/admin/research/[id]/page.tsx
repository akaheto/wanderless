'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader, Button } from '@/components/ui';

interface InfluencerSpot {
  name: string;
  type: 'bar' | 'restaurant' | 'cafe' | 'museum' | 'lookout' | 'beach' | 'market' | 'shop' | 'other';
  description: string;
}

interface DraftResearchData {
  city: string;
  country: string;
  climate: {
    description: string;
    bestMonths: number[];
    tempRange: { high: number; low: number };
    source: string;
  };
  flightData: {
    nonstop: boolean;
    typicalHours: number;
    source: string;
  };
  visaInfo: string;
  suggestedHotelPrices: {
    fourStarSuggested: number | null;
    fiveStarSuggested: number | null;
    source: string;
  };
  influencerSpotsRaw: string;
  suggestedSpots: InfluencerSpot[];
  summary: string;
}

export default function ResearchReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [research, setResearch] = useState<DraftResearchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fourStarUSD, setFourStarUSD] = useState<number | ''>('');
  const [fiveStarUSD, setFiveStarUSD] = useState<number | ''>('');
  const [hotelSource, setHotelSource] = useState('');
  const [selectedSpots, setSelectedSpots] = useState<InfluencerSpot[]>([]);
  const [summary, setSummary] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Load draft research
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/research/${id}/draft`);
        if (!res.ok) throw new Error('Failed to load research draft');

        const data = await res.json();
        setResearch(data);
        setSelectedSpots(data.suggestedSpots || []);
        setSummary(data.summary);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleAddSpot = () => {
    const newSpot: InfluencerSpot = {
      name: '',
      type: 'bar',
      description: '',
    };
    setSelectedSpots([...selectedSpots, newSpot]);
  };

  const handleUpdateSpot = (index: number, field: keyof InfluencerSpot, value: string) => {
    const updated = [...selectedSpots];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedSpots(updated);
  };

  const handleRemoveSpot = (index: number) => {
    setSelectedSpots(selectedSpots.filter((_, i) => i !== index));
  };

  const handleApprove = async () => {
    if (!fourStarUSD || !fiveStarUSD) {
      setError('Both hotel prices are required');
      return;
    }

    if (selectedSpots.length < 20 || selectedSpots.length > 50) {
      setError(`Need 20-50 influencer spots (you have ${selectedSpots.length})`);
      return;
    }

    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/research/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fourStarUSD: Number(fourStarUSD),
          fiveStarUSD: Number(fiveStarUSD),
          hotelSource,
          influencerSpots: selectedSpots,
          summary,
          adminNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve');
      }

      router.push('/admin/suggestions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 p-6">
        <p className="text-ink-2">Loading research draft...</p>
      </div>
    );
  }

  if (!research || error) {
    return (
      <div className="min-h-screen bg-surface-0 p-6">
        <PageHeader title="Research Review" lede="Verify and approve city research" />
        <div className="text-red-600">{error || 'Research not found'}</div>
      </div>
    );
  }

  const spotTypeCount: Record<string, number> = {};
  selectedSpots.forEach((spot) => {
    spotTypeCount[spot.type] = (spotTypeCount[spot.type] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-surface-0">
      <PageHeader
        title={`Review: ${research.city}, ${research.country}`}
        lede="Admin review required - verify and approve before publishing to catalog"
      />

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-12">
        {/* Auto-Collected Reliable Data */}
        <section className="rounded-lg border border-line bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">✓ Auto-Collected Data (Verified Sources)</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ink-2">Climate</label>
              <p className="text-sm text-ink mt-1">{research.climate.description}</p>
              <p className="text-xs text-ink-3 mt-1">Source: {research.climate.source}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-ink-2">Flights</label>
              <p className="text-sm text-ink mt-1">
                {research.flightData.nonstop ? '✓ Nonstop available' : 'Connections required'} • {research.flightData.typicalHours}h
              </p>
              <p className="text-xs text-ink-3 mt-1">Source: {research.flightData.source}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-ink-2">Visa Requirements</label>
              <p className="text-sm text-ink mt-1">{research.visaInfo}</p>
            </div>
          </div>
        </section>

        {/* Admin-Verified Hotel Prices */}
        <section className="rounded-lg border border-accent/20 bg-accent/5 p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">✎ Hotel Prices (Edit & Verify)</h2>
          <p className="text-sm text-ink-2 mb-4">
            Enter actual prices you&apos;ve researched. {research.suggestedHotelPrices.source}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                4-Star Hotel (per night, USD)
              </label>
              <input
                type="number"
                value={fourStarUSD}
                onChange={(e) => setFourStarUSD(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g., 145"
                className="w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm"
                min="50"
                max="2000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                5-Star Hotel (per night, USD)
              </label>
              <input
                type="number"
                value={fiveStarUSD}
                onChange={(e) => setFiveStarUSD(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g., 420"
                className="w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm"
                min="50"
                max="2000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Source / Notes
              </label>
              <input
                type="text"
                value={hotelSource}
                onChange={(e) => setHotelSource(e.target.value)}
                placeholder="e.g., Booking.com average, March 2026"
                className="w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Influencer Spots Curation */}
        <section className="rounded-lg border border-accent/20 bg-accent/5 p-6">
          <h2 className="text-lg font-semibold text-ink mb-2">✎ Influencer Spots (Curate 20-50)</h2>
          <p className="text-sm text-ink-2 mb-4">
            Review, add, or remove Instagram-worthy locations. Need {Math.max(0, 20 - selectedSpots.length)} more.
          </p>

          {selectedSpots.length > 0 && (
            <div className="mb-4 text-xs text-ink-3">
              Types: {Object.entries(spotTypeCount).map(([type, count]) => `${count} ${type}s`).join(', ')}
            </div>
          )}

          <div className="space-y-3 mb-4">
            {selectedSpots.map((spot, idx) => (
              <div key={idx} className="rounded border border-line bg-surface-2 p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spot.name}
                    onChange={(e) => handleUpdateSpot(idx, 'name', e.target.value)}
                    placeholder="Spot name"
                    className="flex-1 rounded border border-line bg-surface-1 px-2 py-1 text-sm"
                  />
                  <select
                    value={spot.type}
                    onChange={(e) => handleUpdateSpot(idx, 'type', e.target.value)}
                    className="rounded border border-line bg-surface-1 px-2 py-1 text-sm"
                  >
                    <option value="bar">bar</option>
                    <option value="restaurant">restaurant</option>
                    <option value="cafe">cafe</option>
                    <option value="museum">museum</option>
                    <option value="lookout">lookout</option>
                    <option value="beach">beach</option>
                    <option value="market">market</option>
                    <option value="shop">shop</option>
                    <option value="other">other</option>
                  </select>
                  <button
                    onClick={() => handleRemoveSpot(idx)}
                    className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={spot.description}
                  onChange={(e) => handleUpdateSpot(idx, 'description', e.target.value)}
                  placeholder="Why it's notable"
                  className="w-full rounded border border-line bg-surface-1 px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleAddSpot}
            className="text-sm text-accent hover:underline"
          >
            + Add spot
          </button>
        </section>

        {/* Summary */}
        <section className="rounded-lg border border-line bg-surface-1 p-6">
          <label className="block text-sm font-medium text-ink mb-2">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One sentence about this city"
            rows={2}
            className="w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm"
          />
        </section>

        {/* Admin Notes */}
        <section className="rounded-lg border border-line bg-surface-1 p-6">
          <label className="block text-sm font-medium text-ink mb-2">Admin Notes</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Why you approved/changed this data (for audit trail)"
            rows={3}
            className="w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm"
          />
        </section>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={saving}
            className="flex-1 rounded bg-accent px-4 py-2 text-white font-medium hover:bg-accent-strong disabled:opacity-50"
          >
            {saving ? 'Approving...' : '✓ Approve & Publish'}
          </button>
          <button
            onClick={() => router.back()}
            disabled={saving}
            className="px-4 py-2 rounded border border-line text-ink hover:bg-surface-2 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>}
      </div>
    </div>
  );
}
