import { EmailProvider } from "./types";
import { ConsoleEmailProvider } from "./console-provider";
import { SmtpEmailProvider } from "./smtp-provider";
import { SesEmailProvider } from "./ses-provider";

let _provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider;

  const providerName = (process.env.EMAIL_PROVIDER || "").toLowerCase();

  switch (providerName) {
    case "smtp":
      _provider = new SmtpEmailProvider();
      break;
    case "ses":
      _provider = new SesEmailProvider();
      break;
    case "console":
    default:
      // Dev mode default — log emails to console
      _provider = new ConsoleEmailProvider();
      break;
  }

  return _provider;
}

export function resetEmailProvider(): void {
  _provider = null;
}
