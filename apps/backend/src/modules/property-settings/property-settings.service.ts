import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Prisma } from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { UpdatePropertySettingsDto } from './dto/update-property-settings.dto';
import { PropertySettingsRepository } from './repositories/property-settings.repository';
@Injectable()
export class PropertySettingsService {
  constructor(
    private readonly repository: PropertySettingsRepository,
    private readonly auditLogs: AuditLogsService,
  ) {}
  async get() {
    return (await this.repository.find()) ?? this.repository.initialize();
  }
  async update(dto: UpdatePropertySettingsDto, actor: CurrentUserPayload) {
    const before = await this.get();
    const updated = await this.repository.update(dto);
    await this.auditLogs.record({
      actorUserId: actor.sub,
      action: 'PROPERTY_SETTINGS_UPDATED',
      entityType: 'Hotel',
      entityId: '1',
      metadata: {
        before: this.snapshot(before),
        after: this.snapshot(updated),
      },
    });
    return updated;
  }
  async getPropertyTimezone() {
    return (await this.get()).timezone;
  }
  async getPropertyDayBounds(date: string | Date) {
    const timezone = await this.getPropertyTimezone();
    const local =
      typeof date === 'string'
        ? DateTime.fromISO(date, { zone: timezone })
        : DateTime.fromJSDate(date, { zone: timezone });
    return {
      from: local.startOf('day').toUTC().toJSDate(),
      to: local.endOf('day').toUTC().toJSDate(),
      timezone,
    };
  }
  async toPropertyDateRange(from?: string, to?: string, defaultDays = 30) {
    const timezone = await this.getPropertyTimezone();
    const end = to
      ? DateTime.fromISO(to, { zone: timezone })
      : DateTime.now().setZone(timezone);
    const start = from
      ? DateTime.fromISO(from, { zone: timezone })
      : end.minus({ days: defaultDays });
    return {
      from: start.startOf('day').toUTC().toJSDate(),
      to: end.endOf('day').toUTC().toJSDate(),
      timezone,
    };
  }
  private snapshot(value: {
    name: string;
    code: string | null;
    timezone: string;
    defaultCurrency: string;
    locale: string;
    defaultTaxRate: Prisma.Decimal | null;
    defaultServiceChargeRate: Prisma.Decimal | null;
  }) {
    return {
      name: value.name,
      code: value.code,
      timezone: value.timezone,
      defaultCurrency: value.defaultCurrency,
      locale: value.locale,
      defaultTaxRate: String(value.defaultTaxRate ?? ''),
      defaultServiceChargeRate: String(value.defaultServiceChargeRate ?? ''),
    };
  }
}
