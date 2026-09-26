import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { SearchIcon } from "./icons.jsx";

export const SearchBar = ({ className, autoFocus = false, size = "md", onSubmit }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [value, setValue] = useState(searchParams.get("keyword") || "");
  const isLarge = size === "lg";

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/search?keyword=${encodeURIComponent(trimmed)}`);
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} role="search" className={clsx("w-full", className)}>
      <label htmlFor="global-search" className="sr-only">
        Search cars by brand, model, or location
      </label>
      <div
        className={clsx(
          "flex items-center w-full rounded-full border border-card bg-white/70 backdrop-blur-md",
          "transition-colors duration-200 focus-within:bg-white focus-within:border-brass focus-within:ring-2 focus-within:ring-brass/20",
          isLarge ? "h-14 pl-5 pr-2" : "h-11 pl-4 pr-1.5",
        )}
      >
        <button
          type="submit"
          aria-label="Search"
          className={clsx(
            "shrink-0 flex items-center justify-center text-ash transition-colors hover:text-brass-dark",
            isLarge ? "h-8 w-8" : "h-6 w-6",
          )}
        >
          <SearchIcon className={isLarge ? "h-5 w-5" : "h-4 w-4"} />
        </button>

        <input
          id="global-search"
          type="search"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search brand, model, or location…"
          className={clsx(
            "flex-1 min-w-0 bg-transparent border-none outline-none text-bone placeholder:text-ash/70 px-2.5",
            isLarge ? "text-base" : "text-sm",
          )}
        />
      </div>
    </form>
  );
};
