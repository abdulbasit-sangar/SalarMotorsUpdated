import LoginPage from "./LoginPage.jsx";

// Route: /manager/login — manager only.
// A superadmin who tries here gets a 403 ROLE_MISMATCH from the backend and
// no session is created.
// A manager whose account is still pending gets ACCOUNT_PENDING and is
// sent to /manager/pending (see LoginPage.jsx).
export default function ManagerLoginPage() {
  return (
    <LoginPage
      expectedRole="manager"
      dashboardPath="/manager/dashboard"
      heading={{
        title: "Manager Sign In",
        subtitle: "Log in with the manager account created for you. New accounts must be activated first.",
      }}
    />
  );
}
