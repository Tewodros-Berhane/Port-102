"use client";
import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";
export function LiveSearchInput({
  value,
  onSearch,
  delay = 300,
  ...props
}: Omit<
  React.ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange"
> & { value: string; onSearch: (value: string) => void; delay?: number }) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft, delay);
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);
  useEffect(() => {
    if (debounced !== value) onSearchRef.current(debounced);
  }, [debounced, value]);
  return (
    <Input
      {...props}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}
