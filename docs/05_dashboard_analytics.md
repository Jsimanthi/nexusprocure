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

The analytics page provides a more in-depth, interactive view of procurement data. It features several charts designed to help users visualize spending and make informed decisions. For a complete roadmap of planned features, please see the `PROPOSAL.md` document.

### 2.1. Spend Over Time

*   **Visualization:** A bar chart displaying the total spending from approved Purchase Orders, aggregated by month.
*   **Interactivity:** Users can click on a specific bar (representing a month) to drill down into a filtered list of all Purchase Orders created in that month. This provides a seamless way to investigate spending spikes or trends.

### 2.2. Spend by Category

*   **Visualization:** A pie chart that breaks down total spending by the procurement category assigned to each Purchase Order item.
*   **Interactivity:** Users can click on a specific slice of the pie (representing a category) to drill down into a filtered list of all Purchase Orders containing items from that category. This helps in understanding where the company's money is being allocated.

### 2.3. Spend by Department

*   **Visualization:** A vertical bar chart showing the total spend for each department.
*   **Interactivity:** Users can click on a department's bar to see a filtered list of all Purchase Orders originating from that department, providing insight into departmental spending habits.