import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AiService } from "@/lib/ai/service";

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, fields } = body ?? {};
    if (
        !content ||
        typeof content !== "string" ||
        !Array.isArray(fields) ||
        fields.length === 0
    ) {
        return NextResponse.json(
            { error: "content (string) and fields (string[]) required" },
            { status: 400 }
        );
    }

    const service = new AiService();
    if (!service.isAvailable()) {
        return NextResponse.json({ error: "AI provider not configured" }, { status: 503 });
    }

    const suggestions = await service.suggestFieldValues(content, fields);
    return NextResponse.json({ suggestions });
}
