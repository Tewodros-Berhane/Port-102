# Reservations and Date-Based Availability Module

## Purpose

The reservations module manages the booking foundation for a single-hotel Port-102 installation. It supports guest reservations, reservation room lines, date-based availability, a booking calendar, and the reservation lifecycle up to confirmation, cancellation, and no-show.

This module is not multi-tenant. It does not use `hotelId`, `HotelUser`, active hotel selection, or hotel-based access checks.

## Main Entities

- `Reservation`: The guest booking header with dates, source, status, guest count, notes, cancellation fields, creator, and canceller.
- `ReservationRoom`: One reserved room line for a reservation. It always has a `roomTypeId` and may optionally have an exact `roomId`.
- `Guest`: The customer profile attached to the reservation.
- `RoomType`: The sellable category used for inventory capacity.
- `Room`: The optional exact physical room assignment.

## Reservation Statuses

- `DRAFT`: A provisional reservation that can later be confirmed.
- `CONFIRMED`: An active booking that blocks availability.
- `CANCELLED`: A booking cancelled before stay completion. It does not block availability.
- `NO_SHOW`: A confirmed booking where the guest did not arrive. It does not block availability.
- `CHECKED_IN`: Reserved for the future check-in module.
- `CHECKED_OUT`: Reserved for the future check-out module.

Reservation room statuses:

- `RESERVED`: The room line blocks availability.
- `CANCELLED`: The room line no longer blocks availability.
- `CHECKED_IN`: Reserved for the future check-in module.
- `CHECKED_OUT`: Reserved for the future check-out module.

## Availability Rule

Date-based availability uses this overlap rule:

```text
existing.checkInDate < requestedCheckOutDate
AND existing.checkOutDate > requestedCheckInDate
```

This allows back-to-back stays where one guest checks out on the same date another guest checks in.

A room is available for a date range only when:

- `room.isActive = true`
- `room.maintenanceStatus = AVAILABLE`
- no non-cancelled reservation room blocks the date range
- the parent reservation is not `CANCELLED` or `NO_SHOW`

Availability is calculated from reservation records and room active/maintenance state. It does not yet include advanced rate plans, channel inventory, overbooking rules, or housekeeping readiness.

## Main Permissions

- Reservations: `reservations.create`, `reservations.read`, `reservations.update`, `reservations.cancel`, `reservations.no_show.mark`, `reservations.confirm`
- Availability: `availability.read`
- Booking calendar: `booking_calendar.read`

## Key Endpoints

Reservations:

- `POST /reservations`
- `GET /reservations`
- `GET /reservations/:id`
- `PATCH /reservations/:id`
- `PATCH /reservations/:id/confirm`
- `PATCH /reservations/:id/cancel`
- `PATCH /reservations/:id/no-show`
- `POST /reservations/:id/rooms`
- `PATCH /reservations/:id/rooms/:reservationRoomId`
- `DELETE /reservations/:id/rooms/:reservationRoomId`

Availability and calendar:

- `GET /reservations/availability/search`
- `GET /reservations/availability/by-room-type`
- `GET /reservations/availability/rooms`
- `GET /reservations/calendar`

## Important Business Rules

- Reservation creation requires an active guest and at least one room line.
- Room types must be active.
- Exact room assignments must be active, match the selected room type, be available for sale, and have no overlapping reservation.
- Room-type reservations require enough date-based capacity for the requested room type.
- Updating reservation dates rechecks availability for active reservation room lines.
- Confirming a `DRAFT` reservation changes it to `CONFIRMED`; confirming an already confirmed reservation is idempotent.
- Cancelling a reservation sets reservation status to `CANCELLED`, records the reason, stores cancellation metadata, and sets reservation room lines to `CANCELLED`.
- Marking no-show requires a confirmed reservation, sets status to `NO_SHOW`, records `noShowAt`, and sets reservation room lines to `CANCELLED`.
- Adding or updating reservation room lines rechecks availability.
- Removing the last active room line from an active reservation is blocked.

## Audited Actions

The module records audit logs for:

- reservation creation
- reservation update
- reservation confirmation
- reservation cancellation
- reservation no-show
- reservation room added
- reservation room updated
- reservation room removed

## Current Limitations

- Check-in and check-out workflows are not implemented in this stage.
- Folios, invoices, payments, and deposit posting are not implemented in this stage.
- Housekeeping task creation is not implemented in this stage.
- Availability does not model advanced rate plans, channel allocation, or overbooking controls.
