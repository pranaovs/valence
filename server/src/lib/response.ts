import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ status: "ok" as const, data }, status);
}

export function error(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400
) {
  return c.json({ status: "error" as const, error: { code, message } }, status);
}

export function paginated<T>(
  c: Context,
  data: T[],
  page: number,
  perPage: number,
  total: number
) {
  return c.json({
    status: "ok" as const,
    data,
    pagination: {
      page,
      per_page: perPage,
      total,
      has_next: page * perPage < total,
    },
  });
}
