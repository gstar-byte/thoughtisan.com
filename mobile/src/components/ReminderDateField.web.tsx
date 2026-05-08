import React from 'react';

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 浏览器预览 / Expo Web：社区 DateTimePicker 不可用，使用原生 datetime-local。
 */
export function ReminderDateField({ value, onChange }: Props) {
  return (
    <input
      type="datetime-local"
      value={toLocalInputValue(value)}
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange(new Date(v));
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: 12,
        fontSize: 16,
        borderRadius: 12,
        border: '1px solid #E5E5EA',
        marginTop: 8,
        marginBottom: 4,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    />
  );
}
