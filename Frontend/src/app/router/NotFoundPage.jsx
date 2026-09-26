import { Link } from "react-router-dom";
import { Button } from "../../shared/components/Button.jsx";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="inline-block border border-steel bg-graphite-800 tag-shape px-6 py-3 mb-6">
          <span className="font-mono text-brass text-sm tracking-widest">ERR // 404</span>
        </div>
        <h1 className="font-display text-5xl text-bone mb-4">Route Not Found</h1>
        <p className="text-ash text-sm mb-8">
          There's no listing or page at this address. It may have been moved, hidden, or never existed.
        </p>
        <Button as={Link} to="/" variant="primary">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
