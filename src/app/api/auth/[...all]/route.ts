import { assertAuthRuntimeEnv, handlers } from "@/auth";

export async function GET(req: Request) {
    assertAuthRuntimeEnv();
    return handlers.GET(req);
}

export async function POST(req: Request) {
    try {
        assertAuthRuntimeEnv();
        return await handlers.POST(req);
    } catch (e: any) {
        const err = e?.cause ? e.cause : e;
        // Log detailed error internally but don't expose to client
        console.error("[auth POST error]", err);
        
        // Return generic error message in production
        const isProduction = process.env.NODE_ENV === "production";
        return new Response(
            JSON.stringify({
                status: 500,
                error: isProduction ? "Internal server error" : err?.message ?? "Internal error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}