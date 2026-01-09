// hooks/useSearch.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

type Ctx = {
  q: string;
  setQ: (v: string) => void;
};

const SearchContext = createContext<Ctx | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState("");

  const value = useMemo(() => ({ q, setQ }), [q]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
