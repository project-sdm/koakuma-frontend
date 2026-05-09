"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { z } from "zod";

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
  const initialized = useRef(false);

  // Restore query from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("query");
    if (saved) setQuery(saved);
    initialized.current = true;
  }, []);

  // Save query to localStorage on change
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
                height="500px"
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
                    {result.results.length === 0 ||
                    result.results.every((r) => r.rows.length === 0) ? (
                      <p className="text-xs text-stone-400">
                        No se retornaron resultados.
                      </p>
                    ) : (
                      result.results.map((res, resIdx) => (
                        <div key={resIdx} className="space-y-3">
                          {result.results.length > 1 && (
                            <div className="text-sm font-bold text-stone-400 uppercase tracking-widest">
                              Resultado {resIdx + 1}
                            </div>
                          )}
                          <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-stone-200 rounded-sm">
                            <table className="w-full text-xs border-collapse">
                              <thead className="sticky top-0 z-10 bg-stone-50 shadow-[0_1px_0_0_rgba(231,229,228,1)]">
                                <tr>
                                  {res.columns.map((col, i) => (
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
                                {res.rows.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={res.columns.length}
                                      className="px-4 py-8 text-center text-stone-400"
                                    >
                                      Tabla vacía.
                                    </td>
                                  </tr>
                                ) : (
                                  res.rows.map((row, ri) => (
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
