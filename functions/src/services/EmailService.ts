/**
 * EmailService Stub
 * Logs email attempts without sending. Replace with a real provider when needed.
 */
interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const EmailService = {
  async send({ to, subject }: EmailParams): Promise<void> {
    console.log(`📧 [Email Stub] Would send to ${to}: "${subject}" (No provider configured)`);
  },
};
