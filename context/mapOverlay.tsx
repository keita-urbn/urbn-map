import { createContext, useContext, useState, type PropsWithChildren } from "react";
const MapOverlayContext = createContext({ sheetOpen: false, setSheetOpen: (_open: boolean) => {} });
export function MapOverlayProvider({ children }: PropsWithChildren) {
  const [sheetOpen, setSheetOpen] = useState(false);
  return <MapOverlayContext.Provider value={{ sheetOpen, setSheetOpen }}>{children}</MapOverlayContext.Provider>;
}
export const useMapOverlay = () => useContext(MapOverlayContext);
