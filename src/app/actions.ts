"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as store from "@/lib/db/trips";
import * as stops from "@/lib/db/stops";
import * as placesStore from "@/lib/db/places";
import * as searchesStore from "@/lib/db/searches";
import * as eventsStore from "@/lib/db/events";
import * as usersStore from "@/lib/db/users";
import { getDestination } from "@/data/destinations";
import {
  ORIGINS,
  PLANNING_STATUSES,
  PLACE_CATEGORIES,
  type CandidateStatus,
  type ComparisonPreferences,
} from "@/lib/domain/types";
import { isValidDate, nightsBetween, today as todayISO } from "@/lib/dates";
import { flightSearch } from "@/lib/flights";
import type { FlightSearchQuery } from "@/lib/flights";
import { HOME_AIRPORTS } from "@/lib/config/home";
import { logAudit } from "@/lib/audit";

/**
 * Server actions.
 *
 * Every action validates its input and throws on anything it cannot honour. Nothing here
 * swallows an error and returns a plausible-looking success — a failed save that renders
 * as a saved form is the worst outcome available, and the one that costs the most later.
 */

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || isValidDate(v), { message: "Expected a YYYY-MM-DD date" });

const tripSchema = z
  .object({
    name: z.string().trim().min(1, "A trip needs a name").max(120),
    status: z.enum(PLANNING_STATUSES),
    startDate: optionalDate,
    endDate: optionalDate,
    flexibility: z.enum(["fixed", "few_days", "flexible_weeks", "month_open"]),
    // Airports the trip will use, in preference order. A closed set, because a free-text
    // code has no route data behind it and would silently score as JFK (ADR 0015).
    origins: z
      .array(z.enum(ORIGINS))
      .transform((v) => [...new Set(v)])
      .refine((v) => v.length > 0, "Pick at least one airport"),
    travelers: z.coerce.number().int().min(1).max(20),
    purpose: z.string().trim().max(2000),
    priorities: z.string().trim().max(2000),
    notes: z.string().trim().max(10000),
  })
  .refine((v) => !v.startDate || !v.endDate || nightsBetween(v.startDate, v.endDate) >= 1, {
    message: "The return date must be after the departure date",
    path: ["endDate"],
  });

function readTripForm(formData: FormData) {
  const parsed = tripSchema.safeParse({
    name: formData.get("name") ?? "",
    status: formData.get("status") ?? "idea",
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    flexibility: formData.get("flexibility") ?? "fixed",
    origins: (() => {
      const picked = formData.getAll("origins").map(String);
      return picked.length > 0 ? picked : HOME_AIRPORTS;
    })(),
    travelers: formData.get("travelers") ?? 2,
    purpose: formData.get("purpose") ?? "",
    priorities: formData.get("priorities") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }
  return parsed.data;
}

const tripId = z.coerce.number().int().positive();

function readTripId(formData: FormData): number {
  const parsed = tripId.safeParse(formData.get("tripId"));
  if (!parsed.success) throw new Error("Missing or invalid trip id");
  return parsed.data;
}

function readDestinationId(formData: FormData): string {
  const raw = String(formData.get("destinationId") ?? "");
  if (!getDestination(raw)) throw new Error(`Unknown destination "${raw}"`);
  return raw;
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export async function createTripAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const input = readTripForm(formData);
  const id = await store.createTrip({
    ...input,
    ownerId: user?.id,
  });

  void logAudit(user?.id ?? null, id, "trip_created", {
    name: input.name,
    status: input.status,
    travelers: input.travelers,
  });

  revalidatePath("/trips");
  revalidatePath("/");
  redirect(`/trips/${id}`);
}

export async function updateTripAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const id = readTripId(formData);
  const input = readTripForm(formData);
  await store.updateTrip(id, input);

  void logAudit(user?.id ?? null, id, "trip_updated", {
    name: input.name,
    status: input.status,
  });

  revalidatePath(`/trips/${id}`);
  revalidatePath("/trips");
  revalidatePath("/");
  redirect(`/trips/${id}`);
}

export async function setTripStatusAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const id = readTripId(formData);
  const status = z.enum(PLANNING_STATUSES).parse(formData.get("status"));
  await store.setTripStatus(id, status);

  void logAudit(user?.id ?? null, id, "trip_updated", { status });

  revalidatePath(`/trips/${id}`);
  revalidatePath("/trips");
  revalidatePath("/");
}

export async function setArchivedAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const id = readTripId(formData);
  const archived = String(formData.get("archived")) === "1";
  await store.setArchived(id, archived);

  void logAudit(user?.id ?? null, id, archived ? "trip_archived" : "trip_updated", {
    archived,
  });

  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath(`/trips/${id}`);
}

export async function duplicateTripAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const oldId = readTripId(formData);
  const newId = await store.duplicateTrip(oldId);

  void logAudit(user?.id ?? null, newId, "trip_created", {
    duplicatedFrom: oldId,
  });

  revalidatePath("/trips");
  redirect(`/trips/${newId}`);
}

export async function deleteTripAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const id = readTripId(formData);

  void logAudit(user?.id ?? null, id, "trip_deleted", {
    deletedAt: new Date().toISOString(),
  });

  await store.deleteTrip(id);
  revalidatePath("/trips");
  revalidatePath("/");
  redirect("/trips");
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export async function addCandidateAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  await store.addCandidate(id, readDestinationId(formData));
  revalidatePath(`/trips/${id}`);
}

export async function setCandidateStatusAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const id = readTripId(formData);
  const status = z
    .enum(["considering", "shortlisted", "rejected", "selected"])
    .parse(formData.get("status")) as CandidateStatus;
  const destinationId = readDestinationId(formData);

  await store.setCandidateStatus(id, destinationId, status);

  const actionType = status === "selected" ? "destination_selected" : status === "rejected" ? "destination_rejected" : "trip_updated";
  void logAudit(user?.id ?? null, id, actionType, {
    destination: destinationId,
    status,
  });

  // Choosing a destination is a planning milestone; move the trip on with it rather than
  // leaving the status to be updated by hand and quietly going stale.
  if (status === "selected") {
    const trip = await store.getTrip(id);
    if (trip && (trip.status === "idea" || trip.status === "comparing")) {
      await store.setTripStatus(id, "destination_selected");
    }
  }

  revalidatePath(`/trips/${id}`);
  revalidatePath(`/trips/${id}/compare`);
}

export async function setCandidateNoteAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  await store.setCandidateNote(
    id,
    readDestinationId(formData),
    String(formData.get("note") ?? "").slice(0, 4000),
  );
  revalidatePath(`/trips/${id}`);
}

export async function removeCandidateAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  await store.removeCandidate(id, readDestinationId(formData));
  revalidatePath(`/trips/${id}`);
}

// ---------------------------------------------------------------------------
// Links and preferences
// ---------------------------------------------------------------------------

export async function addLinkAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  const parsed = z
    .object({
      label: z.string().trim().min(1, "A link needs a label").max(200),
      url: z.string().trim().url("That is not a valid URL"),
    })
    .safeParse({ label: formData.get("label") ?? "", url: formData.get("url") ?? "" });

  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  await store.addLink(id, parsed.data.label, parsed.data.url);
  revalidatePath(`/trips/${id}`);
}

export async function removeLinkAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  await store.removeLink(z.coerce.number().int().positive().parse(formData.get("linkId")));
  revalidatePath(`/trips/${id}`);
}

export async function savePreferencesAction(
  id: number,
  prefs: ComparisonPreferences,
): Promise<void> {
  await store.savePreferences(id, prefs);
  revalidatePath(`/trips/${id}/compare`);
}

// ---------------------------------------------------------------------------
// Itinerary stops (Release 2)
// ---------------------------------------------------------------------------

const stopId = z.coerce.number().int().positive();

function readStopId(formData: FormData): number {
  const parsed = stopId.safeParse(formData.get("stopId"));
  if (!parsed.success) throw new Error("Missing or invalid stop id");
  return parsed.data;
}

export async function addStopAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  const destinationId = readDestinationId(formData);

  // Default the new stop to whatever the trip has left over, so the common case — laying
  // out stops one at a time until the trip is full — needs no arithmetic from the user.
  const nights = z.coerce.number().int().min(0).max(365).catch(1).parse(formData.get("nights"));

  await stops.addStop(id, destinationId, nights);
  revalidatePath(`/trips/${id}`);
}

export async function setStopNightsAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  const nights = z.coerce.number().int().min(0).max(365).parse(formData.get("nights"));
  await stops.setStopNights(readStopId(formData), nights);
  revalidatePath(`/trips/${id}`);
}

export async function setStopNoteAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  const note = z.string().trim().max(2000).parse(formData.get("note") ?? "");
  await stops.setStopNote(readStopId(formData), note);
  revalidatePath(`/trips/${id}`);
}

export async function removeStopAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  await stops.removeStop(id, readStopId(formData));
  revalidatePath(`/trips/${id}`);
}

export async function moveStopAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  await stops.moveStop(id, readStopId(formData), direction);
  revalidatePath(`/trips/${id}`);
}

/** Start the itinerary from the destination already chosen, giving it the whole trip. */
export async function seedItineraryAction(formData: FormData): Promise<void> {
  const id = readTripId(formData);
  const destinationId = readDestinationId(formData);
  const nights = z.coerce.number().int().min(1).max(365).parse(formData.get("nights"));
  await stops.seedStopsFromSelection(id, destinationId, nights);
  revalidatePath(`/trips/${id}`);
}

// ---------------------------------------------------------------------------
// Places (Release 3)
// ---------------------------------------------------------------------------

const placeId = z.coerce.number().int().positive();

function readPlaceId(formData: FormData): number {
  const parsed = placeId.safeParse(formData.get("placeId"));
  if (!parsed.success) throw new Error("Missing or invalid place id");
  return parsed.data;
}

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || Number.isFinite(v), { message: "Expected a number" });

const fetchedFieldsSchema = z.object({
  name: z.string().trim().min(1, "A place needs a name").max(200),
  address: z.string().trim().max(400).default(""),
  neighborhood: z.string().trim().max(200).default(""),
  lat: optionalNumber.refine((v) => v === null || (v >= -90 && v <= 90), "Latitude out of range"),
  lon: optionalNumber.refine((v) => v === null || (v >= -180 && v <= 180), "Longitude out of range"),
  hours: z.string().trim().max(500).default(""),
  priceLevel: optionalNumber.refine(
    (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 4),
    "Price level is 1-4",
  ),
  url: z.string().trim().max(500).default(""),
  providerPlaceId: z.string().trim().max(200).nullable().default(null),
});

const personalFieldsSchema = z.object({
  whyItMatters: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(4000).default(""),
  priority: z.enum(["must", "considering", "if_time", "ruled_out"]).default("considering"),
  reservationRequired: z
    .union([z.literal("on"), z.literal("true"), z.null(), z.undefined(), z.string()])
    .transform((v) => v === "on" || v === "true"),
});

function readFetched(formData: FormData) {
  return fetchedFieldsSchema.parse({
    name: formData.get("name") ?? "",
    address: formData.get("address") ?? "",
    neighborhood: formData.get("neighborhood") ?? "",
    lat: formData.get("lat") ?? "",
    lon: formData.get("lon") ?? "",
    hours: formData.get("hours") ?? "",
    priceLevel: formData.get("priceLevel") ?? "",
    url: formData.get("url") ?? "",
    providerPlaceId: null,
  });
}

function readPersonal(formData: FormData) {
  return personalFieldsSchema.parse({
    whyItMatters: formData.get("whyItMatters") ?? "",
    notes: formData.get("notes") ?? "",
    priority: formData.get("priority") ?? "considering",
    reservationRequired: formData.get("reservationRequired"),
  });
}

/**
 * Record where a place came from, if the user said.
 *
 * Returns null rather than inventing a source — "no source recorded" is a true and useful
 * statement, and the UI warns about it. A fabricated source would be worse than none.
 */
async function readSource(formData: FormData): Promise<number | null> {
  const label = String(formData.get("sourceLabel") ?? "").trim();
  if (label === "") return null;

  return placesStore.createSource({
    label,
    url: String(formData.get("sourceUrl") ?? "").trim(),
    kind: z
      .enum(["web", "person", "guidebook", "provider", "personal"])
      .catch("web")
      .parse(formData.get("sourceKind")),
  });
}

export async function addPlaceAction(formData: FormData): Promise<void> {
  const destinationId = readDestinationId(formData);
  const rawTripId = formData.get("tripId");
  const tripIdValue = rawTripId === null || rawTripId === "" ? null : tripId.parse(rawTripId);

  const category = z.enum(PLACE_CATEGORIES).parse(formData.get("category"));
  const sourceId = await readSource(formData);

  // Only claim a verification date if the user actually confirmed they checked. An
  // automatic "today" here would make every place look verified when none had been.
  const verifiedOn = formData.get("verifiedNow") === "on" ? todayISO() : null;

  await placesStore.createPlace({
    destinationId,
    tripId: tripIdValue,
    category,
    fetched: readFetched(formData),
    personal: readPersonal(formData),
    sourceId,
    verifiedOn,
  });

  if (tripIdValue !== null) revalidatePath(`/trips/${tripIdValue}`);
  revalidatePath(`/destinations/${destinationId}`);
}

export async function reverifyPlaceAction(formData: FormData): Promise<void> {
  const id = readPlaceId(formData);
  const existing = await placesStore.getPlace(id);
  if (!existing) throw new Error(`No place with id ${id}`);

  const sourceId = (await readSource(formData)) ?? existing.sourceId;
  await placesStore.reverifyPlace(id, readFetched(formData), sourceId, todayISO());

  if (existing.tripId !== null) revalidatePath(`/trips/${existing.tripId}`);
  revalidatePath(`/destinations/${existing.destinationId}`);
}

export async function updatePlaceNotesAction(formData: FormData): Promise<void> {
  const id = readPlaceId(formData);
  const existing = await placesStore.getPlace(id);
  if (!existing) throw new Error(`No place with id ${id}`);

  await placesStore.updatePersonalFields(id, readPersonal(formData));

  if (existing.tripId !== null) revalidatePath(`/trips/${existing.tripId}`);
  revalidatePath(`/destinations/${existing.destinationId}`);
}

export async function setPlacePriorityAction(formData: FormData): Promise<void> {
  const id = readPlaceId(formData);
  const priority = z.enum(["must", "considering", "if_time", "ruled_out"]).parse(formData.get("priority"));
  const existing = await placesStore.getPlace(id);
  if (!existing) throw new Error(`No place with id ${id}`);

  await placesStore.setPlacePriority(id, priority);

  if (existing.tripId !== null) revalidatePath(`/trips/${existing.tripId}`);
  revalidatePath(`/destinations/${existing.destinationId}`);
}

/** Bring a standing destination note onto this trip, keeping the original. */
export async function copyPlaceToTripAction(formData: FormData): Promise<void> {
  const id = readPlaceId(formData);
  const trip = readTripId(formData);
  await placesStore.copyPlaceToTrip(id, trip);
  revalidatePath(`/trips/${trip}`);
}

export async function deletePlaceAction(formData: FormData): Promise<void> {
  const id = readPlaceId(formData);
  const existing = await placesStore.getPlace(id);
  if (!existing) return;

  await placesStore.deletePlace(id);

  if (existing.tripId !== null) revalidatePath(`/trips/${existing.tripId}`);
  revalidatePath(`/destinations/${existing.destinationId}`);
}

export async function deleteFlightSearchAction(formData: FormData): Promise<void> {
  const searchId = Number(formData.get("searchId"));
  const tripId = Number(formData.get("tripId"));
  if (!Number.isFinite(searchId) || !Number.isFinite(tripId)) {
    throw new Error("Invalid search or trip ID");
  }

  await searchesStore.deleteFlightSearch(searchId);
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteHotelSearchAction(formData: FormData): Promise<void> {
  const searchId = Number(formData.get("searchId"));
  const tripId = Number(formData.get("tripId"));
  if (!Number.isFinite(searchId) || !Number.isFinite(tripId)) {
    throw new Error("Invalid search or trip ID");
  }

  await searchesStore.deleteHotelSearch(searchId);
  revalidatePath(`/trips/${tripId}`);
}

const eventSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  label: z.string().trim().min(1).max(200),
  startDate: z.string().refine((v) => isValidDate(v), "Invalid date"),
  endDate: z.string().refine((v) => isValidDate(v), "Invalid date"),
  kind: z.enum(["constraint", "opportunity"]),
  notes: z.string().trim().max(1000),
});

export async function addEventAction(formData: FormData): Promise<void> {
  const data = eventSchema.safeParse({
    tripId: formData.get("tripId"),
    label: formData.get("label"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    kind: formData.get("kind"),
    notes: formData.get("notes"),
  });

  if (!data.success) throw new Error("Invalid event data");
  if (data.data.startDate > data.data.endDate) throw new Error("Start date must be before end date");

  await eventsStore.createEvent(
    data.data.tripId,
    data.data.label,
    data.data.startDate,
    data.data.endDate,
    data.data.kind,
    data.data.notes,
  );

  revalidatePath(`/trips/${data.data.tripId}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const eventId = Number(formData.get("eventId"));
  const tripId = Number(formData.get("tripId"));
  if (!Number.isFinite(eventId) || !Number.isFinite(tripId)) {
    throw new Error("Invalid event or trip ID");
  }

  await eventsStore.deleteEvent(eventId);
  revalidatePath(`/trips/${tripId}`);
}

// ---------------------------------------------------------------------------
// Budget items (Release 2)
// ---------------------------------------------------------------------------

const budgetItemSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  category: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  estimatedUsd: z.coerce.number().nonnegative().optional(),
  bookedUsd: z.coerce.number().nonnegative().optional(),
  dueOn: optionalDate,
  notes: z.string().trim().max(1000),
});

export async function createBudgetItemAction(formData: FormData): Promise<void> {
  const { createBudgetItem } = await import("@/lib/db/budget");

  const data = budgetItemSchema.safeParse({
    tripId: formData.get("tripId"),
    category: formData.get("category"),
    label: formData.get("label"),
    estimatedUsd: formData.get("estimatedUsd") ? Number(formData.get("estimatedUsd")) : undefined,
    bookedUsd: formData.get("bookedUsd") ? Number(formData.get("bookedUsd")) : undefined,
    dueOn: formData.get("dueOn") ?? "",
    notes: formData.get("notes"),
  });

  if (!data.success) throw new Error("Invalid budget item data");

  await createBudgetItem(
    data.data.tripId,
    data.data.category,
    data.data.label,
    data.data.estimatedUsd ?? null,
    data.data.dueOn,
    data.data.notes,
  );

  revalidatePath(`/trips/${data.data.tripId}`);
}

export async function updateBudgetItemAction(formData: FormData): Promise<void> {
  const { updateBudgetItem } = await import("@/lib/db/budget");

  const budgetId = z.coerce.number().int().positive().safeParse(formData.get("budgetId"));
  const tripId = z.coerce.number().int().positive().safeParse(formData.get("tripId"));

  if (!budgetId.success || !tripId.success) {
    throw new Error("Invalid budget item or trip ID");
  }

  const data = budgetItemSchema.partial().safeParse({
    category: formData.get("category"),
    label: formData.get("label"),
    estimatedUsd: formData.get("estimatedUsd") ? Number(formData.get("estimatedUsd")) : undefined,
    bookedUsd: formData.get("bookedUsd") ? Number(formData.get("bookedUsd")) : undefined,
    dueOn: formData.get("dueOn") ?? "",
    notes: formData.get("notes"),
  });

  if (!data.success) throw new Error("Invalid budget item data");

  await updateBudgetItem(budgetId.data, {
    category: data.data.category,
    label: data.data.label,
    estimatedUsd: data.data.estimatedUsd ?? null,
    bookedUsd: data.data.bookedUsd ?? null,
    dueOn: data.data.dueOn,
    notes: data.data.notes,
  });

  revalidatePath(`/trips/${tripId.data}`);
}

export async function deleteBudgetItemAction(formData: FormData): Promise<void> {
  const { deleteBudgetItem } = await import("@/lib/db/budget");

  const budgetId = Number(formData.get("budgetId"));
  const tripId = Number(formData.get("tripId"));
  if (!Number.isFinite(budgetId) || !Number.isFinite(tripId)) {
    throw new Error("Invalid budget item or trip ID");
  }

  await deleteBudgetItem(budgetId);
  revalidatePath(`/trips/${tripId}`);
}

export async function createShareLinkAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const tripId = Number(formData.get("tripId"));
  const note = String(formData.get("note") || "");

  if (!Number.isFinite(tripId)) {
    throw new Error("Invalid trip ID");
  }

  const createdBy = user?.id ?? "system";

  await usersStore.createShareLink(tripId, createdBy, null, note);

  void logAudit(user?.id ?? null, tripId, "trip_shared", {
    note,
  });

  revalidatePath(`/trips/${tripId}`);
}

export async function deleteShareAction(formData: FormData): Promise<void> {
  const shareId = String(formData.get("shareId"));
  const tripId = Number(formData.get("tripId"));

  if (!Number.isFinite(tripId)) {
    throw new Error("Invalid trip ID");
  }

  await usersStore.deleteShare(shareId);
  revalidatePath(`/trips/${tripId}`);
}

// ---------------------------------------------------------------------------
// Flight searches
// ---------------------------------------------------------------------------

export async function searchFlightsAction(formData: FormData): Promise<void> {
  const tripId = Number(formData.get("tripId"));
  const originStrings = (formData.getAll("origins") as string[]).filter(
    (o): o is typeof ORIGINS[number] => ORIGINS.includes(o as typeof ORIGINS[number]),
  );
  const destinationAirport = String(formData.get("destinationAirport") ?? "");
  const departDate = String(formData.get("departDate") ?? "");
  const returnDate = String(formData.get("returnDate") ?? "");
  const travellers = Number(formData.get("travellers") ?? 1);

  if (!Number.isFinite(tripId)) {
    throw new Error("Invalid trip ID");
  }

  if (originStrings.length === 0) {
    throw new Error("At least one origin airport is required");
  }

  if (!destinationAirport) {
    throw new Error("Destination airport is required");
  }

  if (!isValidDate(departDate)) {
    throw new Error("Departure date must be in YYYY-MM-DD format");
  }

  if (returnDate && !isValidDate(returnDate)) {
    throw new Error("Return date must be in YYYY-MM-DD format");
  }

  if (travellers < 1 || travellers > 20) {
    throw new Error("Number of travellers must be between 1 and 20");
  }

  const query: FlightSearchQuery = {
    origins: originStrings,
    destinationAirport,
    departDate,
    returnDate: returnDate || undefined,
    travellers,
  };

  try {
    const searcher = flightSearch();
    const results = await searcher.search(query);

    // Store each result from each origin
    for (const result of results) {
      await searchesStore.storeFlightSearch(tripId, result);
    }

    revalidatePath(`/trips/${tripId}`);
  } catch (error) {
    throw new Error(`Flight search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function searchHotelsAction(formData: FormData): Promise<void> {
  const tripId = Number(formData.get("tripId"));
  const destinationId = String(formData.get("destinationId") ?? "");
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");
  const guests = Number(formData.get("guests") ?? 1);

  if (!Number.isFinite(tripId)) {
    throw new Error("Invalid trip ID");
  }

  if (!destinationId) {
    throw new Error("Destination is required");
  }

  if (!isValidDate(checkIn)) {
    throw new Error("Check-in date must be in YYYY-MM-DD format");
  }

  if (!isValidDate(checkOut)) {
    throw new Error("Check-out date must be in YYYY-MM-DD format");
  }

  if (new Date(checkOut) <= new Date(checkIn)) {
    throw new Error("Check-out date must be after check-in date");
  }

  if (guests < 1 || guests > 20) {
    throw new Error("Number of guests must be between 1 and 20");
  }

  try {
    const { hotelSearch } = await import("@/lib/hotels");
    const query = {
      destinationId,
      checkIn,
      checkOut,
      guests,
    };

    const searcher = hotelSearch();
    const result = await searcher.search(query);

    if (result) {
      await searchesStore.storeHotelSearch(
        tripId,
        destinationId,
        checkIn,
        checkOut,
        result,
        result.provider,
        result.retrievedAt,
      );
    }

    revalidatePath(`/trips/${tripId}`);
  } catch (error) {
    throw new Error(`Hotel search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signUpAction(formData: FormData): Promise<{ user: any } | { error: string }> {
  try {
    const { signUp } = await import("@/lib/auth");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    const user = await signUp(email, password);

    void logAudit(user?.id ?? null, null, "user_signed_up", {
      email,
    });

    revalidatePath("/trips");
    revalidatePath("/");
    return { user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign up failed";
    return { error: message };
  }
}

export async function signInAction(formData: FormData): Promise<{ user: any } | { error: string }> {
  try {
    const { signIn } = await import("@/lib/auth");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    const user = await signIn(email, password);

    void logAudit(user?.id ?? null, null, "user_signed_in", {
      email,
    });

    revalidatePath("/trips");
    revalidatePath("/");
    return { user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed";
    return { error: message };
  }
}

export async function signOutAction(): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const { signOut } = await import("@/lib/auth");

  void logAudit(user?.id ?? null, null, "user_signed_out", {});

  await signOut();
  revalidatePath("/trips");
  revalidatePath("/");
  redirect("/");
}

// ---------------------------------------------------------------------------
// Collaborator Invites
// ---------------------------------------------------------------------------

function logEmail(to: string, subject: string, body: string): void {
  console.log(`[EMAIL] To: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Body:\n${body}\n`);
}

export async function inviteCollaboratorAction(formData: FormData): Promise<{ error?: string; inviteToken?: string }> {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "You must be signed in to invite collaborators" };
    }

    const tripId = Number(formData.get("tripId") ?? 0);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = String(formData.get("role") ?? "editor") as "editor" | "viewer";

    if (!tripId) {
      throw new Error("Invalid trip ID");
    }

    if (!email || !email.includes("@")) {
      throw new Error("Please provide a valid email address");
    }

    if (role !== "editor" && role !== "viewer") {
      throw new Error("Invalid role");
    }

    // Verify the user owns the trip
    const trip = await store.getTrip(tripId);
    if (!trip || trip.ownerId !== currentUser.id) {
      return { error: "You must be the trip owner to invite collaborators" };
    }

    // Don't invite yourself
    if (email === currentUser.email) {
      return { error: "You cannot invite yourself" };
    }

    // Create the invite
    const invite = await usersStore.createInvite(tripId, email, role);

    // Log the invite email (mock for now)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${invite.token}`;
    logEmail(
      email,
      `You're invited to collaborate on "${trip.name}"`,
      `Hi there,

${currentUser.email} has invited you to collaborate on their trip "${trip.name}".

Accept the invitation to view and edit this trip:
${inviteUrl}

This link expires in 7 days.

Best,
Travel Intelligence Hub`
    );

    revalidatePath(`/trips/${tripId}`);
    return { inviteToken: invite.token };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invite";
    return { error: message };
  }
}

export async function acceptInviteAction(formData: FormData): Promise<{ error?: string; tripId?: number }> {
  try {
    const { getCurrentUser, signIn } = await import("@/lib/auth");
    const token = String(formData.get("token") ?? "").trim();

    if (!token) {
      throw new Error("Invalid invite token");
    }

    // Get the invite
    const invite = await usersStore.getInviteByToken(token);
    if (!invite) {
      throw new Error("Invite not found or has expired");
    }

    // Get or create user (signed in or need to sign up)
    let user = await getCurrentUser();
    if (!user) {
      // User is not signed in, they need to sign up or sign in
      return { error: "You must sign in or create an account to accept this invitation" };
    }

    // Check if user already is a collaborator
    const collaborators = await usersStore.listCollaborators(invite.tripId);
    if (collaborators.some((c) => c.userId === user!.id)) {
      return { error: "You are already a collaborator on this trip" };
    }

    // Accept the invite
    await usersStore.acceptInvite(token, user.id);

    revalidatePath(`/trips/${invite.tripId}`);
    return { tripId: invite.tripId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept invite";
    return { error: message };
  }
}

export async function declineInviteAction(formData: FormData): Promise<{ error?: string }> {
  try {
    const token = String(formData.get("token") ?? "").trim();

    if (!token) {
      throw new Error("Invalid invite token");
    }

    // Delete the invite
    await usersStore.deleteInvite(token);

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to decline invite";
    return { error: message };
  }
}

export async function revokeInviteAction(formData: FormData): Promise<{ error?: string }> {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "You must be signed in" };
    }

    const tripId = Number(formData.get("tripId") ?? 0);
    const token = String(formData.get("token") ?? "").trim();

    if (!tripId || !token) {
      throw new Error("Invalid trip ID or invite token");
    }

    // Verify the user owns the trip
    const trip = await store.getTrip(tripId);
    if (!trip || trip.ownerId !== currentUser.id) {
      return { error: "You must be the trip owner to revoke invites" };
    }

    // Delete the invite
    await usersStore.deleteInvite(token);

    revalidatePath(`/trips/${tripId}`);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke invite";
    return { error: message };
  }
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

const bookingStatusEnum = z.enum(["option", "tentative", "confirmed", "cancelled"]);

const flightBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  airline: z.string().trim().max(100),
  flightNumber: z.string().trim().max(20),
  cabin: z.string().trim().max(50),
  confirmation: z.string().trim().max(50),
  notes: z.string().trim().max(2000),
  costUsd: optionalNumber,
  status: bookingStatusEnum,
});

const hotelBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  nightlyUsd: optionalNumber,
  taxesUsd: optionalNumber,
  resortFeeUsd: optionalNumber,
  refundable: z.union([z.literal("on"), z.literal("true"), z.null(), z.undefined()]).transform((v) => v === "on" || v === "true"),
  cancelBy: optionalDate,
  breakfastIncluded: z.union([z.literal("on"), z.literal("true"), z.null(), z.undefined()]).transform((v) => v === "on" || v === "true"),
  confirmation: z.string().trim().max(50),
  notes: z.string().trim().max(2000),
  status: bookingStatusEnum,
});

export async function createFlightBookingAction(formData: FormData): Promise<void> {
  const { updateFlightBooking } = await import("@/lib/db/bookings");
  
  const parsed = flightBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    airline: formData.get("airline") ?? "",
    flightNumber: formData.get("flightNumber") ?? "",
    cabin: formData.get("cabin") ?? "",
    confirmation: formData.get("confirmation") ?? "",
    notes: formData.get("notes") ?? "",
    costUsd: formData.get("costUsd") ?? "",
    status: formData.get("status") ?? "option",
  });

  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const tripId = Number(formData.get("tripId"));
  if (!Number.isFinite(tripId)) throw new Error("Invalid trip ID");

  await updateFlightBooking(
    parsed.data.bookingId,
    parsed.data.airline,
    parsed.data.flightNumber,
    parsed.data.cabin,
    parsed.data.confirmation,
    parsed.data.notes,
    parsed.data.costUsd,
    parsed.data.status,
  );

  revalidatePath(`/trips/${tripId}`);
}

export async function createHotelBookingAction(formData: FormData): Promise<void> {
  const { updateHotelBooking } = await import("@/lib/db/bookings");
  
  const parsed = hotelBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    name: formData.get("name") ?? "",
    nightlyUsd: formData.get("nightlyUsd") ?? "",
    taxesUsd: formData.get("taxesUsd") ?? "",
    resortFeeUsd: formData.get("resortFeeUsd") ?? "",
    refundable: formData.get("refundable"),
    cancelBy: formData.get("cancelBy") ?? "",
    breakfastIncluded: formData.get("breakfastIncluded"),
    confirmation: formData.get("confirmation") ?? "",
    notes: formData.get("notes") ?? "",
    status: formData.get("status") ?? "option",
  });

  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const tripId = Number(formData.get("tripId"));
  if (!Number.isFinite(tripId)) throw new Error("Invalid trip ID");

  await updateHotelBooking(
    parsed.data.bookingId,
    parsed.data.name,
    parsed.data.nightlyUsd,
    parsed.data.taxesUsd,
    parsed.data.resortFeeUsd,
    parsed.data.refundable,
    parsed.data.cancelBy,
    parsed.data.breakfastIncluded,
    parsed.data.confirmation,
    parsed.data.notes,
    parsed.data.status,
  );

  revalidatePath(`/trips/${tripId}`);
}
