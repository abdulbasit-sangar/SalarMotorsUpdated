
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { SearchIcon, ChevronDownIcon, CheckIcon } from "./icons.jsx";

const VISIBLE_ITEM_COUNT = 5;
const ITEM_ROW_HEIGHT = 40;

export const SearchableSelect = ({
  id,
  label,
  labelClassName = "field-label",
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  disabledLabel,
  allowClear = true,
  required = false,
  error,
}) => {
  const { t } = useTranslation();
  const shownPlaceholder = placeholder ?? t("select.any");
  const shownDisabledLabel = disabledLabel ?? t("select.loading");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return options;

    return options.filter(
      (opt) =>
        String(opt.label).toLowerCase().includes(search) ||
        String(opt.value).toLowerCase().includes(search),
    );
  }, [options, query]);

  const selectedOption = options.find((opt) => opt.value === value);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const desiredHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openBelow =
      spaceBelow >= desiredHeight || spaceBelow >= spaceAbove;

    const availableSpace = openBelow ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(
      desiredHeight,
      Math.max(120, availableSpace),
    );

    const width = Math.min(rect.width, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - width - 12,
    );

    setPosition({
      top: openBelow
        ? rect.bottom + 6
        : rect.top - maxHeight - 6,
      left,
      width,
      maxHeight,
    });
  }, []);

  const openDropdown = () => {
    if (disabled) return;

    updatePosition();
    setQuery("");
    setOpen(true);
  };

  const closeDropdown = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;

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

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

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
      {!Icon && (
        <>
          {label && (
            <label htmlFor={id} className={labelClassName}>
              {label}
              {required && (
                <span className="text-brass ms-1">*</span>
              )}
            </label>
          )}

          <button
            {...triggerCommonProps}
            className={clsx(
              "w-full h-12 px-3.5 flex items-center justify-between gap-2 bg-white/70 border border-card",
              "rounded-xl text-sm transition-colors backdrop-blur-sm",
              "focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 focus:bg-white",
              disabled
                ? "cursor-not-allowed opacity-70"
                : "hover:border-brass/50",
              error &&
                "border-danger focus:border-danger focus:ring-danger/20",
            )}
          >
            <span
              className={clsx(
                "truncate text-start",
                selectedOption ? "text-bone" : "text-ash",
              )}
            >
              {disabled
                ? shownDisabledLabel
                : selectedOption
                  ? selectedOption.label
                  : shownPlaceholder}
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

      {Icon && (
        <button
          {...triggerCommonProps}
          aria-label={label}
          className={clsx(
            "w-full h-12 px-4 flex items-center gap-3 bg-white/70 border border-card",
            "rounded-xl text-sm transition-colors backdrop-blur-sm text-start",
            "focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 focus:bg-white",
            disabled
              ? "cursor-not-allowed opacity-70"
              : "hover:border-brass/50",
          )}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-graphite-950/5 text-bone"
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
                ? shownDisabledLabel
                : selectedOption
                  ? selectedOption.label
                  : shownPlaceholder}
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
              maxHeight: position.maxHeight,
            }}
            className="z-[200] glass-panel-strong rounded-xl overflow-hidden flex flex-col p-0"
          >
            <div className="shrink-0 border-b border-card p-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ash" />

                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("select.search")}
                  aria-label={t("select.search")}
                  className="w-full h-9 ps-9 pe-3 rounded-lg bg-white/80 border border-card text-sm text-bone placeholder:text-ash/70 focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
                />
              </div>
            </div>

            <ul
              className="m-0 list-none overflow-y-auto p-0"
              style={{
                maxHeight: ITEM_ROW_HEIGHT * VISIBLE_ITEM_COUNT,
              }}
            >
              {allowClear && Boolean(shownPlaceholder) && (
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelect("")}
                    className={clsx(
                      "w-full flex items-center justify-between gap-2 px-4 h-10 text-sm text-start transition-colors",
                      !value
                        ? "text-brass-dark font-semibold"
                        : "text-bone hover:bg-brass/8",
                    )}
                  >
                    <span className="truncate">
                      {shownPlaceholder}
                    </span>

                    {!value && (
                      <CheckIcon className="h-4 w-4 shrink-0" />
                    )}
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
                        "w-full flex items-center justify-between gap-2 px-4 h-10 text-sm text-start transition-colors",
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
                <li className="px-4 py-3 text-sm text-ash">
                  {t("select.noMatches")}
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};