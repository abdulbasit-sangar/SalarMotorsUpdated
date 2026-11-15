import { HomeHeroSlider } from "./HomeHeroSlider.jsx";
import { PromotedCarousel } from "./PromotedCarousel.jsx";
import { MembershipSection } from "./MembershipSection.jsx";
import { AboutSafarSection } from "./AboutSafarSection.jsx";
import { FollowUsSection } from "./FollowUsSection.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import { fetchFeaturedCars } from "../../../services/cars/carsApi.js";

// One request feeds both the slider photos and the promoted row.
const loadHomeData = async () => {
  const featured = await fetchFeaturedCars(12);
  return { featuredCars: featured.cars };
};

export default function HomePage() {
  const { data, error, loading, refetch } = useAsyncData(loadHomeData, []);
  const featuredCars = data?.featuredCars ?? [];

  return (
    <div>
      <HomeHeroSlider cars={featuredCars} />

      <PromotedCarousel
        cars={featuredCars}
        loading={loading}
        error={error}
        onRetry={refetch}
      />

      <MembershipSection />

      <AboutSafarSection />

      <FollowUsSection />
    </div>
  );
}
