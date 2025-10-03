# Departmental Spend Tracking

This document provides a comprehensive overview of the departmental spend tracking feature in NexusProcure. This feature is designed to provide clear insights into spending across different organizational departments, enhancing budget management and financial accountability.

## 1. Feature Purpose

The primary goal of this feature is to track all procurement-related expenditures against the department that initiated the request. This allows managers and administrators to:

*   Monitor departmental budgets in near real-time.
*   Analyze spending patterns across the organization.
*   Generate reports on departmental spending for financial planning and review.
*   Improve accountability by associating every procurement request with a specific department.

## 2. Core Concepts

### 2.1. Department Management

*   **Creation & Viewing:** Departments (e.g., "IT", "Human Resources", "Finance") can be created and managed by users with the `MANAGE_DEPARTMENTS` permission. This is typically restricted to Administrators.
*   **UI Location:** The department management interface is located in the main dashboard under **Dashboard > Departments**.

### 2.2. User-Department Association

*   Every user in the system is assigned to a single `Department`.
*   This assignment is made on the user creation or user edit pages, which are accessible to users with the `MANAGE_USERS` permission.

### 2.3. Department Inheritance in Workflows

To ensure data integrity and automate the tracking process, the `departmentId` is automatically passed down through the entire procurement workflow.

1.  **Inter-Office Memo (IOM):** When a user creates a new IOM, the system automatically retrieves the `departmentId` from the logged-in user's session and saves it with the IOM record. This establishes the origin of the spending request.

2.  **Purchase Order (PO):**
    *   If a PO is created by converting an approved IOM, it **inherits** the `departmentId` from the parent IOM.
    *   If a PO is created as a standalone document, it is automatically tagged with the `departmentId` of the user who created it.

3.  **Payment Request (PR):**
    *   A PR is always created from a parent PO. Therefore, it automatically **inherits** the `departmentId` from its parent PO.

This inheritance chain ensures that a request originating from the "IT" department will have all its subsequent POs and PRs correctly attributed to the "IT" department, even if they are processed by users in the "Procurement" or "Finance" departments.

## 3. Analytics & Reporting

The culmination of this feature is the **"Spend by Department"** widget on the main Analytics page (`/dashboard/analytics`).

*   **Visualization:** This widget is a pie chart that provides a clear, at-a-glance view of the total spending allocated to each department.
*   **Data Source:** The chart aggregates the `grandTotal` from all `PurchaseOrder` records that are not in a `DRAFT`, `REJECTED`, or `CANCELLED` state. This ensures the analytics reflect actual or committed spending.
*   **Permissions:** This widget, along with the entire analytics page, is only visible to users with the `VIEW_ANALYTICS` permission.