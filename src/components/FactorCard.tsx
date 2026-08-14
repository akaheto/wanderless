"use client";

interface FactorCardProps {
  name: string;
  score: number;
  weight: number;
  explanation: string;
  category: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  climate: "🌤️",
  cost: "💰",
  experience: "⭐",
  practicality: "✈️",
  travel: "🚗",
  lodging: "🏨",
  seasonal: "📅",
  personal: "👤",
};

const getScoreColor = (score: number): string => {
  if (score >= 75) return "text-good";
  if (score >= 50) return "text-amber-600";
  if (score >= 25) return "text-orange-600";
  return "text-critical";
};

const getScoreBgColor = (score: number): string => {
  if (score >= 75) return "bg-green-50 dark:bg-green-900/20";
  if (score >= 50) return "bg-amber-50 dark:bg-amber-900/20";
  if (score >= 25) return "bg-orange-50 dark:bg-orange-900/20";
  return "bg-critical/10 dark:bg-critical/10";
};

export function FactorCard({
  name,
  score,
  weight,
  explanation,
  category,
}: FactorCardProps) {
  const emoji = CATEGORY_EMOJI[category] || "📊";

  return (
    <div
      className={`p-3 rounded-lg border border-line ${getScoreBgColor(score)} text-sm`}
      title={explanation}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{emoji}</span>
        <span className="font-medium text-ink-1 flex-1 truncate">{name}</span>
      </div>
      <div className={`text-lg font-bold ${getScoreColor(score)}`}>{Math.round(score)}</div>
      <div className="text-xs text-ink-3 line-clamp-2 mt-1">{explanation}</div>
      <div className="text-xs text-ink-4 mt-1">Weight: {Math.round(weight * 100)}%</div>
    </div>
  );
}
