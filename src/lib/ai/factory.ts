import { AiProvider } from "./types";
import { OpenAiProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

let _provider: AiProvider | null = null;
let _attempted = false;

export function getAiProvider(): AiProvider {
    if (_attempted) {
        if (_provider) return _provider;
        throw new Error("AI provider configured but failed to initialize");
    }
    _attempted = true;

    const aiProvider = (process.env.AI_PROVIDER || "").toLowerCase();

    if (aiProvider === "none" || !aiProvider) {
        throw new Error(
            "AI provider is not configured. Set AI_PROVIDER and an API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) to enable."
        );
    }

    const model = process.env.AI_MODEL;

    switch (aiProvider) {
        case "openai": {
            const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
            if (!apiKey) throw new Error("OPENAI_API_KEY or AI_API_KEY is not set");
            _provider = new OpenAiProvider(apiKey, model ?? "gpt-4o-mini");
            break;
        }
        case "anthropic": {
            const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;
            if (!apiKey) {
                throw new Error("ANTHROPIC_API_KEY or AI_API_KEY is not set");
            }
            _provider = new AnthropicProvider(apiKey, model ?? "claude-sonnet-4-20250514");
            break;
        }
        default:
            throw new Error(`Unknown AI provider: ${aiProvider}`);
    }

    return _provider;
}

export function isAiEnabled(): boolean {
    return (
        (process.env.AI_PROVIDER || "").toLowerCase() !== "none" &&
        Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)
    );
}

export function resetAiProvider(): void {
    _provider = null;
    _attempted = false;
}
