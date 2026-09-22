import { NextResponse } from "next/server";
import { exportRecords } from "@/actions/standard/export-actions";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ appApiName: string; objectApiName: string }> }
) {
    const { objectApiName, appApiName } = await params;
    const url = new URL(request.url);
    const viewId = url.searchParams.get("viewId");
    const listViewId = viewId ? parseInt(viewId, 10) : undefined;

    const result = await exportRecords(objectApiName, listViewId);

    if (!result.success) {
        const message = result.error ?? "";
        if (message.includes("Unauthorized")) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        if (message.includes("permissions")) {
            return new NextResponse("Forbidden", { status: 403 });
        }
        console.error(`CSV export error for ${appApiName}/${objectApiName}:`, result.error);
        return new NextResponse("Export failed", { status: 500 });
    }

    return new NextResponse(result.csv, {
        status: 200,
        headers: {
            "Content-Type": result.contentType ?? "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${result.filename ?? "export"}"`,
            "Cache-Control": "no-store",
        },
    });
}
