/**
 * Appends an ImageKit transformation query string so the browser downloads
 * an image sized for where it's actually displayed, instead of the full
 * original upload (car.model.js images can be full-resolution camera/phone
 * photos). Falls through untouched for any URL that isn't from ImageKit —
 * safe for mock/test/placeholder images that don't support transforms.
 *
 * ImageKit docs: appending `?tr=w-400,q-80` (etc.) to any asset URL is
 * equivalent to the path-based `/tr:w-400,q-80/` form and works without
 * knowing the asset's folder structure.
 */
export const optimizedImageUrl = (url, { width, quality = 75 } = {}) => {
  if (!url || !url.includes("ik.imagekit.io")) return url;

  const params = [`q-${quality}`];
  if (width) params.push(`w-${width}`);
  // f-webp lets ImageKit auto-serve WebP where the browser supports it,
  // falling back to the original format otherwise.
  params.push("f-webp");

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=${params.join(",")}`;
};

/**
 * Builds a `srcset` string across a few common widths for a responsive
 * <img>. Widths chosen to roughly match card/grid/gallery breakpoints
 * rather than shipping one fixed size to every viewport.
 */
export const buildSrcSet = (url, widths = [320, 480, 640, 800]) => {
  if (!url || !url.includes("ik.imagekit.io")) return undefined;
  return widths.map((w) => `${optimizedImageUrl(url, { width: w })} ${w}w`).join(", ");
};
