Based on your updated RBAC image, the **Driver role has been replaced with a Dispatcher**, and the permissions have changed. Below is the updated document reflecting the new role structure.

---

# **TransitOps – Roles, Responsibilities & Role-Based Access Guide**

This document defines the **Role-Based Access Control (RBAC)** model for the **TransitOps – Smart Transport Operations Platform**. The RBAC implementation ensures that each user can only access the modules required for their responsibilities, improving security, data integrity, and operational efficiency.

---

# **1\. Fleet Manager**

**Primary Responsibility:**  
Manage the organization's fleet, vehicles, maintenance, and overall operational efficiency.

## **Dashboard**

* Total Vehicles  
* Available Vehicles  
* Vehicles On Trip  
* Vehicles In Shop  
* Retired Vehicles  
* Fleet Utilization (%)

## **Accessible Modules**

* Dashboard  
* Vehicle Registry (Full CRUD)  
* Driver Management (Full CRUD)  
* Analytics Dashboard

## **Permissions**

* Register new vehicles.  
* Edit vehicle information.  
* Retire vehicles.  
* Manage driver records.  
* View fleet analytics.  
* Monitor fleet utilization.  
* View operational reports.

**Restrictions**

* Cannot create or dispatch trips.  
* Cannot manage fuel expenses.

---

# **2\. Dispatcher**

**Primary Responsibility:**  
Plan, schedule, create, dispatch, and monitor transportation trips.

## **Dashboard**

* Active Trips  
* Pending Trips  
* Completed Trips  
* Vehicle Availability  
* Driver Availability

## **Accessible Modules**

* Trip Management (Full CRUD)  
* Fleet Registry (View Only)

## **Permissions**

* Create trips.  
* Assign available vehicles.  
* Assign available drivers.  
* Dispatch trips.  
* Complete trips.  
* Cancel trips.  
* Monitor trip progress.  
* View fleet information.

**Restrictions**

* Cannot register or edit vehicles.  
* Cannot manage drivers.  
* Cannot access financial data.  
* Cannot access analytics.

---

# **3\. Safety Officer**

**Primary Responsibility:**  
Ensure driver compliance, monitor license validity, and maintain safety standards.

## **Dashboard**

* Expired Licenses  
* Expiring Licenses  
* Suspended Drivers  
* Average Safety Score  
* Compliance Status

## **Accessible Modules**

* Driver Management (Full CRUD)  
* Trip Management (View Only)

## **Permissions**

* Register drivers.  
* Update driver information.  
* Suspend drivers.  
* Reactivate drivers.  
* Update safety scores.  
* Renew license information.  
* View trip details for compliance verification.

**Restrictions**

* Cannot create trips.  
* Cannot manage vehicles.  
* Cannot access financial information.  
* Cannot access analytics.

---

# **4\. Financial Analyst**

**Primary Responsibility:**  
Monitor transportation expenses, fuel consumption, profitability, and operational analytics.

## **Dashboard**

* Fuel Cost  
* Maintenance Cost  
* Operational Cost  
* Vehicle ROI  
* Monthly Expenses  
* Fuel Efficiency

## **Accessible Modules**

* Fleet Registry (View Only)  
* Fuel & Expense Management  
* Reports & Analytics

## **Permissions**

* Record fuel expenses.  
* Record operational expenses.  
* View fleet information.  
* View analytics.  
* Generate financial reports.  
* Export reports.

**Restrictions**

* Cannot register or modify vehicles.  
* Cannot manage drivers.  
* Cannot create or dispatch trips.

---

# **Recommended Permission Matrix**

| Feature | Fleet Manager | Dispatcher | Safety Officer | Financial Analyst |
| ----- | ----- | ----- | ----- | ----- |
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Vehicle Registry | CRUD | View | No Access | View |
| Driver Management | CRUD | No Access | CRUD | No Access |
| Trip Management | No Access | CRUD | View | No Access |
| Fuel & Expense Management | No Access | No Access | No Access | CRUD |
| Reports & Analytics | ✓ | No Access | No Access | ✓ |

---

# **Recommended Sidebar**

## **Fleet Manager**

* Dashboard  
* Vehicles  
* Drivers  
* Analytics

---

## **Dispatcher**

* Dashboard  
* Trips  
* Fleet (View Only)

---

## **Safety Officer**

* Dashboard  
* Drivers  
* Trip Monitoring (View Only)

---

## **Financial Analyst**

* Dashboard  
* Fleet (View Only)  
* Fuel & Expenses  
* Analytics

---

# **Module Access Summary**

### **Fleet Manager**

✔ Vehicle Management (Full Access)

✔ Driver Management (Full Access)

✔ Analytics (Full Access)

✖ Trip Management

✖ Fuel & Expense Management

---

### **Dispatcher**

✔ Trip Management (Full Access)

✔ Fleet Registry (View Only)

✖ Vehicle Management

✖ Driver Management

✖ Fuel & Expense Management

✖ Analytics

---

### **Safety Officer**

✔ Driver Management (Full Access)

✔ Trip Management (View Only)

✖ Vehicle Management

✖ Fuel & Expense Management

✖ Analytics

---

### **Financial Analyst**

✔ Fleet Registry (View Only)

✔ Fuel & Expense Management (Full Access)

✔ Analytics (Full Access)

✖ Vehicle Management

✖ Driver Management

✖ Trip Management

---

# **Business Rules**

* Only the **Fleet Manager** can create, update, or retire vehicles.  
* Only the **Fleet Manager** and **Safety Officer** can create or modify driver records.  
* Only the **Dispatcher** can create, dispatch, complete, or cancel trips.  
* The **Safety Officer** can only view trips for compliance verification.  
* The **Financial Analyst** has read-only access to fleet information and full access to fuel, expense, and analytics modules.  
* All role permissions must be enforced on both the frontend and backend using Role-Based Access Control (RBAC).  
* Users should only see the navigation menus, pages, and actions permitted for their assigned role.  
* Unauthorized API requests must return appropriate HTTP 403 (Forbidden) responses.

This RBAC model aligns with the permissions shown in your image and provides a practical separation of responsibilities for the TransitOps platform.

