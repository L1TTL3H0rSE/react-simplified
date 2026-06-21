const API_URL = "http://localhost:3000";

export type ApiHabit = {
  id: string;
  name: string;
  completions: string[];
};

async function parseJsonResponse<T>(
  response: Response,
  error?: string,
): Promise<T> {
  if (!response.ok) {
    throw new Error(error ?? "Request failed");
  }

  return response.json();
}

export async function getHabits(): Promise<ApiHabit[]> {
  const response = await fetch(`${API_URL}/api/habits`);

  return parseJsonResponse(response, "Failed to load habits");
}

export async function createHabit(name: string): Promise<ApiHabit> {
  const response = await fetch(`${API_URL}/api/habits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  return parseJsonResponse(response, "Failed to create habit");
}

export async function deleteHabitRequest(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/habits/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete habit");
  }
}

export async function toggleHabitCompletion(
  id: string,
  date: string,
): Promise<ApiHabit> {
  const response = await fetch(
    `${API_URL}/api/habits/${id}/toggle-completion/${date}`,
    {
      method: "POST",
    },
  );

  return parseJsonResponse(response, "Failed to toggle habit completion");
}
