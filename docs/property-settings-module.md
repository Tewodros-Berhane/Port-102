# Property Settings Module

The single-hotel property profile remains stored in the existing `Hotel` model and is exposed only as singleton property settings at stable ID `1`. It is not a tenant or authorization boundary.

`GET /api/property-settings` requires the existing profile/settings read permissions. `PATCH /api/property-settings` requires the corresponding update permissions and records a `PROPERTY_SETTINGS_UPDATED` audit event with before/after configuration metadata.

Settings include identity and legal metadata, contacts and address, branding/footer text, IANA timezone, ISO-style currency, locale, default check-in/out times, and default tax/service-charge percentages. Missing singleton data is initialized safely.

Luxon provides shared property day boundaries. Date-only reporting inputs are interpreted in the configured property timezone and converted to inclusive UTC instants for database queries. This remains DST-safe for properties using zones with daylight-saving transitions.

Tax and service rates are configuration defaults only; this phase does not retroactively alter posted financial records or implement tax accounting rules.
