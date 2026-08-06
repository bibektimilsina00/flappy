import { cn } from "@/lib/cn";

// Small self-contained illustrations (CSS/SVG, no assets) used in nav menus, feature
// cards, and steps. Every shape scales to its frame via a 200×112 viewBox.
const TEAL = "#14b8a6";
const INDIGO = "#6366f1";
const EMERALD = "#34d399";
const AMBER = "#f5a524";
const ROSE = "#f43f5e";

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("relative h-28 w-full overflow-hidden rounded-lg border border-mk-border bg-mk-bg", className)}>{children}</div>;
}
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 200 112" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function Canvas({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <Svg>
        <line x1={140} y1={41} x2={176} y2={44} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <rect x={16} y={28} width={120} height={11} rx={5} fill={TEAL} />
        <rect x={16} y={45} width={104} height={11} rx={5} fill={INDIGO} />
        <rect x={16} y={62} width={86} height={11} rx={5} fill={EMERALD} />
        <rect x={176} y={36} width={16} height={16} rx={4} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      </Svg>
    </Frame>
  );
}

function Nodes({ className }: { className?: string }) {
  const dots = [
    { x: 26, y: 62, c: INDIGO, r: 13 },
    { x: 78, y: 76, c: EMERALD, r: 11 },
    { x: 126, y: 44, c: AMBER, r: 12 },
    { x: 172, y: 76, c: ROSE, r: 10 },
  ];
  return (
    <Frame className={className}>
      <Svg>
        {dots.slice(0, -1).map((d, i) => (
          <line key={d.c} x1={d.x} y1={d.y} x2={dots[i + 1].x} y2={dots[i + 1].y} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        ))}
        {dots.map((d) => (
          <circle key={d.c} cx={d.x} cy={d.y} r={d.r} fill={d.c} />
        ))}
      </Svg>
    </Frame>
  );
}

function Timeline({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <Svg>
        <rect x={12} y={26} width={176} height={14} rx={4} fill="rgba(255,255,255,0.05)" />
        <rect x={12} y={49} width={176} height={14} rx={4} fill="rgba(255,255,255,0.05)" />
        <rect x={12} y={72} width={176} height={14} rx={4} fill="rgba(255,255,255,0.05)" />
        <rect x={12} y={26} width={70} height={14} rx={4} fill={TEAL} />
        <rect x={86} y={26} width={54} height={14} rx={4} fill={`${TEAL}88`} />
        <rect x={144} y={26} width={44} height={14} rx={4} fill={TEAL} />
        <rect x={30} y={49} width={96} height={14} rx={4} fill={INDIGO} />
        <rect x={12} y={72} width={176} height={14} rx={4} fill="rgba(255,255,255,0.08)" />
        <line x1={100} y1={20} x2={100} y2={92} stroke={TEAL} strokeWidth="1.5" />
      </Svg>
    </Frame>
  );
}

function Bars({ className }: { className?: string }) {
  const bars = [
    [26, 40, TEAL],
    [52, 66, INDIGO],
    [78, 30, EMERALD],
    [104, 74, INDIGO],
    [130, 50, EMERALD],
    [156, 86, TEAL],
  ] as const;
  return (
    <Frame className={className}>
      <Svg>
        {bars.map(([x, h, c]) => (
          <rect key={x} x={x} y={96 - h} width={16} height={h} rx={4} fill={c} />
        ))}
      </Svg>
    </Frame>
  );
}

function Waveform({ className }: { className?: string }) {
  const hs = [18, 34, 52, 40, 66, 48, 72, 54, 38, 60, 44, 28, 50, 36, 22];
  return (
    <Frame className={className}>
      <Svg>
        {hs.map((h, i) => (
          <rect key={`${i}-${h}`} x={14 + i * 12} y={56 - h / 2} width={6} height={h} rx={3} fill={i % 2 ? `${TEAL}aa` : TEAL} />
        ))}
      </Svg>
    </Frame>
  );
}

function Grid({ className }: { className?: string }) {
  const cells = [
    [56, 30],
    [92, 52],
    [128, 40],
    [150, 72],
  ];
  return (
    <Frame className={className}>
      <Svg>
        {[28, 56, 84].map((y) => (
          <line key={`h${y}`} x1={12} y1={y} x2={188} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        {[52, 92, 132, 172].map((x) => (
          <line key={`v${x}`} x1={x} y1={16} x2={x} y2={96} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={14} height={14} rx={3} fill={INDIGO} />
        ))}
      </Svg>
    </Frame>
  );
}

function Scene({ className }: { className?: string }) {
  const stars = [
    [18, 20],
    [40, 60],
    [70, 30],
    [110, 70],
    [140, 24],
    [165, 54],
    [90, 88],
    [30, 90],
  ];
  return (
    <div className={cn("relative h-28 w-full overflow-hidden rounded-lg", className)} style={{ background: "linear-gradient(135deg, #4f46e5, #7c5cff 60%, #a78bfa)" }}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 200 112" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        {stars.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="rgba(255,255,255,0.85)" />
        ))}
      </svg>
      <span className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-lg" />
      <span className="absolute left-[43%] top-[36%] size-7 rounded-xl bg-white/40" />
    </div>
  );
}

export function Visual({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "nodes":
      return <Nodes className={className} />;
    case "scene":
      return <Scene className={className} />;
    case "timeline":
      return <Timeline className={className} />;
    case "bars":
      return <Bars className={className} />;
    case "waveform":
      return <Waveform className={className} />;
    case "grid":
      return <Grid className={className} />;
    default:
      return <Canvas className={className} />;
  }
}

export const MenuVisual = Visual;
