import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { currentSignupAgreement, hasAgreement, recordAgreement } from "../../lib/legalAgreements";
import { useTheme } from "../../theme";
import SignupAgreement from "./SignupAgreement";

export default function AccountAgreement({ uid }: { uid: string }) {
  const { colors } = useTheme();
  const agreement = currentSignupAgreement();
  const id = agreement?.id;
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<"loading" | "missing" | "accepted" | "failed">("loading");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const current = currentSignupAgreement();
    if (!current || current.id !== id) return;
    let active = true;
    void hasAgreement(uid, current).then(
      (accepted) => { if (active) setState(accepted ? "accepted" : "missing"); },
      () => { if (active) setState("failed"); },
    );
    return () => { active = false; };
  }, [uid, id, attempt]);

  if (!agreement || state === "loading" || state === "accepted") return null;
  if (state === "failed") return (
    <Pressable accessibilityRole="button" onPress={() => { setState("loading"); setAttempt(attempt + 1); }}
      style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: colors.text }}>同意状況を取得できませんでした。再読み込み</Text>
    </Pressable>
  );
  const save = async () => {
    if (!checked || busy) return;
    setBusy(true);
    setSaveError(false);
    try {
      await recordAgreement(uid, agreement);
      setState("accepted");
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ padding: 16, gap: 8 }}>
      <SignupAgreement checked={checked} onChange={setChecked} disabled={busy} />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !checked || busy }} disabled={!checked || busy}
        onPress={() => void save()} style={{ minHeight: 44, justifyContent: "center", opacity: !checked || busy ? 0.6 : 1 }}>
        <Text style={{ color: colors.text }}>{busy ? "保存中…" : "同意・確認を記録する"}</Text>
      </Pressable>
      {saveError && <Text accessibilityRole="alert" style={{ color: colors.text }}>同意記録を保存できませんでした。再試行してください。</Text>}
    </View>
  );
}
