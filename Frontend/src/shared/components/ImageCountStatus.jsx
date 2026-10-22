import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { getPublishStatus, getPublishMessages } from "../utils/imageRules.js";

/**
 * ImageCountStatus — the "3 / 20 images" counter plus the publishing rule.
 *
 * `count` must already be the number that matters for the context:
 *   - Manage Images: images ATTACHED to the listing (never local selections)
 *   - Create Listing: files selected for the upload that publishes the listing
 * `needsPublish` is true when the listing is not live yet (creating, or
 * currently hidden), where falling short actually blocks publishing; for an
 * already-live listing a shortfall is only informational.
 */
export const ImageCountStatus = ({
  count,
  limits,
  needsPublish = true,
  id,
  className,
}) => {
  const { t } = useTranslation("admin");
  const status = getPublishStatus(count, limits);
  const text = getPublishMessages(t, status);

  let tone = "text-ash";
  let message = null;
  if (status.canPublish) {
    tone = "text-signal-dark";
    message = t("images.meets", { min: status.min });
  } else if (needsPublish) {
    tone = "text-danger";
    message = `${text.requirementMessage} ${text.missingMessage}`;
  } else {
    tone = "text-brass-dark";
    message = t("images.liveShort", { min: status.min });
  }

  return (
    <div id={id} role="status" aria-live="polite" className={clsx("text-xs", className)}>
      <p className="ltr-isolate font-mono font-semibold text-bone rtl:text-end">
        {text.counterLabel}
      </p>
      <p className={clsx("mt-0.5", tone)}>{message}</p>
    </div>
  );
};
