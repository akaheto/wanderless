"use client";

import type { BudgetTotals, BudgetCategory } from "@/lib/money/budget";
import type { DataWarning } from "@/lib/domain/types";
import { format } from "@/lib/money";
import { Badge, Card, CardHeader } from "./ui";
import { formatDate } from "@/lib/dates";

export interface TripBudgetPanelProps {
  totals: BudgetTotals;
  byCategory: { category: BudgetCategory; total: { amount: number; currency: string }; count: number }[];
  upcomingPayments: Array<{
    item: { id: number; label: string; category: string; dueOn: string | null; paid: boolean };
    dueOn: string;
    days: number;
    amount: { amount: number; currency: string };
  }>;
}

const categoryLabels: Record<BudgetCategory, string> = {
  flights: "Flights",
  lodging: "Lodging",
  activities: "Activities",
  food: "Food",
  transport: "Ground transport",
  other: "Other",
};

function WarningBadge({ warning }: { warning: DataWarning }) {
  return (
    <div className="rounded bg-surface-1 p-3">
      <div className={`text-[12px] font-medium ${warning.severity === "serious" ? "text-red-800" : warning.severity === "warning" ? "text-amber-800" : "text-ink-2"}`}>
        {warning.label}
      </div>
      {warning.detail && <div className="mt-0.5 text-[12px] text-ink-3">{warning.detail}</div>}
    </div>
  );
}

export function TripBudgetPanel({ totals, byCategory, upcomingPayments }: TripBudgetPanelProps) {
  return (
    <Card>
      <CardHeader
        title="Trip budget"
        note={
          totals.missingRates.length > 0
            ? `Missing rates for ${totals.missingRates.join(", ")}`
            : byCategory.length > 0
              ? `${byCategory.reduce((sum, cat) => sum + cat.count, 0)} items across ${byCategory.length} categories`
              : "No budget items yet"
        }
      />

      {/* Warnings */}
      {totals.warnings.length > 0 && (
        <div className="border-t border-line px-4 py-3 space-y-2">
          {totals.warnings.map((warning, i) => (
            <WarningBadge key={i} warning={warning} />
          ))}
        </div>
      )}

      {/* Totals grid */}
      <div className="grid gap-px bg-line sm:grid-cols-2">
        <div className="space-y-3 bg-surface-1 px-4 py-3">
          <div>
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Estimated</div>
            <div className="tnum mt-1 text-[16px] font-semibold">{format(totals.estimated)}</div>
            <div className="mt-0.5 text-[12px] text-ink-3">What you expect to spend</div>
          </div>
        </div>

        <div className="space-y-3 bg-surface-1 px-4 py-3">
          <div>
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Booked</div>
            <div className="tnum mt-1 text-[16px] font-semibold">{format(totals.booked)}</div>
            <div className="mt-0.5 text-[12px] text-ink-3">
              {totals.booked.amount === 0 ? "No bookings yet" : `${(totals.variance.amount > 0 ? "+" : "")}${format(totals.variance)} vs estimate`}
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-surface-1 px-4 py-3">
          <div>
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Exposure</div>
            <div className="tnum mt-1 text-[16px] font-semibold">{format(totals.exposure)}</div>
            <div className="mt-0.5 text-[12px] text-ink-3">Non-refundable commitments</div>
          </div>
        </div>

        <div className="space-y-3 bg-surface-1 px-4 py-3">
          <div>
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Recoverable</div>
            <div className="tnum mt-1 text-[16px] font-semibold">{format(totals.recoverable)}</div>
            <div className="mt-0.5 text-[12px] text-ink-3">Still refundable until cancellation date</div>
          </div>
        </div>
      </div>

      {/* Per-category breakdown */}
      {byCategory.length > 0 && (
        <div className="border-t border-line">
          <div className="px-4 py-3">
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase mb-3">By category</div>
            <div className="space-y-2">
              {byCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-2">{categoryLabels[cat.category]}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-2">{format(cat.total)}</span>
                    <Badge tone="neutral">{cat.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming payments */}
      {upcomingPayments.length > 0 && (
        <div className="border-t border-line">
          <div className="px-4 py-3">
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase mb-3">Payments due</div>
            <div className="space-y-2">
              {upcomingPayments.map((payment) => (
                <div key={payment.item.id} className="flex items-start justify-between gap-2 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink-2">{payment.item.label}</div>
                    <div className="text-[12px] text-ink-3">
                      Due {formatDate(payment.dueOn, { year: false })} ({payment.days === 0 ? "today" : payment.days === 1 ? "tomorrow" : `in ${payment.days} days`})
                    </div>
                  </div>
                  <div className="shrink-0 font-medium text-ink-2 tnum">{format(payment.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversions (if any) */}
      {totals.conversions.length > 0 && (
        <div className="border-t border-line bg-surface-0 px-4 py-2.5">
          <div className="text-[11px] text-ink-3">
            Converted at rates from{" "}
            <span className="font-medium">
              {totals.conversions
                .map((c) => c.rateDate)
                .filter((d, i, arr) => arr.indexOf(d) === i)
                .join(", ")}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
