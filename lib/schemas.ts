import { z } from "zod";

export const Column = z.object({
  name: z.string(),
  type: z.enum(["Int", "Real", "Bool", "VarChar", "Point2d"]),
});
export type Column = z.infer<typeof Column>;

export const Point2D = z.tuple([z.number(), z.number()]);
export type Point2D = z.infer<typeof Point2D>;

export const Value = z.union([z.int(), z.boolean(), z.string(), Point2D]);
export type Value = z.infer<typeof Value>;

export const Row = z.array(Value);
export type Row = z.infer<typeof Row>;

export const Rect = z.object({
  min: Point2D,
  max: Point2D,
});
export type Rect = z.infer<typeof Rect>;

export const Table = z.object({
  columns: z.array(Column),
  rows: z.array(Row),
});
export type Table = z.infer<typeof Table>;

export const Plane = z.object({
  rects: z.array(z.tuple([z.int(), Rect])),
  point: z.nullable(Point2D),
  radius: z.nullable(z.number()),
});
export type Plane = z.infer<typeof Plane>;

export const OkResult = z.object({
  status: z.literal("ok"),
  table: z.nullable(Table),
  plane: z.nullable(Plane),
  messages: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type OkResult = z.infer<typeof OkResult>;

export const ErrorResult = z.object({
  status: z.literal("error"),
  detail: z.string(),
});
export type ErrorResult = z.infer<typeof ErrorResult>;

export const QueryResult = z.discriminatedUnion("status", [
  OkResult,
  ErrorResult,
]);
export type QueryResult = z.infer<typeof QueryResult>;

export const OkResponse = z.object({
  reads: z.int(),
  writes: z.int(),
  time_ms: z.int(),
  results: z.array(QueryResult),
});
export type OkResponse = z.infer<typeof OkResponse>;

export const ErrorResponse = z.object({
  detail: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
