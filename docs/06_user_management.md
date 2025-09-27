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

Permissions are granular and control access to specific actions in the system. The following is a list of the available permissions:

*   **IOM:** `CREATE_IOM`, `READ_IOM`, `UPDATE_IOM`, `DELETE_IOM`, `APPROVE_IOM`
*   **PO:** `CREATE_PO`, `READ_PO`, `UPDATE_PO`, `DELETE_PO`, `APPROVE_PO`
*   **PR:** `CREATE_PR`, `READ_PR`, `UPDATE_PR`, `DELETE_PR`, `APPROVE_PR`
*   **User:** `MANAGE_USERS`
*   **Role:** `MANAGE_ROLES`
*   **Vendor:** `MANAGE_VENDORS`
*   **Analytics:** `VIEW_ANALYTICS`

This system allows for a flexible and secure way to manage user access to the application.