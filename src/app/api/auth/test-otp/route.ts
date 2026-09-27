import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ error: "email query param is required" }, { status: 400 });
    }

    const record = await db.verification.findFirst({
        where: { identifier: email },
        orderBy: { createdAt: "desc" },
        select: { value: true, expiresAt: true },
    });

    if (!record) {
        return NextResponse.json({ error: "No OTP found for this email" }, { status: 404 });
    }

    return NextResponse.json({ email, otp: record.value, expiresAt: record.expiresAt });
}
