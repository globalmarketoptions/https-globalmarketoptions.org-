/*
 * Fail-closed broker adapter boundary.
 *
 * This repository has no selected broker/exchange, provider API contract,
 * order signing scheme, or provider credentials. Do not replace this with a
 * guessed URL or mark a request executed without a confirmed provider result.
 * Implement and review a provider-specific adapter before enabling execution.
 */
async function executeTradeIntent(_intent) {
  const error = new Error("Live trade execution is disabled: configure and review a broker-specific adapter first.");
  error.status = 503;
  throw error;
}

module.exports = { executeTradeIntent };
