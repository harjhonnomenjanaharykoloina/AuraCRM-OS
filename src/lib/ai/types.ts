export interface AiProvider {
    name: "openai" | "anthropic";
    summarize(content: string, maxTokens?: number): Promise<string>;
    generateFieldSuggestions(content: string, fields: string[]): Promise<string[]>;
    translateQuery(
        naturalLanguage: string,
        schema: unknown
    ): Promise<{ filter: Record<string, any>; intent: string }>;
}

export interface AiSummaryResult {
    summary: string;
    updatedAt: Date;
}
