import React from "react";
import { MessageBox } from "./MessageBox";
import { ResultTable } from "./ResultTable";
import { QueryResult } from "@/lib/schemas";
import { RTreeVisualization } from "./RTreeVisualization";

export interface Props {
  result: QueryResult;
}

export const ResultItem: React.FC<Props> = ({ result }) => {
  if (result.status !== "ok") {
    return <MessageBox type="error">{result.detail}</MessageBox>;
  }

  return (
    <div className="space-y-3">
      <hr className="border-stone-200" />
      {result.messages.map((message, i) => (
        <MessageBox key={i} type="info">
          {message}
        </MessageBox>
      ))}
      {result.warnings.map((warning, i) => (
        <MessageBox key={i} type="warning">
          {warning}
        </MessageBox>
      ))}

      {result.table ? (
        <ResultTable table={result.table} />
      ) : (
        <p className="text-xs text-stone-400">Sin resultados.</p>
      )}

      {result.plane && <RTreeVisualization rects={result.plane.rects} />}
    </div>
  );
};
