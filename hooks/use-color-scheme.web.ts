import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return hydrated ? colorScheme : "light";
}
