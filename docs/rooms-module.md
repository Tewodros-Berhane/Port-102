# Rooms, Floors, and Room Types Backend Module

## Purpose

The room inventory module manages the physical room setup for a single-hotel Port-102 installation. It provides the foundation for future reservations, check-in, check-out, housekeeping, maintenance, and reporting workflows.

This module is not multi-tenant. It does not use `hotelId`, `HotelUser`, active hotel selection, or hotel-based access checks.

## Main Entities

- `Floor`: Optional physical grouping for rooms, such as "First Floor".
- `RoomType`: Sellable room category with occupancy limits and a base rate.
- `RoomAmenity`: Reusable amenity catalog entries.
- `RoomTypeAmenity`: Assignment between room types and amenities.
- `Room`: Physical room record with separate occupancy, cleaning, and maintenance statuses.
- `RoomStatusLog`: History record for room status changes.

## Status Meaning

- `occupancyStatus`: Whether a guest is currently occupying the room.
- `cleaningStatus`: Whether the room is clean, dirty, or inspected.
- `maintenanceStatus`: Whether the room can be sold or needs maintenance attention.

A room is currently sellable only when all of these are true:

- `isActive = true`
- `occupancyStatus = VACANT`
- `cleaningStatus = CLEAN` or `INSPECTED`
- `maintenanceStatus = AVAILABLE`

Current physical availability is exposed through the rooms module. Date-based booking availability is handled by the reservations module.

## Main Permissions

- Floors: `floors.create`, `floors.read`, `floors.update`, `floors.delete`
- Room types: `room_types.create`, `room_types.read`, `room_types.update`, `room_types.delete`
- Room amenities: `room_amenities.create`, `room_amenities.read`, `room_amenities.update`, `room_amenities.delete`
- Rooms: `rooms.create`, `rooms.read`, `rooms.update`, `rooms.delete`
- Room status: `rooms.status.read`, `rooms.status.update`
- Out-of-order workflow: `rooms.out_of_order.mark`, `rooms.out_of_order.clear`
- Availability: `rooms.availability.read`

## Key Endpoints

Floors:

- `POST /floors`
- `GET /floors`
- `GET /floors/:id`
- `PATCH /floors/:id`
- `DELETE /floors/:id`

Room types:

- `POST /room-types`
- `GET /room-types`
- `GET /room-types/:id`
- `PATCH /room-types/:id`
- `DELETE /room-types/:id`
- `POST /room-types/:id/amenities`
- `DELETE /room-types/:id/amenities/:amenityId`

Room amenities:

- `POST /room-amenities`
- `GET /room-amenities`
- `GET /room-amenities/:id`
- `PATCH /room-amenities/:id`
- `DELETE /room-amenities/:id`

Rooms:

- `POST /rooms`
- `GET /rooms`
- `GET /rooms/:id`
- `PATCH /rooms/:id`
- `DELETE /rooms/:id`
- `PATCH /rooms/:id/status`
- `PATCH /rooms/:id/mark-out-of-order`
- `PATCH /rooms/:id/clear-out-of-order`
- `GET /rooms/availability/summary`
- `GET /rooms/status/summary`
- `GET /rooms/:id/status-logs`

## Audited Actions

The module records audit logs for floor, room type, and room setup changes, plus room status updates, mark-out-of-order, and clear-out-of-order workflows. Room status field changes also create `RoomStatusLog` entries.
