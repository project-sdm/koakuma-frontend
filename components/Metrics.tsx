export interface Props {
  reads: number;
  writes: number;
  time_ms: number;
}

export const Metrics = ({ reads, writes, time_ms }: Props) => (
  <div className="flex flex-wrap gap-6 text-xs uppercase tracking-widest text-stone-400 font-bold">
    <div className="flex gap-2">
      <span>Lecturas:</span>
      <span className="text-stone-800">{reads}</span>
    </div>
    <div className="flex gap-2">
      <span>Escrituras:</span>
      <span className="text-stone-800">{writes}</span>
    </div>
    <div className="flex gap-2">
      <span>Tiempo:</span>
      <span className="text-stone-800">{time_ms} ms</span>
    </div>
  </div>
);
