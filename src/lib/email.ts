import { Resend } from 'resend';
import * as React from 'react';

// We will instantiate Resend inside the function to avoid initialization errors on startup.
let resend: Resend | undefined;

if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_12345678_12345678') {
    resend = new Resend(process.env.RESEND_API_KEY);
}

export const sendEmail = async ({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) => {
  if (!resend || !process.env.EMAIL_FROM) {
    console.log(`Email sending is disabled. To: ${to}, Subject: ${subject}`);
    // In a real app, you might want to log the email content for debugging in dev environments
    // For now, we just return silently.
    return;
  }

  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      react,
    });

    console.log(`Email sent successfully to ${to}:`, data.id);
    return data;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
};
