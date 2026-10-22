import { forwardRef, useId } from "react";
import clsx from "clsx";

// Fields whose content is always typed left-to-right (addresses, numbers):
// keep them LTR inside RTL pages and align them to the visual end.
const LTR_TYPES = ["email", "tel", "url", "number"];

export const Input = forwardRef(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const isLtrField = LTR_TYPES.includes(props.type);
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
            {required && <span className="text-brass ms-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-required={required || undefined}
          aria-describedby={clsx(errorId, hintId) || undefined}
          dir={isLtrField ? "ltr" : undefined}
          className={clsx(
            isLtrField && "rtl:text-end",
            "w-full h-11 px-3.5 bg-white/70 border border-card text-bone placeholder:text-ash/60",
            "rounded-xl text-sm transition-colors backdrop-blur-sm",
            "focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 focus:bg-white",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-ash">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export const Select = forwardRef(
  ({ label, error, hint, className, id, required, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="field-label">
            {label}
            {required && <span className="text-brass ms-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-required={required || undefined}
          className={clsx(
            "w-full h-11 px-3.5 bg-white/70 border border-card text-bone",
            "rounded-xl text-sm transition-colors appearance-none backdrop-blur-sm",
            "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22none%22 stroke=%22%235B6472%22 stroke-width=%221.6%22><path d=%22M5 7.5L10 12.5L15 7.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-no-repeat ltr:bg-[right_0.9rem_center] rtl:bg-[left_0.9rem_center] pe-9",
            "focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 focus:bg-white",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {hint && !error && <p className="mt-1.5 text-xs text-ash">{hint}</p>}
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export const Textarea = forwardRef(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const generatedId = useId();
    const areaId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={areaId} className="field-label">
            {label}
            {required && <span className="text-brass ms-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          aria-invalid={!!error}
          aria-required={required || undefined}
          className={clsx(
            "w-full min-h-[120px] px-3.5 py-3 bg-white/70 border border-card text-bone placeholder:text-ash/60",
            "rounded-xl text-sm transition-colors resize-y backdrop-blur-sm",
            "focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 focus:bg-white",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-xs text-ash">{hint}</p>}
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
