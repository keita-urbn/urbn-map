import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../theme";

interface PremiumUpsellModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

/** Lightweight limit explanation. Purchase and restore live on /premium. */
export default function PremiumUpsellModal({ visible, message, onClose }: PremiumUpsellModalProps) {
  const { colors } = useTheme();

  const openPremiumPlan = () => {
    onClose();
    router.push("/premium");
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <Text style={styles.icon}>🔒</Text>
          <Text style={[styles.title, { color: colors.text }]}>Premium プランにアップグレード</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
          <Pressable style={styles.purchaseBtn} onPress={openPremiumPlan}>
            <Text style={styles.purchaseBtnText}>Premiumプランを見る</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={[styles.closeLink, { color: colors.muted }]}>閉じる</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  icon: { fontSize: 40, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  message: { fontSize: 14, fontWeight: "500", lineHeight: 22, textAlign: "center", marginBottom: 8 },
  purchaseBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#1d4ed8",
  },
  purchaseBtnText: { fontSize: 16, fontWeight: "900", color: "#fff" },
  closeLink: { marginTop: 4, fontSize: 14, fontWeight: "600" },
});
