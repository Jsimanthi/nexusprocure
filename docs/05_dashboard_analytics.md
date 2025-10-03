# NexusProcure: Dashboard & Analytics

This document provides an overview of the dashboard and analytics features in NexusProcure.

## 1. Dashboard

The dashboard is the main landing page for users after logging in. It provides a quick overview of the procurement activities and key metrics relevant to their role.

### 1.1. Key Metrics

The dashboard displays key metrics tailored to the user's role. For example, an administrator might see system-wide totals, while a procurement officer sees counts of their own documents.

### 1.2. Recent Activity

The dashboard also displays a list of recent activities, including the creation and status changes of IOMs, POs, and PRs relevant to the user.

### 1.3. Real-time Updates

The dashboard uses Pusher for real-time updates. When a new activity occurs, the dashboard is automatically updated to reflect the changes without requiring a page refresh.

## 2. Analytics & Reports

The analytics page provides a more in-depth view of the procurement data. It includes charts and graphs to visualize the data and help users make informed decisions.

### 2.1. Spend Over Time

A bar chart that shows the total spending on approved Purchase Orders over the last 12 months. This helps users to track spending trends and identify potential cost-saving opportunities. Users can click on a bar to drill down and view the POs for that specific month.

### 2.2. Spend by Category

A pie chart that shows the distribution of spending across different item categories. This provides a clear visual breakdown of where money is being allocated. Users can click on a pie slice to drill down and view all POs for that specific category.

### 2.3. Spend by Department

A pie chart that visualizes spending across all organizational departments. This is a key feature for managers and administrators to track departmental budgets and analyze spending patterns. The data is aggregated from all non-draft, non-rejected, and non-cancelled Purchase Orders.

### 2.4. Future Enhancements

The analytics and reporting module can be further enhanced with the following features:

*   **Customizable Dashboards:** Allow users to customize their dashboards with widgets that are most relevant to their roles.
*   **Advanced Filtering:** Provide more advanced filtering options to allow users to drill down into the data.
*   **Exporting Reports:** Allow users to export reports in various formats (e.g., PDF, CSV).
*   **Scheduled Reports:** Allow users to schedule reports to be sent to their email on a regular basis.
*   **More Chart Types:** Add more chart types to visualize the data in different ways.
*   **Integration with BI Tools:** Integrate with business intelligence tools like Tableau or Power BI for more advanced analysis.