import { Redirect, useLocalSearchParams } from "expo-router";

// Keep existing auth links working while presenting account inside the tab navigator.
export default function LoginRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return <Redirect href={{ pathname: "/account", params: returnTo ? { returnTo } : {} }} />;
}
