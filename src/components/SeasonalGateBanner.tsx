"use client";

interface SeasonalGateBannerProps {
  destinationName: string;
  month: number;
  currentRating: number;
  gate: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function SeasonalGateBanner({
  destinationName,
  month,
  currentRating,
  gate,
}: SeasonalGateBannerProps) {
  if (gate >= 0.85) return null; // Only show if gate significantly reduces score

  const monthName = MONTH_NAMES[Math.max(0, Math.min(11, month - 1))];
  const gatePercent = Math.round(gate * 100);

  return (
    <div className="rounded-lg bg-critical/10 border-l-4 border-critical p-4 mb-4">
      <div className="flex gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <div className="font-semibold text-critical">
            Poor suitability in {monthName}
          </div>
          <div className="text-sm text-critical mt-1">
            {destinationName} rates only {currentRating.toFixed(1)}/5 in {monthName}. The seasonal
            gate reduces your score by {100 - gatePercent}%. Consider different dates.
          </div>
        </div>
      </div>
    </div>
  );
}
