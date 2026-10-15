import clsx from "clsx";
import { getPublishStatus } from "../utils/imageRules.js";

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
  const status = getPublishStatus(count, limits);

  let tone = "text-ash";
  let message = null;
  if (status.canPublish) {
    tone = "text-signal-dark";
    message = `Meets the ${status.min}-image minimum to publish.`;
  } else if (needsPublish) {
    tone = "text-danger";
    message = `${status.requirementMessage} ${status.missingMessage}`;
  } else {
    tone = "text-brass-dark";
    message = `This live listing has fewer than ${status.min} images. It stays visible, but ${status.min} are required to publish it again after hiding.`;
  }

  return (
    <div id={id} role="status" aria-live="polite" className={clsx("text-xs", className)}>
      <p className="font-mono font-semibold text-bone">{status.counterLabel}</p>
      <p className={clsx("mt-0.5", tone)}>{message}</p>
    </div>
  );
};
