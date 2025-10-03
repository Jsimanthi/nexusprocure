# Application Settings

The `Setting` model provides a simple yet powerful key-value store for managing application-wide configurations directly from the database. This allows administrators to dynamically adjust application behavior without requiring code changes or deployments.

## 1. Database Schema

The schema for the `Setting` model is defined in `prisma/schema.prisma` as follows:

```prisma
// prisma/schema.prisma

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique // The unique identifier for the setting
  value     String   // The value of the setting
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

*   `key`: A unique string that acts as the name of the setting (e.g., `site_name`, `maintenance_mode`).
*   `value`: A string that holds the setting's value. For complex data types like booleans or numbers, the application code is responsible for parsing the string. For structured data, JSON can be used.

## 2. Purpose and Use Cases

The primary purpose of the `Setting` model is to store configuration data that is:

*   **Dynamic**: Needs to be changed on the fly by an administrator.
*   **Centralized**: Provides a single source of truth for application configuration.
*   **Persistent**: Stored in the database, ensuring it persists across application restarts.

**Potential Use Cases:**

*   **Maintenance Mode**: A setting with `key: "maintenance_mode"` and `value: "true"` could be used to display a maintenance banner across the application.
*   **Default Currency**: Storing the default currency for financial transactions (e.g., `key: "default_currency"`, `value: "USD"`).
*   **Feature Flags**: Enabling or disabling specific features for all users (e.g., `key: "enable_new_analytics"`, `value: "false"`).
*   **Email Configuration**: Storing sender email addresses or templates.

## 3. Managing Settings

Currently, settings must be managed directly in the database by a system administrator.

Future enhancements could include an "Application Settings" page in the admin dashboard, providing a user-friendly interface for viewing and editing these key-value pairs. This would empower administrators to manage the application's configuration without needing database access.