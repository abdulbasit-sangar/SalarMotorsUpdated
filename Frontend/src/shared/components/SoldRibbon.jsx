import { useTranslation } from "react-i18next";

/**
 * SoldRibbon — premium diagonal "SOLD" banner for the top-left corner of a
 * vehicle card/image. Renders nothing when `sold` is false so call sites
 * can use it unconditionally.
 *
 * Must be placed inside a `relative` + `overflow-hidden` container (the
 * image wrapper in CarCard.jsx already is).
 */
export const SoldRibbon = ({ sold }) => {
  const { t } = useTranslation();
  if (!sold) return null;

  return (
    <div
      className="pointer-events-none absolute -start-11 top-5 z-20 w-[150px] ltr:-rotate-45 rtl:rotate-45"
      aria-hidden="true"
    >
      <div className="flex items-center justify-center bg-gradient-to-b from-danger to-[#9d1f1f] py-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-1 ring-white/20">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white">
          {t("sold.label")}
        </span>
      </div>
    </div>
  );
};

/** Screen-reader-only label, used alongside the visual ribbon. */
export const SoldSrLabel = ({ sold }) => {
  const { t } = useTranslation();
  return sold ? <span className="sr-only">{t("sold.srLabel")}</span> : null;
};
