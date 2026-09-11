/**
 * Email provider stub — wire SMTP/Resend later.
 */
export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  // Intentionally no-op until an email provider is configured.
  void payload;
}
