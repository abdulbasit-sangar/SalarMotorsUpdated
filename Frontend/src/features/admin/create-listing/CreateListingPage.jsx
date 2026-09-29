import { useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Input, Select, Textarea } from "../../../shared/components/Input.jsx";

import { Button } from "../../../shared/components/Button.jsx";

import { ImageUploader } from "../../../shared/components/ImageUploader.jsx";

import { FeaturesSelector } from "../../../shared/components/FeaturesSelector.jsx";

import { useToast } from "../../../store/ui/ToastContext.jsx";

import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import { SearchableSelect } from "../../../shared/components/SearchableSelect.jsx";

import {
  validateCarForm,
  hasErrors,
} from "../../../shared/utils/validators.js";

import { parseApiError } from "../../../services/api/client.js";

import {
  createCar,
  waitForCreationStatus,
} from "../../../services/cars/carsApi.js";

const INITIAL_FORM = {
  title: "",
  brand: "",
  model: "",
  year: "",
  price: "",
  currency: "USD",
  province: "",
  city: "",
  mileage: "",
  mileageUnit: "km",
  fuelType: "",
  bodyType: "",
  transmission: "",
  condition: "",
  engineCC: "",
  color: "",
  vin: "",
  sellerPhone: "",
  sellerWhatsapp: "",
  sellerLocation: "",
  description: "",
  importedDate: "",
  features: [],
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useCarOptions();

  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const creationRequestId = useRef(crypto.randomUUID());

  const updateField = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [key]: undefined,
    }));
  };

  const updateBrand = (event) => {
    setForm((prev) => ({
      ...prev,
      brand: event.target.value,
      model: "",
    }));

    setFieldErrors((prev) => ({
      ...prev,
      brand: undefined,
      model: undefined,
    }));
  };

  const updateModel = (model) => {
    setForm((prev) => ({ ...prev, model }));
    setFieldErrors((prev) => ({ ...prev, model: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateCarForm(form);

    setFieldErrors(errors);
    setFormError(null);

    if (hasErrors(errors)) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);

    try {
      const car = await createCar(form, images, creationRequestId.current);

      toast.success(
        `"${car.title}" listed successfully. Pictures uploaded successfully.`,
      );

      navigate("/admin/listings");
    } catch (err) {
      if (!err?.response) {
        try {
          const statusCar = await waitForCreationStatus(
            creationRequestId.current,
          );
          toast.success(
            `"${statusCar.title}" listed successfully. Pictures uploaded successfully.`,
          );
          navigate("/admin/listings");
          return;
        } catch {
          // The original network error remains the actionable result.
        }
      }
      // Rotate the idempotency key so a *changed* resubmission isn't judged
      // against this failed attempt's request hash (see listingCreation
      // .service.js beginListingCreation — same key + different data = 409).
      creationRequestId.current = crypto.randomUUID();

      const parsed = parseApiError(err);

      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);

      toast.error(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-8 sm:py-10 max-w-3xl">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        Inventory
      </p>

      <h1 className="font-display text-4xl font-semibold text-bone mb-8">
        Create Listing
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {formError && (
          <div
            role="alert"
            className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 space-y-1"
          >
            {formError.map((msg, i) => (
              <p key={i} className="text-danger text-sm">
                {msg}
              </p>
            ))}
          </div>
        )}

        {optionsError && (
          <div
            role="alert"
            className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <p className="text-danger text-sm">
              Couldn't load dropdown options (brand, location, engine, year).
            </p>
            <button
              type="button"
              onClick={refetchOptions}
              className="text-danger text-sm font-semibold underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ==================== CORE DETAILS ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            Core Details
          </h2>

          <Input
            label="Title"
            required
            placeholder="e.g. 2020 Toyota Corolla Altis"
            value={form.title}
            onChange={updateField("title")}
            error={fieldErrors.title}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            {/* BRAND DROPDOWN */}
            <Select
              label="Brand"
              required
              value={form.brand}
              onChange={updateBrand}
              error={fieldErrors.brand}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading ? "Loading brands…" : "Select brand"}
              </option>
              {(options?.brands ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>

            <SearchableSelect
              id="listing-model"
              label="Model"
              required
              value={form.model}
              onChange={updateModel}
              options={(options?.modelsByBrand?.[form.brand] ?? []).map(
                (model) => ({ value: model, label: model }),
              )}
              placeholder={form.brand ? "Select model" : "Select brand first"}
              disabled={!form.brand}
              disabledLabel="Select brand first"
              error={fieldErrors.model}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* YEAR DROPDOWN */}
            <Select
              label="Year"
              required
              value={form.year}
              onChange={updateField("year")}
              error={fieldErrors.year}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading ? "Loading years…" : "Select year"}
              </option>
              {(options?.years ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>

            <Input
              label="Price"
              type="number"
              required
              placeholder="1500000"
              value={form.price}
              onChange={updateField("price")}
              error={fieldErrors.price}
            />

            {/* CURRENCY DROPDOWN — spec requirement #2: price and currency
                are stored separately (see Backend/src/models/car.model.js)
                and only combined at display time (shared/utils/format.js). */}
            <Select
              label="Currency"
              value={form.currency}
              onChange={updateField("currency")}
              error={fieldErrors.currency}
            >
              {(options?.currencies ?? []).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.code}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="VIN (Vehicle Identification Number)"
            placeholder="1HGCM82633A004352"
            hint="Optional — 5–17 letters/numbers. Used to search for this listing."
            value={form.vin}
            onChange={updateField("vin")}
            error={fieldErrors.vin}
          />
        </section>

        {/* ==================== LOCATION ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            Location
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* LOCATION DROPDOWN — Afghan provinces/cities plus the
                "Dubai Cars" / "On The Way" special categories, grouped
                so admins can tell them apart at a glance. Both groups are
                still the same underlying `province` field (see
                Backend/src/constants/car.constants.js LOCATIONS). */}
            <Select
              label="Location"
              required
              value={form.province}
              onChange={updateField("province")}
              error={fieldErrors.province}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading ? "Loading locations…" : "Select location"}
              </option>
              {(options?.locationGroups?.specialLocations?.length ?? 0) > 0 && (
                <optgroup label="Categories">
                  {options.locationGroups.specialLocations.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Afghan Provinces">
                {(
                  options?.locationGroups?.provinces ??
                  options?.provinces ??
                  []
                ).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </optgroup>
            </Select>

            <Input
              label="City"
              placeholder="Jalalabad"
              value={form.city}
              onChange={updateField("city")}
            />
          </div>
        </section>

        {/* ==================== SPECIFICATIONS ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            Specifications
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Mileage"
              type="number"
              placeholder="30000"
              value={form.mileage}
              onChange={updateField("mileage")}
              error={fieldErrors.mileage}
            />

            {/* MILEAGE UNIT — spec requirement #4: stored separately from
                the numeric mileage (never "85000 km" as one string). */}
            <Select
              label="Unit"
              value={form.mileageUnit}
              onChange={updateField("mileageUnit")}
            >
              {(options?.mileageUnits ?? ["km", "miles"]).map((u) => (
                <option key={u} value={u}>
                  {u === "miles" ? "Miles" : "KM"}
                </option>
              ))}
            </Select>
          </div>

          {/* ENGINE DROPDOWN */}
          <Select
            label="Engine (cc)"
            value={form.engineCC}
            onChange={updateField("engineCC")}
            error={fieldErrors.engineCC}
            disabled={optionsLoading}
          >
            <option value="">
              {optionsLoading ? "Loading engine sizes…" : "Select engine"}
            </option>
            {(options?.engineCC ?? []).map((v) => (
              <option key={v} value={v}>
                {v} cc
              </option>
            ))}
          </Select>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Fuel Type"
              value={form.fuelType}
              onChange={updateField("fuelType")}
            >
              <option value="">Select fuel type</option>

              {(options?.fuelTypes ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>

            <Select
              label="Body Type"
              value={form.bodyType}
              onChange={updateField("bodyType")}
            >
              <option value="">Select body type</option>

              {(options?.bodyTypes ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Transmission"
              value={form.transmission}
              onChange={updateField("transmission")}
            >
              <option value="">Select transmission</option>

              {(options?.transmissions ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>

            <Select
              label="Condition"
              value={form.condition}
              onChange={updateField("condition")}
            >
              <option value="">Select condition</option>

              {(options?.conditions ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Color"
              placeholder="White"
              value={form.color}
              onChange={updateField("color")}
            />

            <Input
              label="Imported Date"
              type="date"
              value={form.importedDate}
              onChange={updateField("importedDate")}
            />
          </div>

          <Textarea
            label="Description"
            placeholder="Condition notes, service history, ownership details…"
            value={form.description}
            onChange={updateField("description")}
            error={fieldErrors.description}
            hint={`${form.description.length} / 2000`}
          />
        </section>

        {/* ==================== FEATURES ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6">
          <FeaturesSelector
            featureGroups={options?.featureGroups ?? []}
            selected={form.features}
            onChange={(features) => setForm((prev) => ({ ...prev, features }))}
          />
        </section>

        {/* ==================== SELLER INFORMATION ==================== */}
        {/* Spec requirement #1: seller info now belongs to the individual
            listing, not the admin's profile — so different vehicles can
            list different sellers. */}
        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            Seller Information
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+93 70 123 4567"
              hint="Used for the Call button on the listing."
              value={form.sellerPhone}
              onChange={updateField("sellerPhone")}
              error={fieldErrors.sellerPhone}
            />
            <Input
              label="WhatsApp Number"
              type="tel"
              placeholder="+93 70 123 4567"
              hint="Leave blank to reuse the phone number above."
              value={form.sellerWhatsapp}
              onChange={updateField("sellerWhatsapp")}
              error={fieldErrors.sellerWhatsapp}
            />
          </div>

          <Input
            label="Seller Location"
            placeholder="Kabul, Afghanistan"
            value={form.sellerLocation}
            onChange={updateField("sellerLocation")}
            error={fieldErrors.sellerLocation}
          />
        </section>

        {/* ==================== IMAGES ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6">
          <ImageUploader files={images} onChange={setImages} />
        </section>

        {/* ==================== ACTIONS ==================== */}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={submitting}>
            Publish Listing
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/admin/listings")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
