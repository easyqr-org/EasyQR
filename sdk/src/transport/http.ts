import { EasyQRError } from "../errors/EasyQRError.js";
import type { EasyQRClientConfig } from "../types/config.js";
import type {
  CreateSessionRequest,
  CreateSessionResponse,
} from "../types/session.js";

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${path}`;
}

function normalizeCreateSessionResponse(
  raw: unknown,
  projectId: string
): CreateSessionResponse {
  if (!raw || typeof raw !== "object") {
    throw new EasyQRError(
      "E_HTTP_BAD_RESPONSE",
      "Invalid response payload from create session"
    );
  }

  const body = raw as Record<string, unknown>;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  const desktopUrl = typeof body.desktopUrl === "string" ? body.desktopUrl : null;
  const mobileUrl = typeof body.mobileUrl === "string" ? body.mobileUrl : null;
  const expiresAt =
    typeof body.expiresAt === "number"
      ? body.expiresAt
      : Number.isFinite(Number(body.expiresAt))
        ? Number(body.expiresAt)
        : null;

  if (!sessionId || !desktopUrl || !mobileUrl || expiresAt === null) {
    throw new EasyQRError(
      "E_HTTP_BAD_RESPONSE",
      "Missing required fields in create session response"
    );
  }

  const token = typeof body.wsToken === "string" ? body.wsToken : "";

  return {
    session: {
      sessionId,
      projectId,
      state: "CREATED",
      expiresAt,
    },
    desktopUrl,
    mobileUrl,
    token,
  };
}

function mapHttpError(status: number): EasyQRError {
  if (status === 401) {
    return new EasyQRError("E_HTTP_UNAUTHORIZED", "Unauthorized", status);
  }
  if (status === 429) {
    return new EasyQRError("E_HTTP_RATE_LIMITED", "Rate limit exceeded", status);
  }
  if (status >= 500) {
    return new EasyQRError(
      "E_HTTP_BAD_RESPONSE",
      "Server error during create session",
      status
    );
  }
  return new EasyQRError("E_HTTP_BAD_RESPONSE", "Unexpected HTTP response", status);
}

export async function createSessionRequest(
  config: EasyQRClientConfig,
  input: CreateSessionRequest
): Promise<CreateSessionResponse> {
  const url = joinUrl(config.baseUrl, "/api/sessions");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "x-project-id": config.projectId,
        "x-api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        projectId: config.projectId,
        apiKey: config.apiKey,
        context: input.context,
      }),
    });
  } catch (_error) {
    throw new EasyQRError("E_HTTP_BAD_RESPONSE", "Network error during create session");
  }

  if (!response.ok) {
    throw mapHttpError(response.status);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (_error) {
    throw new EasyQRError(
      "E_HTTP_BAD_RESPONSE",
      "Invalid JSON in create session response",
      response.status
    );
  }

  return normalizeCreateSessionResponse(json, config.projectId);
}
