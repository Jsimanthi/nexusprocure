import * as React from 'react';

interface StatusUpdateEmailProps {
  userName: string;
  documentType: 'Purchase Order' | 'IOM' | 'Check Request';
  documentNumber: string;
  newStatus: string;
}

export const StatusUpdateEmail: React.FC<Readonly<StatusUpdateEmailProps>> = ({
  userName,
  documentType,
  documentNumber,
  newStatus,
}) => (
  <div>
    <h1>{documentType} Status Update</h1>
    <p>Hello {userName},</p>
    <p>
      The status of your {documentType}{' '}
      <strong>{documentNumber}</strong> has been updated to{' '}
      <strong>{newStatus}</strong>.
    </p>
    <p>
      You can view the document in the NexusProcure application.
    </p>
    <p>
      Thank you,
      <br />
      The NexusProcure Team
    </p>
  </div>
);
