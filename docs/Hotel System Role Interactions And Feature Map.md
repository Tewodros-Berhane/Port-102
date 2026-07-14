# Hotel Operating System — Role Interactions and Feature Map

This document explains **how each user role interacts with the hotel system** and what features we can derive from those interactions.

The goal is to understand the app from a real hotel workflow perspective before designing screens, database models, or backend APIs.

This version reflects the simplified workflow decisions:

* No platform super admin role for now.
* Receptionist, reservation officer, and cashier are combined into one role.
* No separate kitchen/bar staff system role.
* Waiters take orders traditionally, give the order to the cashier, the cashier prepares the receipt, the kitchen prepares the food, and the waiter delivers it.
* No security officer role for now.

---

# 1. Main Idea

A hotel system is not one dashboard used by everyone.

It is a role-based operating system where each department sees only the tools they need.

The system should answer these questions:

* Who is using the system?
* What job are they trying to do?
* Which app do they use?
* What screens do they need?
* What data do they create or update?
* Which other departments are affected by their action?

From that, we can identify the actual features the app needs.

---

# 2. App Types

## 2.1 Web App — Next.js

Used by desk-based and management users.

Examples:

* hotel owner
* hotel admin
* general manager
* receptionist/cashier
* accountant/finance officer
* HR/admin officer
* procurement/store officer
* restaurant/cafe cashier
* restaurant/cafe supervisor
* housekeeping supervisor
* maintenance supervisor

The web app is best for:

* dashboards
* tables
* reports
* bookings
* billing
* staff management
* inventory management
* system settings
* approvals

---

## 2.2 Mobile App — React Native / Expo

Used by staff who move around the hotel.

Examples:

* housekeeping attendant
* maintenance technician
* waiter / room service runner
* stock checker
* supervisor on duty

The mobile app is best for:

* task lists
* quick status updates
* room cleaning updates
* maintenance issue updates
* taking photos
* updating order delivery status later
* offline-tolerant work

---

## 2.3 Guest Portal / Booking Interface

Used by guests.

This can be a website, mobile web page, QR page, or WhatsApp/SMS-linked page.

Examples:

* online booking
* reservation lookup
* self check-in later
* service requests
* room service ordering later
* payment link
* invoice/receipt viewing

This can come after the internal hotel workflow is stable.

---

# 3. Role Interaction Map

---

# 3.1 Hotel Owner / Director

## App Used

* Web app
* optional mobile summary later

## Main Goal

Understand business performance and control important decisions.

## What They See

* revenue dashboard
* occupancy dashboard
* daily/monthly sales
* profit-related summaries
* department performance
* cash/payment summaries
* approval requests
* guest satisfaction overview
* audit logs for sensitive actions

## What They Do

* review hotel performance
* approve large discounts/refunds
* review revenue reports
* monitor room occupancy
* monitor staff performance
* view department-level summaries
* check suspicious activities

## Features Derived

* owner dashboard
* revenue analytics
* occupancy analytics
* approval workflow
* audit log viewer
* department performance reports
* financial summaries

## Example Scenario

The owner opens the dashboard and sees yesterday’s occupancy, restaurant sales, total payments collected, open maintenance issues, and refunds approved by managers.

---

# 3.2 Hotel Admin

This is usually the main system administrator inside one hotel.

## App Used

* Web app

## Main Goal

Configure the hotel system and manage internal users.

## What They See

* hotel settings
* users and roles
* rooms and room types
* floors/buildings
* departments
* tax/service charge settings
* payment methods
* outlet settings
* system configuration

## What They Do

* create user accounts
* assign roles
* configure hotel details
* create room types
* create floors and rooms
* configure departments
* configure payment methods
* manage permissions

## Features Derived

* hotel profile setup
* user management
* role and permission management
* room setup
* floor/building setup
* department setup
* payment method setup
* system settings

## Example Scenario

The hotel adds a new floor with 12 rooms. The hotel admin creates the floor, creates room types, adds rooms, and assigns them to the correct floor.

---

# 3.3 General Manager

## App Used

* Web app
* optional mobile access later

## Main Goal

Run daily hotel operations across departments.

## What They See

* today’s arrivals
* today’s departures
* current occupancy
* room status map
* unresolved guest complaints
* pending maintenance tasks
* housekeeping progress
* restaurant/cafe sales
* staff on duty
* approval requests
* daily summary report

## What They Do

* monitor daily operations
* handle escalations
* approve discounts or refunds
* check department performance
* assign supervisors
* review complaints
* review maintenance issues
* inspect daily revenue

## Features Derived

* manager operations dashboard
* arrival/departure overview
* room readiness overview
* escalation management
* discount/refund approval
* daily operations report
* staff-on-duty view
* department dashboards

## Example Scenario

At 8:00 AM, the manager checks the dashboard. There are 20 arrivals, 15 departures, 8 dirty rooms, 2 rooms out of order, and 1 VIP guest arriving early. The manager tells housekeeping to prioritize the VIP room.

---

# 3.4 Receptionist / Reservation / Cashier

This is now one combined role.

In many Ethiopian hotels, especially small and mid-sized hotels, the same front desk employee may handle:

* reservations
* guest check-in
* guest check-out
* room assignment
* payment collection
* receipts
* guest questions
* basic guest requests

So instead of treating receptionist, reservation officer, and cashier as separate roles, we combine them into one operational role.

## App Used

* Web app

## Main Goal

Manage the full front desk flow from booking to checkout and payment.

## What They See

* front desk dashboard
* reservation search
* booking calendar
* room availability board
* arrivals list
* departures list
* in-house guest list
* room status map
* guest profile
* stay details
* guest folio
* payment/receipt screen

## What They Do

### Reservation duties

* create reservations
* create walk-in bookings
* modify reservations
* cancel reservations if allowed
* check availability
* record booking source
* add guest details
* add special requests
* record booking deposit
* send or print confirmation

### Check-in duties

* search reservation
* verify guest details
* assign room
* confirm room readiness
* collect deposit or payment
* check guest in
* open guest folio
* mark guest as in-house

### Stay management duties

* handle guest requests
* update guest information
* change room
* extend stay
* post manual charges
* view active folio balance
* coordinate with housekeeping or maintenance

### Checkout and cashier duties

* open guest folio
* review charges
* add missing charges if needed
* apply approved discount if allowed
* record payment
* support partial or split payment
* print/send receipt
* check guest out
* mark room as vacant dirty

## Features Derived

* front desk workspace
* booking calendar
* room availability search
* create reservation
* modify reservation
* cancel reservation
* booking source tracking
* guest profile management
* walk-in booking
* check-in workflow
* room assignment
* room move workflow
* stay extension
* guest request logging
* folio quick view
* payment recording
* deposit management
* partial payment support
* split payment support
* invoice/receipt generation
* checkout workflow

## Example Scenario 1: Reserved Guest Arrives

A guest arrives with a reservation. The receptionist searches the booking, verifies the guest details, checks room readiness, assigns room 203, collects payment, opens the folio, and marks the guest as checked in.

## Example Scenario 2: Walk-In Guest

A guest walks in without a booking. The receptionist checks available rooms, quotes the rate, creates the booking, collects payment/deposit, assigns a room, and checks the guest in immediately.

## Example Scenario 3: Guest Checkout

At checkout, the guest’s folio includes room charge, restaurant charge, and laundry charge. The receptionist/cashier reviews the bill, records payment, prints the receipt, checks the guest out, and the room automatically becomes vacant dirty for housekeeping.

---

# 3.5 Accountant / Finance Officer

## App Used

* Web app

## Main Goal

Reconcile money and produce financial reports.

## What They See

* payment transactions
* invoices
* receipts
* unpaid balances
* daily revenue
* outlet sales
* refund/adjustment logs
* tax/service charge reports
* accounts receivable

## What They Do

* review daily transactions
* reconcile cash/card/mobile payments
* review invoices
* manage receivables
* approve or review adjustments
* export financial reports
* monitor payment discrepancies

## Features Derived

* finance dashboard
* transaction ledger
* invoice management
* receipt management
* accounts receivable
* payment reconciliation
* daily close report
* tax/service charge reports
* adjustment audit

## Example Scenario

At the end of the day, finance checks all payments recorded at front desk and restaurant, compares them with cash/card/mobile money totals, and confirms the day’s settlement.

---

# 3.6 Housekeeping Attendant

## App Used

* Mobile app

## Main Goal

Clean assigned rooms and update room readiness.

## What They See

* assigned room list
* room priority
* room status
* cleaning checklist
* guest notes
* special instructions
* issue report button

## What They Do

* start cleaning task
* mark room cleaned
* report damage
* report missing item
* report maintenance issue
* update minibar/amenity usage if needed
* add photo if needed

## Features Derived

* mobile housekeeping task list
* room cleaning checklist
* room status update
* issue reporting
* photo upload
* priority room flag
* offline task update later

## Example Scenario

After checkout, room 205 becomes vacant dirty. The attendant sees room 205 in the mobile app, starts cleaning, completes the checklist, and marks it cleaned.

---

# 3.7 Housekeeping Supervisor

## App Used

* Web app
* mobile/tablet app

## Main Goal

Assign, monitor, and inspect housekeeping work.

## What They See

* all rooms by status
* housekeeping staff list
* task progress
* floor/zone assignment board
* inspection queue
* dirty/clean/inspected rooms
* priority arrivals

## What They Do

* assign rooms to attendants
* reassign urgent rooms
* inspect cleaned rooms
* approve room as ready
* report room discrepancies
* monitor productivity
* coordinate with front desk

## Features Derived

* housekeeping supervisor dashboard
* floor/zone task assignment
* room inspection workflow
* priority cleaning queue
* productivity tracking
* room discrepancy report

## Example Scenario

A VIP guest arrives early. The supervisor moves that room to high priority, assigns it to an attendant, inspects it after cleaning, then marks it ready for front desk check-in.

---

# 3.8 Maintenance Technician

## App Used

* Mobile app

## Main Goal

Fix assigned maintenance issues.

## What They See

* assigned work orders
* priority level
* room/location
* issue description
* reported by
* photos
* status buttons

## What They Do

* accept/start work order
* inspect issue
* add notes
* mark issue fixed
* request parts/materials
* upload photos
* mark room needs more work

## Features Derived

* mobile maintenance work orders
* status updates
* issue notes
* photo upload
* parts/material request
* room out-of-order linkage
* completion tracking

## Example Scenario

A guest reports the AC is not working. The front desk creates a maintenance ticket. The technician receives a mobile task, checks the room, fixes the issue, uploads a photo/note, and marks the ticket complete.

---

# 3.9 Maintenance Supervisor / Facilities Manager

## App Used

* Web app
* optional mobile

## Main Goal

Control maintenance workload and hotel assets.

## What They See

* open work orders
* overdue work orders
* rooms out of order
* technician assignments
* preventive maintenance schedule
* recurring issue history
* asset/equipment list

## What They Do

* assign technicians
* prioritize work orders
* approve completion
* mark rooms out of order
* return rooms to service
* schedule preventive maintenance
* review recurring problems

## Features Derived

* maintenance dashboard
* work order assignment
* room out-of-order management
* preventive maintenance scheduler
* asset/equipment tracking
* technician workload tracking

## Example Scenario

A pipe leak affects room 310. The supervisor marks the room out of order, assigns a technician, and only returns the room to available inventory after repair is confirmed.

---

# 3.10 Restaurant / Cafe / Bar Cashier

## App Used

* Web app or tablet POS

## Main Goal

Prepare receipts, record outlet sales, and post charges to guest rooms when needed.

## What They See

* POS screen
* menu/products
* order list
* payment options
* room charge option
* daily outlet sales
* printed/issued receipts

## What They Do

* receive order details from waiter
* create POS order
* add items and quantities
* prepare receipt
* accept direct payment
* charge order to guest room
* close order
* send/confirm order for kitchen preparation using the hotel’s traditional process

## Features Derived

* POS order screen
* product/menu management
* receipt preparation
* direct payment handling
* charge-to-room flow
* outlet sales report
* item availability tracking

## Example Scenario

A waiter takes a guest’s food order and gives it to the cashier. The cashier enters the order into the POS, prepares the receipt, and the kitchen starts preparing the food. After preparation, the waiter delivers it to the table.

---

# 3.11 Waiter / Room Service Runner

## App Used

* Mobile app later, or no system access in v1
* tablet POS later if the hotel wants it

## Main Goal

Take guest orders and deliver food/service.

## What They See

If mobile support is added later:

* active orders
* room service requests
* order status
* table/room number
* guest notes

In the simple traditional workflow, they may not need a system account at first.

## What They Do

* take order from guest
* give order to cashier
* deliver food after kitchen preparation
* collect payment if hotel process allows
* inform cashier if guest wants room charge

## Features Derived

For v1:

* waiter does not need a full module
* cashier handles POS entry

For later:

* waiter order-taking app
* room service task list
* delivery status
* table service flow

## Example Scenario

The waiter receives the order from table 4, gives it to the cashier for receipt preparation, waits for the kitchen to prepare the food, then delivers it to the table.

---

# 3.12 Storekeeper / Inventory Officer

## App Used

* Web app
* optional mobile for stock counting

## Main Goal

Track hotel stock and supplies.

## What They See

* stock item list
* current quantities
* reorder alerts
* stock movements
* suppliers
* purchase requests
* department issue records

## What They Do

* create stock items
* receive stock
* issue items to departments
* transfer stock
* adjust stock with approval
* create reorder request
* manage suppliers

## Features Derived

* inventory item management
* stock receiving
* stock issue/transfer
* reorder levels
* supplier management
* purchase request workflow
* stock movement history
* stock adjustment audit

## Example Scenario

Housekeeping requests cleaning chemicals. The storekeeper issues the items from inventory, and the stock balance decreases automatically.

---

# 3.13 Procurement Officer

## App Used

* Web app

## Main Goal

Buy goods and manage suppliers.

## What They See

* purchase requests
* supplier list
* reorder alerts
* purchase orders
* goods received records
* approval status

## What They Do

* review purchase requests
* create purchase orders
* send/record supplier orders
* record received goods
* update purchase status
* compare supplier prices later

## Features Derived

* purchase request management
* purchase order management
* goods received note
* supplier records
* procurement approval flow
* low-stock-to-purchase workflow

## Example Scenario

Inventory shows coffee is below reorder level. Procurement creates a purchase order to the supplier and later records the goods received.

---

# 3.14 HR / Admin Officer

## App Used

* Web app

## Main Goal

Manage employee records and basic workforce operations.

## What They See

* employee list
* departments
* roles
* shift schedules
* attendance records later
* leave requests later
* employee documents

## What They Do

* create employee profiles
* assign department
* assign job role
* assign system account if needed
* manage shifts
* track attendance later
* manage leave later
* upload staff documents

## Features Derived

* employee management
* department management
* role assignment
* shift scheduling
* attendance tracking later
* leave management later
* staff document storage

## Example Scenario

A new receptionist joins. HR creates the employee profile, assigns the Front Desk department, and the hotel admin creates their system login.

---

# 3.15 Guest

## App Used

* guest website/portal
* mobile web link
* optional WhatsApp/SMS link

## Main Goal

Book, stay, request services, and pay easily.

## What They See

* booking page
* reservation confirmation
* check-in form later
* payment page
* service request form
* room service menu later
* folio/invoice view

## What They Do

* book room
* upload/check ID later
* request airport pickup later
* request cleaning or maintenance help later
* order room service later
* pay deposit or balance
* view receipt
* give feedback

## Features Derived

* booking engine
* guest portal
* self check-in later
* guest service requests
* room service portal later
* online payment link
* feedback/review collection

## Example Scenario

The guest receives a pre-arrival link, fills basic details, pays deposit, and requests airport pickup before arriving.

---

# 4. Cross-Role Workflow Examples

---

# 4.1 Booking to Check-In

## Roles Involved

* guest
* receptionist/reservation/cashier
* housekeeping supervisor

## Flow

1. guest books a room or calls/walks in
2. receptionist creates or confirms booking
3. system blocks room inventory
4. housekeeping sees future arrival priority if needed
5. guest arrives
6. receptionist checks reservation
7. receptionist records payment/deposit
8. receptionist assigns room
9. guest becomes in-house

## Features Needed

* booking creation
* availability checking
* guest profile
* reservation status
* room assignment
* payment/deposit
* room readiness check
* check-in workflow

---

# 4.2 Checkout to Room Cleaning

## Roles Involved

* guest
* receptionist/reservation/cashier
* housekeeping attendant
* housekeeping supervisor

## Flow

1. guest asks to check out
2. receptionist opens guest folio
3. receptionist settles balance
4. system closes stay
5. room becomes vacant dirty
6. housekeeping task is created
7. attendant cleans room
8. supervisor inspects room
9. room becomes vacant clean/ready

## Features Needed

* folio settlement
* checkout workflow
* room status update
* automatic housekeeping task
* cleaning checklist
* inspection workflow
* room readiness notification

---

# 4.3 Maintenance Issue During Stay

## Roles Involved

* guest
* receptionist/reservation/cashier
* maintenance technician
* maintenance supervisor
* manager

## Flow

1. guest reports issue
2. receptionist creates maintenance ticket
3. technician receives task
4. technician repairs issue
5. if serious, supervisor marks room out of order
6. manager sees unresolved/critical issue
7. ticket is completed

## Features Needed

* guest request/complaint logging
* maintenance ticket creation
* technician assignment
* mobile work order app
* room out-of-order status
* completion notes/photos
* manager escalation dashboard

---

# 4.4 Traditional Restaurant/Cafe Order Flow

## Roles Involved

* guest
* waiter
* restaurant/cafe cashier
* kitchen staff outside the system
* front desk/finance if charged to room

## Flow

1. guest gives order to waiter
2. waiter gives order details to cashier
3. cashier enters order into POS
4. cashier prepares receipt
5. kitchen starts preparing the food using the traditional internal process
6. waiter delivers food to the table
7. guest pays directly or asks to charge to room
8. if charged to room, the POS posts the amount to the guest folio
9. finance sees outlet revenue later

## Features Needed

* POS order system
* product/menu management
* receipt preparation
* direct payment support
* charge-to-room flow
* folio posting
* outlet revenue reports
* finance reconciliation

---

# 4.5 Stock Reorder Flow

## Roles Involved

* storekeeper
* procurement officer
* manager
* supplier
* finance later

## Flow

1. item stock falls below reorder level
2. system creates low-stock alert
3. storekeeper creates purchase request
4. manager approves request
5. procurement creates purchase order
6. goods are received
7. stock balance updates

## Features Needed

* inventory tracking
* reorder level alerts
* purchase requests
* approval workflow
* purchase orders
* goods received note
* supplier management

---

# 5. Feature List Derived from Roles

---

# 5.1 Core Hotel Setup Features

* hotel profile
* buildings
* floors
* room types
* rooms
* room amenities
* departments
* outlets
* tax/service charge settings
* payment methods
* system users
* roles and permissions

---

# 5.2 Reservation and Front Desk Features

Because receptionist, reservation officer, and cashier are now one combined role, these features belong together in one strong front desk workspace.

* availability search
* booking calendar
* create reservation
* modify reservation
* cancel reservation
* booking source tracking
* guest details
* special requests
* deposit tracking
* confirmation notifications
* arrivals list
* departures list
* in-house guests
* walk-in booking
* check-in
* check-out
* room assignment
* room move
* stay extension
* guest profile view
* room status map
* guest request logging
* folio quick view
* payment recording
* receipt generation

---

# 5.3 Room and Housekeeping Features

* room status board
* vacant/occupied state
* clean/dirty/inspected state
* out-of-order state
* automatic cleaning task after checkout
* task assignment
* mobile housekeeping checklist
* inspection workflow
* priority rooms
* room discrepancy report

---

# 5.4 Maintenance Features

* maintenance ticket creation
* technician assignment
* mobile work order list
* priority levels
* room/facility issue tracking
* photo upload
* completion notes
* room out-of-order linkage
* preventive maintenance later
* asset tracking later

---

# 5.5 Billing and Payment Features

* guest folio
* room charges
* POS charges
* manual charges
* taxes/service charges
* discounts
* deposits
* partial payments
* split payments
* refunds/adjustments
* invoices
* receipts
* daily settlement
* payment reconciliation

---

# 5.6 POS / Restaurant / Cafe / Store Features

* product/menu items
* POS order creation by cashier
* receipt preparation
* direct payment
* charge-to-room
* outlet sales report
* item availability
* room service support later
* waiter order-taking app later if needed

Removed from current scope:

* separate kitchen/bar staff system role
* kitchen display system for v1

---

# 5.7 Inventory and Procurement Features

* stock item management
* stock receiving
* stock issuing
* stock transfers
* reorder levels
* low-stock alerts
* suppliers
* purchase requests
* purchase orders
* goods received notes
* stock adjustment audit

---

# 5.8 Employee and HR Features

* employee profiles
* departments
* job positions
* system account linking
* role assignment
* shift scheduling
* attendance later
* leave management later
* staff documents
* training records later

---

# 5.9 Reports and Dashboards

* owner dashboard
* manager dashboard
* occupancy report
* arrivals/departures report
* room status report
* revenue report
* outlet sales report
* payment report
* finance reconciliation report
* housekeeping productivity report
* maintenance backlog report
* stock movement report
* audit log report

---

# 5.10 Audit Features

* login audit
* role change audit
* reservation change audit
* payment adjustment audit
* refund audit
* room status change audit
* inventory adjustment audit
* maintenance ticket audit
* checkout/check-in audit

Removed from current scope:

* security incident module
* lost and found module
* visitor/vehicle logs

These can be added later only if the hotel needs them.

---

# 5.11 Notification Features

* booking confirmation
* payment receipt
* room ready alert
* housekeeping task notification
* maintenance ticket notification
* low-stock alert
* approval request alert
* guest request alert
* manager escalation alert

---

# 6. Updated MVP Role Priority

For the first build, focus only on the roles that prove the core hotel workflow.

## MVP Roles

1. Hotel Admin
2. General Manager
3. Receptionist / Reservation / Cashier
4. Housekeeping Supervisor
5. Housekeeping Attendant
6. Maintenance Technician
7. Maintenance Supervisor

## MVP Features

* authentication
* users and roles
* hotel setup
* room types
* floors
* rooms
* guests
* reservations
* check-in
* check-out
* folios/payments basic
* room status board
* housekeeping task flow
* maintenance ticket flow
* audit logs basic
* reports basic

---

# 7. Phase 2 Roles

After MVP, add:

* accountant/finance officer
* restaurant/cafe cashier
* waiter / room service runner if needed
* storekeeper
* procurement officer
* HR/admin officer

## Phase 2 Features

* POS
* charge-to-room
* inventory
* purchase requests
* supplier management
* finance reconciliation
* employee records
* shift planning
* basic outlet reporting

---

# 8. Phase 3 Roles

Later add:

* guest portal user
* hotel owner/director advanced dashboard
* waiter mobile ordering if hotel wants digital ordering

## Phase 3 Features

* booking engine
* guest portal
* self check-in
* QR room service
* waiter order-taking app
* advanced reports
* guest feedback
* loyalty/CRM later

---

# 9. Final Feature Understanding

From the updated roles, we can say the hotel system is capable of managing:

1. The hotel structure
2. Users and permissions
3. Room inventory
4. Guest profiles
5. Bookings/reservations
6. Guest check-in and check-out
7. Guest folios and payments
8. Housekeeping operations
9. Maintenance operations
10. Restaurant/cafe/store sales through cashier POS
11. Charge-to-room workflows
12. Stock and procurement
13. Employee records and shifts
14. Reports and dashboards
15. Audit logs
16. Guest communication and notifications
17. Guest-facing booking/service flows later

---

# 10. Simple Mental Model

The hotel system revolves around this chain:

```txt
Hotel setup
↓
Room inventory
↓
Reservation
↓
Guest arrival
↓
Check-in
↓
In-house stay
↓
Services, charges, requests, issues
↓
Checkout and payment
↓
Housekeeping turnover
↓
Room ready for next guest
```

Every role exists to support one part of this chain.

The system becomes powerful when these roles are connected in one shared workflow instead of each department working separately.

---

# 11. Updated Role List Summary

The active role list for now is:

1. Hotel Owner / Director
2. Hotel Admin
3. General Manager
4. Receptionist / Reservation / Cashier
5. Accountant / Finance Officer
6. Housekeeping Supervisor
7. Housekeeping Attendant
8. Maintenance Supervisor / Facilities Manager
9. Maintenance Technician
10. Restaurant / Cafe / Bar Cashier
11. Waiter / Room Service Runner
12. Storekeeper / Inventory Officer
13. Procurement Officer
14. HR / Admin Officer
15. Guest

Removed for now:

* Platform Super Admin
* Separate Reservation Officer
* Separate Front Desk Cashier
* Separate Kitchen / Bar Staff system role
* Security Officer
