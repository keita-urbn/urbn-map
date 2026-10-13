import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DAY_LABELS, WEEKDAYS, type BusinessHours, type DayHours } from '../lib/businessHours';
import { useTheme } from '../theme';
export default function BusinessHoursEditor({ value, onChange, disabled = false }: { value: BusinessHours | null; onChange: (value: BusinessHours | null) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const updateDay = (day: typeof WEEKDAYS[number], patch: DayHours | undefined) => {
    const weekly = { ...(value?.weekly ?? {}) };
    if (patch) weekly[day] = patch; else delete weekly[day];
    onChange({ timezone: value?.timezone ?? 'Asia/Tokyo', weekly });
  };
  return <View style={{ gap: 12 }}>
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>営業時間</Text>
    <Text style={{ color: colors.muted }}>未設定は「情報なし」として保存します。翌日までの営業にも対応。</Text>
    <TextInput accessibilityLabel="営業時間のタイムゾーン" editable={!disabled} placeholder="Asia/Tokyo" placeholderTextColor={colors.muted} value={value?.timezone ?? 'Asia/Tokyo'} onChangeText={timezone => onChange({ timezone, weekly: value?.weekly ?? {} })} autoCapitalize="none" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
    {WEEKDAYS.map(day => {
      const schedule = value?.weekly[day];
      return <View key={day} style={{ gap: 8 }}>
        <View style={styles.row}><Text style={{ color: colors.text, fontWeight: '800' }}>{DAY_LABELS[day]}曜日</Text>
          {(['unknown', 'open', 'closed'] as const).map(mode => {
            const active = mode === 'unknown' ? !schedule : mode === 'closed' ? schedule?.closed : schedule && !schedule.closed;
            return <Pressable key={mode} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={() => updateDay(day, mode === 'unknown' ? undefined : mode === 'closed' ? { closed: true, intervals: [] } : { closed: false, intervals: schedule?.intervals.length ? schedule.intervals : [{ open: '', close: '' }] })} style={[styles.mode, { borderColor: active ? '#ef4444' : colors.border }]}><Text style={{ color: active ? '#ef4444' : colors.muted }}>{mode === 'unknown' ? '未設定' : mode === 'open' ? '営業' : '休業'}</Text></Pressable>;
          })}
        </View>
        {schedule && !schedule.closed && schedule.intervals.map((interval, index) => <View key={index} style={styles.row}>
          {(['open', 'close'] as const).map(field => <TextInput key={field} accessibilityLabel={`${DAY_LABELS[day]}曜日 ${index + 1} ${field === 'open' ? '開店' : '閉店'}時刻`} editable={!disabled} value={interval[field]} placeholder={field === 'open' ? '開店 HH:mm' : '閉店 HH:mm'} placeholderTextColor={colors.muted} autoCapitalize="none" maxLength={5} onChangeText={time => updateDay(day, { ...schedule, intervals: schedule.intervals.map((i, n) => n === index ? { ...i, [field]: time } : i) })} style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />)}
        </View>)}
      </View>;
    })}
    <Pressable disabled={disabled} onPress={() => onChange(null)}><Text style={{ color: colors.muted }}>営業時間情報をクリア</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, mode: { padding: 8, minHeight: 40, borderRadius: 10, borderWidth: 1 }, input: { minHeight: 44, padding: 10, borderWidth: 1, borderRadius: 10 } });
