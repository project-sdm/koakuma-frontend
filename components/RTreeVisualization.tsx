import { Rect } from "@/lib/schemas";
import { Coordinates, Mafs, Point, Polygon } from "mafs";
import "mafs/core.css";

export interface Props {
  rects: [number, Rect][];
}

export const RTreeVisualization = ({ rects }: Props) => {
  if (rects.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  rects.forEach(([, rect]) => {
    minX = Math.min(minX, rect.min[0], rect.max[0]);
    minY = Math.min(minY, rect.min[1], rect.max[1]);
    maxX = Math.max(maxX, rect.min[0], rect.max[0]);
    maxY = Math.max(maxY, rect.min[1], rect.max[1]);
  });

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

  const levels = 1 + Math.max(...rects.map((r) => r[0]));

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
      </Mafs>
    </div>
  );
};
