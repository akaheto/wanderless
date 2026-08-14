import { db } from "./client";

export interface CitySuggestion {
  id?: number;
  city: string;
  country: string;
  status: "pending" | "researching" | "reviewed" | "approved" | "rejected";
  research_notes?: string;
  hotel_data?: string;
  flight_data?: string;
  visa_info?: string;
  climate_data?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  decision?: string;
  user_email?: string;
  submitted_at: string;
  created_at: string;
}

/**
 * Submit a new city suggestion for research.
 */
export async function submitCitySuggestion(
  city: string,
  country: string,
  userEmail?: string
): Promise<CitySuggestion | null> {
  const now = new Date().toISOString();
  // Normalize to title case for consistency
  const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  const normalizedCountry = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();

  try {
    const client = await db();
    await client.execute({
      sql: `
        INSERT INTO city_suggestions
        (city, country, status, user_email, submitted_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [normalizedCity, normalizedCountry, "pending", userEmail || null, now, now],
    });

    return {
      city: normalizedCity,
      country: normalizedCountry,
      status: "pending",
      user_email: userEmail,
      submitted_at: now,
      created_at: now,
    };
  } catch (err) {
    // Likely duplicate (city, country) pair
    console.error("[City Suggestion Error]", err);
    return null;
  }
}

/**
 * Update suggestion status and research data.
 */
export async function updateCitySuggestion(
  id: number,
  updates: Partial<CitySuggestion>
): Promise<boolean> {
  const now = new Date().toISOString();

  const fields = [];
  const values: (string | number)[] = [];

  if (updates.status) {
    fields.push("status = ?");
    values.push(updates.status);
  }

  if (updates.research_notes !== undefined) {
    fields.push("research_notes = ?");
    values.push(updates.research_notes || "");
  }

  if (updates.hotel_data) {
    fields.push("hotel_data = ?");
    values.push(updates.hotel_data);
  }

  if (updates.flight_data) {
    fields.push("flight_data = ?");
    values.push(updates.flight_data);
  }

  if (updates.visa_info) {
    fields.push("visa_info = ?");
    values.push(updates.visa_info);
  }

  if (updates.climate_data) {
    fields.push("climate_data = ?");
    values.push(updates.climate_data);
  }

  if (updates.decision) {
    fields.push("decision = ?");
    values.push(updates.decision);
    fields.push("reviewed_at = ?");
    values.push(now);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  const sql = `UPDATE city_suggestions SET ${fields.join(", ")} WHERE id = ?`;

  try {
    const client = await db();
    await client.execute({ sql, args: values });
    return true;
  } catch (err) {
    console.error("[City Suggestion Update Error]", err);
    return false;
  }
}

/**
 * Get a suggestion by ID.
 */
export async function getCitySuggestion(id: number): Promise<CitySuggestion | null> {
  try {
    const client = await db();
    const result = await client.execute({
      sql: "SELECT * FROM city_suggestions WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0] as unknown as CitySuggestion | undefined;
    return row || null;
  } catch (err) {
    console.error("[City Suggestion Fetch Error]", err);
    return null;
  }
}

/**
 * Get all pending suggestions (for review).
 */
export async function getPendingSuggestions(): Promise<CitySuggestion[]> {
  try {
    const client = await db();
    const result = await client.execute(
      `SELECT * FROM city_suggestions
       WHERE status IN ('pending', 'researching', 'reviewed')
       ORDER BY submitted_at DESC`
    );
    return result.rows as unknown as CitySuggestion[];
  } catch (err) {
    console.error("[City Suggestions Fetch Error]", err);
    return [];
  }
}

/**
 * Check if a city has already been suggested.
 */
export async function hasCitySuggestion(city: string, country: string): Promise<boolean> {
  try {
    const client = await db();
    const result = await client.execute({
      sql: "SELECT id FROM city_suggestions WHERE LOWER(city) = ? AND LOWER(country) = ?",
      args: [city.toLowerCase(), country.toLowerCase()],
    });
    return result.rows.length > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Delete a suggestion by ID.
 */
export async function deleteCitySuggestion(id: number): Promise<boolean> {
  try {
    const client = await db();
    await client.execute({
      sql: "DELETE FROM city_suggestions WHERE id = ?",
      args: [id],
    });
    return true;
  } catch (err) {
    console.error("[City Suggestion Delete Error]", err);
    return false;
  }
}
