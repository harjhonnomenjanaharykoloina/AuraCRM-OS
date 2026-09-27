import { describe, expect, it } from "vitest";
import {
    DEFAULT_STAGE_PROBABILITY,
    STAGE_FORECAST_CATEGORY,
    computeProbability,
    computeExpectedRevenue,
    getForecastCategoryForStage,
} from "@/lib/opportunity";

describe("opportunity lib", () => {
    describe("DEFAULT_STAGE_PROBABILITY", () => {
        it("has all 7 stages mapped", () => {
            expect(Object.keys(DEFAULT_STAGE_PROBABILITY)).toHaveLength(7);
            expect(DEFAULT_STAGE_PROBABILITY.Lead).toBe(10);
            expect(DEFAULT_STAGE_PROBABILITY.Qualified).toBe(25);
            expect(DEFAULT_STAGE_PROBABILITY.Demo).toBe(50);
            expect(DEFAULT_STAGE_PROBABILITY.Proposal).toBe(75);
            expect(DEFAULT_STAGE_PROBABILITY.Negotiation).toBe(90);
            expect(DEFAULT_STAGE_PROBABILITY.Won).toBe(100);
            expect(DEFAULT_STAGE_PROBABILITY.Lost).toBe(0);
        });
    });

    describe("STAGE_FORECAST_CATEGORY", () => {
        it("maps stages to forecast categories", () => {
            expect(STAGE_FORECAST_CATEGORY.Lead).toBe("Pipeline");
            expect(STAGE_FORECAST_CATEGORY.Qualified).toBe("Pipeline");
            expect(STAGE_FORECAST_CATEGORY.Demo).toBe("Pipeline");
            expect(STAGE_FORECAST_CATEGORY.Proposal).toBe("Best Case");
            expect(STAGE_FORECAST_CATEGORY.Negotiation).toBe("Commit");
            expect(STAGE_FORECAST_CATEGORY.Won).toBe("Closed Won");
            expect(STAGE_FORECAST_CATEGORY.Lost).toBe("Pipeline");
        });
    });

    describe("computeProbability", () => {
        it("returns correct probability for Lead", () => {
            expect(computeProbability("Lead")).toBe(10);
        });

        it("returns correct probability for Qualified", () => {
            expect(computeProbability("Qualified")).toBe(25);
        });

        it("returns correct probability for Demo", () => {
            expect(computeProbability("Demo")).toBe(50);
        });

        it("returns correct probability for Proposal", () => {
            expect(computeProbability("Proposal")).toBe(75);
        });

        it("returns correct probability for Negotiation", () => {
            expect(computeProbability("Negotiation")).toBe(90);
        });

        it("returns 100 for Won", () => {
            expect(computeProbability("Won")).toBe(100);
        });

        it("returns 0 for Lost", () => {
            expect(computeProbability("Lost")).toBe(0);
        });

        it("returns 0 for unknown stage", () => {
            expect(computeProbability("Some Unknown Stage")).toBe(0);
        });
    });

    describe("computeExpectedRevenue", () => {
        it("computes expected revenue from number amount and probability", () => {
            expect(computeExpectedRevenue(1000, 75)).toBe(750);
        });

        it("computes expected revenue from string amount", () => {
            expect(computeExpectedRevenue("1000", 75)).toBe(750);
        });

        it("computes expected revenue from decimal amount", () => {
            expect(computeExpectedRevenue(1500.5, 50)).toBe(750);
        });

        it("returns null when amount is null", () => {
            expect(computeExpectedRevenue(null, 75)).toBeNull();
        });

        it("returns null when amount is undefined", () => {
            expect(computeExpectedRevenue(undefined as any, 75)).toBeNull();
        });

        it("returns null when probability is null", () => {
            expect(computeExpectedRevenue(1000, null)).toBeNull();
        });

        it("returns null when probability is undefined", () => {
            expect(computeExpectedRevenue(1000, undefined as any)).toBeNull();
        });

        it("returns null when amount is NaN string", () => {
            expect(computeExpectedRevenue("not-a-number", 75)).toBeNull();
        });

        it("returns 0 when amount is 0", () => {
            expect(computeExpectedRevenue(0, 50)).toBe(0);
        });

        it("rounds to nearest integer", () => {
            expect(computeExpectedRevenue(999, 25)).toBe(250);
            expect(computeExpectedRevenue(333, 90)).toBe(300);
            expect(computeExpectedRevenue(100, 1)).toBe(1);
            expect(computeExpectedRevenue(150, 1)).toBe(2);
        });
    });

    describe("getForecastCategoryForStage", () => {
        it("returns Pipeline for Lead", () => {
            expect(getForecastCategoryForStage("Lead")).toBe("Pipeline");
        });

        it("returns Pipeline for Qualified", () => {
            expect(getForecastCategoryForStage("Qualified")).toBe("Pipeline");
        });

        it("returns Pipeline for Demo", () => {
            expect(getForecastCategoryForStage("Demo")).toBe("Pipeline");
        });

        it("returns Best Case for Proposal", () => {
            expect(getForecastCategoryForStage("Proposal")).toBe("Best Case");
        });

        it("returns Commit for Negotiation", () => {
            expect(getForecastCategoryForStage("Negotiation")).toBe("Commit");
        });

        it("returns Closed Won for Won", () => {
            expect(getForecastCategoryForStage("Won")).toBe("Closed Won");
        });

        it("returns Pipeline for Lost", () => {
            expect(getForecastCategoryForStage("Lost")).toBe("Pipeline");
        });

        it("returns Pipeline as fallback for unknown stage", () => {
            expect(getForecastCategoryForStage("Unknown Stage")).toBe("Pipeline");
        });
    });
});
