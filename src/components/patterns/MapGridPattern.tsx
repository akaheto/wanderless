/**
 * Subtle map grid pattern for hero backgrounds.
 * Uses theme tokens so it works in both light and dark modes.
 */
export function MapGridPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.04 }}
      viewBox="0 0 1200 400"
    >
      {/* Vertical lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={`v-${i}`}
          x1={i * 200}
          y1="0"
          x2={i * 200}
          y2="400"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Horizontal lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * 100}
          x2="1200"
          y2={i * 100}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Grid intersections (small circles) */}
      {[0, 1, 2, 3, 4, 5].map((x) =>
        [0, 1, 2, 3, 4].map((y) => (
          <circle
            key={`dot-${x}-${y}`}
            cx={x * 200}
            cy={y * 100}
            r="1.5"
            fill="currentColor"
            vectorEffect="non-scaling-stroke"
          />
        ))
      )}
    </svg>
  );
}
