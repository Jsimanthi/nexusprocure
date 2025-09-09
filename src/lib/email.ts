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
    return;
  }

  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      react,
    });

    if (response.data) {
      console.log(`Email sent successfully to ${to}:`, response.data.id);
    } else if (response.error) {
      console.error(`Failed to send email to ${to}:`, response.error);
      return response;
    }

    return response.data;

  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
};