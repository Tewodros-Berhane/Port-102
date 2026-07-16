"use client";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ThemeMode } from "@/lib/theme";

const themes: readonly { value: ThemeMode; label: string; icon: typeof Sun }[] = [{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Laptop }];
export function ThemeToggle() {
  const { theme, setTheme } = useTheme(); const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const selected = themes.find((item) => item.value === theme) ?? themes[2]; const Icon = mounted ? selected.icon : Laptop;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Choose color theme"><Icon/><span className="sr-only">Theme: {mounted ? selected.label : "System"}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Appearance</DropdownMenuLabel><DropdownMenuRadioGroup value={mounted ? theme : "system"} onValueChange={setTheme}>{themes.map(({ value, label, icon: ItemIcon }) => <DropdownMenuRadioItem key={value} value={value}><ItemIcon className="size-4 text-foreground-muted"/>{label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>;
}
