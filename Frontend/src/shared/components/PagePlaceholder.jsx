export const PagePlaceholder = ({ title, phase }) => (
  <div className="container-page py-24 text-center">
    <p className="font-mono text-xs text-brass uppercase tracking-widest mb-3">
      Phase {phase}
    </p>
    <h1 className="font-display text-4xl font-semibold text-bone mb-3">{title}</h1>
    <p className="text-ash text-sm max-w-md mx-auto">
      This screen is scaffolded and routed, and will be built out in a later phase.
    </p>
  </div>
);
