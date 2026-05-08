import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

function normalizeHex(s: string): string {
  const x = s.replace('#', '').trim();
  if (/^[0-9A-Fa-f]{6}$/.test(x)) return `#${x.toUpperCase()}`;
  return '';
}

/**
 * 原生端自定义颜色：输入 #RRGGBB（与 Web 的 input[type=color] 对应）。
 */
export function CustomColorInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState(() => value || '#6BCB77');

  useEffect(() => {
    setDraft(value || '#6BCB77');
  }, [value]);

  const apply = () => {
    const h = normalizeHex(draft);
    if (h) onChange(h);
  };

  return (
    <View style={s.wrap}>
      <Text style={s.lbl}>CUSTOM COLOR</Text>
      <View style={s.row}>
        <View style={[s.swatch, { backgroundColor: normalizeHex(draft) || (value || '#6BCB77') }]} />
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          onBlur={apply}
          onSubmitEditing={apply}
          placeholder="#RRGGBB"
          autoCapitalize="characters"
          maxLength={7}
        />
      </View>
      <Text style={s.hint}>Enter 6 hex digits; applies on blur</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 10 },
  lbl: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  hint: { fontSize: 11, color: '#8E8E93', marginTop: 6, fontWeight: '600' },
});
