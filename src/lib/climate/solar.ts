/**
 * Sunrise, sunset and daylight length from latitude and date.
 *
 * Computed rather than fetched: the geometry is exact, deterministic and free, and
 * daylight is one of the few climate facts that never needs re-verifying. Follows the
 * NOAA solar position algorithm, accurate to roughly a minute at the latitudes here.
 *
 * Times returned are LOCAL CLOCK TIME at the destination, using the fixed UTC offset
 * supplied by the caller. Daylight *length* is offset-independent and always exact.
 */

import { parseDate } from "@/lib/dates";

const RAD = Math.PI / 180;

interface SolarDay {
  /** Hours between sunrise and sunset. */
  daylightHours: number;
  /** Local clock time "HH:MM", or null in polar day/night when the sun does not cross the horizon. */
  sunrise: string | null;
  sunset: string | null;
  /** True when the sun stays up all day. */
  polarDay: boolean;
  /** True when the sun never rises. */
  polarNight: boolean;
}

/** Days since 1 Jan 2000 12:00 UTC. */
function daysSinceEpoch(iso: string): number {
  return parseDate(iso).getTime() / 86_400_000 - 10957.5;
}

/** Solar declination in radians, and the equation of time in minutes. */
function solarPosition(n: number): { declination: number; equationOfTime: number } {
  const meanLongitude = (280.46 + 0.9856474 * n) * RAD;
  const meanAnomaly = (357.528 + 0.9856003 * n) * RAD;
  const eclipticLongitude =
    meanLongitude + 1.915 * RAD * Math.sin(meanAnomaly) + 0.02 * RAD * Math.sin(2 * meanAnomaly);
  const obliquity = (23.439 - 0.0000004 * n) * RAD;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));

  // Equation of time via the difference between mean and true solar position.
  const y = Math.tan(obliquity / 2) ** 2;
  const eqTime =
    4 *
    ((y * Math.sin(2 * meanLongitude) -
      2 * 0.0167 * Math.sin(meanAnomaly) +
      4 * 0.0167 * y * Math.sin(meanAnomaly) * Math.cos(2 * meanLongitude) -
      0.5 * y * y * Math.sin(4 * meanLongitude) -
      1.25 * 0.0167 * 0.0167 * Math.sin(2 * meanAnomaly)) /
      RAD);

  return { declination, equationOfTime: eqTime };
}

function formatClock(hoursUtc: number, utcOffsetHours: number): string {
  let h = hoursUtc + utcOffsetHours;
  while (h < 0) h += 24;
  while (h >= 24) h -= 24;
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  // Rounding 23:59.6 up must not produce "23:60".
  const carry = mm === 60;
  return `${String((hh + (carry ? 1 : 0)) % 24).padStart(2, "0")}:${String(carry ? 0 : mm).padStart(2, "0")}`;
}

export function solarDay(iso: string, lat: number, lon: number, utcOffsetHours: number): SolarDay {
  const n = daysSinceEpoch(iso);
  const { declination, equationOfTime } = solarPosition(n);

  // -0.833° accounts for atmospheric refraction and the sun's apparent radius.
  const zenith = 90.833 * RAD;
  const cosHourAngle =
    (Math.cos(zenith) - Math.sin(lat * RAD) * Math.sin(declination)) /
    (Math.cos(lat * RAD) * Math.cos(declination));

  if (cosHourAngle < -1) {
    return { daylightHours: 24, sunrise: null, sunset: null, polarDay: true, polarNight: false };
  }
  if (cosHourAngle > 1) {
    return { daylightHours: 0, sunrise: null, sunset: null, polarDay: false, polarNight: true };
  }

  const hourAngle = Math.acos(cosHourAngle) / RAD; // degrees
  const daylightHours = (2 * hourAngle) / 15;

  const solarNoonUtc = 12 - lon / 15 - equationOfTime / 60;
  const sunriseUtc = solarNoonUtc - hourAngle / 15;
  const sunsetUtc = solarNoonUtc + hourAngle / 15;

  return {
    daylightHours,
    sunrise: formatClock(sunriseUtc, utcOffsetHours),
    sunset: formatClock(sunsetUtc, utcOffsetHours),
    polarDay: false,
    polarNight: false,
  };
}

/**
 * UTC offset in hours for an IANA zone on a given date, so daylight times respect
 * summer time without hardcoding a table of offsets.
 */
export function utcOffsetHours(timeZone: string, iso: string): number {
  // Noon UTC keeps the probe away from any midnight DST transition.
  const probe = new Date(`${iso}T12:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  const part = fmt.formatToParts(probe).find((p) => p.type === "timeZoneName")?.value;
  if (!part) throw new Error(`Could not resolve a UTC offset for "${timeZone}"`);
  if (part === "GMT") return 0;

  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
  if (!m) throw new Error(`Unexpected offset format "${part}" for "${timeZone}"`);
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) + Number(m[3] ?? 0) / 60);
}
