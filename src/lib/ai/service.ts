import { db } from "@/lib/db";
import { getAiProvider } from "./factory";
import { AiProvider } from "./types";

export interface RecordContext {
    id: number;
    name: string | null;
    objectApiName: string;
    fields: Record<string, string>;
    updatedAt?: Date | string | null;
    aiSummary?: string | null;
    aiSummaryUpdatedAt?: Date | string | null;
}

export class AiService {
    private provider: AiProvider | null = null;

    constructor() {
        try {
            this.provider = getAiProvider();
        } catch {
            this.provider = null;
        }
    }

    isAvailable(): boolean {
        return this.provider !== null;
    }

    async summarizeRecord(
        record: RecordContext
    ): Promise<{ summary: string; cached: boolean }> {
        if (!this.provider) return { summary: "", cached: false };

        const cached = this.getCachedSummary(record);
        if (cached !== null) {
            return { summary: cached, cached: true };
        }

        const content = this.buildRecordContent(record);
        const summary = await this.provider.summarize(content);

        if (summary) {
            try {
                await db.record.update({
                    where: { id: record.id },
                    data: {
                        aiSummary: summary,
                        aiSummaryUpdatedAt: new Date(),
                    },
                });
            } catch {}
        }

        return { summary, cached: false };
    }

    async suggestFieldValues(content: string, fields: string[]): Promise<string[]> {
        if (!this.provider) return [];
        return this.provider.generateFieldSuggestions(content, fields);
    }

    async translateNaturalLanguageQuery(
        naturalLanguage: string,
        schema: unknown
    ): Promise<{ filter: Record<string, any>; intent: string }> {
        if (!this.provider) return { filter: {}, intent: naturalLanguage };
        return this.provider.translateQuery(naturalLanguage, schema);
    }

    private getCachedSummary(record: RecordContext): string | null {
        if (!record.aiSummary) return null;

        const updated = record.updatedAt ? new Date(record.updatedAt) : null;
        const summaryAt = record.aiSummaryUpdatedAt
            ? new Date(record.aiSummaryUpdatedAt)
            : null;

        if (!updated || !summaryAt) return null;
        if (summaryAt.getTime() < updated.getTime()) return null;

        return record.aiSummary;
    }

    private buildRecordContent(record: RecordContext): string {
        const parts: string[] = [
            `Record: ${record.name || `ID ${record.id}`} (${record.objectApiName})`,
        ];
        for (const [key, value] of Object.entries(record.fields)) {
            parts.push(`${key}: ${value}`);
        }
        return parts.join("\n");
    }
}
