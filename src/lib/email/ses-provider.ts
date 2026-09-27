import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { EmailProvider, SendEmailOptions } from "./types";

export class SesEmailProvider implements EmailProvider {
  name = "ses" as const;
  private client: SESClient;
  private sourceArn?: string;

  constructor() {
    this.client = new SESClient({
      region: process.env.SES_REGION || process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    this.sourceArn = process.env.SES_SOURCE_ARN;
  }

  async sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    const from = opts.from || process.env.EMAIL_FROM || "noreply@example.com";
    try {
      await this.client.send(new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: Array.isArray(opts.to) ? opts.to : [opts.to] },
        Message: {
          Subject: { Data: opts.subject },
          Body: {
            ...(opts.html ? { Html: { Data: opts.html } } : {}),
            ...(opts.text ? { Text: { Data: opts.text } } : {}),
          },
        },
        ...(this.sourceArn ? { SourceArn: this.sourceArn } : {}),
      }));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
