import { sendTemplateEmail } from "@/lib/email/service";

export type OTPType = "verification" | "password-reset" | "login" | "sign-in" | "email-verification" | "forget-password" | "change-email";

export async function sendVerificationOTPEmail(
    email: string,
    otp: string,
    type: OTPType
): Promise<{ success: boolean }> {
    const templateMap: Record<OTPType, string> = {
        "verification": "otp-verification",
        "password-reset": "otp-password-reset",
        "login": "otp-login",
        "sign-in": "otp-login",
        "email-verification": "otp-verification",
        "forget-password": "otp-password-reset",
        "change-email": "otp-verification",
    };

    const templateName = templateMap[type] || "otp-verification";
    const result = await sendTemplateEmail(email, templateName, { otp });
    return result;
}
