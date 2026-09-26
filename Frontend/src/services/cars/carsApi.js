import { apiClient, UPLOAD_TIMEOUT_MS } from "../api/client.js";
import { cached, cacheKey, invalidateCache } from "../api/cache.js";

const CREATION_STATUS_POLL_INTERVAL_MS = 2000;
const CREATION_STATUS_POLL_ATTEMPTS = 75;

// GET /api/cars/featured?limit=
export const fetchFeaturedCars = async (limit = 8) => {
  return cached(cacheKey("featured", { limit }), async () => {
    const { data } = await apiClient.get("/cars/featured", {
      params: { limit },
    });
    return data.data; // { cars }
  });
};

// GET /api/cars?page=&limit=&sort=
export const fetchCars = async (params = {}) => {
  return cached(cacheKey("cars", params), async () => {
    const { data } = await apiClient.get("/cars", { params });
    return data.data; // { cars, pagination }
  });
};

// GET /api/cars/admin?page=&limit=&sort=
export const fetchAdminCars = async (params = {}) => {
  return cached(cacheKey("cars-admin", params), async () => {
    const { data } = await apiClient.get("/cars/admin", { params });
    return data.data; // { cars, pagination }
  });
};

// GET /api/cars/search?keyword= — short TTL since a person may edit a
// listing seconds after searching for it; still worth deduping bursts.
export const searchCars = async (params = {}) => {
  return cached(
    cacheKey("search", params),
    async () => {
      const { data } = await apiClient.get("/cars/search", { params });
      return data.data; // { cars, pagination, keyword }
    },
    15_000,
  );
};

// GET /api/cars/filter?...
export const filterCars = async (params = {}) => {
  return cached(
    cacheKey("filter", params),
    async () => {
      const { data } = await apiClient.get("/cars/filter", { params });
      return data.data; // { cars, pagination, appliedFilters }
    },
    15_000,
  );
};

// GET /api/cars/options — centralized dropdown options (brands, provinces,
// years, engineCC, steering, fuelTypes, bodyTypes, transmissions, conditions).
// Single source of truth is backend/constants/car.constants.js — components
// must not hardcode their own copies of these lists. Cached longer than the
// catalog data below since these change rarely (only when the constants
// file itself is edited on the backend).
export const fetchCarOptions = async () => {
  return cached(
    cacheKey("car-options", {}),
    async () => {
      const { data } = await apiClient.get("/cars/options");
      return data.data; // { brands, provinces, years, engineCC, steering, fuelTypes, bodyTypes, transmissions, conditions }
    },
    5 * 60_000,
  );
};

// GET /api/cars/similar/:id
export const fetchSimilarCars = async (id) => {
  return cached(cacheKey("similar", { id }), async () => {
    const { data } = await apiClient.get(`/cars/similar/${id}`);
    return data.data; // { cars, source }
  });
};

// GET /api/cars/:id — MUST be called after the named routes above;
// keep this last in the file as a reminder of backend route ordering.
export const fetchCarById = async (id) => {
  return cached(cacheKey("car", { id }), async () => {
    const { data } = await apiClient.get(`/cars/${id}`);
    return data.data.car;
  });
};

// POST /api/cars — protected, multipart/form-data (images field name: "images")
export const createCar = async (
  carFields,
  imageFiles = [],
  creationRequestId,
) => {
  const formData = new FormData();
  Object.entries(carFields).forEach(([key, value]) => {
    if (key === "features") {
      // Sent as a JSON string — multer/multipart can't carry a real array
      // in a text field. Backend parses it back into an array before
      // validation (see parseFeaturesField in car.validator.js).
      formData.append("features", JSON.stringify(value || []));
      return;
    }
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
  imageFiles.forEach((file) => formData.append("images", file));

  const { data } = await apiClient.post("/cars", formData, {
    headers: {
      ...(creationRequestId && { "Idempotency-Key": creationRequestId }),
    },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  if (data.data?.status === "processing") {
    return waitForCreationStatus(creationRequestId);
  }
  invalidateCache(); // a new listing affects totals, featured lists, everything
  return data.data.car;
};

export const getCreationStatus = async (creationRequestId) => {
  const { data } = await apiClient.get(
    `/cars/creation-status/${encodeURIComponent(creationRequestId)}`,
  );
  return data.data;
};

export const waitForCreationStatus = async (creationRequestId) => {
  // Poll for a bounded period without resubmitting the multipart upload.
  for (let attempt = 0; attempt < CREATION_STATUS_POLL_ATTEMPTS; attempt += 1) {
    const status = await getCreationStatus(creationRequestId);
    if (status.status === "completed" && status.car) {
      invalidateCache();
      return status.car;
    }
    if (status.status === "failed") {
      const error = new Error(
        status.errorMessage || "Listing creation failed on the server",
      );
      error.response = {
        status: 422,
        data: { message: error.message, errors: [] },
      };
      throw error;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, CREATION_STATUS_POLL_INTERVAL_MS),
    );
  }

  const error = new Error(
    "Listing creation is taking longer than expected. Check Manage Listings before trying again.",
  );
  error.response = {
    status: 202,
    data: { message: error.message, errors: [] },
  };
  throw error;
};

// PATCH /api/cars/feature/:id — protected
export const toggleFeatureCar = async (id) => {
  const { data } = await apiClient.patch(`/cars/feature/${id}`);
  invalidateCache();
  return data.data.car;
};

// PATCH /api/cars/hide/:id — protected
export const toggleHideCar = async (id) => {
  const { data } = await apiClient.patch(`/cars/hide/${id}`);
  invalidateCache();
  return data.data.car;
};

// PATCH /api/cars/sold/:id — protected (Sold Vehicle Indicator)
export const toggleSoldCar = async (id) => {
  const { data } = await apiClient.patch(`/cars/sold/${id}`);
  invalidateCache();
  return data.data.car;
};

// PATCH /api/cars/features/:id — protected, JSON body { features: [...] }
export const updateCarFeatures = async (id, features) => {
  const { data } = await apiClient.patch(`/cars/features/${id}`, { features });
  invalidateCache();
  return data.data.car;
};

// PATCH /api/cars/images/:id — protected, multipart/form-data — add images
export const addCarImages = async (id, imageFiles = []) => {
  const formData = new FormData();
  imageFiles.forEach((file) => formData.append("images", file));

  const { data } = await apiClient.patch(`/cars/images/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  invalidateCache();
  return data.data.car;
};

// PUT /api/cars/images/:id — protected, multipart/form-data — replaces the
// complete image set and cleans the previous set on the backend.
export const replaceCarImages = async (id, imageFiles = []) => {
  const formData = new FormData();
  imageFiles.forEach((file) => formData.append("images", file));

  const { data } = await apiClient.put(`/cars/images/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  invalidateCache();
  return data.data.car;
};

// DELETE /api/cars/images/:id — protected — removes a single image by
// public_id, both from ImageKit and the car document (see
// removeCarImageService on the backend — never leaves an orphaned upload).
export const removeCarImage = async (id, publicId) => {
  const { data } = await apiClient.delete(`/cars/images/${id}`, {
    data: { public_id: publicId },
  });
  invalidateCache();
  return data.data.car;
};

// PATCH /api/cars/images/:id/reorder — protected, JSON body { order: [publicIds] }
export const reorderCarImages = async (id, order) => {
  const { data } = await apiClient.patch(`/cars/images/${id}/reorder`, {
    order,
  });
  invalidateCache();
  return data.data.car;
};

// DELETE /api/cars/:id — protected
export const deleteCar = async (id) => {
  const { data } = await apiClient.delete(`/cars/${id}`);
  invalidateCache();
  return data.message;
};

// Sort options are a pure frontend/UX concern (they map to SORT_MAP in the
// backend's car.service.js by value, not to a car.constants.js list), so
// they stay defined here rather than in GET /api/cars/options.
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "mileage_low", label: "Mileage: low to high" },
];
