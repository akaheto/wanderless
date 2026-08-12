"use client";

import { useTransition } from "react";
import type { BudgetItem } from "@/lib/db/budget";
import { createBudgetItemAction, updateBudgetItemAction, deleteBudgetItemAction } from "@/app/actions";
import { toMajorUnits } from "@/lib/money";
import { Button, Card } from "./ui";

export interface BudgetItemFormProps {
  tripId: number;
  item?: BudgetItem;
  onCancel?: () => void;
}

const categories = [
  { value: "flights", label: "Flights" },
  { value: "lodging", label: "Lodging" },
  { value: "activities", label: "Activities" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Ground transport" },
  { value: "other", label: "Other" },
];

export function BudgetItemForm({ tripId, item, onCancel }: BudgetItemFormProps) {
  const [pending, startTransition] = useTransition();
  const isEditing = !!item;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      formData.set("tripId", String(tripId));
      if (isEditing) {
        formData.set("budgetId", String(item.id));
        await updateBudgetItemAction(formData);
      } else {
        await createBudgetItemAction(formData);
      }
      onCancel?.();
    });
  };

  const handleDelete = () => {
    if (!isEditing) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("tripId", String(tripId));
      formData.set("budgetId", String(item.id));
      await deleteBudgetItemAction(formData);
      onCancel?.();
    });
  };

  return (
    <Card>
      <form action={handleSubmit} className="space-y-3 px-4 py-4">
        <div>
          <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
            Item label
          </label>
          <input
            type="text"
            name="label"
            defaultValue={item?.label ?? ""}
            placeholder="e.g., Travel insurance, Visa, Activities"
            maxLength={200}
            required
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Category
            </label>
            <select name="category" defaultValue={item?.category ?? "other"} className="w-full">
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Currency
            </label>
            <input
              type="text"
              name="currency"
              defaultValue={item?.estimated?.currency ?? item?.booked?.currency ?? "USD"}
              placeholder="USD"
              maxLength={3}
              className="uppercase w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Estimated
            </label>
            <input
              type="number"
              name="estimatedAmount"
              defaultValue={item?.estimated ? toMajorUnits(item.estimated) : ""}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Booked
            </label>
            <input
              type="number"
              name="bookedAmount"
              defaultValue={item?.booked ? toMajorUnits(item.booked) : ""}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Due on
            </label>
            <input
              type="date"
              name="dueOn"
              defaultValue={item?.dueOn ?? ""}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Refundable until
            </label>
            <input
              type="date"
              name="refundableUntil"
              defaultValue={item?.refundableUntil ?? ""}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="paid"
              defaultChecked={item?.paid ?? false}
            />
            <span className="text-[13px] text-ink-2">Paid</span>
          </label>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            defaultValue={item?.notes ?? ""}
            placeholder="Any additional notes…"
            maxLength={1000}
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEditing ? "Update" : "Add item"}
          </Button>
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="secondary" disabled={pending}>
              Cancel
            </Button>
          )}
          {isEditing && (
            <Button
              type="button"
              onClick={handleDelete}
              variant="danger"
              disabled={pending}
              className="ml-auto"
            >
              Delete
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
