import LoginPage from "./LoginPage.jsx";

// Route: /admin/login — main admin (superadmin) only.
// A manager who tries here gets a 403 ROLE_MISMATCH from the backend,
// no session is created, and the form links them to /manager/login.
export default function AdminLoginPage() {
  return (
    <LoginPage
      expectedRole="superadmin"
      dashboardPath="/admin/dashboard"
      heading={{
        title: "Main Admin Login",
        subtitle: "This login is for the main admin only. Managers, please use the manager login.",
      }}
    />
  );
}
