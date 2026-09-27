import { EmailProvider, SendEmailOptions } from "./types";

export class ConsoleEmailProvider implements EmailProvider {
  name = "console" as const;

  async sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    console.log("[Email][Console] Sending email:", {
      to: opts.to,
      subject: opts.subject,
    });
    return { success: true };
  }
}
