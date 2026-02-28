const counters = {
  http_requests_total: 0,
  http_errors_total: 0,
  ws_connections_active: 0,
  ws_connections_total: 0,
  redis_disconnects_total: 0,
};

function incHttpRequest() {
  counters.http_requests_total += 1;
}

function incHttpError() {
  counters.http_errors_total += 1;
}

function incWsConnected() {
  counters.ws_connections_active += 1;
}

function decWsConnected() {
  counters.ws_connections_active = Math.max(0, counters.ws_connections_active - 1);
}

function incWsTotal() {
  counters.ws_connections_total += 1;
}

function incRedisDisconnect() {
  counters.redis_disconnects_total += 1;
}

function renderMetrics() {
  return [
    `http_requests_total ${counters.http_requests_total}`,
    `http_errors_total ${counters.http_errors_total}`,
    `ws_connections_active ${counters.ws_connections_active}`,
    `ws_connections_total ${counters.ws_connections_total}`,
    `redis_disconnects_total ${counters.redis_disconnects_total}`,
  ].join("\n");
}

module.exports = {
  incHttpRequest,
  incHttpError,
  incWsConnected,
  decWsConnected,
  incWsTotal,
  incRedisDisconnect,
  renderMetrics,
};

