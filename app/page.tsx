"use client";

import { useState, useCallback } from "react";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { z } from "zod";

const Column = z.object({
  name: z.string(),
  type: z.enum(["INT", "REAL", "BOOL", "VARCHAR", "POINT2D"]),
});
type Column = z.infer<typeof Column>;

const Point2D = z.object({
  x: z.number(),
  y: z.number(),
});
type Point2D = z.infer<typeof Point2D>;

const Value = z.union([z.int(), z.boolean(), z.string(), Point2D]);
type Value = z.infer<typeof Value>;

const Row = z.array(Value);
type Row = z.infer<typeof Row>;

const QueryResult = z.object({
  columns: z.array(Column),
  rows: z.array(Row),
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

export default function Home() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [loading, setLoading] = useState(false);

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
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") executeQuery();
    },
    [executeQuery],
  );

  return (
    <main className="min-h-screen bg-stone-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden">
        <header className="px-8 py-7 border-b border-black/5 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Consola SQL de Koakuma
          </h1>
          <div className="flex items-center gap-3">
            <label
              htmlFor="api-url"
              className="text-xs font-bold uppercase tracking-wider text-stone-500"
            >
              API URL
            </label>
            <input
              id="api-url"
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="flex-1 text-sm px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800/50 transition-all"
              placeholder="http://localhost:8080"
            />
          </div>
        </header>

        <section className="px-8 py-7 space-y-6">
          <div>
            <div
              className="rounded-xl overflow-hidden border border-stone-300"
              onKeyDown={handleKeyDown}
            >
              <CodeMirror
                value={query}
                extensions={[sql()]}
                onChange={setQuery}
                minHeight="160px"
                className="text-sm"
                theme="light"
                basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
              />
            </div>
            <div className="flex gap-3 mt-3">
              <button
                onClick={executeQuery}
                disabled={loading}
                className="flex-1 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {loading ? "Ejecutando..." : "Ejecutar"}
              </button>
            </div>
          </div>

          {(result || error) && (
            <div>
              <label className="block mb-2 text-sm font-semibold">
                Resultados
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
                  {error.detail}
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm text-stone-500 bg-stone-50 p-3 rounded-lg border border-stone-200">
                    <span>
                      Lecturas:{" "}
                      <span className="font-bold">{result.reads}</span>
                    </span>
                    <span>
                      Escrituras:{" "}
                      <span className="font-bold">{result.writes}</span>
                    </span>
                    <span>
                      Tiempo:{" "}
                      <span className="font-bold">{result.time_ms} ms</span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-6">
                    {result.results.length === 0 ||
                    result.results.every((r) => r.rows.length === 0) ? (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No se retornaron filas.
                      </p>
                    ) : (
                      result.results.map((res, resIdx) => (
                        <div key={resIdx} className="space-y-2">
                          {result.results.length > 1 && (
                            <h3 className="text-xs font-bold tracking-wider text-green-800/60 ml-1">
                              Resultado {resIdx + 1}
                            </h3>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden border border-black/10">
                              <thead>
                                <tr>
                                  {res.columns.map((col, i) => (
                                    <th
                                      key={i}
                                      className="px-3 py-2 text-left font-bold bg-green-800/10 border-b border-black/5"
                                    >
                                      {col.name || `Column ${i + 1}`}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {res.rows.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={res.columns.length}
                                      className="px-3 py-4 text-center text-gray-400 italic"
                                    >
                                      Sin filas en este set.
                                    </td>
                                  </tr>
                                ) : (
                                  res.rows.map((row, ri) => (
                                    <tr key={ri}>
                                      {row.map((val, i) => (
                                        <td
                                          key={i}
                                          className="px-3 py-2 border-b border-black/5"
                                        >
                                          {typeof val == "object"
                                            ? `(${val.x}, ${val.y})`
                                            : val.toString()}
                                        </td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
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
