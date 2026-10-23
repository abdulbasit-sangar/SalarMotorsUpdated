import { useTranslation } from "react-i18next";
import { useOptionLabel } from "../../../i18n/optionLabels.js";
import { Input, Select, Textarea } from "../../../shared/components/Input.jsx";
import { FeaturesSelector } from "../../../shared/components/FeaturesSelector.jsx";
import { SearchableSelect } from "../../../shared/components/SearchableSelect.jsx";

/**
 * ListingFormSections — every vehicle-detail field of a listing (core,
 * location, specs, features, seller). Shared by Create Listing and Edit
 * Vehicle so the two forms always offer the same fields, options and
 * behaviour. Images are NOT part of this component: they are handled
 * differently when creating (upload) vs. editing (existing image manager).
 */
export const ListingFormSections = ({
  form,
  setForm,
  fieldErrors,
  setFieldErrors,
  options,
  optionsLoading,
}) => {
  const { t } = useTranslation("admin");
  const label = useOptionLabel();

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

  return (
    <>
        {/* ==================== CORE DETAILS ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            {t("create.sections.core")}
          </h2>

          <Input
            label={t("create.fields.title")}
            required
            placeholder={t("create.fields.titlePlaceholder")}
            value={form.title}
            onChange={updateField("title")}
            error={fieldErrors.title}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            {/* BRAND DROPDOWN */}
            <Select
              label={t("create.fields.brand")}
              required
              value={form.brand}
              onChange={updateBrand}
              error={fieldErrors.brand}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading
                  ? t("create.select.loadingBrands")
                  : t("create.select.brand")}
              </option>
              {(options?.brands ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>

            <SearchableSelect
              id="listing-model"
              label={t("create.fields.model")}
              required
              value={form.model}
              onChange={updateModel}
              options={(options?.modelsByBrand?.[form.brand] ?? []).map(
                (model) => ({ value: model, label: model }),
              )}
              placeholder={
                form.brand
                  ? t("create.select.model")
                  : t("create.select.brandFirst")
              }
              disabled={!form.brand}
              disabledLabel={t("create.select.brandFirst")}
              error={fieldErrors.model}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* YEAR DROPDOWN */}
            <Select
              label={t("create.fields.year")}
              required
              value={form.year}
              onChange={updateField("year")}
              error={fieldErrors.year}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading
                  ? t("create.select.loadingYears")
                  : t("create.select.year")}
              </option>
              {(options?.years ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>

            <Input
              label={t("create.fields.price")}
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
              label={t("create.fields.currency")}
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
            label={t("create.fields.vin")}
            dir="ltr"
            placeholder="1HGCM82633A004352"
            hint={t("create.fields.vinHint")}
            value={form.vin}
            onChange={updateField("vin")}
            error={fieldErrors.vin}
          />
        </section>

        {/* ==================== LOCATION ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            {t("create.sections.location")}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* LOCATION DROPDOWN — Afghan provinces/cities plus the
                "Dubai Cars" / "On The Way" special categories, grouped
                so admins can tell them apart at a glance. Both groups are
                still the same underlying `province` field (see
                Backend/src/constants/car.constants.js LOCATIONS). */}
            <Select
              label={t("create.fields.location")}
              required
              value={form.province}
              onChange={updateField("province")}
              error={fieldErrors.province}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading
                  ? t("create.select.loadingLocations")
                  : t("create.select.location")}
              </option>
              {(options?.locationGroups?.specialLocations?.length ?? 0) > 0 && (
                <optgroup label={t("create.select.categories")}>
                  {options.locationGroups.specialLocations.map((v) => (
                    <option key={v} value={v}>
                      {label("province", v)}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label={t("create.select.provinces")}>
                {(
                  options?.locationGroups?.provinces ??
                  options?.provinces ??
                  []
                ).map((v) => (
                  <option key={v} value={v}>
                    {label("province", v)}
                  </option>
                ))}
              </optgroup>
            </Select>

            <Input
              label={t("create.fields.city")}
              placeholder={t("create.fields.cityPlaceholder")}
              value={form.city}
              onChange={updateField("city")}
            />
          </div>
        </section>

        {/* ==================== SPECIFICATIONS ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            {t("create.sections.specs")}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label={t("create.fields.mileage")}
              type="number"
              placeholder="30000"
              value={form.mileage}
              onChange={updateField("mileage")}
              error={fieldErrors.mileage}
            />

            {/* MILEAGE UNIT — spec requirement #4: stored separately from
                the numeric mileage (never "85000 km" as one string). */}
            <Select
              label={t("create.fields.unit")}
              value={form.mileageUnit}
              onChange={updateField("mileageUnit")}
            >
              {(options?.mileageUnits ?? ["km", "miles"]).map((u) => (
                <option key={u} value={u}>
                  {label("mileageUnit", u)}
                </option>
              ))}
            </Select>
          </div>

          {/* ENGINE DROPDOWN */}
          <Select
            label={t("create.fields.engine")}
            value={form.engineCC}
            onChange={updateField("engineCC")}
            error={fieldErrors.engineCC}
            disabled={optionsLoading}
          >
            <option value="">
              {optionsLoading
                ? t("create.select.loadingEngines")
                : t("create.select.engine")}
            </option>
            {(options?.engineCC ?? []).map((v) => (
              <option key={v} value={v}>
                {t("specs.engineCc", { ns: "catalog", value: v })}
              </option>
            ))}
          </Select>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label={t("create.fields.fuelType")}
              value={form.fuelType}
              onChange={updateField("fuelType")}
            >
              <option value="">{t("create.select.fuelType")}</option>

              {(options?.fuelTypes ?? []).map((v) => (
                <option key={v} value={v}>
                  {label("fuelType", v)}
                </option>
              ))}
            </Select>

            <Select
              label={t("create.fields.bodyType")}
              value={form.bodyType}
              onChange={updateField("bodyType")}
            >
              <option value="">{t("create.select.bodyType")}</option>

              {(options?.bodyTypes ?? []).map((v) => (
                <option key={v} value={v}>
                  {label("bodyType", v)}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label={t("create.fields.transmission")}
              value={form.transmission}
              onChange={updateField("transmission")}
            >
              <option value="">{t("create.select.transmission")}</option>

              {(options?.transmissions ?? []).map((v) => (
                <option key={v} value={v}>
                  {label("transmission", v)}
                </option>
              ))}
            </Select>

            <Select
              label={t("create.fields.condition")}
              value={form.condition}
              onChange={updateField("condition")}
            >
              <option value="">{t("create.select.condition")}</option>

              {(options?.conditions ?? []).map((v) => (
                <option key={v} value={v}>
                  {label("condition", v)}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label={t("create.fields.color")}
              placeholder={t("create.fields.colorPlaceholder")}
              value={form.color}
              onChange={updateField("color")}
            />

            <Input
              label={t("create.fields.importedDate")}
              type="date"
              value={form.importedDate}
              onChange={updateField("importedDate")}
            />
          </div>

          <Textarea
            label={t("create.fields.description")}
            placeholder={t("create.fields.descriptionPlaceholder")}
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
            {t("create.sections.seller")}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label={t("create.fields.phone")}
              type="tel"
              placeholder="+93 70 123 4567"
              hint={t("create.fields.phoneHint")}
              value={form.sellerPhone}
              onChange={updateField("sellerPhone")}
              error={fieldErrors.sellerPhone}
            />
            <Input
              label={t("create.fields.whatsapp")}
              type="tel"
              placeholder="+93 70 123 4567"
              hint={t("create.fields.whatsappHint")}
              value={form.sellerWhatsapp}
              onChange={updateField("sellerWhatsapp")}
              error={fieldErrors.sellerWhatsapp}
            />
          </div>

          <Input
            label={t("create.fields.sellerLocation")}
            placeholder={t("create.fields.sellerLocationPlaceholder")}
            value={form.sellerLocation}
            onChange={updateField("sellerLocation")}
            error={fieldErrors.sellerLocation}
          />
        </section>
    </>
  );
};
