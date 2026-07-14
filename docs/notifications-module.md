# Notifications Module

Notifications are internal, database-backed, in-app records. There are no push, email, SMS, WhatsApp, device-token, provider-delivery, or external broker integrations.

Authenticated users can list, count unread, retrieve, mark read, mark all read, archive, and delete only their own records under `/api/notifications`. Lists are paginated to a maximum of 100 and exclude archives by default. Read and read-all actions are idempotent.

`NotificationsService` supports creation for one user, several users, or all active users in a role. Initial hooks cover approval submission/decision, housekeeping assignment/rejection, maintenance assignment, and urgent maintenance alerts. Notification persistence runs after successful business work; failures are logged and do not roll back the primary operation.

Operational alert deduplication uses user, type, entity type, entity ID, and unread status. An identical unread alert is reused. Once it is read or archived, a later recurrence may create a new record.

Known limitations: no scheduled delivery, templates, notification preferences, realtime socket transport, or provider delivery state. Role delivery reflects active users at creation time.
