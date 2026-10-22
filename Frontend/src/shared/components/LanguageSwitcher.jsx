import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../i18n/useLanguage.js";
import { useEscapeKey } from "../hooks/useEscapeKey.js";
import { ChevronDownIcon, CheckIcon, LanguagesIcon } from "./icons.jsx";

/**
 * LanguageSwitcher — English / پښتو / دری.
 *
 *  variant="menu"  compact dropdown for the navbar (listbox pattern).
 *  variant="list"  always-visible radio-style list for the mobile drawer.
 *
 * Keyboard (menu): Enter/Space/↓ opens; ↑ ↓ Home End move; Enter/Space
 * selects; Escape closes and returns focus to the button; Tab closes.
 * Each option is rendered in its own language/direction (lang + dir) so
 * screen readers pronounce the endonym correctly.
 */
export const LanguageSwitcher = ({ variant = "menu", onChanged, className }) => {
  const { t } = useTranslation("common");
  const { language, languages, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();

  const currentIndex = Math.max(
    0,
    languages.findIndex((l) => l.code === language),
  );
  const current = languages[currentIndex];

  const choose = async (code) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (code === language || pending) return;
    setPending(true);
    await setLanguage(code);
    setPending(false);
    onChanged?.(code);
  };

  useEscapeKey(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, open);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // Move real focus onto the active option whenever the list is open.
  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const openMenu = () => {
    setActiveIndex(currentIndex);
    setOpen(true);
  };

  const onButtonKeyDown = (event) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu();
    }
  };

  const onOptionKeyDown = (event, index) => {
    const last = languages.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex(index === last ? 0 : index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex(index === 0 ? last : index - 1);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(languages[index].code);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
    }
  };

  if (variant === "list") {
    return (
      <div
        role="radiogroup"
        aria-label={t("language.label")}
        aria-busy={pending}
        className={clsx("flex flex-col gap-1", className)}
      >
        {languages.map((l) => {
          const selected = l.code === language;
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={selected}
              lang={l.htmlLang}
              dir={l.dir}
              disabled={pending}
              onClick={() => choose(l.code)}
              className={clsx(
                "flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium transition-colors",
                selected
                  ? "bg-brass/10 text-brass-dark"
                  : "text-bone hover:bg-graphite-100",
              )}
            >
              <span>{l.label}</span>
              {selected && <CheckIcon className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={clsx("relative shrink-0", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${t("language.label")}: ${current.label}`}
        aria-busy={pending}
        disabled={pending}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className="flex h-10 shrink-0 items-center gap-1 rounded-full px-2.5 text-sm font-medium text-bone transition-colors hover:bg-graphite-100 disabled:opacity-60 lg:h-9"
      >
        <LanguagesIcon className="h-[18px] w-[18px]" />
        <span lang={current.htmlLang} dir={current.dir} className="hidden sm:inline">
          {current.label}
        </span>
        <ChevronDownIcon
          className={clsx(
            "hidden h-3.5 w-3.5 transition-transform duration-200 sm:block",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("language.label")}
          className="absolute end-0 top-full z-[70] mt-2 w-40 rounded-2xl glass-panel-strong p-1.5 shadow-2xl"
        >
          {languages.map((l, index) => {
            const selected = l.code === language;
            return (
              <li key={l.code} role="presentation">
                <button
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={index === activeIndex ? 0 : -1}
                  lang={l.htmlLang}
                  dir={l.dir}
                  onClick={() => choose(l.code)}
                  onKeyDown={(event) => onOptionKeyDown(event, index)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/40",
                    selected
                      ? "bg-brass/12 text-brass-dark"
                      : "text-bone hover:bg-graphite-100",
                  )}
                >
                  <span>{l.label}</span>
                  {selected && <CheckIcon className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
