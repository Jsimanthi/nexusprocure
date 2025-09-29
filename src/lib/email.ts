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
  attachments,
}: {
  to: string;
  subject:string;
  react: React.ReactElement;
  attachments?: { filename: string; content: Buffer }[];
}) => {
  if (!resend || !process.env.EMAIL_FROM) {
    console.log(`Email sending is disabled. To: ${to}, Subject: ${subject}`);
    if (attachments) {
      console.log(`Attachments would have been sent: ${attachments.map(a => a.filename).join(', ')}`);
    }
    return;
  }

  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      react,
      attachments,
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