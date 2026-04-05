import { addPinyin, isChinese, toTraditional, toSimplified } from '../../lib/chinese';
import { useChinese } from '../../lib/ChineseContext';

interface PinyinTextProps {
  text: string;
  showPinyin?: boolean; // Optional override
  className?: string;
  ignoreFontSize?: boolean;
}

export default function PinyinText({ text, showPinyin: propShowPinyin, className = '', ignoreFontSize = false }: PinyinTextProps) {
  const { showPinyin: contextShowPinyin, isTraditional, fontSize } = useChinese();
  
  const shouldShowPinyin = propShowPinyin !== undefined ? propShowPinyin && contextShowPinyin : contextShowPinyin;
  
  const displayText = isTraditional ? toTraditional(text) : toSimplified(text);

  const style = ignoreFontSize ? {} : { fontSize: `${fontSize}px` };

  if (!shouldShowPinyin) {
    return <span className={className} style={style}>{displayText}</span>;
  }

  const items = addPinyin(displayText);

  return (
    <span className={`inline-flex flex-wrap items-end gap-[2px] ${className}`} style={style}>
      {items.map((item, index) => {
        if (!isChinese(item.char)) {
          return <span key={index} className="inline-block">{item.char}</span>;
        }
        return (
          <ruby key={index} className="inline-flex flex-col items-center leading-none">
            {item.char}
            <rt className="text-[0.6em] text-emerald-400 font-sans tracking-normal select-none mb-0.5">
              {item.pinyin}
            </rt>
          </ruby>
        );
      })}
    </span>
  );
}
