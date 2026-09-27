import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AiService } from "@/lib/ai/service";
import { getSessionUser } from "@/lib/auth/types";

export async function POST(request: Request) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(user.id);
    const organizationId = user.organizationId;

    if (isNaN(userId) || isNaN(organizationId)) {
        return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const body = await request.json();
    const { recordId, objectApiName } = body ?? {};
    if (!recordId || !objectApiName) {
        return NextResponse.json(
            { error: "recordId and objectApiName required" },
            { status: 400 }
        );
    }

    const service = new AiService();
    if (!service.isAvailable()) {
        return NextResponse.json({ error: "AI provider not configured" }, { status: 503 });
    }

    const record = await db.record.findFirst({
        where: {
            id: Number(recordId),
            organizationId,
            isDeleted: false,
            objectDef: { apiName: objectApiName },
        },
        select: {
            id: true,
            name: true,
            updatedAt: true,
            aiSummary: true,
            aiSummaryUpdatedAt: true,
            fields: {
                include: {
                    fieldDef: { select: { apiName: true } },
                },
            },
        },
    });

    if (!record) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const fields: Record<string, string> = {};
    for (const f of record.fields) {
        fields[f.fieldDef.apiName] = f.valueText ?? "";
    }

    const result = await service.summarizeRecord({
        id: record.id,
        name: record.name,
        objectApiName,
        fields,
        updatedAt: record.updatedAt,
        aiSummary: record.aiSummary,
        aiSummaryUpdatedAt: record.aiSummaryUpdatedAt,
    });

    return NextResponse.json({
        summary: result.summary,
        cached: result.cached,
    });
}
