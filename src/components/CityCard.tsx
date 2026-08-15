'use client';

import { useState } from 'react';
import type { CitySuggestion } from '@/lib/db/city-suggestions';
import { Button } from '@/components/ui';

interface CityCardProps {
  suggestion: CitySuggestion;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number, reason: string) => Promise<void>;
  onRetry?: (id: number) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Card displaying a city suggestion with research status and action buttons.
 * Shows hotel data, flight info, visa requirements, and climate data as available.
 */
export function CityCard({
  suggestion,
  onApprove,
  onReject,
  onRetry,
  onDelete,
  isLoading = false,
}: CityCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    if (!suggestion.id) return;
    setIsProcessing(true);
    try {
      await onApprove(suggestion.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!suggestion.id) return;
    setIsProcessing(true);
    try {
      await onReject(suggestion.id, rejectionReason || 'Not a suitable leisure destination');
      setShowRejectForm(false);
      setRejectionReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    if (!suggestion.id || !onRetry) return;
    setIsProcessing(true);
    try {
      await onRetry(suggestion.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!suggestion.id || !onDelete) return;
    if (!confirm('Are you sure you want to delete this suggestion?')) return;
    setIsProcessing(true);
    try {
      await onDelete(suggestion.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusColors = {
    pending: 'bg-amber-50 border-amber-200',
    researching: 'bg-blue-50 border-blue-200',
    reviewed: 'bg-green-50 border-green-200',
    approved: 'bg-green-50 border-green-200',
    rejected: 'bg-red-50 border-red-200',
  };

  const statusLabels = {
    pending: '⏳ Pending',
    researching: '🔍 Researching',
    reviewed: '✓ Reviewed',
    approved: '✓ Approved',
    rejected: '✗ Rejected',
  };

  const hotelData = suggestion.hotel_data ? JSON.parse(suggestion.hotel_data) : null;
  const flightData = suggestion.flight_data ? JSON.parse(suggestion.flight_data) : null;
  const influencerSpots = suggestion.influencer_spots ? JSON.parse(suggestion.influencer_spots) : null;

  return (
    <div className={`rounded-lg border p-6 ${statusColors[suggestion.status as keyof typeof statusColors]}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {suggestion.city}, {suggestion.country}
          </h3>
          <p className="text-sm text-ink-2 mt-1">
            {statusLabels[suggestion.status as keyof typeof statusLabels]} •{' '}
            {new Date(suggestion.submitted_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Research Data */}
      <div className="space-y-3 mb-4">
        {suggestion.research_notes && (
          <div>
            <p className="text-xs font-medium text-ink-2 uppercase">Notes</p>
            <p className="text-sm text-ink">{suggestion.research_notes}</p>
          </div>
        )}

        {hotelData && (
          <div>
            <p className="text-xs font-medium text-ink-2 uppercase">Hotels</p>
            <p className="text-sm text-ink">
              4-star: ${hotelData.fourStarUSD} • 5-star: ${hotelData.fiveStarUSD}
              {hotelData.source && <span className="text-xs text-ink-3"> ({hotelData.source})</span>}
            </p>
          </div>
        )}

        {flightData && (
          <div>
            <p className="text-xs font-medium text-ink-2 uppercase">Flights</p>
            <p className="text-sm text-ink">
              {flightData.nonstop ? '✓ Nonstop available' : 'Connections required'} •{' '}
              {flightData.typicalHours}h travel
              {flightData.source && <span className="text-xs text-ink-3"> ({flightData.source})</span>}
            </p>
          </div>
        )}

        {suggestion.visa_info && (
          <div>
            <p className="text-xs font-medium text-ink-2 uppercase">Visa</p>
            <p className="text-sm text-ink">{suggestion.visa_info}</p>
          </div>
        )}

        {suggestion.climate_data && (
          <div>
            <p className="text-xs font-medium text-ink-2 uppercase">Climate</p>
            <p className="text-sm text-ink">{suggestion.climate_data}</p>
          </div>
        )}

        {influencerSpots && influencerSpots.length > 0 && (
          <div>
            <p className="text-xs font-medium text-ink-2 uppercase mb-2">Influencer Spots ({influencerSpots.length})</p>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {influencerSpots.map((spot: any, idx: number) => (
                <div key={idx} className="rounded border border-line/50 bg-surface-1 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-ink">{spot.name}</p>
                      <p className="text-xs text-ink-2 mt-0.5">{spot.description}</p>
                    </div>
                    <span className="inline-block px-2 py-1 bg-accent/10 text-accent text-xs rounded font-medium whitespace-nowrap">
                      {spot.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Email */}
      {suggestion.user_email && (
        <div className="mb-4 text-xs text-ink-3">
          Submitted by: {suggestion.user_email}
        </div>
      )}

      {/* Actions */}
      {(suggestion.status === 'pending' || suggestion.status === 'researching') && (
        <div className="space-y-2">
          {showRejectForm ? (
            <div className="space-y-2">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex gap-2 text-sm">
                <Button
                  onClick={handleReject}
                  disabled={isProcessing}
                  variant="danger"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
                </Button>
                <Button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  disabled={isProcessing}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 text-sm">
              <Button onClick={handleApprove} disabled={isProcessing} variant="primary">
                {isProcessing ? 'Processing...' : '✓ Approve & Research'}
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                variant="secondary"
              >
                ✗ Reject
              </Button>
            </div>
          )}
        </div>
      )}

      {suggestion.status === 'reviewed' && (
        <div className="space-y-2">
          {suggestion.research_notes?.includes('failed') || suggestion.research_notes?.includes('Failed') ? (
            <>
              <div className="text-xs text-critical mb-3">
                Research failed. You can retry or delete this suggestion.
              </div>
              <div className="flex gap-2 text-sm">
                <Button
                  onClick={handleRetry}
                  disabled={isProcessing}
                  variant="primary"
                >
                  {isProcessing ? 'Retrying...' : '↻ Retry Research'}
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isProcessing}
                  variant="danger"
                >
                  {isProcessing ? 'Deleting...' : '🗑 Delete'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-xs text-ink-3">
              Reviewed on {suggestion.reviewed_at ? new Date(suggestion.reviewed_at).toLocaleDateString() : 'N/A'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
