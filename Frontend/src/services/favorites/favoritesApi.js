import { apiClient } from "../api/client.js";

// GET /api/favorites — this device's saved cars
export const fetchFavorites = async () => {
  const { data } = await apiClient.get("/favorites");
  return data.data; // { cars, favoritedCarIds }
};

// POST /api/favorites/:carId
export const addFavorite = async (carId) => {
  const { data } = await apiClient.post(`/favorites/${carId}`);
  return data.data;
};

// DELETE /api/favorites/:carId
export const removeFavorite = async (carId) => {
  const { data } = await apiClient.delete(`/favorites/${carId}`);
  return data.data;
};
