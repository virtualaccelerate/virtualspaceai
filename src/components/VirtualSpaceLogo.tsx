type Props = { className?: string; size?: number };

/**
 * Virtual Space brand mark — 8 interlocking petals forming a floral
 * mandala + 8 outer dots. Matches the brandbook symbol (line-only, green).
 */
export function VirtualSpaceLogo({ className, size = 32 }: Props) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  const dots = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 + 22.5) * (Math.PI / 180) - Math.PI / 2;
    const r = 46;
    return { cx: 50 + Math.cos(angle) * r, cy: 50 + Math.sin(angle) * r };
  });
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g
        className="vs-mark"
        style={{ transformOrigin: "50px 50px" }}
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      >
        {petals.map((a) => (
          <path
            key={`p-${a}`}
            d="M50 10 C 58 22, 66 30, 68 42 C 60 44, 54 48, 50 54 C 46 48, 40 44, 32 42 C 34 30, 42 22, 50 10 Z"
            transform={`rotate(${a} 50 50)`}
          />
        ))}
      </g>
      {dots.map((d, i) => (
        <circle key={`d-${i}`} cx={d.cx} cy={d.cy} r={2.4} fill="currentColor" />
      ))}
    </svg>
  );
}
