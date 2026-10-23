function setHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function send(res, status, payload) {
  setHeaders(res);
  return res.status(status).json(payload);
}

function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  return send(res, 405, { error: "Method not allowed." });
}

function fail(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error("API request failed:", error.message || error);
  return send(res, status, {
    error: status >= 500 ? "The request could not be completed." : error.message
  });
}

module.exports = { send, methodNotAllowed, fail };
