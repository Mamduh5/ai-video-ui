import type { InputHTMLAttributes } from "react";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Toggle({ label, ...props }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
      <input
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        type="checkbox"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

