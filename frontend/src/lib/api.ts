const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function getHealth() {
  const response = await fetch(`${apiBaseUrl}/health`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json() as Promise<{
    ok: boolean;
    service: string;
  }>;
}

export async function getMatches() {
  const response = await fetch(`${apiBaseUrl}/api/matches`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Could not load matches");
  }

  return response.json() as Promise<{
    matches: Array<{
      id: string;
      status: string;
      isPredictionEnabled: boolean;
      lockAt: string;
      match: {
        id: string;
        stage: string;
        groupName: string;
        kickoffAt: string;
        homeTeam: { name: string; countryCode: string };
        awayTeam: { name: string; countryCode: string };
      };
    }>;
  }>;
}
