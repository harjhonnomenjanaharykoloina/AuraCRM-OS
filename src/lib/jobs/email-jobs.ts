import { getBoss } from "@/lib/jobs/pgboss";

export const EMAIL_SEND_JOB = "email.send";

export type EmailSendPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

export async function enqueueEmailJob(payload: EmailSendPayload) {
  const boss = await getBoss();
  await boss.createQueue(EMAIL_SEND_JOB);
  await boss.send(EMAIL_SEND_JOB, payload);
}
