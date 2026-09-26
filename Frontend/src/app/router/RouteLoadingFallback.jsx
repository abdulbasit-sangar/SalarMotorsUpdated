import { Spinner } from "../../shared/components/Spinner.jsx";

export const RouteLoadingFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Spinner size={32} className="text-brass" />
  </div>
);
