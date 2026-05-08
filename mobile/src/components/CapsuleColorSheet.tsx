import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { PRESET_COLORS } from '../constants';
import type { Capsule } from '../types';
import { CustomColorInput } from './CustomColorInput';

type Props = {
  capsule: Capsule;
  onSelectPreset: (hex: string) => void;
  onReset: () => void;
  onCustomColor: (hex: string) => void;
  onClose: () => void;
};

/** 与 web CapsuleItem 颜色面板：Presets + Reset + Custom */
export function CapsuleColorSheet({
  capsule,
  onSelectPreset,
  onReset,
  onCustomColor,
  onClose,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const selected = capsule.color;

  return (
    <View style={s.sheet}>
      <Text style={s.title}>Change Color</Text>
      <Text style={s.sec}>PRESETS</Text>
      <ScrollView
        style={{ maxHeight: windowHeight * 0.22 }}
        contentContainerStyle={s.presetScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.presetRow}>
          {PRESET_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                s.dot,
                { backgroundColor: color },
                selected === color && s.dotOn,
              ]}
              onPress={() => onSelectPreset(color)}
            />
          ))}
          <TouchableOpacity
            style={[s.resetDot, !selected && s.resetDotOn]}
            onPress={onReset}
            accessibilityLabel="Reset to default"
          >
            <RotateCcw size={14} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CustomColorInput
        value={selected || '#6BCB77'}
        onChange={(hex) => onCustomColor(hex)}
      />
      <TouchableOpacity style={s.closeBtn} onPress={onClose}>
        <Text style={s.closeTxt}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    width: '100%',
  },
  title: { fontSize: 18, fontWeight: '900', color: '#1D1D1F', marginBottom: 12 },
  sec: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 10,
  },
  presetScroll: { paddingBottom: 4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dotOn: { borderColor: '#007AFF', transform: [{ scale: 1.06 }] },
  resetDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D1D6',
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetDotOn: { borderColor: '#007AFF', backgroundColor: 'rgba(0,122,255,0.08)' },
  closeBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  closeTxt: { color: '#007AFF', fontWeight: '800', fontSize: 15 },
});
