import type { Kind } from "./types";
export function PlantSymbol({ kind }: { kind: Kind }) {
  return (
    <svg
      viewBox="0 0 80 56"
      width="80"
      height="56"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {kind === "motor" && (
        <>
          <circle cx="40" cy="27" r="20" />
          <path d="M28 36V18l12 13 12-13v18M24 48h32M40 47v-1" />
        </>
      )}
      {kind === "pump" && (
        <>
          <circle cx="39" cy="29" r="19" />
          <path d="m32 17 21 12-21 12ZM58 29h17M39 10V3H66M24 50h32" />
        </>
      )}
      {kind === "valve" && (
        <>
          <path d="M10 17v26l30-13 30 13V17L40 30ZM40 30V8M28 8h24" />
        </>
      )}
      {kind === "tank" && (
        <>
          <ellipse cx="40" cy="10" rx="25" ry="7" />
          <path d="M15 10v35c0 10 50 10 50 0V10M25 52v4M55 52v4" />
        </>
      )}
      {kind === "sensor" && (
        <>
          <path d="M13 28h16M51 28h16M40 5v10M40 41v10" />
          <path d="m40 11 17 17-17 17-17-17Z" />
          <text
            x="40"
            y="32"
            textAnchor="middle"
            fontSize="13"
            stroke="none"
            fill="currentColor"
          >
            S
          </text>
        </>
      )}
      {kind === "button" && (
        <>
          <path d="M20 48h40M25 47V25h30v22M40 25V12M20 12h40V5H20Z" />
          <path d="M31 32h18" />
        </>
      )}
      {kind === "lamp" && (
        <>
          <circle cx="40" cy="28" r="16" />
          <path d="m29 17 22 22M51 17 29 39M40 3v5M40 48v5M15 28h5M60 28h5" />
        </>
      )}
      {kind === "numeric" && (
        <>
          <rect x="7" y="10" width="66" height="37" rx="3" />
          <text
            x="40"
            y="35"
            textAnchor="middle"
            fontSize="18"
            fontFamily="Consolas,monospace"
            stroke="none"
            fill="currentColor"
          >
            #
          </text>
        </>
      )}
    </svg>
  );
}
