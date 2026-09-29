import { Link } from "react-router-dom";
import { Badge } from "../../../shared/components/Badge.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import {
  carLocation,
  carTitle,
  formatPrice,
  getPrimaryImage,
} from "../../../shared/utils/format.js";

export const AdminCarRow = ({
  car,
  onToggleFeatured,
  onToggleHide,
  onToggleSold,
  onEditFeatures,
  onManageImages,
  onDelete,
  pending,
}) => {
  const image = getPrimaryImage(car);
  const location = carLocation(car);
  // Feature is superadmin-only; listing deletion is allowed for both roles.
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === "superadmin";

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-card border border-card rounded-premium-lg p-4 shadow-card">
      <div className="w-full sm:w-32 aspect-[4/3] sm:aspect-square shrink-0 bg-graphite-100 rounded-xl overflow-hidden flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={carTitle(car)}
            className="w-full h-full object-cover"
          />
        ) : (
          <CarSilhouetteIcon className="w-10 h-6 text-steel" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-card truncate">
              {carTitle(car)}
            </h3>
            <p className="text-card-muted text-xs mt-0.5">{location}</p>
          </div>
          <p className="font-mono text-brass-dark text-base font-semibold shrink-0">
            {formatPrice(car.price, car.currency)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Badge variant={car.featured ? "brass" : "neutral"}>
            {car.featured ? "Featured" : "Not Featured"}
          </Badge>
          <Badge variant={car.isHidden ? "danger" : "neutral"}>
            {car.isHidden ? "Hidden" : "Visible"}
          </Badge>
          <Badge variant={car.isSold ? "danger" : "neutral"}>
            {car.isSold ? "Sold" : "Available"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="secondary"
              loading={pending === "feature"}
              onClick={() => onToggleFeatured(car)}
            >
              {car.featured ? "Unfeature" : "Feature"}
            </Button>
          )}
          <Button
            size="sm"
            variant={car.isHidden ? "primary" : "danger"}
            loading={pending === "hide"}
            onClick={() => onToggleHide(car)}
          >
            {car.isHidden ? "Unhide" : "Hide"}
          </Button>
          <Button
            size="sm"
            variant={car.isSold ? "secondary" : "danger"}
            loading={pending === "sold"}
            onClick={() => onToggleSold(car)}
          >
            {car.isSold ? "Mark Available" : "Mark Sold"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onEditFeatures(car)}
          >
            Edit Features
            {car.features?.length ? ` (${car.features.length})` : ""}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onManageImages(car)}
          >
            Manage Images ({car.images?.length || 0})
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={pending === "delete"}
            onClick={() => onDelete(car)}
          >
            Delete
          </Button>
          {!car.isHidden && (
            <Button
              as={Link}
              to={`/cars/${car._id}`}
              target="_blank"
              size="sm"
              variant="ghost"
            >
              View live →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
