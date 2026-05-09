import React from "react";

export interface Props {
  type: "info" | "warning" | "error";
  children: React.ReactNode;
}

const styles = {
  info: "border-blue-200 bg-blue-100/50 text-blue-900",
  warning: "border-amber-200 bg-amber-50/50 text-amber-900",
  error: "border-red-200 bg-red-50/50 text-red-900",
};

const labels = {
  info: "[INFO]",
  warning: "[WARNING]",
  error: "[ERROR]",
};

export const MessageBox: React.FC<Props> = ({ type, children }) => (
  <div
    className={`border p-3 text-xs leading-relaxed mb-2 rounded-sm ${styles[type]}`}
  >
    <span className="font-bold mr-2">{labels[type]}</span>
    {children}
  </div>
);
