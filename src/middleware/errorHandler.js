export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);

  // Never leak internals (stack traces, DB error text) to the client.
  const status = err.status || 500;
  const message =
    status === 500 ? "Something went wrong. Please try again." : err.message;

  res.status(status).json({ error: message });
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
