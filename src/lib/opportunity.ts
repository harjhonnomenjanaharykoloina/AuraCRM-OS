export const DEFAULT_STAGE_PROBABILITY: Record<string, number> = {
    Lead: 10,
    Qualified: 25,
    Demo: 50,
    Proposal: 75,
    Negotiation: 90,
    Won: 100,
    Lost: 0,
};

export const STAGE_FORECAST_CATEGORY: Record<string, string> = {
    Lead: "Pipeline",
    Qualified: "Pipeline",
    Demo: "Pipeline",
    Proposal: "Best Case",
    Negotiation: "Commit",
    Won: "Closed Won",
    Lost: "Pipeline",
};

export function computeProbability(stageLabel: string): number {
    return DEFAULT_STAGE_PROBABILITY[stageLabel] ?? 0;
}

export function computeExpectedRevenue(
    amount: number | string | null,
    probability: number | null
): number | null {
    if (amount == null || probability == null) return null;
    const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return null;
    return Math.round((numericAmount * probability) / 100);
}

export function getForecastCategoryForStage(stageLabel: string): string {
    return STAGE_FORECAST_CATEGORY[stageLabel] ?? "Pipeline";
}
