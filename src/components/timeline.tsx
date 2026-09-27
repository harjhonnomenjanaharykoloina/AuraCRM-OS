"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeForDisplay } from "@/lib/temporal";
import {
    Calendar,
    Clock,
    FileText,
    Mail,
    MoreHorizontal,
    Phone,
    CheckSquare,
} from "lucide-react";
import type { ActivityTimelineItem, TimelineResult } from "@/actions/activity-actions";

interface TimelineProps {
    recordId: number;
}

const activityTypeIcons: Record<string, any> = {
    call: Phone,
    meeting: Calendar,
    email: Mail,
    task: CheckSquare,
    custom: Clock,
};

function getActivityIcon(activityType: string | null): any {
    if (!activityType) return MoreHorizontal;
    return activityTypeIcons[activityType.toLowerCase()] ?? MoreHorizontal;
}

function getStatusBadgeVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
    const lower = (status ?? "").toLowerCase();
    if (lower === "completed") return "default";
    if (lower === "pending") return "secondary";
    if (lower === "scheduled") return "outline";
    return "outline";
}

export function Timeline({ recordId }: TimelineProps) {
    const [result, setResult] = useState<TimelineResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchTimeline = async () => {
            const mod = await import("@/actions/activity-actions");
            const res = await mod.getActivityTimeline(recordId);
            if (!cancelled) {
                setResult(res);
                setLoading(false);
            }
        };
        fetchTimeline();
        return () => { cancelled = true; };
    }, [recordId]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Loading activities...</p>
                </CardContent>
            </Card>
        );
    }

    if (!result?.success || !result.activities) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{result?.error ?? "Failed to load activities."}</p>
                </CardContent>
            </Card>
        );
    }

    const activities = result.activities;

    if (activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No activities yet</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {activities.map((activity: ActivityTimelineItem) => {
                        const Icon = getActivityIcon(activity.activityType);
                        return (
                            <div key={activity.id} className="flex items-start gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium leading-none">
                                            {activity.subject ?? activity.activityType ?? "Untitled"}
                                        </p>
                                        <Badge variant={getStatusBadgeVariant(activity.status)} className="text-xs">
                                            {activity.status ?? "\u2014"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {activity.activityDate && (
                                            <span>
                                                {formatDateTimeForDisplay(activity.activityDate) ?? activity.activityDate}
                                            </span>
                                        )}
                                        {activity.durationMinutes != null && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {activity.durationMinutes} min
                                            </span>
                                        )}
                                        {activity.createdBy?.name && <span>by {activity.createdBy.name}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
