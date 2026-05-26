import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  ReservationSource,
  ReservationStatus,
} from '../../../generated/prisma/client';
import { AvailabilitySearchQueryDto } from './availability-search-query.dto';
import { BookingCalendarQueryDto } from './booking-calendar-query.dto';
import { CreateReservationDto } from './create-reservation.dto';
import { GetReservationsQueryDto } from './get-reservations-query.dto';
import { UpdateReservationDto } from './update-reservation.dto';

describe('reservation DTO validation', () => {
  it('accepts a valid reservation creation payload', async () => {
    const dto = plainToInstance(CreateReservationDto, {
      guestId: '12',
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      adults: '2',
      children: '1',
      source: ReservationSource.PHONE,
      rooms: [
        {
          roomTypeId: '4',
          roomId: '9',
          rate: '125.50',
          notes: 'Near elevator',
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toEqual([]);
    expect(dto.guestId).toBe(12);
    expect(dto.adults).toBe(2);
    expect(dto.children).toBe(1);
    expect(dto.rooms[0]).toMatchObject({
      roomTypeId: 4,
      roomId: 9,
      rate: 125.5,
    });
  });

  it('rejects reservation creation when checkout is not after checkin', async () => {
    const dto = plainToInstance(CreateReservationDto, {
      guestId: 12,
      checkInDate: '2026-06-12',
      checkOutDate: '2026-06-12',
      rooms: [
        {
          roomTypeId: 4,
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'checkOutDate')).toBe(
      true,
    );
  });

  it('rejects reservation creation without at least one room', async () => {
    const dto = plainToInstance(CreateReservationDto, {
      guestId: 12,
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      rooms: [],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'rooms')).toBe(true);
  });

  it('allows partial reservation updates while validating paired date ranges', async () => {
    const partialUpdate = plainToInstance(UpdateReservationDto, {
      checkOutDate: '2026-06-12',
    });
    const invalidRange = plainToInstance(UpdateReservationDto, {
      checkInDate: '2026-06-12',
      checkOutDate: '2026-06-10',
    });

    await expect(validate(partialUpdate)).resolves.toEqual([]);

    const errors = await validate(invalidRange);

    expect(errors.some((error) => error.property === 'checkOutDate')).toBe(
      true,
    );
  });
