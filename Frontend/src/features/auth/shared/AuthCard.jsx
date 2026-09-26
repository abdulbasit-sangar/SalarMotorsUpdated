/**
 * Shared presentation shell for the auth flows (Login, Register, Manager
 * Register, Forgot/Reset Password). Pulls the repeated centered-card
 * layout, step heading, and error-banner markup that used to be copied
 * into each page into one place. No auth logic lives here — every page
 * still owns its own state, validation, and API calls.
 */
export const AuthShell = ({ children }) => (
  <div className="min-h-[calc(100vh-var(--header-h,76px))] flex items-center justify-center px-4 py-14 sm:py-16">
    <div className="w-full max-w-sm">{children}</div>
  </div>
);

export const AuthHeading = ({ eyebrow, title, subtitle }) => (
  <div className="text-center mb-8">
    {eyebrow && (
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        {eyebrow}
      </p>
    )}
    <h1 className="font-display text-4xl font-semibold text-bone">{title}</h1>
    {subtitle && <p className="text-ash text-sm mt-2 leading-relaxed">{subtitle}</p>}
  </div>
);

export const AuthCardPanel = ({ children, className = "" }) => (
  <div className={`glass-panel-strong rounded-premium-lg p-6 sm:p-8 ${className}`}>
    {children}
  </div>
);

export const AuthFormError = ({ messages, children }) => {
  if (!messages?.length && !children) return null;
  return (
    <div
      role="alert"
      className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 space-y-1"
    >
      {messages?.map((msg, i) => (
        <p key={i} className="text-danger text-sm leading-snug">
          {msg}
        </p>
      ))}
      {children}
    </div>
  );
};

export const AuthFootnote = ({ children }) => (
  <p className="text-center text-ash text-xs mt-6 leading-relaxed">{children}</p>
);
