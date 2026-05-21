import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateGuestDto } from './dto/create-guest.dto';
import { ListGuestsQueryDto } from './dto/list-guests-query.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestsRepository } from './repositories/guests.repository';

type GuestProfile = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  documentNumber: string | null;
  status: string;
  preferences: unknown;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    status: string;
  } | null;
};

@Injectable()
export class GuestsService {
  constructor(private readonly guestsRepository: GuestsRepository) {}

  async create(
    currentUser: CurrentUserPayload,
    createGuestDto: CreateGuestDto,
  ) {
    const email = this.normalizeOptionalEmail(createGuestDto.email);

    await this.ensureEmailAvailable(currentUser.hotelId, email);

    const guest = await this.guestsRepository.createGuest({
      hotelId: currentUser.hotelId,
      firstName: createGuestDto.firstName.trim(),
      lastName: createGuestDto.lastName.trim(),
      email,
      phone: this.normalizeOptionalString(createGuestDto.phone),
      nationality: this.normalizeOptionalString(createGuestDto.nationality),
      documentNumber: this.normalizeOptionalString(
        createGuestDto.documentNumber,
      ),
      preferences: this.toInputJson(createGuestDto.preferences),
    });

    return this.serializeGuest(guest);
  }

  async list(currentUser: CurrentUserPayload, query: ListGuestsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, guests] = await this.guestsRepository.listGuests({
      hotelId: currentUser.hotelId,
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: search ?? undefined,
      status: query.status,
    });

    return {
      items: guests.map((guest) => this.serializeGuest(guest)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(currentUser: CurrentUserPayload, guestId: number) {
    const guest = await this.findRequiredGuest(currentUser.hotelId, guestId);

    return this.serializeGuest(guest);
  }

  async update(
    currentUser: CurrentUserPayload,
    guestId: number,
    updateGuestDto: UpdateGuestDto,
  ) {
    const guest = await this.findRequiredGuest(currentUser.hotelId, guestId);
    const data: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      nationality?: string | null;
      documentNumber?: string | null;
      preferences?: Prisma.InputJsonValue | null;
    } = {};

    if (updateGuestDto.email !== undefined) {
      const email = this.normalizeOptionalEmail(updateGuestDto.email);

      await this.ensureEmailAvailable(currentUser.hotelId, email, guest.id);
      data.email = email;
    }

    if (updateGuestDto.firstName !== undefined) {
      data.firstName = updateGuestDto.firstName.trim();
    }

    if (updateGuestDto.lastName !== undefined) {
      data.lastName = updateGuestDto.lastName.trim();
    }

    if (updateGuestDto.phone !== undefined) {
      data.phone = this.normalizeOptionalString(updateGuestDto.phone);
    }

    if (updateGuestDto.nationality !== undefined) {
      data.nationality = this.normalizeOptionalString(
        updateGuestDto.nationality,
      );
    }

    if (updateGuestDto.documentNumber !== undefined) {
      data.documentNumber = this.normalizeOptionalString(
        updateGuestDto.documentNumber,
      );
    }

    if (updateGuestDto.preferences !== undefined) {
      data.preferences = this.toInputJson(updateGuestDto.preferences);
    }

    if (Object.keys(data).length > 0) {
      await this.updateGuestOrThrow(currentUser.hotelId, guest.id, data);
    }

    return this.getById(currentUser, guest.id);
  }

  private async findRequiredGuest(hotelId: number, guestId: number) {
    const guest = await this.guestsRepository.findGuestProfile(
      hotelId,
      guestId,
    );

    if (!guest) {
      throw new NotFoundException('Guest was not found in this hotel.');
    }

    return guest;
  }

  private async ensureEmailAvailable(
    hotelId: number,
    email?: string | null,
    currentGuestId?: number,
  ) {
    if (!email) {
      return null;
    }

    const existingGuest = await this.guestsRepository.findGuestByEmail(
      hotelId,
      email,
    );

    if (existingGuest && existingGuest.id !== currentGuestId) {
      throw new ConflictException('Guest email already exists in this hotel.');
    }

    return existingGuest;
  }

  private async updateGuestOrThrow(
    hotelId: number,
    guestId: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      nationality?: string | null;
      documentNumber?: string | null;
      preferences?: Prisma.InputJsonValue | null;
    },
  ) {
    const result = await this.guestsRepository.updateGuest(
      hotelId,
      guestId,
      data,
    );

    if (result.count === 0) {
      throw new NotFoundException('Guest was not found in this hotel.');
    }
  }

  private serializeGuest(guest: GuestProfile) {
    return {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      nationality: guest.nationality,
      documentNumber: guest.documentNumber,
      status: guest.status,
      preferences: guest.preferences,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      user: guest.user
        ? {
            id: guest.user.id,
            email: guest.user.email,
            fullName: guest.user.fullName,
            phone: guest.user.phone,
            status: guest.user.status,
          }
        : null,
    };
  }

  private normalizeOptionalEmail(email?: string | null) {
    return this.normalizeOptionalString(email)?.toLowerCase() ?? null;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private toInputJson(value?: Record<string, unknown> | null) {
    return value === undefined ? undefined : (value as Prisma.InputJsonValue);
  }
}
