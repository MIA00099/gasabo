# Administration System Documentation

## Overview

The platform is governed by a single Administration System with two managed panels:

- **Marketplace Management**
- **Gasabo Real Estate Management**

All administrative actions are protected by role-based access control.

---

## 1. Administrator Access Flow

```text
Administrator Login
        │
        ▼
Authentication
        │
        ▼
Permission Verification
        │
        ▼
Administration Dashboard
        │
 ┌──────┴─────────┐
 ▼                ▼
Marketplace     Real Estate
Management      Management
```

---

## 2. Administrator Roles

| Role | Access Level | Description |
|---|---|---|
| **Administrator** | Full access | Manages sub-administrators, permissions, security, platform configuration, both panels, audit logs, and backups |
| **Sub-Administrator** | Restricted | Limited to modules explicitly assigned by the Administrator (e.g., Product Management, Seller Management, Categories, Advertisements, Reports, Real Estate Content) |

---

## 3. Marketplace Management

### 3.1 Product Management
- View, add, edit, and delete products
- Suspend and restore products
- Feature products
- Set trending and recommended products

### 3.2 Seller Management
- View sellers and seller activity
- Suspend or activate seller accounts
- Reset seller passwords
- Remove seller-listed products

### 3.3 Category Management
- Add, edit, and delete categories
- Upload category icons

### 3.4 Advertisement Management
- Upload homepage banners, hero sliders, and promotional banners
- Schedule advertisements

---

## 4. Gasabo Real Estate Management

Administrators manage public-facing content for the real estate platform, including:

- Homepage hero content
- About, Services, and Contact section content
- Property listings, image galleries, and optional YouTube tours
- Company contact information

---

## 5. Platform User Management

Marketplace sellers are governed separately under Section 3.2. The database also has a distinct
PlatformUser model for future buyer/user accounts, but the current admin UI manages
Administrators and Sub-Administrators rather than a full public-user lifecycle.

```text
User Registers
      │
      ▼
Future Administrator Review
      │
      ▼
View / Suspend / Activate / Reset Password / Assign Roles
```

---

## 6. Notification System

### Seller Notifications
Triggered automatically for:
- Product expiring in 7 days
- Product expired
- Account suspended / activated
- Password reset requests and completed reset notices
- Real-estate public inquiries

### Administrator Notifications
Triggered automatically for:
- New seller registrations
- Suspension requests
- Security alerts
- System errors
- Contact form submissions (also emailed to the platform contact address, and
  listed in the Contact Messages panel; visible to Administrators and any
  Sub-Administrator holding the Reports permission)

---

## 7. Security

**Authentication & Access Flow:**

```text
Login → Authentication → Permission Verification → Access Granted / Denied
```

**Security Features:**
- Encrypted passwords
- Role-Based Access Control (RBAC)
- Audit logs and login history
- Session management
- Input validation
- Manual database backup snapshots
