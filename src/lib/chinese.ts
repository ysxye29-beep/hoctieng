import { pinyin } from 'pinyin-pro';
import * as OpenCC from 'opencc-js';

// Khởi tạo converter đồng bộ
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

export function isChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

export function addPinyin(text: string): Array<{ char: string; pinyin: string }> {
  const result: Array<{ char: string; pinyin: string }> = [];
  for (const char of text) {
    if (isChinese(char)) {
      result.push({ char, pinyin: pinyin(char) });
    } else {
      result.push({ char, pinyin: '' });
    }
  }
  return result;
}

export function toTraditional(text: string): string {
  return s2t(text);
}

export function toSimplified(text: string): string {
  return t2s(text);
}
