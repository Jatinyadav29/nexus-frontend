// The one HTTP client of the app. Every API call goes through `request()`:
//   - base URL from VITE_API_BASE_URL (read per request, so a changed env in
//     tests applies at once), falling back to http://localhost:3005/api;
//   - credentials on every call: auth is the httpOnly `token` cookie, the
//     backend accepts no Authorization header (API_CONTRACT.md §0);
//   - every failure becomes an `ApiError`;
//   - a 401 notifies `onUnauthorized` listeners (AuthContext clears the
//     session — contract M-23). There is no token refresh: the backend has
//     no refresh endpoint (SEC-09), the cookie simply lasts 7 days.
import axios from "axios";
import type { ApiErrorBody } from "../types/api";

export const DEFAULT_API_BASE_URL = "http://localhost:3005/api";

export const getApiBaseUrl = (): string =>
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

const http = axios.create({ withCredentials: true });

/** Any failed API call: HTTP error status, network failure or bad request. */
export class ApiError extends Error {
  /** HTTP status, or null when no response arrived (network/CORS failure). */
  readonly status: number | null;
  /** The `message` of the error envelope, when the server sent one. */
  readonly serverMessage: string | undefined;

  constructor(message: string, status: number | null, serverMessage: string | undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

const isErrorBody = (data: unknown): data is ApiErrorBody =>
  typeof data === "object" &&
  data !== null &&
  "message" in data &&
  typeof data.message === "string";

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    return new ApiError(
      error.message,
      error.response?.status ?? null,
      isErrorBody(data) ? data.message : undefined,
    );
  }
  return new ApiError(error instanceof Error ? error.message : String(error), null, undefined);
};

/**
 * The server's error message for a failed call, if it sent one. Screens show
 * `apiErrorMessage(err) || "<their own fallback text>"`.
 */
export const apiErrorMessage = (error: unknown): string | undefined =>
  error instanceof ApiError ? error.serverMessage : undefined;

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to 401 answers. Returns the unsubscribe function. */
export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

type Method = "GET" | "POST" | "PUT" | "DELETE";

/** Sends one request and resolves with the parsed JSON body of a 2xx answer. */
export async function request<Response>(
  method: Method,
  path: string,
  body?: object,
): Promise<Response> {
  try {
    const response = await http.request<Response>({
      method,
      url: path,
      baseURL: getApiBaseUrl(),
      data: body,
    });
    return response.data;
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      console.warn("Auth token missing or expired.");
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw apiError;
  }
}
