import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { AiProvider } from "./types";

const suggestionsSchema = z.object({
    suggestions: z.array(
        z.object({ field: z.string(), value: z.string() })
    ),
});

const translationSchema = z.object({
    intent: z.string(),
    filter: z.record(z.string(), z.any()),
});

export class AnthropicProvider implements AiProvider {
    name = "anthropic" as const;
    private client: ReturnType<typeof createAnthropic>;
    private model: string;

    constructor(apiKey: string, model = "claude-sonnet-4-20250514") {
        this.client = createAnthropic({ apiKey });
        this.model = model;
    }

    async summarize(content: string, maxTokens = 150): Promise<string> {
        const { text } = await generateText({
            model: this.client(this.model),
            system: "Summarize the following record data concisely in 1-2 sentences:",
            prompt: content,
            maxOutputTokens: maxTokens,
        });
        return text.trim();
    }

    async generateFieldSuggestions(content: string, fields: string[]): Promise<string[]> {
        const { object } = await generateObject({
            model: this.client(this.model),
            schema: suggestionsSchema,
            system: `Given a text description, extract relevant values for these fields: ${fields.join(", ")}. Return a JSON object with a "suggestions" key containing an array of {field, value} objects.`,
            prompt: content,
            maxOutputTokens: 200,
        });
        return object.suggestions.map((s) => s.value);
    }

    async translateQuery(
        naturalLanguage: string,
        schema: unknown
    ): Promise<{ filter: Record<string, any>; intent: string }> {
        const { object } = await generateObject({
            model: this.client(this.model),
            schema: translationSchema,
            system: `Translate the following natural language query about CRM records into a structured filter. Available fields: ${JSON.stringify(schema)}. Return JSON: { "intent": string, "filter": object }.`,
            prompt: naturalLanguage,
            maxOutputTokens: 200,
        });
        return { intent: object.intent, filter: object.filter };
    }
}
