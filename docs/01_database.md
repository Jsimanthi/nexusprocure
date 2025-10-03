# NexusProcure: Detailed Database Schema

This document provides a detailed breakdown of every model in the `prisma/schema.prisma` file.

## Table of Contents
1.  [RBAC & User Models](#1-rbac--user-models)
    *   [User](#user)
    *   [Role](#role)
    *   [Permission](#permission)
    *   [PermissionsOnRoles](#permissionsonroles)
    *   [Department](#department)
2.  [NextAuth.js Models](#2-nextauthjs-models)
    *   [Account](#account)
    *   [Session](#session)
    *   [VerificationToken](#verificationtoken)
3.  [Core Procurement Models](#3-core-procurement-models)
    *   [IOM (Inter-Office Memo)](#iom-inter-office-memo)
    *   [IOMItem](#iomitem)
    *   [PurchaseOrder](#purchaseorder)
    *   [POItem](#poitem)
    *   [PaymentRequest](#paymentrequest)
4.  [Supporting Models](#4-supporting-models)
    *   [Vendor](#vendor)
    *   [Attachment](#attachment)
    *   [Notification](#notification)
    *   [AuditLog](#auditlog)
    *   [Setting](#setting)
5.  [Enums](#5-enums)
    *   [ActionStatus](#actionstatus)
    *   [IOMStatus](#iomstatus)
    *   [POStatus](#postatus)
    *   [PRStatus](#prstatus)
    *   [PaymentMethod](#paymentmethod)

---

## 1. RBAC & User Models

These models form the foundation of the Role-Based Access Control system and user management.

### `User`
Represents an individual user account in the system.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier for the user (CUID). |
| `name` | `String?` | The user's full name. Optional. |
| `email` | `String` | The user's email address. Must be unique. Used for login. |
| `emailVerified` | `DateTime?` | Timestamp indicating when the user's email was verified. |
| `image` | `String?` | URL for the user's profile picture. |
| `roleId` | `String?` | Foreign key linking to the `Role` model. |
| `role` | `Role?` | Relation to the user's assigned role. |
| `departmentId` | `String?` | Foreign key linking to the `Department` model. |
| `department` | `Department?` | Relation to the user's assigned department. |
| `password` | `String?` | The user's hashed password. |
| `accounts` | `Account[]` | Relation to linked OAuth accounts (for NextAuth.js). |
| `sessions` | `Session[]` | Relation to active user sessions (for NextAuth.js). |
| `notifications` | `Notification[]` | Relation to all notifications for this user. |
| `preparedIOMs` | `IOM[]` | Reverse relation for all IOMs prepared by this user. |
| `...` | `...` | Multiple reverse relations for IOMs, POs, and PRs, linking the user to documents they've prepared, requested, reviewed, or approved. |
| `createdAt` | `DateTime` | Timestamp of when the user account was created. |
| `updatedAt` | `DateTime` | Timestamp of the last update to the user account. |

### `Role`
Defines a specific role within the system (e.g., "Administrator", "Manager").

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier for the role. |
| `name` | `String` | The name of the role. Must be unique. |
| `users` | `User[]` | Reverse relation to all users assigned this role. |
| `permissions` | `PermissionsOnRoles[]` | Relation to the join table that links this role to its permissions. |

### `Permission`
Represents a single, specific action that can be permitted or denied (e.g., "CREATE_PO").

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier for the permission. |
| `name` | `String` | The name of the permission. Must be unique. |
| `roles` | `PermissionsOnRoles[]` | Relation to the join table that links this permission to roles. |

### `PermissionsOnRoles`
This is a many-to-many join table connecting `Role` and `Permission`.

| Field | Type | Description |
|---|---|---|
| `roleId` | `String` | Foreign key for the `Role`. |
| `permissionId` | `String` | Foreign key for the `Permission`. |
| `assignedAt` | `DateTime` | Timestamp of when the permission was assigned to the role. |
| `assignedBy` | `String` | Identifier of the user who assigned the permission. |

### `Department`
Represents an organizational department for tracking and analytics.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier for the department. |
| `name` | `String` | The name of the department (e.g., "IT", "Finance"). Must be unique. |
| `users` | `User[]` | Reverse relation to all users in this department. |
| `ioms` | `IOM[]` | Reverse relation to all IOMs originating from this department. |
| `purchaseOrders`| `PurchaseOrder[]` | Reverse relation to all POs from this department. |
| `paymentRequests`| `PaymentRequest[]` | Reverse relation to all PRs from this department. |

---

## 2. NextAuth.js Models
Standard models required by NextAuth.js for session management.

### `Account`
Used for linking OAuth accounts.

### `Session`
Stores user session information.

### `VerificationToken`
Used for email verification tokens (e.g., for passwordless login).

---

## 3. Core Procurement Models

### `IOM` (Inter-Office Memo)
The internal request that initiates a procurement workflow.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `iomNumber` | `String` | A unique, human-readable number for the IOM (e.g., "IOM-2023-0001"). |
| `title` | `String` | The main title of the IOM. |
| `from` / `to` / `subject` | `String` | Standard memo fields. |
| `content` | `String?` | The main body/content of the memo. |
| `status` | `IOMStatus` | The current status in the workflow (e.g., `DRAFT`, `APPROVED`). |
| `totalAmount` | `Float` | The calculated total amount of all items in the IOM. |
| `departmentId`| `String?` | Foreign key linking to the `Department`. |
| `department`  | `Department?` | Relation to the department this IOM belongs to. |
| `items` | `IOMItem[]` | Relation to the line items of this IOM. |
| `preparedById` | `String` | FK for the user who created the IOM. |
| `requestedById` | `String` | FK for the user on whose behalf the IOM was created. |
| `reviewedById` | `String?` | FK for the user assigned to review the IOM. |
| `approvedById` | `String?` | FK for the user assigned to approve the IOM. |
| `purchaseOrders`| `PurchaseOrder[]` | Reverse relation to any POs created from this IOM. |
| `attachments` | `Attachment[]` | Relation to any files attached to this IOM. |

### `IOMItem`
A line item within an IOM.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `itemName` | `String` | Name of the item being requested. |
| `description` | `String?` | Further details about the item. |
| `quantity` | `Int` | The quantity of the item. |
| `unitPrice` | `Float` | The price per unit. |
| `totalPrice` | `Float` | The calculated total price (`quantity` * `unitPrice`). |
| `iomId` | `String` | Foreign key linking back to the parent `IOM`. |

### `PurchaseOrder`
The formal order placed with an external vendor.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `poNumber` | `String` | A unique, human-readable number for the PO. |
| `iomId` | `String?` | Foreign key linking to the IOM this PO was converted from. |
| `vendorId` | `String?` | Foreign key linking to the `Vendor`. |
| `departmentId`| `String?` | Foreign key linking to the `Department`. Inherited from IOM or User. |
| `department`  | `Department?` | Relation to the department this PO belongs to. |
| `title` | `String` | The title of the PO. |
| `status` | `POStatus` | The current status in the workflow (e.g., `DRAFT`, `ORDERED`). |
| `totalAmount`| `Float` | The subtotal before tax. |
| `taxAmount` | `Float` | The calculated total tax amount. |
| `grandTotal`| `Float` | The final total (`totalAmount` + `taxAmount`). |
| ... | ... | Contains many fields for company and vendor details, currency, etc. |
| `items` | `POItem[]` | Relation to the line items of this PO. |

### `POItem`
A line item within a `PurchaseOrder`. Similar to `IOMItem` but includes fields for `taxRate` and `taxAmount`.

### `PaymentRequest`
A request to make a payment, typically for a fulfilled PO.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `prNumber` | `String` | A unique, human-readable number for the PR. |
| `poId` | `String?` | Foreign key linking to the PO this PR is for. |
| `departmentId`| `String?` | Foreign key linking to the `Department`. Inherited from PO. |
| `department`  | `Department?` | Relation to the department this PR belongs to. |
| ... | ... | Contains fields for totals, currency, and payment-specific details like `paymentTo`, `paymentDate`, `paymentMethod`, `bankAccount`, etc. |
| `status` | `PRStatus` | The current status in the workflow (e.g., `DRAFT`, `PROCESSED`). |

---

## 4. Supporting Models

### `Vendor`
Represents an external supplier or vendor. Contains fields for name, address, contact info, etc.

### `Attachment`
A polymorphic-like model to handle file uploads.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `url` | `String` | The URL where the file is stored (e.g., on Vercel Blob). |
| `filename` | `String` | The name of the file. |
| `filetype` | `String` | The MIME type of the file. |
| `size` | `Int` | The size of the file in bytes. |
| `iomId` | `String?` | Optional FK to an IOM. |
| `poId` | `String?` | Optional FK to a PO. |
| `prId` | `String?` | Optional FK to a PR. |

### `Notification`
A message sent to a user within the application.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `message` | `String` | The content of the notification. |
| `read` | `Boolean` | Flag indicating if the user has read the notification. |
| `userId` | `String` | Foreign key linking to the `User` who should receive it. |

### `AuditLog`
Records significant events for accountability.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `action` | `String` | The type of action (e.g., "CREATE", "UPDATE", "DELETE"). |
| `model` | `String` | The name of the model that was changed (e.g., "IOM", "User"). |
| `recordId` | `String` | The ID of the record that was changed. |
| `userId` | `String` | The ID of the user who performed the action. |
| `userName` | `String` | The name of the user who performed the action. |
| `changes` | `String` | A JSON string representing the changes made. |

### `Setting`
A simple key-value store for dynamic application configuration.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique identifier. |
| `key` | `String` | The unique key for the setting (e.g., "site_name"). |
| `value` | `String` | The value of the setting. |

---

## 5. Enums

### `ActionStatus`
`PENDING`, `APPROVED`, `REJECTED`

### `IOMStatus`
`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `COMPLETED`

### `POStatus`
`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `ORDERED`, `DELIVERED`, `CANCELLED`, `COMPLETED`

### `PRStatus`
`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `PROCESSED`, `CANCELLED`

### `PaymentMethod`
`CHEQUE`, `BANK_TRANSFER`, `CASH`, `ONLINE_PAYMENT`