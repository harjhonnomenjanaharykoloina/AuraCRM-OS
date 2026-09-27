import nodemailer, { Transporter } from "nodemailer";
import { EmailProvider, SendEmailOptions } from "./types";

export class SmtpEmailProvider implements EmailProvider {
  name = "smtp" as const;
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const from = opts.from || process.env.SMTP_FROM || process.env.EMAIL_FROM || "noreply@example.com";
      await this.transporter.sendMail({ from, ...opts });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
