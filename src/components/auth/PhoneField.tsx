import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export function PhoneField({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">Phone (with country)</span>
      <div
        className={cn(
          "mt-1 flex h-11 items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-base",
        )}
      >
        <PhoneInput
          international
          defaultCountry="IN"
          value={value || undefined}
          onChange={(v) => onChange(v ?? "")}
          required={required}
          className="phone-input-themed flex w-full items-center gap-2 outline-none"
        />
      </div>
    </label>
  );
}
