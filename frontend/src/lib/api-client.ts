const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface RequestOptions extends RequestInit {
  json?: any;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  const url = `${API_BASE_URL}${apiPath}`;
  const headers = new Headers(options.headers);

  if (options.json) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.json);
  }

  if (typeof window !== "undefined") {
    const activeLeagueId = localStorage.getItem("activeLeagueId");
    if (activeLeagueId) {
      headers.set("X-League-ID", activeLeagueId);
    }
  }

  options.credentials = "include";

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let code = "errUnknown";
    let message = "Something went wrong";
    try {
      const errData = await response.json();
      code = errData.code || code;
      message = errData.message || message;
    } catch {
      // ignore
    }
    throw new ApiError(code, message, response.status);
  }

  return response.json() as Promise<T>;
}
