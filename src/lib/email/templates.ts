import { EmailTemplate } from "./types";

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  "otp-verification": {
    name: "otp-verification",
    subject: "Your verification code",
    html: `<p>Your one-time verification code is <strong>{otp}</strong>.</p><p>This code expires in 5 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
    text: `Your one-time verification code is: {otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
  },
  "otp-password-reset": {
    name: "otp-password-reset",
    subject: "Password reset code",
    html: `<p>Your password reset code is <strong>{otp}</strong>.</p><p>This code expires in 15 minutes.</p>`,
    text: `Your password reset code is: {otp}\n\nThis code expires in 15 minutes.`,
  },
  "otp-login": {
    name: "otp-login",
    subject: "Your login code",
    html: `<p>Your login code is <strong>{otp}</strong>.</p><p>This code expires in 5 minutes.</p>`,
    text: `Your login code is: {otp}\n\nThis code expires in 5 minutes.`,
  },
};

export function renderTemplate(template: EmailTemplate, variables: Record<string, string | number>): EmailTemplate {
  const interpolate = (str: string): string =>
    str.replace(/\{(\w+)\}/g, (_, key) => String(variables[key] ?? ""));
  return {
    name: template.name,
    subject: interpolate(template.subject),
    html: interpolate(template.html),
    text: interpolate(template.text),
  };
}
