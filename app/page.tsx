"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { z } from "zod";
import { Mafs, Coordinates, Polygon, Point } from "mafs";

import "mafs/core.css";

const Column = z.object({
  name: z.string(),
  type: z.enum(["Int", "Real", "Bool", "VarChar", "Point2d"]),
});
type Column = z.infer<typeof Column>;

const Point2D = z.tuple([z.number(), z.number()]);
type Point2D = z.infer<typeof Point2D>;

const Value = z.union([z.int(), z.boolean(), z.string(), Point2D]);
type Value = z.infer<typeof Value>;

const Row = z.array(Value);
type Row = z.infer<typeof Row>;

const Rect = z.object({
  min: Point2D,
  max: Point2D,
});
type Rect = z.infer<typeof Rect>;

const Table = z.object({
  columns: z.array(Column),
  rows: z.array(Row),
});
type Table = z.infer<typeof Table>;

const Plane = z.object({
  rects: z.array(z.tuple([z.int(), Rect])),
});
type Plane = z.infer<typeof Plane>;

const QueryResult = z.object({
  table: z.nullable(Table),
  plane: z.nullable(Plane),
  warnings: z.array(z.string()),
});
type QueryResult = z.infer<typeof QueryResult>;

const QueryResponse = z.object({
  reads: z.int(),
  writes: z.int(),
  time_ms: z.int(),
  results: z.array(QueryResult),
});
type QueryResponse = z.infer<typeof QueryResponse>;

const ErrorResponse = z.object({
  detail: z.string(),
});
type ErrorResponse = z.infer<typeof ErrorResponse>;

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const RTreeVisualization = ({
  rects,
}: {
  rects: [number, { min: [number, number]; max: [number, number] }][];
}) => {
  if (rects.length === 0) return null;

  // Find bounding box for initial view
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

export default function Home() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("query") ?? "";
    }
    return "";
  });
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (initialized.current) {
      localStorage.setItem("query", query);
    }
  }, [query]);

  const executeQuery = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/query`, {
        method: "POST",
        body: query,
        headers: { "Content-Type": "text/plain" },
      });

      const json = await res.json();

      if (res.status != 200) {
        setResult(null);
        setError(ErrorResponse.parse(json));
      } else {
        setResult(QueryResponse.parse(json));
        setError(null);
      }
    } catch (err) {
      console.error("Error:", err);
      setResult(null);
      setError({ detail: "Error llegando al servidor." });
    } finally {
      setLoading(false);
    }
  }, [query, apiUrl]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        executeQuery();
      }
    },
    [executeQuery],
  );

  return (
    <main className="min-h-screen bg-stone-50 p-4 md:p-8 font-mono text-stone-800">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h1 className="text-xl font-bold tracking-tight uppercase">
              Consola SQL Koakuma
            </h1>
            <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-sm hover:border-stone-300 focus-within:border-stone-800 focus-within:bg-white transition-all">
              <label
                htmlFor="api-url"
                className="text-sm font-bold uppercase tracking-widest text-stone-400 select-none"
              >
                Endpoint
              </label>
              <input
                id="api-url"
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="text-xs font-mono bg-transparent focus:outline-none min-w-[240px] cursor-text text-stone-600 focus:text-stone-900"
                placeholder="URL de la API"
              />
            </div>
          </div>
        </header>

        <section className="space-y-6">
          <div className="space-y-2">
            <div className="border border-stone-300 bg-white rounded-sm overflow-hidden focus-within:border-stone-800 transition-colors">
              <CodeMirror
                value={query}
                extensions={[sql()]}
                onChange={setQuery}
                height="300px"
                className="text-sm"
                theme="light"
                basicSetup={{ lineNumbers: true }}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={executeQuery}
                disabled={loading}
                className="px-6 py-2 bg-stone-800 enabled:hover:bg-black disabled:opacity-30 text-white text-xs font-bold uppercase tracking-widest rounded-sm transition-all enabled:cursor-pointer"
              >
                Ejecutar
              </button>
            </div>
          </div>

          {(result || error) && (
            <div className="space-y-6 pt-4 border-t border-stone-200">
              {error && (
                <div className="border border-red-200 bg-red-50/50 p-4 text-red-900 text-xs leading-relaxed">
                  <span className="font-bold mr-2">[ERROR]</span>
                  {error.detail}
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-6 text-xs uppercase tracking-widest text-stone-400 font-bold">
                    <div className="flex gap-2">
                      <span>Lecturas:</span>
                      <span className="text-stone-800">{result.reads}</span>
                    </div>
                    <div className="flex gap-2">
                      <span>Escrituras:</span>
                      <span className="text-stone-800">{result.writes}</span>
                    </div>
                    <div className="flex gap-2">
                      <span>Tiempo:</span>
                      <span className="text-stone-800">
                        {result.time_ms} ms
                      </span>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {result.results.length === 0 ? (
                      <p className="text-xs text-stone-400">
                        No se retornaron resultados.
                      </p>
                    ) : (
                      result.results.map((res, resIdx) => (
                        <div key={resIdx} className="space-y-3">
                          <hr className="border-stone-200" />
                          {res.warnings && res.warnings.length > 0 && (
                            <div className="space-y-2">
                              {res.warnings.map((warning, i) => (
                                <div
                                  key={i}
                                  className="border border-amber-200 bg-amber-50/50 p-3 text-amber-900 text-xs leading-relaxed"
                                >
                                  <span className="font-bold mr-2">
                                    [WARNING]
                                  </span>
                                  {warning}
                                </div>
                              ))}
                            </div>
                          )}

                          {res.table && (
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-stone-200 rounded-sm">
                              <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 z-10 bg-stone-50 shadow-[0_1px_0_0_rgba(231,229,228,1)]">
                                  <tr>
                                    {res.table.columns.map((col, i) => (
                                      <th
                                        key={i}
                                        className="px-4 py-3 text-center font-bold border-x border-stone-200 text-stone-500 uppercase tracking-tighter"
                                      >
                                        {col.name || `col_${i + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {res.table.rows.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={res.table.columns.length}
                                        className="px-4 py-8 text-center text-stone-400"
                                      >
                                        Tabla vacía.
                                      </td>
                                    </tr>
                                  ) : (
                                    res.table.rows.map((row, ri) => (
                                      <tr
                                        key={ri}
                                        className="border-b border-stone-100 last:border-b-0"
                                      >
                                        {row.map((val, i) => (
                                          <td
                                            key={i}
                                            className="px-4 py-2 text-center border-x border-stone-200 tabular-nums"
                                          >
                                            {Array.isArray(val)
                                              ? `(${val[0]}, ${val[1]})`
                                              : typeof val == "string"
                                                ? `'${val}'`
                                                : val.toString()}
                                          </td>
                                        ))}
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {res.plane && (
                            <RTreeVisualization rects={res.plane.rects} />
                          )}

                          {!res.table &&
                            !res.plane &&
                            res.warnings.length === 0 && (
                              <p className="text-xs text-stone-400">
                                Sin resultados.
                              </p>
                            )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
