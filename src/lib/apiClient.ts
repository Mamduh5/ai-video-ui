export type ApiErrorCategory =
  | "validation"
  | "not_found"
  | "artifact_not_ready"
  | "network"
  | "server"
  | "unknown";

export interface ApiClientErrorOptions {
  status?: number;
  message: string;
  category: ApiErrorCategory;
  code?: string;
  details?: unknown;
  rawBody?: string;
  cause?: unknown;
}

export class ApiClientError extends Error {
  readonly status?: number;
  readonly category: ApiErrorCategory;
  readonly code?: string;
  readonly details?: unknown;
  readonly rawBody?: string;

  constructor({
    status,
    message,
    category,
    code,
    details,
    rawBody,
    cause,
  }: ApiClientErrorOptions) {
    super(message, { cause });
    this.name = "ApiClientError";
    this.status = status;
    this.category = category;
    this.code = code;
    this.details = details;
    this.rawBody = rawBody;
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface JsonRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

const DEFAULT_API_BASE_URL = "http://localhost:8080";

export function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_API_BASE_URL
  );
}

export function buildApiUrl(path: string, baseUrl = getApiBaseUrl()) {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export async function apiJson<T>(
  path: string,
  options: JsonRequestOptions = {},
  clientOptions: ApiClientOptions = {},
) {
  const url = buildApiUrl(path, clientOptions.baseUrl);

  return fetchJsonUrl<T>(url, options, clientOptions);
}

export async function fetchJsonUrl<T>(
  url: string,
  options: JsonRequestOptions = {},
  clientOptions: ApiClientOptions = {},
) {
  const response = await performFetch(
    url,
    {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    },
    clientOptions.fetchFn,
  );

  await throwIfResponseFailed(response);

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJsonResponse<T>(response);
}

export async function fetchTextUrl(
  url: string,
  clientOptions: ApiClientOptions = {},
) {
  const response = await performFetch(
    url,
    { headers: { Accept: "text/plain, application/json;q=0.9, */*;q=0.8" } },
    clientOptions.fetchFn,
  );

  await throwIfResponseFailed(response);

  return response.text();
}

export async function fetchBlobUrl(
  url: string,
  clientOptions: ApiClientOptions = {},
) {
  const response = await performFetch(
    url,
    { headers: { Accept: "*/*" } },
    clientOptions.fetchFn,
  );

  await throwIfResponseFailed(response);

  return response.blob();
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function isArtifactNotReadyError(error: unknown) {
  return (
    isApiClientError(error) &&
    error.category === "artifact_not_ready" &&
    error.status === 409
  );
}

async function performFetch(
  url: string,
  init: RequestInit,
  fetchFn: typeof fetch = fetch,
) {
  try {
    return await fetchFn(url, init);
  } catch (error) {
    throw new ApiClientError({
      category: "network",
      message: "Backend unavailable or request blocked.",
      cause: error,
      details: error,
    });
  }
}

async function throwIfResponseFailed(response: Response) {
  if (response.ok) {
    return;
  }

  const rawBody = await safeReadText(response);
  const parsedBody = parseMaybeJson(rawBody);
  const message = extractErrorMessage(parsedBody, rawBody, response.status);
  const code = extractErrorCode(parsedBody);
  const details = extractErrorDetails(parsedBody);

  throw new ApiClientError({
    status: response.status,
    category: categoryForStatus(response.status),
    message,
    code,
    details,
    rawBody,
  });
}

async function parseJsonResponse<T>(response: Response) {
  const rawBody = await safeReadText(response);

  if (!rawBody) {
    return undefined as T;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch (error) {
    throw new ApiClientError({
      status: response.status,
      category: "unknown",
      message: "Backend returned invalid JSON.",
      rawBody,
      cause: error,
    });
  }
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function parseMaybeJson(rawBody: string) {
  if (!rawBody) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return undefined;
  }
}

function categoryForStatus(status: number): ApiErrorCategory {
  if (status === 400) {
    return "validation";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status === 409) {
    return "artifact_not_ready";
  }

  if (status >= 500) {
    return "server";
  }

  return "unknown";
}

function extractErrorMessage(
  parsedBody: unknown,
  rawBody: string,
  status: number,
) {
  if (isRecord(parsedBody)) {
    const value = parsedBody.message ?? parsedBody.error;

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  if (rawBody.trim()) {
    return rawBody;
  }

  return `Request failed with status ${status}.`;
}

function extractErrorCode(parsedBody: unknown) {
  if (!isRecord(parsedBody)) {
    return undefined;
  }

  return typeof parsedBody.code === "string" ? parsedBody.code : undefined;
}

function extractErrorDetails(parsedBody: unknown) {
  if (!isRecord(parsedBody)) {
    return parsedBody;
  }

  return parsedBody.details ?? parsedBody.fields ?? parsedBody;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

