export const SkipToContent = ({ targetId = "main-content" }) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-brass focus:text-graphite-950 focus:px-4 focus:py-2 focus:rounded-sm focus:font-semibold focus:text-sm focus:uppercase focus:tracking-wide"
  >
    Skip to content
  </a>
);
