"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { apiErrorFromResponse } from "@/lib/errors";
import { routes } from "@/lib/routes";
import { loginSchema, type LoginValues } from "../_schemas/login.schema";

export function LoginForm() {
  const router = useRouter(); const search = useSearchParams(); const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  async function submit(values: LoginValues) {
    setServerError(""); const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    if (!response.ok) { const error = await apiErrorFromResponse(response); setServerError(error.status === 401 ? error.message : "Sign in could not be completed. Please try again."); return; }
    const next = search.get("next"); router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : routes.dashboard); router.refresh();
  }
  return <form onSubmit={handleSubmit(submit)} className="login-form" noValidate>
    <label>Email<input type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} /></label>{errors.email && <p className="field-error">{errors.email.message}</p>}
    <label>Password<input type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} /></label>{errors.password && <p className="field-error">{errors.password.message}</p>}
    {serverError && <div className="form-error" role="alert">{serverError}</div>}
    <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
  </form>;
}
