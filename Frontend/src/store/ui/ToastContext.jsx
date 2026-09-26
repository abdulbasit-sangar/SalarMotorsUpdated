import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);
let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    ({ type = "info", message, duration = 4500 }) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, type, message }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const toast = useMemoToast(push);
  const value = { ...toast, dismiss, toasts };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

// Small helper so consumers can call toast.success("...") / toast.error("...")
function useMemoToast(push) {
  return {
    success: (message, opts) => push({ type: "success", message, ...opts }),
    error: (message, opts) => push({ type: "error", message, ...opts }),
    info: (message, opts) => push({ type: "info", message, ...opts }),
  };
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
