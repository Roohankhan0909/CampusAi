import type { AiResponse, AiTask, ChatMessage } from "./types";

type AiRequest = {
  task: AiTask;
  input?: string;
  messages?: ChatMessage[];
  count?: number;
};

export async function callAi(body: AiRequest): Promise<AiResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as AiResponse;
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
