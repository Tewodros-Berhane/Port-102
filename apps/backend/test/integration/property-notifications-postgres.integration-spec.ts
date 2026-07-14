import {
  NotificationStatus,
  NotificationType,
  FolioStatus,
  FolioLineItemType,
  ReservationStatus,
  StayStatus,
} from '../../src/generated/prisma/client';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { PropertySettingsService } from '../../src/modules/property-settings/property-settings.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import {
  createIntegrationContext,
  IntegrationContext,
  resetIntegrationDatabase,
} from './integration-test-context';
describe('Property and notifications PostgreSQL integration', () => {
  let context: IntegrationContext;
  let notifications: NotificationsService;
  let properties: PropertySettingsService;
  let reports: ReportsService;
  beforeAll(async () => {
    context = await createIntegrationContext();
    notifications = context.app.get(NotificationsService);
    properties = context.app.get(PropertySettingsService);
    reports = context.app.get(ReportsService);
  });
  beforeEach(async () => {
    context.user = await resetIntegrationDatabase(context.prisma);
    await context.prisma.hotel.create({
      data: { id: 1, name: 'Port-102', timezone: 'Africa/Addis_Ababa' },
    });
  });
  afterAll(async () => context?.app.close());
  it('isolates inbox ownership', async () => {
    const second = await context.prisma.user.create({
      data: {
        email: 'second@test',
        passwordHash: 'x',
        fullName: 'Second',
        roleId: context.user.roleId,
      },
    });
    const created = await notifications.createForUser({
      userId: context.user.id,
      title: 'Mine',
      message: 'Owned',
    });
    await expect(notifications.get(second.id, created.id)).rejects.toThrow(
      'Notification was not found',
    );
  });
  it('deduplicates identical unread alerts and allows a new alert after read', async () => {
    const input = {
      userId: context.user.id,
      type: NotificationType.OPERATIONAL_ALERT,
      title: 'Low stock',
      message: 'Low',
      entityType: 'InventoryItemLocation',
      entityId: '1:1',
    };
    const first = await notifications.createDeduplicated(input);
    const same = await notifications.createDeduplicated(input);
    expect(same.id).toBe(first.id);
    await context.prisma.notification.update({
      where: { id: first.id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
    const next = await notifications.createDeduplicated(input);
    expect(next.id).not.toBe(first.id);
  });
  it('uses configured property timezone for daily report boundaries', async () => {
    const guest = await context.prisma.guest.create({
      data: { firstName: 'Zone', lastName: 'Test' },
    });
    const reservation = await context.prisma.reservation.create({
      data: {
        reservationNumber: 'TZ-1',
        guestId: guest.id,
        status: ReservationStatus.CHECKED_IN,
        checkInDate: new Date('2026-07-14T20:00:00Z'),
        checkOutDate: new Date('2026-07-16T08:00:00Z'),
      },
    });
    const stay = await context.prisma.stay.create({
      data: {
        stayNumber: 'TZ-STAY',
        reservationId: reservation.id,
        guestId: guest.id,
        status: StayStatus.ACTIVE,
        checkedInAt: new Date('2026-07-14T20:00:00Z'),
        expectedCheckOutDate: new Date('2026-07-16T08:00:00Z'),
      },
    });
    const folio = await context.prisma.folio.create({
      data: {
        folioNumber: 'TZ-FOLIO',
        stayId: stay.id,
        guestId: guest.id,
        status: FolioStatus.OPEN,
      },
    });
    await context.prisma.folioLineItem.create({
      data: {
        folioId: folio.id,
        type: FolioLineItemType.ROOM_CHARGE,
        description: 'After midnight local',
        unitAmount: 10,
        totalAmount: 10,
        postedAt: new Date('2026-07-14T21:30:00Z'),
      },
    });
    const report = await reports.getRevenue({
      from: '2026-07-15',
      to: '2026-07-15',
    });
    expect(report.netRevenue).toBe('10.00');
    expect(report.dateRange.timezone).toBe('Africa/Addis_Ababa');
    expect((await properties.get()).id).toBe(1);
  });
});
