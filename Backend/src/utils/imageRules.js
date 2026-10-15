import { ApiError } from "./apiHelpers.js";
import {
  MAX_CAR_IMAGES,
  MIN_IMAGES_TO_PUBLISH,
} from "../constants/car.constants.js";

// Consistent validation errors for the image rules. Uses the existing
// ApiError(statusCode, message, errors[]) shape so responses match every
// other validation failure in the API.

export const minImagesError = (currentCount) => {
  const missing = Math.max(0, MIN_IMAGES_TO_PUBLISH - currentCount);
  return new ApiError(
    400,
    `Upload at least ${MIN_IMAGES_TO_PUBLISH} images to publish this listing.`,
    [
      `This listing has ${currentCount} valid image${currentCount === 1 ? "" : "s"}; ${missing} more ${missing === 1 ? "is" : "are"} required (minimum ${MIN_IMAGES_TO_PUBLISH}).`,
    ],
  );
};

export const maxImagesError = (currentCount, incomingCount) => {
  const room = Math.max(0, MAX_CAR_IMAGES - currentCount);
  return new ApiError(
    400,
    `A car can have a maximum of ${MAX_CAR_IMAGES} images`,
    [
      `This listing already has ${currentCount} image${currentCount === 1 ? "" : "s"} and you tried to add ${incomingCount}; only ${room} more can be added.`,
    ],
  );
};
