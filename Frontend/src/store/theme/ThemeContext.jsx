import { createContext, useContext } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => children;

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      theme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }

  return context;
};
