import type { PropsWithChildren, ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
}

export function Field({
  children,
  error,
  hint,
  htmlFor,
  label,
}: PropsWithChildren<FieldProps>) {
  const descriptionId = `${htmlFor}-description`;
  const errorId = `${htmlFor}-error`;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-sm text-slate-500" id={descriptionId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

