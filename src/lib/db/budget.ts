import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import { isValidDate } from "@/lib/dates";

export interface BudgetItem {
  id: number;
  tripId: number;
  category: string;
  label: string;
  estimatedUsd: number | null;
  bookedUsd: number | null;
  refundable: boolean;
  dueOn: string | null;
  notes: string;
  createdAt: string;
}

function toBudgetItem(row: Row): BudgetItem {
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    category: String(row.category),
    label: String(row.label),
    estimatedUsd: row.estimated_usd === null ? null : Number(row.estimated_usd),
    bookedUsd: row.booked_usd === null ? null : Number(row.booked_usd),
    refundable: Number(row.refundable) === 1,
    dueOn: row.due_on === null ? null : String(row.due_on),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function createBudgetItem(
  tripId: number,
  category: string,
  label: string,
  estimatedUsd: number | null = null,
  dueOn: string | null = null,
  notes: string = "",
): Promise<BudgetItem> {
  if (dueOn && !isValidDate(dueOn)) {
    throw new Error("Invalid due date format");
  }

  const now = new Date().toISOString();
  const client = await db();
  const row = await client.execute({
    sql: `INSERT INTO budget_items (trip_id, category, label, estimated_usd, due_on, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [tripId, category, label, estimatedUsd, dueOn, notes, now],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    category,
    label,
    estimatedUsd,
    bookedUsd: null,
    refundable: true,
    dueOn,
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
  if (updates.estimatedUsd !== undefined) {
    fields.push("estimated_usd = ?");
    args.push(updates.estimatedUsd);
  }
  if (updates.bookedUsd !== undefined) {
    fields.push("booked_usd = ?");
    args.push(updates.bookedUsd);
  }
  if (updates.refundable !== undefined) {
    fields.push("refundable = ?");
    args.push(updates.refundable ? 1 : 0);
  }
  if (updates.dueOn !== undefined) {
    fields.push("due_on = ?");
    args.push(updates.dueOn);
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
