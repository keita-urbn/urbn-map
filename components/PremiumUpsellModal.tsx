// components/PremiumUpsellModal.tsx
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/auth";
import { dummyPurchase, dummyRestore } from "../lib/premiumPurchase";
import { useTheme } from "../theme";

interface PremiumUpsellModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

function showAlert(title: string, body: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n${body}`);
  } else {
    Alert.alert(title, body);
  }
}

export default function PremiumUpsellModal({
  visible,
  message,
  onClose,
}: PremiumUpsellModalProps) {
  const { colors } = useTheme();
  const { user, refreshPremium } = useAuth();
  const [busy, setBusy] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // Fade-in animation for the success panel
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.92)).current;
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state whenever the modal is hidden so it starts fresh next time
  useEffect(() => {
    if (!visible) {
      setSucceeded(false);
      successOpacity.setValue(0);
      successScale.setValue(0.92);
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
    }
  }, [visible]);

  function showSuccess() {
    setSucceeded(true);
    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 160,
      }),
    ]).start();

    // Auto-close after 2 s so the user sees the success message
    autoCloseTimer.current = setTimeout(() => {
      onClose();
    }, 2000);
  }

  // ── Dummy purchase ────────────────────────────────────────────────────────
  async function handlePurchase() {
    if (!user?.uid) {
      showAlert("エラー", "購入するにはログインしてください");
      return;
    }
    setBusy(true);
    try {
      const result = await dummyPurchase(user.uid);
      if (result.ok) {
        // Refresh state first, then reveal the success panel
        await refreshPremium();
        showSuccess();
      } else {
        showAlert("エラー", result.error ?? "購入に失敗しました");
      }
    } catch (e: any) {
      showAlert("エラー", e?.message ?? "購入に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  // ── Dummy restore ─────────────────────────────────────────────────────────
  async function handleRestore() {
    if (!user?.uid) {
      showAlert("エラー", "復元するにはログインしてください");
      return;
    }
    setBusy(true);
    try {
      const result = await dummyRestore(user.uid);
      if (!result.ok) {
        showAlert("エラー", result.error ?? "復元に失敗しました");
        return;
      }
      if (result.restored) {
        await refreshPremium();
        onClose();
        showAlert("復元完了", "Premiumプランが復元されました");
      } else {
        showAlert("復元", "復元できる購入が見つかりませんでした");
      }
    } catch (e: any) {
      showAlert("エラー", e?.message ?? "復元に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={succeeded ? onClose : undefined}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => {}} // prevent backdrop dismiss when tapping inside
        >
          {succeeded ? (
            /* ── Success panel ───────────────────────────────────────────── */
            <Animated.View
              style={[
                styles.successPanel,
                { opacity: successOpacity, transform: [{ scale: successScale }] },
              ]}
            >
              <Text style={styles.successIcon}>✅</Text>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                Premium登録が完了しました
              </Text>
              <Text style={[styles.successBody, { color: colors.muted }]}>
                お気に入り数や経路案内の制限が解除されました
              </Text>
              <View style={[styles.successBar, { backgroundColor: "#1d4ed8" }]} />
            </Animated.View>
          ) : (
            /* ── Normal upsell panel ─────────────────────────────────────── */
            <>
              {/* Icon */}
              <Text style={styles.icon}>🔒</Text>

              {/* Title */}
              <Text style={[styles.title, { color: colors.text }]}>
                Premium プランにアップグレード
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.muted }]}>
                {message}
              </Text>

              {/* Purchase button */}
              <Pressable
                style={[styles.purchaseBtn, { opacity: busy ? 0.6 : 1 }]}
                onPress={handlePurchase}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.purchaseBtnText}>Premiumになる</Text>
                )}
              </Pressable>

              {/* Restore button */}
              <Pressable
                style={[styles.restoreBtn, { borderColor: colors.border }]}
                onPress={handleRestore}
                disabled={busy}
              >
                <Text style={[styles.restoreBtnText, { color: colors.muted }]}>
                  購入を復元
                </Text>
              </Pressable>

              {/* Close link */}
              <Pressable onPress={onClose} disabled={busy}>
                <Text style={[styles.closeLink, { color: colors.muted }]}>
                  閉じる
                </Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
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
  icon: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  purchaseBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#1d4ed8",
  },
  purchaseBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  restoreBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  restoreBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  closeLink: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  // ── Success panel ──────────────────────────────────────────────────────────
  successPanel: {
    width: "100%",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  successBody: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  /** Thin blue progress bar that visually communicates the auto-close timer */
  successBar: {
    height: 3,
    width: "60%",
    borderRadius: 2,
    marginTop: 8,
    opacity: 0.6,
  },
});
