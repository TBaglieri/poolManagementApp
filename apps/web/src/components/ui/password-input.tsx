"use client";

/**
 * Password field with a built-in show/hide (eye) toggle — the ONE component used
 * for every password input across the auth surfaces (login, sign-up/invite,
 * password reset, change password), so the behavior is identical everywhere.
 *
 *   • Clicking the eye toggles the input between type="password" and type="text".
 *   • The icon reflects state (open = hidden, slashed = visible) and carries an
 *     accessible label ("Show password" / "Hide password").
 *   • The toggle is a real <button> — focusable and operable with Enter/Space.
 *   • State is local, so multiple fields on one page (new + confirm) toggle
 *     independently.
 */
import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Optional leading glyph rendered inside the field (e.g. a <Lock/>), sized 1rem. */
  leadingIcon?: React.ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, leadingIcon, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const label = visible ? "Hide password" : "Show password";
    const fieldId = props.id ?? useId();

    return (
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-slate-400">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          {...props}
          id={fieldId}
          type={visible ? "text" : "password"}
          className={cn("input pr-10", leadingIcon && "pl-9", className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={label}
          aria-pressed={visible}
          aria-controls={fieldId}
          title={label}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-slate-300"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
