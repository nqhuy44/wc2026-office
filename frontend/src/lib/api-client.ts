const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface RequestOptions extends RequestInit {
  json?: any;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  const url = `${API_BASE_URL}${apiPath}`;
  const headers = new Headers(options.headers);

  if (options.json) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.json);
  }

  // Inject active league ID from localStorage if client side
  if (typeof window !== "undefined") {
    const activeLeagueId = localStorage.getItem("activeLeagueId");
    if (activeLeagueId) {
      headers.set("X-League-ID", activeLeagueId);
    }
  }

  // Ensure cookies are sent (CORS)
  options.credentials = "include";

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = "Something went wrong";
    try {
      const errData = await response.json();
      errorMsg = errData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
