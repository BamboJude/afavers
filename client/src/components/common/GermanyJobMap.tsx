import { useState } from 'react';

// ── Projection ────────────────────────────────────────────────────────────────
// Simple linear projection for Germany's bounding box.
// lon: 5.5°–15.5°E, lat: 47.0°–55.5°N  →  SVG: 400 × 480

const W = 400;
const H = 480;

function project(lon: number, lat: number): [number, number] {
  const x = ((lon - 5.5) / 10.0) * W;
  const y = ((55.5 - lat) / 8.5) * H;
  return [x, y];
}

// ── Simplified Germany outline (clockwise border polygon) ────────────────────
// Each pair = [lon, lat]
const GERMANY_BORDER: [number, number][] = [
  [6.0, 51.5],   // Netherlands border W
  [7.0, 53.5],   // Netherlands → North Sea
  [8.8, 55.0],   // Denmark border
  [10.5, 54.5],  // Baltic coast W
  [12.8, 54.3],  // Baltic coast
  [14.0, 54.5],  // Baltic coast NE
  [14.2, 53.9],  // Polish border N
  [14.8, 52.1],  // Polish border
  [14.9, 51.0],  // Polish border S
  [12.5, 50.2],  // Czech border NW
  [13.8, 48.5],  // Czech border S
  [13.0, 47.5],  // Austrian border E
  [10.5, 47.4],  // Austrian border
  [9.7,  47.5],  // Swiss border
  [8.5,  47.6],  // Swiss border W
  [7.5,  47.8],  // French border S
  [7.0,  48.5],  // French border
  [6.1,  49.5],  // French border N
  [6.1,  50.1],  // Luxembourg
  [5.9,  51.0],  // Belgian border
];

const borderPath = (() => {
  const pts = GERMANY_BORDER.map(([lon, lat]) => project(lon, lat));
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
})();

// ── Known German cities with coordinates ─────────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  'Düsseldorf':  [6.7762,  51.2217],
  'Koeln':       [6.9578,  50.9333],
  'Köln':        [6.9578,  50.9333],
  'Essen':       [7.0131,  51.4508],
  'Bochum':      [7.2162,  51.4818],
  'Dortmund':    [7.4653,  51.5136],
  'Berlin':      [13.4050, 52.5200],
  'Hamburg':     [10.0153, 53.5753],
  'München':     [11.5820, 48.1351],
  'Munich':      [11.5820, 48.1351],
  'Frankfurt':   [8.6821,  50.1109],
  'Stuttgart':   [9.1829,  48.7758],
  'Hannover':    [9.7320,  52.3759],
  'Leipzig':     [12.3731, 51.3397],
  'Nürnberg':    [11.0771, 49.4521],
  'Bremen':      [8.8017,  53.0793],
  'Köln/Bonn':   [6.9578,  50.9333],
  'Bonn':        [7.0982,  50.7374],
  'Wuppertal':   [7.1888,  51.2562],
  'Bielefeld':   [8.5325,  52.0302],
  'Mannheim':    [8.4660,  49.4875],
  'Karlsruhe':   [8.4037,  49.0069],
  'Münster':     [7.6261,  51.9607],
};

function findCityCoords(location: string): [number, number] | null {
  // Exact match
  if (CITY_COORDS[location]) return CITY_COORDS[location];
  // Partial match (e.g. "Köln (Westf.)" or "Essen, NRW")
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (location.toLowerCase().includes(city.toLowerCase())) return coords;
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  byLocation: { location: string; count: number }[];
  compact?: boolean;
}

interface TooltipState {
  x: number;
  y: number;
  city: string;
  count: number;
}

export const GermanyJobMap = ({ byLocation, compact = false }: Props) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Build city markers with SVG positions
  const markers = byLocation
    .map(({ location, count }) => {
      const coords = findCityCoords(location);
      if (!coords) return null;
      const [x, y] = project(coords[0], coords[1]);
      return { location, count, x, y };
    })
    .filter(Boolean) as { location: string; count: number; x: number; y: number }[];

  const maxCount = Math.max(...markers.map(m => m.count), 1);

  const height = compact ? 220 : 360;
  const scale = height / H;

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        className="overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Germany outline */}
        <path
          d={borderPath}
          fill="#f0fdf4"
          stroke="#86efac"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* City markers */}
        {markers.map(m => {
          const ratio = m.count / maxCount;
          const r = compact
            ? 4 + ratio * 10
            : 6 + ratio * 18;
          return (
            <g key={m.location}>
              {/* Glow ring */}
              <circle
                cx={m.x}
                cy={m.y}
                r={r + 4}
                fill="#16a34a"
                opacity={0.15}
              />
              {/* Main bubble */}
              <circle
                cx={m.x}
                cy={m.y}
                r={r}
                fill="#16a34a"
                opacity={0.85}
                className="cursor-pointer transition-all duration-150 hover:opacity-100"
                onMouseEnter={e => {
                  const svg = (e.target as SVGElement).closest('svg')!;
                  const rect = svg.getBoundingClientRect();
                  setTooltip({
                    x: m.x * scale * (rect.width / W),
                    y: m.y * scale * (rect.width / W),
                    city: m.location,
                    count: m.count,
                  });
                }}
              />
              {/* City label (full version only) */}
              {!compact && (
                <text
                  x={m.x}
                  y={m.y + r + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#166534"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                >
                  {m.location.split(/[,/(]/)[0].trim()}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && !compact && (
        <div
          className="absolute z-10 pointer-events-none bg-gray-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x + 14, top: tooltip.y - 14 }}
        >
          {tooltip.city} · {tooltip.count.toLocaleString()} jobs
        </div>
      )}

      {/* Legend (full only) */}
      {!compact && markers.length > 0 && (
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 opacity-50" />
            fewer jobs
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded-full bg-green-600" />
            more jobs
          </span>
        </div>
      )}
    </div>
  );
};
