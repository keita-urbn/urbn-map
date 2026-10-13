import { StyleSheet, Text, type TextProps } from 'react-native';
import { canUseDisplayFont, DISPLAY_FONT } from '../../lib/displayFont';
import { useTypography } from '../../theme/typography';

type Props = Omit<TextProps, 'children'> & { children: string };
export default function DisplayText({ children, style, ...props }: Props) {
  const { loaded } = useTypography();
  const condensed = loaded && canUseDisplayFont(children);
  const flattened = StyleSheet.flatten(style);
  const size = flattened?.fontSize ?? 18;
  return <Text {...props} style={[style, condensed && {
    fontFamily: DISPLAY_FONT,
    // Anton's regular face already has heavy strokes; avoid synthetic weights.
    fontWeight: '400', fontStyle: 'normal', letterSpacing: 0,
    lineHeight: Math.max(flattened?.lineHeight ?? 0, Math.ceil(size * 1.35)),
  }]}>{children}</Text>;
}
