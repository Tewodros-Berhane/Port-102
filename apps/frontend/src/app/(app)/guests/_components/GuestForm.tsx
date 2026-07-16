"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { guestSchema, type GuestFormValues } from "../_schemas/guest.schema";
import type { GuestPayload } from "../_types/guests.types";
export function GuestForm({
  defaults,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  defaults?: Partial<GuestFormValues>;
  submitLabel: string;
  pending: boolean;
  error?: unknown;
  onSubmit: (payload: GuestPayload) => void;
}) {
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      nationality: "",
      documentNumber: "",
      ...defaults,
    },
  });
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        onSubmit(
          Object.fromEntries(
            Object.entries(values).filter(([, value]) => value !== ""),
          ) as GuestPayload,
        ),
      )}
    >
      {(
        [
          "firstName",
          "lastName",
          "email",
          "phone",
          "nationality",
          "documentNumber",
        ] as const
      ).map((name) => (
        <div key={name}>
          <Label htmlFor={name}>
            {name
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (v) => v.toUpperCase())}
          </Label>
          <Input
            id={name}
            type={name === "email" ? "email" : "text"}
            {...form.register(name)}
          />
          <p className="mt-1 text-xs text-destructive">
            {String(form.formState.errors[name]?.message ?? "")}
          </p>
        </div>
      ))}
      {Boolean(error) && (
        <div className="sm:col-span-2">
          <QueryErrorState error={error} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button loading={pending} loadingText="Saving guest…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
