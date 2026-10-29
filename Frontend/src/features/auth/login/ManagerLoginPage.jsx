import LoginPage from "./LoginPage.jsx";

// Route: /manager/login — manager only.
// A superadmin who tries here gets a 403 ROLE_MISMATCH from the backend,
// no session is created, and the form links them to /admin/login.
// A manager whose account is still pending gets ACCOUNT_PENDING and is
// sent to /manager/pending (see LoginPage.jsx).
export default function ManagerLoginPage() {
  return (
    <LoginPage
      expectedRole="manager"
      dashboardPath="/manager/dashboard"
      heading={{
        title: "Manager Login",
        subtitle: "Log in with the manager account created for you. New accounts must be activated by the main admin first.",
      }}
    />
  );
}
