import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useBusinessClock } from '../hooks/useBusinessClock';
import { DAY_LABELS, WEEKDAYS, formatDayHours, todayHoursText, getOpeningStatus, localClock, STATUS_ACCENTS, type BusinessHours } from '../lib/businessHours';
import { useTheme } from '../theme';
export default function BusinessHoursSection({ hours }: { hours?: BusinessHours | null }) {
  const { colors } = useTheme();
  const now = useBusinessClock();
  const [expanded, setExpanded] = useState(false);
  const status = getOpeningStatus(hours, now);
  const today = localClock(hours?.timezone, now)?.day;
  return <View style={{ gap: 12 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="週間営業時間" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
      <Text style={{ color: status === 'unknown' ? colors.muted : STATUS_ACCENTS[status], fontWeight: '800' }}>{status === 'open' ? '営業中' : status === 'closed' ? '営業時間外' : '営業時間情報なし'}</Text>
      {hours && today && <Text style={{ color: colors.muted, flex: 1 }}>{todayHoursText(hours, now)}</Text>}
      {hours && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />}
    </Pressable>
    {expanded && hours && WEEKDAYS.map(day => <View key={day} style={{ flexDirection: 'row', gap: 14 }}><Text style={{ color: colors.text, fontWeight: day === today ? '800' : '400', width: 56 }}>{DAY_LABELS[day]}曜日</Text><Text style={{ color: colors.text, flex: 1, fontWeight: day === today ? '800' : '400' }}>{formatDayHours(hours.weekly?.[day])}</Text></View>)}
    {expanded && hours && <Text style={{ color: colors.muted, fontSize: 12 }}>{hours.timezone}</Text>}
  </View>;
}
