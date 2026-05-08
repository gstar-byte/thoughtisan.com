import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

/**
 * iOS：内联 spinner。Android：点按打开系统日历/时间对话框（inline default 在部分机型上不可见）。
 */
export function ReminderDateField({ value, onChange }: Props) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'android') {
    return (
      <View style={styles.androidWrap}>
        <TouchableOpacity
          style={styles.androidBtn}
          onPress={() => setShow(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.androidBtnTxt}>{value.toLocaleString()}</Text>
          <Text style={styles.androidHint}>Tap to pick date and time</Text>
        </TouchableOpacity>
        {show ? (
          <DateTimePicker
            value={value}
            mode="datetime"
            display="default"
            onChange={(event, d) => {
              setShow(false);
              if (event.type === 'dismissed') return;
              if (d) onChange(d);
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <DateTimePicker
      value={value}
      mode="datetime"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={(_, d) => {
        if (d) onChange(d);
      }}
    />
  );
}

const styles = StyleSheet.create({
  androidWrap: { width: '100%', marginTop: 8 },
  androidBtn: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  androidBtnTxt: { fontSize: 15, fontWeight: '700', color: '#1D1D1F' },
  androidHint: { fontSize: 12, color: '#8E8E93', marginTop: 6, fontWeight: '600' },
});
