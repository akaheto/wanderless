import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Wanderless wordmark logo.
 * SVG-based, scales perfectly, uses brand color that works in both light/dark contexts.
 * Uses Fraunces display font for visual distinction.
 */
export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeMap = {
    sm: { width: 100, height: 32, fontSize: 14, letterSpacing: -0.5 },
    md: { width: 160, height: 48, fontSize: 22, letterSpacing: -0.8 },
    lg: { width: 240, height: 64, fontSize: 32, letterSpacing: -1.2 },
  };

  const { width, height, fontSize, letterSpacing } = sizeMap[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      {/* Wordmark: "Wanderless" */}
      <text
        x={width / 2}
        y={height / 2 + fontSize / 3}
        textAnchor="middle"
        fontFamily="var(--font-display, 'Fraunces', serif)"
        fontSize={fontSize}
        fontWeight="600"
        letterSpacing={letterSpacing}
        fill="#1e40af"
        style={{
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        Wanderless
      </text>
    </svg>
  );
}

/**
 * Logo mark only (for favicon / small contexts).
 * A stylized "W" monogram.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className={className}
      style={{ overflow: "visible" }}
    >
      {/* Stylized "W" monogram - two peaks */}
      <path
        d="M 4 24 L 8 8 L 12 16 L 16 8 L 20 24 M 20 24 L 24 8 L 28 24"
        stroke="#1e40af"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </svg>
  );
}
