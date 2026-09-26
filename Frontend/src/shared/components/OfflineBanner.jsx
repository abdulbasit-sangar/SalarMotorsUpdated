import { useEffect, useState } from "react";

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-danger/8 border-b border-danger/25 text-danger text-xs font-semibold text-center py-2 px-4"
    >
      You're offline — some content may not load until your connection is back.
    </div>
  );
};
