"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";

import { MessageBox } from "@/components/MessageBox";
import { ResultItem } from "@/components/ResultItem";
import { ErrorResponse, OkResponse } from "@/lib/schemas";
import { Metrics } from "@/components/Metrics";

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const DEFAULT_QUERY =
  process.env.NEXT_PUBLIC_DEFAULT_QUERY ?? // why not i guess
  `
-- Consultas de ejemplo

drop table if exists users;

create table users (
  id           varchar primary key,
  name         varchar index hash,
  age          int index btree,
  birth_date   varchar,
  married      bool index hash,
  location     point2d index rtree
) from file 'data/sample/users.csv';

select * from users where id = 'id_087';
select * from users where married = true;
select * from users where location in (point(2, 1), radius 4.2);
`.trim();

const Home = () => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("query") ?? DEFAULT_QUERY;
  });
  const [result, setResult] = useState<OkResponse | null>(null);
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
        setResult(OkResponse.parse(json));
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
              {error && <MessageBox type="error">{error.detail}</MessageBox>}

              {result && (
                <div className="space-y-6">
                  <Metrics {...result} />

                  <div className="space-y-8">
                    {result.results.length === 0 ? (
                      <p className="text-xs text-stone-400">
                        No se retornaron resultados.
                      </p>
                    ) : (
                      result.results.map((res, i) => (
                        <ResultItem key={i} result={res} />
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
};

export default Home;
