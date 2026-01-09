import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ShopDoc } from "../types/shop";

type Props = {
  shops: ShopDoc[];
  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
};

export default function ShopMapWeb({ shops, onOpenDetail, onOpenDirections }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web Demo</Text>
      <Text style={styles.sub}>
        地図機能はモバイル（iOS/Android）で提供しています。Webでは店舗一覧で動作確認できます。
      </Text>

      <ScrollView style={styles.list}>
        {(shops ?? []).map((s: any) => (
          <View key={String(s.id)} style={styles.item}>
            <Text style={styles.name}>{s.name}</Text>
            {!!(s.area || s.address) && (
              <Text style={styles.meta}>
                {[s.area, s.address].filter(Boolean).join(" / ")}
              </Text>
            )}

            <View style={styles.row}>
              <TouchableOpacity style={styles.btn} onPress={() => onOpenDetail(s)}>
                <Text style={styles.btnText}>詳細</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.btnDark]} onPress={() => onOpenDirections(s)}>
                <Text style={[styles.btnText, styles.btnTextDark]}>経路案内</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  sub: { fontSize: 13, opacity: 0.8, marginBottom: 12 },

  list: { flex: 1 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#e5e5e5" },
  name: { fontSize: 15, fontWeight: "800" },
  meta: { fontSize: 12, opacity: 0.75, marginTop: 4 },

  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  btn: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  btnText: { fontWeight: "800" },
  btnDark: { backgroundColor: "black", borderColor: "black" },
  btnTextDark: { color: "white" },
});
