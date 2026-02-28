import type { EasyQRErrorCode } from "../types/errors.js";

export class EasyQRError extends Error {
  public readonly code: EasyQRErrorCode;
  public readonly status?: number;

  constructor(code: EasyQRErrorCode, message: string, status?: number) {
    super(message);
    this.name = "EasyQRError";
    this.code = code;
    this.status = status;
  }
}
