import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: process.env.INNGEST_ID || process.env.INNGEST_APP_NAME || "opencrm",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  isDev: process.env.NODE_ENV === "development",
});
