import Fuse from 'fuse.js';

export interface DictResult {
  word: string;
  traditional?: string;     // chỉ tiếng Trung
  phonetic?: string;        // pinyin hoặc /skuːl/
  partOfSpeech: string;     // "Danh từ", "Động từ", "Noun", "Verb"...
  definitions: string[];    // nghĩa tiếng Việt
  definitionsEN?: string[]; // tiếng Anh gốc
  definitionsVI?: string[]; // tiếng Việt từ Gemini
  examples: Array<{ original: string; vi: string }>;
  language: 'zh' | 'en';
  cachedAt?: number;
}

let chineseDictMap: Map<string, DictResult> | null = null;
let fuseIndex: Fuse<DictResult> | null = null;

export async function loadChineseDictionary() {
  if (chineseDictMap && fuseIndex) return;
  
  try {
    // Giả lập load data từ file JSON tĩnh (ví dụ: /data/cvdict.json)
    const res = await fetch('/data/cvdict.json');
    if (res.ok) {
      const data: any[] = await res.json();
      chineseDictMap = new Map();
      const dictArray: DictResult[] = [];

      for (const entry of data) {
        // Parse data to match new DictResult
        const result: DictResult = {
          word: entry.word,
          traditional: entry.traditional !== entry.word ? entry.traditional : undefined,
          phonetic: entry.pinyin || '',
          partOfSpeech: entry.partOfSpeech || entry.type || '',
          definitions: entry.definitions || entry.meanings || (entry.meaning ? [entry.meaning] : []),
          examples: (entry.examples || []).map((ex: any) => ({
            original: ex.zh || ex.en || ex.original || '',
            vi: ex.vi || ''
          })),
          language: 'zh'
        };

        chineseDictMap.set(result.word, result);
        if (result.traditional && !chineseDictMap.has(result.traditional)) {
          chineseDictMap.set(result.traditional, result);
        }
        dictArray.push(result);
      }

      // Khởi tạo Fuse.js cho fuzzy search
      fuseIndex = new Fuse(dictArray, {
        keys: ['word', 'traditional', 'pinyin'],
        threshold: 0.3, // Độ mờ của fuzzy search
        includeScore: true,
        ignoreLocation: true
      });
    } else {
      chineseDictMap = new Map();
      fuseIndex = new Fuse([], { keys: ['word', 'pinyin'] });
    }
  } catch (error) {
    console.warn('Could not load local dictionary, will fallback to API/Gemini', error);
    chineseDictMap = new Map();
    fuseIndex = new Fuse([], { keys: ['word', 'pinyin'] });
  }
}

export async function lookupChinese(word: string): Promise<DictResult | null> {
  const clean = word.trim();
  if (!clean) return null;

  // 1. Load dictionary nếu chưa load
  if (!chineseDictMap || !fuseIndex) {
    await loadChineseDictionary();
  }

  // 2. Tra cứu siêu tốc bằng Map index (O(1))
  if (chineseDictMap && chineseDictMap.has(clean)) {
    return chineseDictMap.get(clean) || null;
  }

  // 3. Fuzzy search bằng Fuse.js (hỗ trợ pinyin hoặc gõ sai nhẹ)
  if (fuseIndex) {
    const results = fuseIndex.search(clean);
    // Lấy kết quả tốt nhất nếu score < 0.2 (càng gần 0 càng chính xác)
    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.2) {
      return results[0].item;
    }
  }

  // 4. Fallback: CC-CEDICT qua API miễn phí
  try {
    const res = await fetch(
      `https://cccedict.org/api/search?q=${encodeURIComponent(clean)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.results?.[0]) {
        const r = data.results[0];
        const result: DictResult = {
          word: clean,
          traditional: r.traditional !== clean ? r.traditional : undefined,
          phonetic: r.pinyin ?? '',
          partOfSpeech: '',
          definitions: r.english ? r.english.split('/').filter(Boolean) : [],
          examples: [],
          language: 'zh'
        };
        chineseDictMap?.set(clean, result);
        return result;
      }
    }
  } catch (_) {}

  // 5. Fallback: Gemini AI tra từ (luôn hoạt động, hỗ trợ cụm từ cực tốt)
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY ?? '' 
    });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tra từ điển Hán-Việt cho từ hoặc cụm từ: "${clean}"
      
Trả về JSON (không markdown):
{
  "word": "${clean}",
  "traditional": "chữ phồn thể (nếu có và khác giản thể, nếu không thì để trống)",
  "pinyin": "phiên âm pinyin có dấu",
  "partOfSpeech": "từ loại (Danh từ, Động từ, Tính từ, Lượng từ, Phó từ... để trống nếu không rõ)",
  "definitions": ["nghĩa 1", "nghĩa 2"],
  "examples": [
    {"zh": "câu ví dụ tiếng Trung", "vi": "dịch tiếng Việt"}
  ]
}`
    });

    const raw = response.text ?? '';
    const cleaned = raw.replace(/```json\n?/gi,'').replace(/```\n?/g,'').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.pinyin && (parsed.definitions || parsed.meanings || parsed.meaning)) {
        const result: DictResult = {
          word: clean,
          traditional: parsed.traditional,
          phonetic: parsed.pinyin,
          partOfSpeech: parsed.partOfSpeech || parsed.type || '',
          definitions: Array.isArray(parsed.definitions) ? parsed.definitions : 
                       Array.isArray(parsed.meanings) ? parsed.meanings : 
                       [parsed.meaning || parsed.definitions || parsed.meanings],
          examples: (parsed.examples || []).map((ex: any) => ({
            original: ex.zh || ex.en || ex.original || '',
            vi: ex.vi || ''
          })),
          language: 'zh'
        };
        chineseDictMap?.set(clean, result);
        return result;
      }
    }
  } catch (_) {}

  return null;
}

export async function lookupEnglish(word: string): Promise<DictResult | null> {
  const clean = word.trim().toLowerCase();
  if (!clean) return null;

  const isPhrase = clean.includes(' ');
  const cacheKey = `dict-en:${clean}`;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      const TTL = 30 * 24 * 60 * 60 * 1000; // 30 ngày
      if (Date.now() - (entry.cachedAt ?? 0) < TTL) {
        return entry;
      }
    }
  } catch { /* bỏ qua */ }

  // Nếu là cụm từ, dùng Gemini ngay lập tức
  if (isPhrase) {
    return lookupEnglishWithGemini(clean);
  }

  // Free Dictionary API cho từ đơn
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const entry = data[0];
      
      const enDefinitions: string[] = entry.meanings
        ?.flatMap((m: any) =>
          m.definitions.slice(0, 2).map((d: any) =>
            `[${m.partOfSpeech}] ${d.definition}`
          )
        )
        .slice(0, 4) ?? [];

      let viDefs: string[] = [];
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ 
          apiKey: process.env.GEMINI_API_KEY ?? '' 
        });
        
        const VI_TRANSLATE_PROMPT = (word: string, defs: string[]) => `
Dịch các nghĩa tiếng Anh sau của từ "${word}" sang tiếng Việt.
Giữ ngắn gọn, tự nhiên. Giữ loại từ trong ngoặc [].
Trả về JSON array, KHÔNG markdown:
${JSON.stringify(defs)}

Ví dụ output:
["[tính từ] đúng đắn, chính xác", "[trạng từ] vừa mới, chỉ"]`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: VI_TRANSLATE_PROMPT(clean, enDefinitions)
        });
        
        const viRaw = response.text ?? '';
        const viClean = viRaw.replace(/```json|```/g, '').trim();
        viDefs = JSON.parse(viClean.match(/\[[\s\S]*\]/)?.[0] ?? '[]');
      } catch (e) {
        console.warn('Gemini translation failed', e);
      }

      const examples = entry.meanings
        ?.flatMap((m: any) =>
          m.definitions
            .filter((d: any) => d.example)
            .slice(0, 1)
            .map((d: any) => ({
              original: d.example,
              vi: ''
            }))
        )
        .slice(0, 2) ?? [];

      const fullEntry: DictResult = {
        word: entry.word,
        phonetic: entry.phonetics?.find((p: any) => p.text)?.text ?? entry.phonetic ?? '',
        partOfSpeech: entry.meanings?.[0]?.partOfSpeech ?? '',
        definitions: viDefs.length > 0 ? viDefs : enDefinitions,
        definitionsEN: enDefinitions,
        definitionsVI: viDefs,
        examples: examples,
        language: 'en',
        cachedAt: Date.now()
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(fullEntry));
      } catch { /* bỏ qua */ }

      return fullEntry;
    }
  } catch (_) {}

  // Fallback to Gemini for single words if API fails
  return lookupEnglishWithGemini(clean);
}

async function lookupEnglishWithGemini(phrase: string): Promise<DictResult | null> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY ?? '' 
    });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Dịch cụm từ hoặc từ tiếng Anh này sang tiếng Việt: "${phrase}"
      
Trả về JSON (không markdown):
{
  "phrase": "${phrase}",
  "phonetic": "phiên âm IPA (nếu là từ đơn) hoặc để trống",
  "type": "từ loại (Noun, Verb, Phrase...)",
  "meaning_vi": ["nghĩa 1", "nghĩa 2"],
  "examples": [
    {"en": "example sentence", "vi": "dịch nghĩa"}
  ]
}`
    });

    const raw = response.text ?? '';
    const cleaned = raw.replace(/```json\n?/gi,'').replace(/```\n?/g,'').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      const result: DictResult = {
        word: parsed.phrase || phrase,
        phonetic: parsed.phonetic || '',
        partOfSpeech: parsed.type || (phrase.includes(' ') ? 'Phrase' : ''),
        definitions: Array.isArray(parsed.meaning_vi) ? parsed.meaning_vi : [parsed.meaning_vi],
        definitionsVI: Array.isArray(parsed.meaning_vi) ? parsed.meaning_vi : [parsed.meaning_vi],
        examples: (parsed.examples || []).map((ex: any) => ({
          original: ex.en || ex.original || '',
          vi: ex.vi || ''
        })),
        language: 'en',
        cachedAt: Date.now()
      };
      
      localStorage.setItem(`dict-en:${phrase}`, JSON.stringify(result));
      return result;
    }
  } catch (e) {
    console.error('Gemini lookup failed', e);
  }
  return null;
}

export async function translateText(text: string): Promise<string> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY ?? '' 
    });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Dịch câu tiếng Anh này sang tiếng Việt tự nhiên, chỉ trả về câu dịch, không giải thích thêm: "${text}"`
    });

    return response.text?.trim() || '';
  } catch (e) {
    console.error('Translation failed', e);
    return '';
  }
}
