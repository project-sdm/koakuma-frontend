import { Table, Value } from "@/lib/schemas";
import React from "react";

export interface Props {
  table: Table;
}

const formatValue = (val: Value) => {
  if (Array.isArray(val)) return `(${val[0]}, ${val[1]})`;
  if (typeof val === "string") return `'${val}'`;
  return val.toString();
};

export const ResultTable: React.FC<Props> = ({ table }) => (
  <div className="overflow-x-auto max-h-[385px] overflow-y-auto border border-stone-200 rounded-sm">
    <table className="w-full text-xs border-collapse">
      <thead className="sticky top-0 z-10 bg-stone-50 shadow-[0_1px_0_0_rgba(231,229,228,1)]">
        <tr>
          {table.columns.map((col, i) => (
            <th
              key={i}
              className="px-4 py-3 text-center font-bold border-x border-stone-200 text-stone-500 tracking-tighter"
            >
              {col.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white">
        {table.rows.length === 0 ? (
          <tr>
            <td
              colSpan={table.columns.length}
              className="px-4 py-8 text-center text-stone-400"
            >
              Tabla vacía.
            </td>
          </tr>
        ) : (
          table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-stone-100 last:border-b-0">
              {row.map((val, i) => (
                <td
                  key={i}
                  className="px-4 py-2 text-center border-x border-stone-200 tabular-nums"
                >
                  {formatValue(val)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
