import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import { isValidDate } from "@/lib/dates";
import { type Money, money, toMajorUnits } from "@/lib/money";

export interface BudgetItem {
  id: number;
  tripId: number;
  category: string;
  label: string;
  estimated: Money | null;
  booked: Money | null;
  refundable: boolean;
  refundableUntil: string | null;
  dueOn: string | null;
  paid: boolean;
  notes: string;
  createdAt: string;
}

function toBudgetItem(row: Row): BudgetItem {
  const currency = String(row.currency ?? "USD").toUpperCase();
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    category: String(row.category),
    label: String(row.label),
    estimated: row.estimated_minor === null ? null : money(Number(row.estimated_minor), currency),
    booked: row.booked_minor === null ? null : money(Number(row.booked_minor), currency),
    refundable: Number(row.refundable) === 1,
    refundableUntil: row.refundable_until === null ? null : String(row.refundable_until),
    dueOn: row.due_on === null ? null : String(row.due_on),
    paid: Number(row.paid) === 1,
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function createBudgetItem(
  tripId: number,
  category: string,
  label: string,
  estimated: Money | null = null,
  dueOn: string | null = null,
  notes: string = "",
  refundableUntil: string | null = null,
): Promise<BudgetItem> {
  if (dueOn && !isValidDate(dueOn)) {
    throw new Error("Invalid due date format");
  }
  if (refundableUntil && !isValidDate(refundableUntil)) {
    throw new Error("Invalid refundable-until date format");
  }

  const now = new Date().toISOString();
  const client = await db();
  const currency = estimated?.currency ?? "USD";
  const row = await client.execute({
    sql: `INSERT INTO budget_items (trip_id, category, label, currency, estimated_minor, due_on, refundable_until, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [tripId, category, label, currency, estimated?.amount ?? null, dueOn, refundableUntil, notes, now],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    category,
    label,
    estimated: estimated ?? null,
    booked: null,
    refundable: true,
    refundableUntil,
    dueOn,
    paid: false,
    notes,
    createdAt: now,
  };
}

export async function listBudgetItems(tripId: number): Promise<BudgetItem[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM budget_items WHERE trip_id = ? ORDER BY due_on ASC, created_at DESC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => toBudgetItem(row));
}

export async function getBudgetItem(id: number): Promise<BudgetItem | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM budget_items WHERE id = ?`,
    args: [id],
  });

  return result.rows.length > 0 ? toBudgetItem(result.rows[0] as Row) : null;
}

export async function updateBudgetItem(
  id: number,
  updates: Partial<Omit<BudgetItem, "id" | "tripId" | "createdAt">>,
): Promise<BudgetItem> {
  const item = await getBudgetItem(id);
  if (!item) throw new Error("Budget item not found");

  if (updates.dueOn && !isValidDate(updates.dueOn)) {
    throw new Error("Invalid due date format");
  }
  if (updates.refundableUntil && !isValidDate(updates.refundableUntil)) {
    throw new Error("Invalid refundable-until date format");
  }

  const fields = [];
  const args = [];

  if (updates.label !== undefined) {
    fields.push("label = ?");
    args.push(updates.label);
  }
  if (updates.category !== undefined) {
    fields.push("category = ?");
    args.push(updates.category);
  }
  if (updates.estimated !== undefined) {
    fields.push("estimated_minor = ?");
    args.push(updates.estimated?.amount ?? null);
  }
  if (updates.booked !== undefined) {
    fields.push("booked_minor = ?");
    args.push(updates.booked?.amount ?? null);
  }
  if (updates.refundable !== undefined) {
    fields.push("refundable = ?");
    args.push(updates.refundable ? 1 : 0);
  }
  if (updates.dueOn !== undefined) {
    fields.push("due_on = ?");
    args.push(updates.dueOn);
  }
  if (updates.refundableUntil !== undefined) {
    fields.push("refundable_until = ?");
    args.push(updates.refundableUntil);
  }
  if (updates.paid !== undefined) {
    fields.push("paid = ?");
    args.push(updates.paid ? 1 : 0);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    args.push(updates.notes);
  }

  if (fields.length === 0) return item;

  args.push(id);
  const client = await db();
  await client.execute({
    sql: `UPDATE budget_items SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  return getBudgetItem(id) as Promise<BudgetItem>;
}

export async function deleteBudgetItem(id: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM budget_items WHERE id = ?`,
    args: [id],
  });
}
