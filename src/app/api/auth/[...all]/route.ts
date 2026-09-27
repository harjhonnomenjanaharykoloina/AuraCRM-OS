import { handlers } from "@/auth";

export const GET = handlers.GET;

export async function POST(req: Request) {
    try {
        return await handlers.POST(req);
    } catch (e: any) {
        const err = e?.cause ? e.cause : e;
        console.error("[auth POST error]", err?.stack || err);
        return new Response(
            JSON.stringify({
                status: 500,
                error: err?.message ?? "Internal error",
                stack: err?.stack,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
