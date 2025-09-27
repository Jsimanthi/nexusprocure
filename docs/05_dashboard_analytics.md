# NexusProcure: Dashboard & Analytics

This document provides an overview of the dashboard and analytics features in NexusProcure.

## 1. Dashboard

The dashboard is the main landing page for users after logging in. It provides a quick overview of the procurement activities and key metrics.

### 1.1. Key Metrics

The dashboard displays the following key metrics:

*   **Total IOMs:** The total number of Inter-Office Memos in the system.
*   **Total POs:** The total number of Purchase Orders in the system.
*   **Total PRs:** The total number of Payment Requests in the system.
*   **Pending Approvals:** The total number of items (IOMs, POs, PRs) that are pending approval.

### 1.2. Recent Activity

The dashboard also displays a list of recent activities, including the creation and status changes of IOMs, POs, and PRs. This allows users to stay up-to-date with the latest activities in the system.

### 1.3. Real-time Updates

The dashboard uses Pusher for real-time updates. When a new activity occurs, the dashboard is automatically updated to reflect the changes without requiring a page refresh.

## 2. Analytics & Reports

The analytics page provides a more in-depth view of the procurement data. It includes charts and graphs to visualize the data and help users make informed decisions.

### 2.1. Document Counts

This section displays the total counts of Purchase Orders, IOMs, and Check Requests.

### 2.2. Purchase Order Status Distribution

A pie chart that shows the distribution of Purchase Orders by their status (e.g., `DRAFT`, `APPROVED`, `REJECTED`). This helps users to quickly understand the current state of the procurement process.

### 2.3. Approved PO Spending (Last 12 Months)

A bar chart that shows the total spending on approved Purchase Orders over the last 12 months. This helps users to track spending trends and identify potential cost-saving opportunities.

### 2.4. Future Enhancements

The analytics and reporting module can be further enhanced with the following features:

*   **Customizable Dashboards:** Allow users to customize their dashboards with widgets that are most relevant to their roles.
*   **Advanced Filtering:** Provide more advanced filtering options to allow users to drill down into the data.
*   **Exporting Reports:** Allow users to export reports in various formats (e.g., PDF, CSV).
*   **Scheduled Reports:** Allow users to schedule reports to be sent to their email on a regular basis.
*   **More Chart Types:** Add more chart types to visualize the data in different ways.
*   **Integration with BI Tools:** Integrate with business intelligence tools like Tableau or Power BI for more advanced analysis.