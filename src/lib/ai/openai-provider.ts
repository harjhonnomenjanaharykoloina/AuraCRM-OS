import OpenAI from "openai";
import { AiProvider } from "./types";

export class OpenAiProvider implements AiProvider {
    name = "openai" as const;
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model = "gpt-4o-mini") {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async summarize(content: string, maxTokens = 150): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: "Summarize the following record data concisely in 1-2 sentences:",
                },
                { role: "user", content },
            ],
            max_tokens: maxTokens,
        });
        return response.choices[0]?.message?.content?.trim() ?? "";
    }

    async generateFieldSuggestions(content: string, fields: string[]): Promise<string[]> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: `Given a text description, extract relevant values for these fields: ${fields.join(", ")}. Return a JSON object with a "suggestions" key containing an array of {field, value} objects.`,
                },
                { role: "user", content },
            ],
            response_format: { type: "json_object" },
            max_tokens: 200,
        });
        try {
            const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
            return parsed.suggestions?.map((s: any) => s.value) ?? [];
        } catch {
            return [];
        }
    }

    async translateQuery(
        naturalLanguage: string,
        schema: unknown
    ): Promise<{ filter: Record<string, any>; intent: string }> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: `Translate the following natural language query about CRM records into a structured filter. Available fields: ${JSON.stringify(schema)}. Return JSON: { "intent": string, "filter": object }.`,
                },
                { role: "user", content: naturalLanguage },
            ],
            response_format: { type: "json_object" },
            max_tokens: 200,
        });
        try {
            return JSON.parse(response.choices[0]?.message?.content ?? "{}");
        } catch {
            return { filter: {}, intent: naturalLanguage };
        }
    }
}
