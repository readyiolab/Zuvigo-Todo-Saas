import { getEnv } from "@/shared/env";
import { logger } from "@/shared/logger";

/**
 * AI provider interface — OpenAI when configured; stub otherwise.
 */
export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AiProvider {
  chat(messages: AiChatMessage[]): Promise<string>;
  isConfigured(): boolean;
}

export class StubAiProvider implements AiProvider {
  isConfigured() {
    return false;
  }

  async chat(_messages: AiChatMessage[]): Promise<string> {
    return "AI assistant is not configured yet.";
  }
}

export class OpenAiProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async chat(messages: AiChatMessage[]): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn("openai_chat_failed", { status: res.status, text });
      throw new Error("AI provider request failed");
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || "";
  }
}

export function getAiProvider(): AiProvider {
  const env = getEnv();
  const key = env.OPENAI_API_KEY?.trim();
  if (key) {
    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    return new OpenAiProvider(key, model);
  }
  return new StubAiProvider();
}
