import { getEmailProvider } from "./factory";
import { renderTemplate, EMAIL_TEMPLATES } from "./templates";
import { SendEmailOptions } from "./types";

export async function sendEmail(
  to: string | string[],
  subjectOrTemplate: string,
  variables?: Record<string, string | number>,
  opts?: Partial<SendEmailOptions>
) {
  const provider = getEmailProvider();
  const from = opts?.from || process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@example.com";

  let subject: string;
  let html: string | undefined;
  let text: string | undefined;

  // If subjectOrTemplate matches a template name, render from template
  const template = EMAIL_TEMPLATES[subjectOrTemplate];
  if (template && variables) {
    const rendered = renderTemplate(template, variables);
    subject = rendered.subject;
    html = rendered.html;
    text = rendered.text;
  } else {
    subject = subjectOrTemplate;
    html = opts?.html;
    text = opts?.text;
  }

  return provider.sendEmail({ to, from, subject, html, text });
}

export async function sendTemplateEmail(
  to: string | string[],
  templateName: string,
  variables: Record<string, string | number>,
  opts?: Partial<SendEmailOptions>
) {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    return { success: false, error: `Unknown email template: ${templateName}` };
  }
  const rendered = renderTemplate(template, variables);
  const provider = getEmailProvider();
  const from = opts?.from || process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@example.com";
  return provider.sendEmail({ to, from, subject: rendered.subject, html: rendered.html, text: rendered.text });
}
