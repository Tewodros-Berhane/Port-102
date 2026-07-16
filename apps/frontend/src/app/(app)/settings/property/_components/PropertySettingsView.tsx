"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  propertySettingsQueryKey,
  usePropertySettings,
} from "@/features/property/use-property-settings";
import { hasAllPermissions, hasAnyPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { propertySchema, type PropertyForm } from "../_schemas/property.schema";
import { updatePropertySettings } from "../_services/property-settings.service";
const fields = [
  ["name", "Property name"],
  ["code", "Code"],
  ["legalName", "Legal name"],
  ["taxIdentification", "Tax identification"],
  ["registrationNumber", "Registration number"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["alternatePhone", "Alternate phone"],
  ["website", "Website"],
  ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"],
  ["city", "City"],
  ["region", "Region"],
  ["country", "Country"],
  ["timezone", "Timezone"],
  ["defaultCurrency", "Currency"],
  ["locale", "Locale"],
  ["checkInTime", "Check-in time"],
  ["checkOutTime", "Check-out time"],
  ["logoUrl", "Logo URL"],
  ["receiptFooter", "Receipt footer"],
  ["invoiceFooter", "Invoice footer"],
  ["defaultTaxRate", "Default tax rate"],
  ["defaultServiceChargeRate", "Service charge rate"],
] as const;
export function PropertySettingsView({ session }: { session: Session }) {
  const read = hasAnyPermission(session.permissions, [
      "hotel.profile.read",
      "hotel.settings.read",
    ]),
    edit = hasAllPermissions(session.permissions, [
      "hotel.profile.update",
      "hotel.settings.update",
    ]),
    query = usePropertySettings(read),
    client = useQueryClient();
  const form = useForm<PropertyForm>({ resolver: zodResolver(propertySchema) });
  const formValues = (data: Record<string, unknown>) =>
    Object.fromEntries(
      fields.map(([name]) => [
        name,
        name === "defaultTaxRate" || name === "defaultServiceChargeRate"
          ? data[name]
            ? Number(data[name])
            : undefined
          : (data[name] ?? ""),
      ]),
    ) as PropertyForm;
  useEffect(() => {
    if (query.data)
      form.reset(formValues(query.data as unknown as Record<string, unknown>));
  }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: updatePropertySettings,
    meta: { successMessage: "Property settings saved successfully." },
    onSuccess: (data) => {
      client.setQueryData(propertySettingsQueryKey, data);
      form.reset(formValues(data as unknown as Record<string, unknown>));
    },
  });
  if (!read)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Configuration"
        title="Property settings"
        description={
          edit
            ? "Update the singleton property configuration."
            : "You have read-only access to property configuration."
        }
      />
      {query.isPending ? (
        <Skeleton className="mt-5 h-96" />
      ) : query.isError ? (
        <QueryErrorState error={query.error} />
      ) : (
        <form
          className="mt-5"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([name, label]) => (
              <div key={name} className="space-y-1.5">
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  disabled={!edit}
                  type={
                    name.includes("Rate")
                      ? "number"
                      : name.includes("Time")
                        ? "time"
                        : "text"
                  }
                  step={name.includes("Rate") ? "0.01" : undefined}
                  {...form.register(
                    name,
                    name.includes("Rate")
                      ? {
                          setValueAs: (value: string) =>
                            value === "" ? undefined : Number(value),
                        }
                      : undefined,
                  )}
                />
                {form.formState.errors[name]?.message && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors[name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          {mutation.isError && <QueryErrorState error={mutation.error} />}{" "}
          {edit && (
            <Button
              className="mt-5"
              disabled={mutation.isPending || !form.formState.isDirty}
              loading={mutation.isPending}
              loadingText="Saving settings…"
            >
              Save settings
            </Button>
          )}
        </form>
      )}
    </PageContainer>
  );
}
