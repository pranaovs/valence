import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err);

  if (err instanceof SyntaxError) {
    return c.json(
      {
        status: "error",
        error: { code: "INVALID_JSON", message: "Invalid request body" },
      },
      400
    );
  }

  return c.json(
    {
      status: "error",
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong",
      },
    },
    500
  );
};
