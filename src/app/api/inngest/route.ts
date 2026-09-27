import { inngest } from "@/inngest/client";
import { sendEmail } from "@/inngest/functions/send-email";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendEmail],
});
