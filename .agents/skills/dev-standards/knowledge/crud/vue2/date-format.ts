// 日期格式化（Vue 2 骨架自带，避免再依赖项目里的 @/utils/time）
// 复制到 src/components/crud/date-format.ts

import type { TimeDisplayMode } from './types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * 把毫秒时间戳 / ISO 字符串 / Date 格式化成展示文本。
 * 空值统一返回 '—'，与表格其它空单元格一致。
 */
export function formatDisplay(value: unknown, mode: TimeDisplayMode = 'date'): string {
  if (value == null || value === '') return '—';

  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return String(value);

  const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (mode === 'time') return hm;
  if (mode === 'datetime') return `${ymd} ${hm}`;
  return ymd;
}
