import { useFonts } from 'expo-font';
import { createContext, useContext, useEffect, type PropsWithChildren } from 'react';
import { DISPLAY_FONT } from '../lib/displayFont';
const FontContext = createContext({ loaded: false, settled: false });
const fonts = { [DISPLAY_FONT]: require('../assets/fonts/Anton-Regular.ttf') };
export function TypographyProvider({ children }: PropsWithChildren) {
  const [loaded, error] = useFonts(fonts);
  useEffect(() => { if (error) console.warn('[typography] Anton could not load; using the system font', error.message); }, [error]);
  return <FontContext.Provider value={{ loaded, settled: loaded || !!error }}>{children}</FontContext.Provider>;
}
export const useTypography = () => useContext(FontContext);
