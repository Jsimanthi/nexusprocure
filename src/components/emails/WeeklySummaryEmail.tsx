import * as React from 'react';

interface WeeklySummaryEmailProps {
  userName: string;
  totalSpend: number;
  poCount: number;
  startDate: string;
  endDate: string;
}

const WeeklySummaryEmail: React.FC<Readonly<WeeklySummaryEmailProps>> = ({
  userName,
  totalSpend,
  poCount,
  startDate,
  endDate,
}) => (
  <div>
    <h1>Your Weekly Spend Summary is Here!</h1>
    <p>Hi {userName},</p>
    <p>
      Here is your automated spending report for the period of <strong>{startDate}</strong> to <strong>{endDate}</strong>.
    </p>
    <h2>Report Highlights:</h2>
    <ul>
      <li><strong>Total Purchase Orders:</strong> {poCount}</li>
      <li>
        <strong>Total Spend:</strong> {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalSpend)}
      </li>
    </ul>
    <p>
      For a detailed breakdown, please see the attached CSV file.
    </p>
    <p>
      Thank you for using NexusProcure.
    </p>
  </div>
);

export default WeeklySummaryEmail;