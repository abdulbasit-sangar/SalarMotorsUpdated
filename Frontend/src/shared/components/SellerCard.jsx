import { WhatsappIcon, PhoneIcon, MapPinIcon } from "./icons.jsx";
import { Button } from "./Button.jsx";

/**
 * digitsOnly — strips everything except digits and a leading "+" so a phone
 * number entered in any common format (spaces, dashes, parentheses) turns
 * into a valid wa.me / tel: target. Never hard-coded — always derived from
 * the seller's own stored number on the listing itself.
 */
const digitsOnly = (phone) => (phone || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");

/**
 * SellerCard — Seller Information section on the vehicle details page.
 * Seller contact info now lives directly on the listing (Car.sellerPhone /
 * sellerWhatsapp / sellerLocation — set on Create Listing, not the admin
 * profile), so a single admin/manager account can list vehicles for
 * different sellers. Renders nothing if the listing has none of these set
 * (e.g. an older listing created before this field existed).
 */
export const SellerCard = ({ car }) => {
  const { sellerPhone, sellerWhatsapp, sellerLocation } = car || {};
  const whatsappDigits = digitsOnly(sellerWhatsapp || sellerPhone);
  const callDigits = digitsOnly(sellerPhone);
  const hasWhatsapp = whatsappDigits.length >= 7;
  const hasCall = callDigits.length >= 7;

  if (!hasWhatsapp && !hasCall && !sellerLocation) return null;

  return (
    <div className="mt-8 glass-panel rounded-premium-lg p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-bone mb-4">
        Seller Information
      </h2>

      {sellerLocation && (
        <p className="flex items-center gap-1.5 text-ash text-sm mb-4">
          <MapPinIcon className="w-4 h-4" />
          {sellerLocation}
        </p>
      )}

      {(hasWhatsapp || hasCall) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {hasWhatsapp && (
            <Button
              as="a"
              href={`https://wa.me/${whatsappDigits.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              className="!bg-[#25D366] !text-white hover:!brightness-105"
            >
              <WhatsappIcon className="w-4 h-4" />
              WhatsApp Seller
            </Button>
          )}
          {hasCall && (
            <Button as="a" href={`tel:${callDigits}`} variant="secondary">
              <PhoneIcon className="w-4 h-4" />
              Call Seller
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
