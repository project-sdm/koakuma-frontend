'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { sql } from '@codemirror/lang-sql';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

type Column = { name: string; type: string };
type DiskIO = { reads: number; writes: number };
type TimingMs = { parse: number; exec: number };

type ResultData = {
  acceptedStatements: number;
  timingMs: TimingMs;
  diskIO: DiskIO;
  columns: Column[];
  rows: unknown[][];
};

type ApiError = { code: string; message: string; detail?: string };

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const executeQuery = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/query`, {
        method: 'POST',
        body: trimmed,
        headers: { 'Content-Type': 'text/plain' },
      });

      const payload = await res.json();

      if (payload.status === 'success') {
        setResult(payload.data);
      } else {
        setError(payload.error);
      }
    } catch (err) {
      setError({ code: 'NETWORK_ERROR', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') executeQuery();
    },
    [executeQuery]
  );

  return (
    <main className="min-h-screen bg-[#f4f1ea] p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white border border-[#ded6c8] rounded-2xl shadow-lg overflow-hidden">

        <header className="px-8 py-7 border-b border-black/5">
          <h1 className="text-3xl font-bold tracking-tight">Koakuma SQL Console</h1>
          <p className="mt-2 text-sm text-gray-500">Run SQL statements against the local database.</p>
        </header>

        <section className="px-8 py-7 space-y-6">
          <div>
            <label className="block mb-2 text-sm font-semibold">SQL Query</label>
            <div className="rounded-xl overflow-hidden border border-[#cfc7b8]" onKeyDown={handleKeyDown}>
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
                className="flex-1 bg-[#4f6f52] hover:bg-[#3f5c42] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Running…' : 'Execute Query'}
              </button>
              <button
                onClick={() => { setQuery(''); setResult(null); setError(null); }}
                className="bg-[#ece7df] hover:bg-[#e2dbd0] text-gray-800 font-semibold py-2.5 px-5 rounded-xl transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {(result || error) && (
            <div>
              <label className="block mb-2 text-sm font-semibold">Results</label>

              {error && (
                <div className="rounded-xl border border-[#e3c2c2] bg-[#fbefef] p-4 text-[#8a2d2d] text-sm font-mono whitespace-pre-wrap">
                  {`Error\nCode: ${error.code}\nMessage: ${error.message}${error.detail ? `\nDetail: ${error.detail}` : ''}`}
                </div>
              )}

              {result && (
                <div className="rounded-xl border border-[#c9ddca] bg-[#eef5ee] p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Success &nbsp;|&nbsp; Statements: {result.acceptedStatements} &nbsp;|&nbsp;
                    Parse: {result.timingMs.parse} ms &nbsp;|&nbsp;
                    Exec: {result.timingMs.exec} ms &nbsp;|&nbsp;
                    Disk reads: {result.diskIO?.reads ?? '?'} &nbsp;|&nbsp;
                    Disk writes: {result.diskIO?.writes ?? '?'}
                  </p>

                  {result.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No rows returned.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden border border-black/10">
                        <thead>
                          <tr>
                            {result.columns.map((col, i) => (
                              <th key={i} className="px-3 py-2 text-left font-bold bg-[#4f6f52]/10 border-b border-black/5">
                                {col.name || `Column ${i + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td key={ci} className={`px-3 py-2 border-b border-black/5 ${cell == null ? 'italic text-gray-400' : ''}`}>
                                  {cell == null ? 'NULL' : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
