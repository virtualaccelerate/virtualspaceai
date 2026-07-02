type Props = { className?: string; size?: number };

/**
 * Virtual Space brand mark — 10 dots arranged in a ring, forming a
 * gentle flower silhouette. Approximates the brandbook symbol.
 */
export function VirtualSpaceLogo({ className, size = 28 }: Props) {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = 18;
    return { cx: 24 + Math.cos(angle) * r, cy: 24 + Math.sin(angle) * r };
  });
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g className="vs-mark" style={{ transformOrigin: "24px 24px" }}>
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={3}
            fill="currentColor"
            opacity={0.55 + (i % 3) * 0.15}
          />
        ))}
      </g>
      <circle cx="24" cy="24" r="4.5" fill="currentColor" />
    </svg>
  );
}
