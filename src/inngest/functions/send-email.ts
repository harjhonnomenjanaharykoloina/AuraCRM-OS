import { inngest } from "@/inngest/client";
import { sendEmail as sendEmailProvider } from "@/lib/email/service";

export interface EmailSendPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

export const sendEmail = inngest.createFunction(
  {
    id: "send-email",
    name: "Send email",
    triggers: [{ event: "app/email.send" }],
  },
  async ({ event, step }) => {
    const payload = event.data as EmailSendPayload;

    await step.run("send-email", async () => {
      await sendEmailProvider(payload.to, payload.subject, undefined, {
        html: payload.html,
        text: payload.text,
      });
    });
  }
);
