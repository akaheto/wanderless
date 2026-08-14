/**
 * Subtle route/path pattern for hero backgrounds.
 * Uses theme tokens so it works in both light and dark modes.
 */
export function RoutePattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.05 }}
      viewBox="0 0 1200 400"
    >
      {/* Curved route paths */}
      <path
        d="M 0 200 Q 300 100 600 200 T 1200 200"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 0 250 Q 300 150 600 250 T 1200 250"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 0 150 Q 300 50 600 150 T 1200 150"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />

      {/* Waypoints */}
      <circle cx="200" cy="100" r="3" fill="currentColor" vectorEffect="non-scaling-stroke" />
      <circle cx="400" cy="200" r="3" fill="currentColor" vectorEffect="non-scaling-stroke" />
      <circle cx="600" cy="150" r="3" fill="currentColor" vectorEffect="non-scaling-stroke" />
      <circle cx="800" cy="250" r="3" fill="currentColor" vectorEffect="non-scaling-stroke" />
      <circle cx="1000" cy="180" r="3" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
