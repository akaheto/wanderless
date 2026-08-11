import Link from "next/link";
import type { Confidence, DataWarning, PlanningStatus, Season, Tier } from "@/lib/domain/types";
import { PLANNING_STATUS_LABELS } from "@/lib/domain/types";

export function PageHeader({
  title,
  lede,
  actions,
  breadcrumb,
}: {
  title: string;
  lede?: string;
  actions?: React.ReactNode;
  breadcrumb?: { href: string; label: string };
}) {
  return (
    <header className="mb-7">
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="mb-2 inline-block text-[13px] text-ink-3 hover:text-accent"
        >
          ← {breadcrumb.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {lede && <p className="mt-1.5 max-w-[62ch] text-[14px] text-ink-2">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`rounded-lg border border-line bg-surface-1 ${className}`}>{children}</Tag>
  );
}

export function CardHeader({
  title,
  note,
  right,
}: {
  title: string;
  note?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
        {note && <p className="mt-0.5 text-[12.5px] text-ink-3">{note}</p>}
      </div>
      {right}
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors disabled:opacity-50";

const BUTTON_VARIANTS = {
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "border border-line-strong bg-surface-2 hover:bg-surface-0",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "border border-line-strong bg-surface-2 text-critical hover:bg-surface-0",
} as const;

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  className = "",
  href,
  children,
}: {
  variant?: keyof typeof BUTTON_VARIANTS;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-[13px] text-ink-2">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "good" | "warning" | "serious" | "critical";
}) {
  const tones = {
    neutral: "border-line-strong text-ink-2",
    accent: "border-transparent bg-accent-soft text-accent",
    good: "border-transparent text-white",
    warning: "border-transparent text-black",
    serious: "border-transparent text-white",
    critical: "border-transparent text-white",
  } as const;
  const backgrounds: Partial<Record<typeof tone, string>> = {
    good: "var(--good)",
    warning: "var(--warning)",
    serious: "var(--serious)",
    critical: "var(--critical)",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${tones[tone]}`}
      style={backgrounds[tone] ? { background: backgrounds[tone] } : undefined}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<PlanningStatus, Parameters<typeof Badge>[0]["tone"]> = {
  idea: "neutral",
  comparing: "accent",
  destination_selected: "accent",
  flights_booked: "good",
  hotels_booked: "good",
  itinerary: "good",
  ready: "good",
  completed: "neutral",
};

export function StatusBadge({ status }: { status: PlanningStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{PLANNING_STATUS_LABELS[status]}</Badge>;
}

export function SeasonBadge({ season }: { season: Season }) {
  const map = { peak: "serious", shoulder: "accent", low: "neutral" } as const;
  return <Badge tone={map[season]}>{season} season</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const map = { high: "good", medium: "warning", low: "critical" } as const;
  return <Badge tone={map[confidence]}>{confidence} confidence</Badge>;
}

/**
 * Marks which epistemic tier a number came from. Present wherever objective, curated
 * and personal figures sit next to each other, so it is always clear whether you are
 * reading a measurement or a judgement.
 */
export function TierMark({ tier }: { tier: Tier }) {
  const label = { objective: "measured", curated: "curated", personal: "yours" }[tier];
  const title = {
    objective: "Measured — from a named external source with a fetch date",
    curated: "Curated — an editorial judgement shipped with the app",
    personal: "Yours — something you entered",
  }[tier];

  return (
    <span
      title={title}
      className="rounded border border-line px-1 py-px text-[10px] tracking-wide text-ink-3 uppercase"
    >
      {label}
    </span>
  );
}

const WARNING_DOT: Record<DataWarning["severity"], string> = {
  serious: "var(--serious)",
  warning: "var(--warning)",
  info: "var(--border-strong)",
};

const WARNING_PREFIX: Record<DataWarning["severity"], string> = {
  serious: "Problem: ",
  warning: "Warning: ",
  info: "Note: ",
};

export function Warnings({ warnings }: { warnings: DataWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {warnings.map((w, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] text-ink-2">
          <span
            aria-hidden
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: WARNING_DOT[w.severity] }}
          />
          <span>
            {/* Severity is carried by colour, so it is also stated for screen readers. */}
            <span className="sr-only">{WARNING_PREFIX[w.severity]}</span>
            <span className={w.severity === "info" ? "" : "font-medium text-ink"}>{w.label}</span>
            {w.detail && <span className="block text-ink-3">{w.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

/** A 0-100 score as a bar. Always paired with its number — colour never carries the value alone. */
export function ScoreBar({
  score,
  label,
  width = 90,
  showValue = true,
}: {
  score: number;
  label?: string;
  width?: number;
  showValue?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="relative inline-block h-1.5 shrink-0 overflow-hidden rounded-full"
        style={{ width, background: "var(--surface-sunken)" }}
        role="img"
        aria-label={`${label ? `${label}: ` : ""}${score} out of 100`}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.max(2, score)}%`, background: scoreColor(score) }}
        />
      </span>
      {showValue && <span className="tnum text-[12.5px] text-ink-2">{score}</span>}
    </span>
  );
}

/**
 * Score colour is a *status* encoding, not a series colour: it says how good a number
 * is, and always appears beside the number itself.
 */
export function scoreColor(score: number): string {
  if (score >= 78) return "var(--good)";
  if (score >= 62) return "var(--seq-3)";
  if (score >= 48) return "var(--warning)";
  if (score >= 35) return "var(--serious)";
  return "var(--critical)";
}

export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 px-3.5 py-3">
      <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">{label}</div>
      <div
        className="tnum mt-1 text-[21px] leading-tight font-semibold tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[12.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function money(usd: number): string {
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}
