import { Point2D, Rect } from "@/lib/schemas";
import { Circle, Coordinates, Mafs, Point, Polygon } from "mafs";
import "mafs/core.css";

export interface Props {
  rects: [number, Rect][];
  point: Point2D | null;
  radius: number | null;
}

export const RTreeVisualization = ({ rects, point, radius }: Props) => {
  if (rects.length === 0 && !point) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  rects.forEach(([, rect]) => {
    updateBounds(rect.min[0], rect.min[1]);
    updateBounds(rect.max[0], rect.max[1]);
  });

  if (point) {
    const r = radius || 0;
    updateBounds(point[0] - r, point[1] - r);
    updateBounds(point[0] + r, point[1] + r);
  }

  // Fallback if still infinity
  if (minX === Infinity) {
    minX = -10;
    minY = -10;
    maxX = 10;
    maxY = 10;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const padding = Math.max(width, height, 20) * 0.1;

  const colorConfig = [
    { stroke: "#78716c", fill: "#78716c", label: "Hoja" },
    { stroke: "#3b82f6", fill: "#3b82f6", label: "Nivel 1" },
    { stroke: "#10b981", fill: "#10b981", label: "Nivel 2" },
    { stroke: "#f59e0b", fill: "#f59e0b", label: "Nivel 3" },
    { stroke: "#f43f5e", fill: "#f43f5e", label: "Nivel 4+" },
  ];

  const levels = rects.length > 0 ? 1 + Math.max(...rects.map((r) => r[0])) : 0;

  return (
    <div className="border border-stone-200 rounded-sm bg-white overflow-hidden h-[500px] relative">
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-600 bg-white/80 px-2 py-1 rounded-sm border border-stone-100">
          Vista de R-Tree
        </div>
        {[...Array(levels)].map((_, level) => {
          const config =
            colorConfig[level] || colorConfig[colorConfig.length - 1];

          return (
            <div
              key={level}
              className="flex items-center gap-2 px-2 py-0.5 bg-white/80 rounded-sm border border-stone-100"
            >
              <div
                className="w-2 h-2 border"
                style={{
                  borderColor: config.stroke,
                  backgroundColor: `${config.fill}20`,
                }}
              />
              <span className="text-[9px] font-bold text-stone-500">
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      <Mafs
        height={500}
        viewBox={{
          x: [minX - padding, maxX + padding],
          y: [minY - padding, maxY + padding],
        }}
        pan
        zoom
      >
        <Coordinates.Cartesian />

        {rects
          .sort((a, b) => b[0] - a[0])
          .map(([level, rect], i) => {
            const config =
              colorConfig[level] || colorConfig[colorConfig.length - 1];

            if (level === 0) {
              return (
                <Point
                  key={i}
                  x={rect.min[0]}
                  y={rect.min[1]}
                  color={config.stroke}
                  svgCircleProps={{ radius: "2px" }}
                />
              );
            }

            const points: [number, number][] = [
              [rect.min[0], rect.min[1]],
              [rect.max[0], rect.min[1]],
              [rect.max[0], rect.max[1]],
              [rect.min[0], rect.max[1]],
            ];

            return (
              <Polygon
                key={i}
                points={points}
                color={config.stroke}
                fillOpacity={0.1}
                weight={2}
              />
            );
          })}

        {point && (
          <>
            {radius && (
              <Circle
                center={point}
                radius={radius}
                color="#ef4444"
                fillOpacity={0.05}
              />
            )}
            <Point
              x={point[0]}
              y={point[1]}
              color="#b91c1c"
              svgCircleProps={{ radius: "5px" }}
            />
          </>
        )}
      </Mafs>
    </div>
  );
};
