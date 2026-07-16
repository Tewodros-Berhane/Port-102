import { formatCurrency } from "@/utils/format.utils";
export function CurrencyValue({
  value,
  locale,
  currency,
  className,
}: {
  value: number;
  locale: string;
  currency: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {formatCurrency(value, { locale, defaultCurrency: currency })}
    </span>
  );
}
