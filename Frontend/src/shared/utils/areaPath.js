// URL prefix for the logged-in role's protected area:
//   "/admin"   -> main admin (superadmin), login at /admin/login
//   "/manager" -> manager,               login at /manager/login
//
// Every link / navigate() inside the protected area MUST go through this
// helper instead of hardcoding "/admin/...". A hardcoded "/admin/..." link
// clicked by a manager sends them to the superadmin-only area, whose guard
// bounces them straight back to /manager/dashboard — so the click appears
// to "do nothing" and the dashboard just stays on screen.
export const areaPrefixForRole = (role) =>
  role === "manager" ? "/manager" : "/admin";

export const areaPath = (role, path) =>
  `${areaPrefixForRole(role)}${path}`;
