// components/ui/SearchBar.tsx
import { useSearch } from "@/hooks/useSearch";
import { TextInput, View } from "react-native";

export default function SearchBar() {
  const { q, setQ } = useSearch();
  return (
    <View style={{ padding: 12, backgroundColor: "#fff" }}>
      <TextInput
        placeholder="検索…"
        value={q}
        onChangeText={setQ}
        style={{ backgroundColor: "#f2f2f2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        returnKeyType="search"
      />
    </View>
  );
}
