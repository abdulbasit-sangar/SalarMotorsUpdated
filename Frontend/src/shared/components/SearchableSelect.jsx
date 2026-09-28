import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { SearchIcon, ChevronDownIcon, CheckIcon } from "./icons.jsx";

// Only this many option rows are visible before the list scrolls — matches
// the "6 visible, scroll for more" pattern requested for every dropdown.
const VISIBLE_ITEM_COUNT = 6;
const ITEM_ROW_HEIGHT = 40; // px — keep in sync with each option button's h-10

/**
 * Custom dropdown used for every filter field with a list of choices:
 * a bordered trigger (matches the app's existing Input/Select look), and on
 * open, a floating panel with a search box (only shown once the list is
 * long enough to need it) and an option list capped at 6 visible rows,
 * scrollable beyond that.
 *
 * The panel is rendered through a portal into <body> and positioned with
 * `position: fixed` from the trigger's live bounding box, so it always
 * renders above surrounding content and is never clipped by a scrollable
 * ancestor (e.g. the mobile FilterSheet).
 *
 * `options`: array of { value, label }. `value` of "" is treated as "no
 * selection" and rendered using `placeholder` — pass `allowClear={false}`
 * for fields that always have a real value (e.g. Sort).
 *
 * `icon` (optional): a component (e.g. from icons.jsx). When provided, the
 * trigger renders as a single row — icon, then the label (small caps) and
 * value stacked on top of each other — used by the hero search bar. When
 * omitted, the trigger keeps its original look: a plain bordered box with
 * the label rendered above it. Existing call sites that don't pass `icon`
 * are unaffected.
 */
export const SearchableSelect = ({
  id,
  label,
  labelClassName = "field-label",
  icon: Icon,
  value,
  onChange,
  options,
  placeholder = "Any",
  disabled = false,
  disabledLabel = "Loading…",
  allowClear = true,
  required = false,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);

  const showSearch = options.length > VISIBLE_ITEM_COUNT;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, showSearch]);

  const selectedOption = options.find((opt) => opt.value === value);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  const openDropdown = () => {
    if (disabled) return;
    updatePosition();
    setQuery("");
    setOpen(true);
  };

  const closeDropdown = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;

    // Focus the search box once the panel has actually mounted.
    const focusTimer = showSearch
      ? window.setTimeout(() => searchInputRef.current?.focus(), 0)
      : null;

    const handlePointerDown = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      closeDropdown();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeDropdown();
    };
    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      if (focusTimer) window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, showSearch]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    closeDropdown();
  };

  const triggerCommonProps = {
    type: "button",
    id,
    ref: triggerRef,
    onClick: () => (open ? closeDropdown() : openDropdown()),
    disabled,
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    "aria-required": required || undefined,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  };

  return (
    <div>
      {/* Original layout: label rendered above a plain bordered trigger. */}
      {!Icon && (
        <>
          {label && (
            <label htmlFor={id} className={labelClassName}>
              {label}
              {required && <span className="text-brass ml-1">*</span>}
            </label>
          )}

          <button
            {...triggerCommonProps}
            className={clsx(
              "w-full h-11 px-3.5 flex items-center justify-between gap-2 bg-white/70 border border-card",
              "rounded-xl text-sm transition-colors backdrop-blur-sm",
              "focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 focus:bg-white",
              disabled
                ? "cursor-not-allowed opacity-70"
                : "hover:border-brass/50",
              error && "border-danger focus:border-danger focus:ring-danger/20",
            )}
          >
            <span
              className={clsx(
                "truncate text-left",
                selectedOption ? "text-bone" : "text-ash",
              )}
            >
              {disabled
                ? disabledLabel
                : selectedOption
                  ? selectedOption.label
                  : placeholder}
            </span>
            <ChevronDownIcon
              className={clsx(
                "h-4 w-4 text-ash shrink-0 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </>
      )}

      {error && !Icon && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-danger"
        >
          {error}
        </p>
      )}

      {/* Icon variant: leading icon + label/value stacked in one row. */}
      {Icon && (
        <button
          {...triggerCommonProps}
          aria-label={label}
          className={clsx(
            "w-full h-14 px-4 flex items-center gap-3 bg-white/70 border border-card",
            "rounded-2xl text-sm transition-colors backdrop-blur-sm text-left",
            "focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 focus:bg-white",
            disabled
              ? "cursor-not-allowed opacity-70"
              : "hover:border-brass/50",
          )}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-graphite-950/5 text-bone"
            aria-hidden="true"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            {label && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ash">
                {label}
              </span>
            )}
            <span
              className={clsx(
                "w-full truncate",
                selectedOption ? "text-bone" : "text-ash",
              )}
            >
              {disabled
                ? disabledLabel
                : selectedOption
                  ? selectedOption.label
                  : placeholder}
            </span>
          </span>
          <ChevronDownIcon
            className={clsx(
              "h-4 w-4 text-ash shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      )}

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="z-[200] glass-panel-strong rounded-xl overflow-hidden"
          >
            {showSearch && (
              <div className="p-2 border-b border-card">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ash" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/80 border border-card text-sm text-bone placeholder:text-ash/70 focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
                  />
                </div>
              </div>
            )}

            <ul
              className="overflow-y-auto py-1"
              style={{ maxHeight: ITEM_ROW_HEIGHT * VISIBLE_ITEM_COUNT }}
            >
              {allowClear && (
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelect("")}
                    className={clsx(
                      "w-full flex items-center justify-between gap-2 px-4 h-10 text-sm text-left transition-colors",
                      !value
                        ? "text-brass-dark font-semibold"
                        : "text-bone hover:bg-brass/8",
                    )}
                  >
                    {placeholder}
                    {!value && <CheckIcon className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              )}

              {filteredOptions.length ? (
                filteredOptions.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={clsx(
                        "w-full flex items-center justify-between gap-2 px-4 h-10 text-sm text-left transition-colors truncate",
                        value === opt.value
                          ? "text-brass-dark font-semibold"
                          : "text-bone hover:bg-brass/8",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {value === opt.value && (
                        <CheckIcon className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-4 py-3 text-sm text-ash">No matches</li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};
