"use client";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SelectOption = {
  value: number;
  label: string;
  description?: string;
};

export function SearchableSelect({
  name,
  value,
  options,
  placeholder,
  searchPlaceholder = "Search options",
  emptyMessage = "No matching options",
  required,
  disabled,
  loading = false,
  onChange,
  onSearchChange,
}: {
  name?: string;
  value?: number | null;
  options: SelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange?: (value: number | null) => void;
  onSearchChange?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [internalValue, setInternalValue] = useState<number | null>(
    value ?? null,
  );
  const [selectedSnapshot, setSelectedSnapshot] = useState<
    SelectOption | undefined
  >();
  const selectedValue = value === undefined ? internalValue : value;
  const selected =
    options.find((option) => option.value === selectedValue) ??
    (selectedSnapshot?.value === selectedValue ? selectedSnapshot : undefined);
  const debouncedSearch = useDebouncedValue(search);
  const searchCallback = useRef(onSearchChange);
  useEffect(() => {
    searchCallback.current = onSearchChange;
  }, [onSearchChange]);
  useEffect(() => {
    searchCallback.current?.(debouncedSearch);
  }, [debouncedSearch]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? options.filter((option) =>
          `${option.label} ${option.description ?? ""}`
            .toLowerCase()
            .includes(term),
        )
      : options;
  }, [options, search]);
  const choose = (next: number | null) => {
    setInternalValue(next);
    setSelectedSnapshot(options.find((option) => option.value === next));
    onChange?.(next);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      {name && (
        <select
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          name={name}
          required={required}
          value={selectedValue ?? ""}
          onChange={() => undefined}
        >
          <option value="" />
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between px-3 font-normal"
        >
          <span
            className={cn("truncate", !selected && "text-foreground-muted")}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={5}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-border bg-surface-overlay p-1 shadow-overlay"
        >
          <div className="relative border-b border-border-subtle p-1 pb-2">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-foreground-muted" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {!required && (
              <button
                type="button"
                onClick={() => choose(null)}
                className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    selectedValue !== null ? "opacity-0" : "opacity-100",
                  )}
                />
                {placeholder}
              </button>
            )}
            {loading ? (
              <p className="px-2 py-4 text-center text-sm text-foreground-muted">
                Loading options…
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-foreground-muted">
                {emptyMessage}
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => choose(option.value)}
                  className="flex w-full items-start rounded-sm px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <Check
                    className={cn(
                      "mr-2 mt-0.5 size-4 shrink-0",
                      selectedValue === option.value
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span>
                    <span className="block">{option.label}</span>
                    {option.description && (
                      <span className="block text-xs text-foreground-muted">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
