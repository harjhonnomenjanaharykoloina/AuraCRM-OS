"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

export function AiSummaryPanel({
    recordId,
    objectApiName,
}: {
    recordId: number;
    objectApiName: string;
}) {
    const [summary, setSummary] = useState<string | null>(null);
    const [cached, setCached] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    const generateSummary = async () => {
        setLoading(true);
        setSummary(null);
        setCached(false);
        try {
            const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recordId, objectApiName }),
            });
            const data = await res.json();
            if (data.summary) {
                setSummary(data.summary);
                setCached(data.cached ?? false);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Summary
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating summary...
                    </div>
                ) : summary ? (
                    <p className="text-sm text-slate-700">{summary}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Generate an AI-powered summary of this record.
                    </p>
                )}
                {cached && (
                    <p className="mt-2 text-xs text-slate-400">(cached)</p>
                )}
                <Button
                    onClick={generateSummary}
                    disabled={loading}
                    size="sm"
                    className="mt-3"
                >
                    {loading ? "Generating..." : "Generate Summary"}
                </Button>
            </CardContent>
        </Card>
    );
}
