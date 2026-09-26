import crypto from "crypto";

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stableValue(value[key]);
        return result;
      }, {});
  }
  return value;
};

export const hashListingRequest = (fields = {}, files = []) => {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(stableValue(fields)));
  files.forEach((file) => {
    hash.update(file.originalname || "");
    hash.update(file.mimetype || "");
    hash.update(String(file.size || file.buffer?.length || 0));
    hash.update(file.buffer || Buffer.alloc(0));
  });
  return hash.digest("hex");
};
