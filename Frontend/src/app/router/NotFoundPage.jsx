import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../shared/components/Button.jsx";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="inline-block border border-steel bg-graphite-800 tag-shape px-6 py-3 mb-6">
          <span className="ltr-isolate font-mono text-brass text-sm tracking-widest">ERR // 404</span>
        </div>
        <h1 className="font-display text-5xl text-bone mb-4">{t("notFound.title")}</h1>
        <p className="text-ash text-sm mb-8">
          {t("notFound.description")}
        </p>
        <Button as={Link} to="/" variant="primary">
          {t("actions.backToHome")}
        </Button>
      </div>
    </div>
  );
}
