import { Resend } from 'resend';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) => {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log("Resend API Key or From Email not configured. Skipping email sending.");
    // In a real app, you might want to throw an error or handle this differently
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
    // Handle or throw the error as per application requirements
  }
};
