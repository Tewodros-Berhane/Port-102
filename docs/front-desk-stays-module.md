# Stays and Front Desk Module

## Purpose

The stays and front-desk modules implement arrival, in-house, room assignment,
room move, stay extension, departure, and checkout operations after reservation.

## Entities and lifecycle

`Stay` and `StayRoomAssignment` connect a checked-in reservation and guest to one
or more rooms. A stay is active until checkout; assignments are active until a
move or checkout releases them.

## Endpoints and permissions

Reservation check-in is exposed under the reservation/stay route. `/stays`
provides active-stay detail, assignment, movement, extension, and checkout.
`/front-desk` provides dashboard, arrivals, departures, in-house guests, and room
status views. Controllers apply JWT and operation-specific front-desk permissions.

## Business rules and integrations

Check-in validates reservation dates, room readiness, occupancy, and overlapping
bookings. Checkout requires a settled folio unless an authorized override is
used. Checkout atomically releases room assignments, marks rooms vacant and dirty,
updates reservation/stay status, writes room logs, optionally closes a zero-balance
folio, and creates one checkout-cleaning task per room. Audit records are written
after successful operations.

## Known limitations

Reservation overlap prevention is currently an application check rather than a
PostgreSQL exclusion constraint, so competing bookings require a future database
locking/constraint strategy. Online keys, ID scanning, and external channel-manager
integration are outside this phase.
