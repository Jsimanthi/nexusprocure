# NexusProcure: User & Role Management

This document provides an overview of the user and role management features in NexusProcure.

## 1. User Management

The user management module allows administrators to create, view, and manage users in the system.

### 1.1. Creating Users

To create a new user, an administrator can navigate to the "Users" page and click on the "Create User" button. The following information is required to create a new user:

*   **Name:** The full name of the user.
*   **Email:** The email address of the user. This will be used for logging in.
*   **Role:** The role assigned to the user.

### 1.2. Viewing Users

The "Users" page displays a list of all users in the system, along with their name, email, and role. Administrators can search for users by name or email.

### 1.3. Editing Users

Administrators can edit a user's role by clicking on the user in the user list. This will take them to the user's profile page, where they can select a new role for the user from a dropdown menu.

## 2. Role Management

The role management module allows administrators to define roles and assign permissions to them.

### 2.1. Viewing Roles

The "Roles" page displays a list of all roles in the system. Administrators can click on a role to view its details, including the permissions assigned to it.

### 2.2. Editing Roles

When viewing a role's details, an administrator can edit the permissions assigned to that role. The permissions are grouped by model (e.g., IOM, PO, PR) and action (e.g., Create, Read, Update, Delete). The administrator can select or deselect permissions to grant or revoke access to specific features.

## 3. Permissions

Permissions are granular and control access to specific actions in the system. The following is a comprehensive list of the available permissions, defined in `prisma/seed.ts`.

### General Permissions
*   `MANAGE_USERS`: Allows creating, viewing, and editing users.
*   `MANAGE_ROLES`: Allows viewing and editing roles and their permissions.
*   `MANAGE_SETTINGS`: Allows managing system-wide settings.
*   `VIEW_ANALYTICS`: Allows viewing the administrator-level dashboard with KPIs.
*   `MANAGE_VENDORS`: Allows creating, editing, and deleting vendors.

### Document Permissions
These permissions apply to IOMs, POs, and PRs respectively.

*   `CREATE_*`: Allows creating a new document.
*   `READ_*`: Allows viewing a document.
*   `UPDATE_*`: Allows editing a document.
*   `DELETE_*`: Allows deleting a document.
*   `APPROVE_*`: Allows performing the final approval action on a document.
*   `REJECT_*`: Allows rejecting a document during the approval process.
*   `REVIEW_*`: Allows performing the review action on a document.

### System-Wide Read Permissions
*   `READ_ALL_IOMS`: Allows viewing all IOMs in the system, not just those the user is involved with.
*   `READ_ALL_POS`: Allows viewing all POs in the system.
*   `READ_ALL_PRS`: Allows viewing all PRs in the system.

### PR-Specific Permissions
*   `PROCESS_PAYMENT_REQUEST`: Allows marking an approved Payment Request as "PROCESSED".