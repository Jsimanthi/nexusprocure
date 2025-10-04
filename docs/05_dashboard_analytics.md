# NexusProcure: Dashboard & Analytics

This document provides an overview of the role-based dashboards and the specific analytics features in NexusProcure.

## 1. Role-Based Dashboards

The dashboard is the main landing page for users after logging in. The content displayed is tailored to the user's role to provide the most relevant information at a glance. All dashboards feature real-time updates via Pusher.

### 1.1. Administrator Dashboard

The Administrator sees a high-level, system-wide overview.
*   **Widgets**:
    *   **Stats Cards**: Displays total counts of all IOMs, POs, and PRs in the system, plus a count of all documents pending approval.
    *   **KPI Widgets**: A detailed view of Key Performance Indicators (see section 2 below).
    *   **Recent Activity**: A list of the latest 10 significant events across the entire system.

### 1.2. Manager / Approver Dashboard

This dashboard is focused on action items and oversight.
*   **Widgets**:
    *   **Action Items**: Shows counts of documents specifically assigned to the logged-in user for review or approval.
    *   **Recent Activity**: A list of recent activities related to documents the user is involved with.

### 1.3. Procurement Officer Dashboard

This dashboard is designed for users who create and manage procurement documents.
*   **Widgets**:
    *   **My Documents**: Displays counts of IOMs, POs, and PRs that were prepared by the logged-in user.
    *   **Recent Activity**: A list of recent activities related to the user's own documents.

### 1.4. Finance Officer Dashboard

This dashboard is tailored for processing payments.
*   **Widgets**:
    *   **Approved PRs**: Shows a count of Payment Requests that have been fully approved and are ready for processing.
    *   **Recent Activity**: A list of recent activities related to Payment Requests.

---

## 2. Administrator Analytics: Key Performance Indicators (KPIs)

The Administrator dashboard includes a set of calculated KPIs to provide deep insights into the efficiency and performance of the procurement process. These are fetched from the `GET /api/dashboard` endpoint.

### 2.1. KPI Descriptions

*   **Average IOM Approval Time**:
    *   **Calculation**: The average time (in days) between an IOM's creation (`createdAt`) and its final approval (`updatedAt` where `status` is `APPROVED`).
    *   **Purpose**: Measures the efficiency of the initial request approval process.

*   **Average PO Approval Time**:
    *   **Calculation**: The average time (in days) between a PO's creation and its final approval.
    *   **Purpose**: Measures the efficiency of the formal purchase order approval process.

*   **Average PR Processing Time**:
    *   **Calculation**: The average time (in days) between a PR's creation and its final processing (`updatedAt` where `status` is `PROCESSED`).
    *   **Purpose**: Measures the efficiency of the payment processing workflow.

*   **Average Procurement Cycle Time**:
    *   **Calculation**: The average time (in days) from the creation of an IOM (`iom.createdAt`) to the fulfillment of its corresponding PO (`po.fulfilledAt`).
    *   **Purpose**: Provides a holistic view of the entire procurement lifecycle duration, from initial request to delivery.

*   **Emergency Purchase Rate**:
    *   **Calculation**: The percentage of all IOMs that are marked as urgent (`isUrgent` is `true`).
    *   **Purpose**: Helps identify reliance on unplanned or emergency purchases, which can indicate areas for better planning.

*   **Total Spend This Month**:
    *   **Calculation**: The sum of `grandTotal` for all Payment Requests that were moved to the `PROCESSED` status within the current calendar month.
    *   **Purpose**: Provides a real-time view of the organization's spending for the month.