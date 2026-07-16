"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  apiErrorFromResponse,
  apiErrorFromUnknown,
  getApiErrorMessage,
} from "@/lib/errors";
import { getDefaultAuthenticatedRoute } from "@/lib/routes";
import type { ApiSuccess } from "@/types/api.types";
import type { Session } from "@/types/auth.types";
import { loginSchema, type LoginValues } from "../_schemas/login.schema";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  async function submit(values: LoginValues) {
    setServerError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw await apiErrorFromResponse(response);
      const result = (await response.json()) as ApiSuccess<Session>;
      const next = search.get("next");
      router.replace(
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : getDefaultAuthenticatedRoute(result.data.permissions),
      );
      router.refresh();
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          apiErrorFromUnknown(error, "/api/auth/login"),
          "Sign in could not be completed. Please try again.",
        ),
      );
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@property.com"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-xs text-destructive-foreground">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-xs text-destructive-foreground">
            {errors.password.message}
          </p>
        )}
      </div>
      {serverError && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive-subtle px-3 py-2.5 text-sm text-destructive-foreground"
          role="alert"
        >
          {serverError}
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
