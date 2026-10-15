type Provider = { name: string; key: string; baseUrl: string; model: string };

type Message = { role: string; content: string };

const PRESETS = {
  groq: { name: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  gemini: { name: "Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

export function getProvider(): Provider | null {
  const key = process.env.AI_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;
  const preset = key.startsWith("gsk_") ? PRESETS.groq : key.startsWith("AIza") ? PRESETS.gemini : PRESETS.openai;
  return {
    ...preset,
    key,
    baseUrl: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || preset.baseUrl,
    model: process.env.AI_MODEL || process.env.OPENAI_MODEL || preset.model,
  };
}

export async function complete(messages: Message[], json = false): Promise<string> {
  const provider = getProvider();
  if (!provider) throw new Error("No AI provider configured");
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.4,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`${provider.name} request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function completeJson(messages: Message[]): Promise<unknown> {
  const raw = await complete(messages, true);
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}
