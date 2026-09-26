import { AuthProvider } from "./store/auth/AuthContext.jsx";
import { FavoritesProvider } from "./store/favorites/FavoritesContext.jsx";
import { ToastProvider } from "./store/ui/ToastContext.jsx";
import { ToastViewport } from "./shared/components/ToastViewport.jsx";
import { AppRouter } from "./app/router/AppRouter.jsx";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FavoritesProvider>
          <AppRouter />
          <ToastViewport />
        </FavoritesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
