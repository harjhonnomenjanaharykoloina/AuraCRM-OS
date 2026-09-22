import { z } from "zod";

export const isDevelopmentMode = process.env.NODE_ENV === "development";

const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9\s]/;

export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(UPPERCASE_REGEX, "Password must include at least one uppercase letter")
    .regex(LOWERCASE_REGEX, "Password must include at least one lowercase letter")
    .regex(NUMBER_REGEX, "Password must include at least one number")
    .regex(SPECIAL_CHAR_REGEX, "Password must include at least one special character");

export type PasswordValidationResult = { valid: boolean; error?: string };

export function validatePassword(password: string): PasswordValidationResult {
    const result = passwordSchema.safeParse(password);
    if (result.success) {
        return { valid: true };
    }
    const firstIssue = result.error.issues[0];
    return { valid: false, error: firstIssue?.message ?? "Invalid password" };
}
