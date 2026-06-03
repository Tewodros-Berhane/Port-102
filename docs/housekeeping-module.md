# Housekeeping Module

## Purpose

The housekeeping module manages room-readiness work after checkout and during daily operations. It coordinates cleaning tasks, supervisor inspections, room cleaning status changes, issue reporting, dashboard counts, and attendant productivity summaries.

This module is backend-only and API-first. It does not implement maintenance tickets, linen inventory, payroll, mobile workflows, or hotel multi-tenancy.

## Main Entities

### HousekeepingTask

Represents room work assigned to housekeeping.

Core lifecycle:

```txt
PENDING
ASSIGNED
IN_PROGRESS
INSPECTION_PENDING
APPROVED
```

Alternative terminal or rework states:

```txt
REJECTED
CANCELLED
```

Rejected tasks can be reassigned or restarted for rework.

### HousekeepingIssue

Represents a reported room/task issue found by housekeeping or other authorized users.

Lifecycle:

```txt
OPEN
RESOLVED
CANCELLED
```

Issue reporting does not create a maintenance ticket yet. A future maintenance integration hook is intentionally left in service logic.

### Room Cleaning Status

Supported room cleaning statuses:

```txt
CLEAN
DIRTY
INSPECTED
```

Task completion marks the room `CLEAN`. Supervisor approval marks the room `INSPECTED`.

## Checkout Relationship

Checkout already releases the room and marks it:

```txt
occupancyStatus = VACANT
cleaningStatus = DIRTY
```

The stay checkout workflow now also creates a pending housekeeping task inside the checkout transaction:

```txt
type = CHECKOUT_CLEANING
status = PENDING
priority = NORMAL
sourceType = STAY_CHECKOUT
sourceId = stay.id
roomId = checked-out room
```

Open duplicate checkout cleaning tasks are prevented for the same room and stay source.

## Main Workflows

### Checkout Cleaning

```txt
Stay checkout
-> room becomes VACANT + DIRTY
-> checkout cleaning task is created
-> supervisor assigns task
-> attendant starts task
-> attendant completes task
-> room becomes CLEAN
-> supervisor approves task
-> room becomes INSPECTED
```

### Rejected Cleaning

```txt
Task completed
-> supervisor rejects inspection
-> task becomes REJECTED
-> task can be reassigned or restarted
-> task is completed again
-> supervisor approves
```

### Issue Reporting

```txt
Authorized user reports issue
-> issue remains OPEN
-> authorized user resolves or cancels issue
-> audit log records the state change
```

## Endpoints

### Dashboard

```txt
GET /housekeeping/dashboard
GET /housekeeping/productivity
```

### Tasks

```txt
POST  /housekeeping/tasks
GET   /housekeeping/tasks
GET   /housekeeping/tasks/assigned/me
GET   /housekeeping/tasks/:id
PATCH /housekeeping/tasks/:id
PATCH /housekeeping/tasks/:id/assign
PATCH /housekeeping/tasks/:id/reassign
PATCH /housekeeping/tasks/:id/start
PATCH /housekeeping/tasks/:id/complete
PATCH /housekeeping/tasks/:id/inspect
PATCH /housekeeping/tasks/:id/approve
PATCH /housekeeping/tasks/:id/reject
PATCH /housekeeping/tasks/:id/cancel
```

### Issues

```txt
POST  /housekeeping/issues
GET   /housekeeping/issues
GET   /housekeeping/issues/:id
PATCH /housekeeping/issues/:id/resolve
PATCH /housekeeping/issues/:id/cancel
```

### Room Cleaning Status

```txt
PATCH /housekeeping/rooms/:roomId/cleaning-status
```

## Roles And Permissions

### Supervisors And Managers

Typical supervisor/manager permissions:

```txt
housekeeping.dashboard.read
housekeeping.productivity.read
housekeeping.tasks.create
housekeeping.tasks.read
housekeeping.tasks.assign
housekeeping.tasks.reassign
housekeeping.tasks.inspect
housekeeping.tasks.approve
housekeeping.issues.report
housekeeping.issues.read
room_cleaning_status.update
```

### Attendants

Typical attendant permissions:

```txt
housekeeping.tasks.read.assigned
housekeeping.tasks.start.assigned
housekeeping.tasks.complete.assigned
housekeeping.issues.report
room_cleaning_status.update.assigned
```

Assigned-only operations are enforced in service logic, not only by permissions.

## Audit Logging

The module records audit logs for task creation, checkout auto-creation, assignment, reassignment, start, completion, inspection, approval, rejection, cancellation, issue reporting, issue resolution, issue cancellation, and room cleaning status updates.

Controllers do not write audit logs directly.
