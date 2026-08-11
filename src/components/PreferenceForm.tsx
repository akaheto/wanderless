"use client";

import { useId, useState } from "react";
import { destinationsByRegion } from "@/data/destinations";
import {
  ALLIANCES,
  ALLIANCE_LABELS,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  ORIGINS,
} from "@/lib/domain/types";
import { airportInfo, airportNote } from "@/data/home";
import type { ComparisonPreferences } from "@/lib/domain/types";
import { Button, Field } from "./ui";

/**
 * A plain GET form. Submitting rewrites the URL, the server re-scores, and the result is
 * a link you can keep. The only thing React is doing here is showing live values next to
 * the sliders — with JavaScript off, the form still submits and still works.
 */

function Slider({
  name,
  label,
  min,
  max,
  step = 1,
  initial,
  format,
  hint,
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  initial: number;
  format: (v: number) => string;
  hint?: string;
}) {
  const [value, setValue] = useState(initial);
  const id = useId();

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[12.5px] font-medium text-ink-2">
          {label}
        </label>
        <span className="tnum text-[12.5px] font-medium">{format(value)}</span>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      {hint && <p className="mt-0.5 text-[11.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function PreferenceForm({
  action,
  startDate,
  endDate,
  preferences,
  selectedIds,
  hiddenFields,
  submitLabel = "Update comparison",
  extraActions,
}: {
  action: string;
  startDate: string;
  endDate: string;
  preferences: ComparisonPreferences;
  selectedIds: string[];
  hiddenFields?: Record<string, string>;
  submitLabel?: string;
  extraActions?: React.ReactNode;
}) {
  const regions = destinationsByRegion();
  const selected = new Set(selectedIds);

  return (
    <form method="get" action={action} className="space-y-6">
      {Object.entries(hiddenFields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Depart">
          <input type="date" name="start" defaultValue={startDate} required />
        </Field>
        <Field label="Return">
          <input type="date" name="end" defaultValue={endDate} required />
        </Field>
      </div>

      {/* Airports are a fixed set, in preference order — a free-text box invited codes the
          route table has no data for, and the app would quietly quote JFK numbers back. */}
      <fieldset className="rounded-md border border-line px-3 py-2.5">
        <legend className="px-1 text-[12.5px] font-medium text-ink-2">Airports you will use</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {ORIGINS.map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-[12.5px]">
              <input
                type="checkbox"
                name="from"
                value={o}
                defaultChecked={preferences.origins.includes(o)}
              />
              <span>{airportInfo(o)?.name ?? o}</span>
            </label>
          ))}
        </div>
        {/* The airport note lives with the airport, not in this component. */}
        {ORIGINS.map((o) => airportNote(o)).filter(Boolean).length > 0 && (
          <p className="mt-1.5 text-[12px] text-ink-3">{airportNote("LGA")}</p>
        )}
      </fieldset>

      <fieldset className="rounded-md border border-line px-3 py-2.5">
        <legend className="px-1 text-[12.5px] font-medium text-ink-2">Airlines</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {ALLIANCES.map((a) => (
            <label key={a} className="flex items-center gap-1.5 text-[12.5px]">
              <input
                type="checkbox"
                name="alliances"
                value={a}
                defaultChecked={preferences.alliances.includes(a)}
              />
              <span>{ALLIANCE_LABELS[a]}</span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-ink-3">
          Leave all unticked for no restriction. Carriers outside the three alliances are
          included under “No alliance” — several are the only way to reach a destination here.
        </p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rain tolerance">
          <select name="rain" defaultValue={preferences.rainTolerance}>
            <option value="low">Low — I want dry days</option>
            <option value="medium">Medium — some rain is fine</option>
            <option value="high">High — rain does not stop me</option>
          </select>
        </Field>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-[12.5px] font-semibold tracking-wide text-ink-3 uppercase">
          What you want
        </legend>
        <Slider
          name="idealHigh"
          label="Ideal daytime high"
          min={35}
          max={100}
          initial={preferences.idealHighF}
          format={(v) => `${v}°F`}
        />
        <Slider
          name="maxHours"
          label="Maximum travel time"
          min={3}
          max={36}
          initial={preferences.maxTravelHours}
          format={(v) => `${v}h each way`}
          hint="Destinations beyond this are still scored, but never ranked above one that fits."
        />
        <Slider
          name="budget"
          label="Hotel budget"
          min={80}
          max={1500}
          step={10}
          initial={preferences.hotelBudgetUSD}
          format={(v) => `$${v}/night`}
        />
        <Slider
          name="beach"
          label="How much beach time matters"
          min={0}
          max={5}
          initial={preferences.beachImportance}
          format={(v) => `${v}/5`}
        />
        <Slider
          name="cityResort"
          label="City versus resort"
          min={-2}
          max={2}
          step={0.5}
          initial={preferences.cityVsResort}
          format={(v) => (v === 0 ? "no preference" : v < 0 ? `city ${Math.abs(v)}` : `resort ${v}`)}
        />
        <Slider
          name="activity"
          label="Activity level"
          min={0}
          max={5}
          initial={preferences.activityLevel}
          format={(v) => `${v}/5`}
          hint="0 is slow days by the pool, 5 is a packed itinerary."
        />
        <Slider
          name="crowds"
          label="Crowd tolerance"
          min={0}
          max={5}
          initial={preferences.crowdTolerance}
          format={(v) => `${v}/5`}
          hint="0 means peak season is disqualifying."
        />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold tracking-wide text-ink-3 uppercase">
          How much each category counts
        </legend>
        <div className="space-y-3">
          {CATEGORY_KEYS.map((key) => (
            <Slider
              key={key}
              name={`w_${key}`}
              label={CATEGORY_LABELS[key]}
              min={0}
              max={5}
              initial={preferences.weights[key]}
              format={(v) => (v === 0 ? "ignored" : `×${v}`)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold tracking-wide text-ink-3 uppercase">
          Destinations to compare
        </legend>
        <p className="mb-2 text-[11.5px] text-ink-3">
          Leave all unticked to rank the whole catalog.
        </p>
        <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border border-line bg-surface-2 p-3">
          {regions.map((group) => (
            <div key={group.region}>
              <div className="mb-1 text-[11px] tracking-wide text-ink-3 uppercase">{group.region}</div>
              <div className="space-y-1">
                {group.items.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      name="dest"
                      value={d.id}
                      defaultChecked={selected.has(d.id)}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    <span>{d.name}</span>
                    <span className="text-ink-3">· {d.area}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        {extraActions}
      </div>
    </form>
  );
}
