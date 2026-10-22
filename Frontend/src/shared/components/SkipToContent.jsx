import { useTranslation } from "react-i18next";

export const SkipToContent = ({ targetId = "main-content" }) => {
  const { t } = useTranslation();
  return (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[200] focus:bg-brass focus:text-graphite-950 focus:px-4 focus:py-2 focus:rounded-sm focus:font-semibold focus:text-sm focus:uppercase focus:tracking-wide"
  >
    {t("a11y.skipToContent")}
  </a>
  );
};
