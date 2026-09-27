export type EmailProviderName = "smtp" | "ses" | "console";

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface EmailProvider {
  name: EmailProviderName;
  sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text: string;
}

export interface RenderedEmail {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}
