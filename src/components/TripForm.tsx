import {
  DATE_FLEXIBILITY_LABELS,
  ORIGINS,
  PLANNING_STATUSES,
  PLANNING_STATUS_LABELS,
  type Trip,
} from "@/lib/domain/types";
import { Button, ButtonLink, Card, CardHeader, Field } from "./ui";

export function TripForm({
  action,
  trip,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  trip?: Trip;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {trip && <input type="hidden" name="tripId" value={trip.id} />}

      <Card>
        <CardHeader title="The basics" />
        <div className="space-y-4 px-4 py-4">
          <Field label="Trip name" hint="Whatever you call it in your head — “Vietnam, March” works.">
            <input type="text" name="name" defaultValue={trip?.name ?? ""} required maxLength={120} autoFocus />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Planning status">
              <select name="status" defaultValue={trip?.status ?? "idea"}>
                {PLANNING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PLANNING_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Travellers">
              <input type="number" name="travelers" min={1} max={20} defaultValue={trip?.travelers ?? 2} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Departure date">
              <input type="date" name="startDate" defaultValue={trip?.startDate ?? ""} />
            </Field>
            <Field label="Return date">
              <input type="date" name="endDate" defaultValue={trip?.endDate ?? ""} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How fixed are the dates?">
              <select name="flexibility" defaultValue={trip?.flexibility ?? "fixed"}>
                {Object.entries(DATE_FLEXIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Airports you will use"
              hint="Journey times come from these — LaGuardia connects to everything."
            >
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                {ORIGINS.map((o) => (
                  <label key={o} className="flex items-center gap-1.5 text-[12.5px]">
                    <input
                      type="checkbox"
                      name="origins"
                      value={o}
                      defaultChecked={(trip?.origins ?? [...ORIGINS]).includes(o)}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="What the trip is for"
          note="This is yours — nothing generated ever overwrites it."
        />
        <div className="space-y-4 px-4 py-4">
          <Field label="Purpose" hint="Why this trip, and what would make it a success.">
            <textarea name="purpose" defaultValue={trip?.purpose ?? ""} maxLength={2000} />
          </Field>
          <Field label="Priorities" hint="The things that must happen, in the order they matter.">
            <textarea name="priorities" defaultValue={trip?.priorities ?? ""} maxLength={2000} />
          </Field>
          <Field label="Notes">
            <textarea name="notes" defaultValue={trip?.notes ?? ""} maxLength={10000} />
          </Field>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
