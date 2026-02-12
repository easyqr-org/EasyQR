;(function (global) {
  "use strict";

  const DEFAULT_WS_PATH = "/ws";

  function resolveBaseUrl(userBaseUrl) {
    if (userBaseUrl) return userBaseUrl.replace(/\/+$/, "");

    try {
      if (document.currentScript && document.currentScript.src) {
        const srcUrl = new URL(document.currentScript.src, window.location.href);
        return srcUrl.origin;
      }
    } catch (e) {
      // ignore and fall back to window.location
    }

    return window.location.origin.replace(/\/+$/, "");
  }

  function EasyQRClient(config) {
    if (!config || !config.projectId) {
      throw new Error("EasyQR.init: projectId is required");
    }

    this.baseUrl = resolveBaseUrl(config.baseUrl);
    this.projectId = config.projectId;
    this.apiKey = config.apiKey || null;
    this.onScan = typeof config.onScan === "function" ? config.onScan : function () {};
    this.onSessionState =
      typeof config.onSessionState === "function" ? config.onSessionState : function () {};

    this._active = null;
  }

  EasyQRClient.prototype._openWebSocket = function (session, context) {
    if (this._active && this._active.ws && this._active.ws.readyState === WebSocket.OPEN) {
      this._active.ws.close();
    }

    const wsBase = this.baseUrl.replace(/^http/, "ws");
    const wsUrl =
      wsBase +
      DEFAULT_WS_PATH +
      "?token=" +
      encodeURIComponent(session.wsToken) +
      "&role=HOST&sessionId=" +
      encodeURIComponent(session.sessionId);

    const ws = new WebSocket(wsUrl);

    const self = this;

    ws.onmessage = function (event) {
      var msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (msg.type === "SCAN") {
        try {
          self.onScan(msg.payload, {
            sessionId: session.sessionId,
            context: context || null,
          });
        } catch (e) {}
      }

      if (msg.type === "SESSION_STATE") {
        try {
          self.onSessionState(msg, {
            sessionId: session.sessionId,
            context: context || null,
          });
        } catch (e) {}
      }
    };

    ws.onclose = function () {
      if (self._active && self._active.ws === ws) {
        self._active.ws = null;
      }
    };

    this._active = {
      sessionId: session.sessionId,
      ws: ws,
      context: context || null,
    };
  };

  EasyQRClient.prototype.startScan = function (options) {
    var opts = options || {};
    var context = opts.context || null;
    var webhookUrl = opts.webhookUrl || null;
    var windowFeatures =
      opts.windowFeatures || "noopener,noreferrer,width=500,height=700,resizable,scrollbars";

    var body = {
      projectId: this.projectId,
      apiKey: this.apiKey,
      context: context,
      webhookUrl: webhookUrl,
    };

    var self = this;

    return fetch(this.baseUrl + "/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () {
            throw new Error("Failed to create session");
          });
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.sessionId || !data.wsToken) {
          throw new Error("Invalid session response");
        }

        // Open the EasyQR desktop session window so the user can see status.
        if (data.desktopUrl) {
          window.open(data.desktopUrl, "_blank", windowFeatures);
        }

        // Connect this host page to the session via WebSocket.
        self._openWebSocket(
          { sessionId: data.sessionId, wsToken: data.wsToken },
          context
        );

        return {
          sessionId: data.sessionId,
          desktopUrl: data.desktopUrl,
          mobileUrl: data.mobileUrl,
          expiresAt: data.expiresAt,
        };
      });
  };

  EasyQRClient.prototype.terminate = function () {
    if (this._active && this._active.ws) {
      try {
        this._active.ws.close();
      } catch (e) {}
      this._active.ws = null;
    }
    this._active = null;
  };

  var singleton = null;

  var EasyQR = {
    /**
     * Initialize the EasyQR SDK.
     *
     * @param {Object} config
     * @param {string} config.projectId - Tenant/project identifier.
     * @param {string} [config.apiKey] - Optional API key if configured on the server.
     * @param {string} [config.baseUrl] - Base URL of the EasyQR service (e.g. "https://easyqr.example.com").
     * @param {Function} [config.onScan] - Callback invoked on each scan: (payload, { sessionId, context }) => void.
     * @param {Function} [config.onSessionState] - Callback for session state changes.
     */
    init: function (config) {
      singleton = new EasyQRClient(config || {});
      return singleton;
    },

    /**
     * Start a new scan session.
     *
     * @param {Object} [options]
     * @param {Object} [options.context] - Arbitrary metadata passed back with scan events.
     * @param {string} [options.webhookUrl] - Optional backend webhook URL (if server is configured to use it later).
     * @param {string} [options.windowFeatures] - Window features string for window.open.
     * @returns {Promise<{sessionId:string,desktopUrl:string,mobileUrl:string,expiresAt:number}>}
     */
    startScan: function (options) {
      if (!singleton) {
        throw new Error("EasyQR.startScan: call EasyQR.init(config) first");
      }
      return singleton.startScan(options);
    },

    /**
     * Terminate the current WebSocket connection (host side).
     */
    terminate: function () {
      if (singleton) {
        singleton.terminate();
      }
    },
  };

  global.EasyQR = EasyQR;
})(typeof window !== "undefined" ? window : this);

