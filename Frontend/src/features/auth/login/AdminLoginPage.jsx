import LoginPage from "./LoginPage.jsx";

// Route: /admin/login — main admin (superadmin) only.
// A manager who tries here gets a 403 ROLE_MISMATCH from the backend and
// no session is created.
export default function AdminLoginPage() {
  return (
    <LoginPage
      expectedRole="superadmin"
      dashboardPath="/admin/dashboard"
      heading={{
        title: "Main Admin Sign In",
        subtitle: "This sign-in is for the main admin only.",
      }}
    />
  );
}
