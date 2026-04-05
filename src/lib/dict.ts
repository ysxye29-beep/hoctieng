import { GoogleGenAI, Type } from '@google/genai';

export type Lang = 'en' | 'zh' | string;

export interface DictEntry {
  lang: Lang;
  word: string;
  ipa?: string;
  pinyin?: string;
  partOfSpeech?: string;
  definitions: string[];
  examples: { en?: string; zh?: string; vi: string }[];
  cachedAt?: number;
}

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
};

async function lookupWithGemini(word: string, lang: Lang): Promise<DictEntry | null> {
  try {
    const ai = getGeminiClient();
    const prompt = lang === 'zh' 
      ? `Provide dictionary entry for the Chinese word: "${word}". Include pinyin, part of speech, 1-3 definitions in Vietnamese, and 1-2 examples (Chinese and Vietnamese translation).`
      : `Provide dictionary entry for the English word: "${word}". Include IPA phonetic transcription, part of speech, 1-3 definitions in Vietnamese, and 1-2 examples (English and Vietnamese translation).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            ipa: { type: Type.STRING, description: "IPA phonetic transcription (for English)" },
            pinyin: { type: Type.STRING, description: "Pinyin (for Chinese)" },
            partOfSpeech: { type: Type.STRING },
            definitions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Definitions in Vietnamese"
            },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING, description: "Example in English (if applicable)" },
                  zh: { type: Type.STRING, description: "Example in Chinese (if applicable)" },
                  vi: { type: Type.STRING, description: "Example translation in Vietnamese" }
                },
                required: ["vi"]
              }
            }
          },
          required: ["word", "definitions", "examples"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        lang,
        word: data.word || word,
        ipa: data.ipa,
        pinyin: data.pinyin,
        partOfSpeech: data.partOfSpeech || 'unknown',
        definitions: data.definitions || [],
        examples: data.examples || []
      };
    }
  } catch (error) {
    console.error("Gemini lookup failed:", error);
  }
  return null;
}

function parseFreeDictionary(data: any): DictEntry {
  const phonetic = data.phonetics?.find((p: any) => p.text)?.text ?? '';
  const meanings = data.meanings ?? [];
  const firstMeaning = meanings[0] ?? {};

  return {
    lang: 'en',
    word: data.word,
    ipa: phonetic,
    partOfSpeech: firstMeaning.partOfSpeech ?? 'unknown',
    definitions: firstMeaning.definitions
      ?.slice(0, 3)
      .map((d: any) => d.definition) ?? [],
    examples: firstMeaning.definitions
      ?.filter((d: any) => d.example)
      .slice(0, 2)
      .map((d: any) => ({ en: d.example, vi: '' })) ?? []
  };
}

export async function lookupEnglish(word: string): Promise<DictEntry | null> {
  const cacheKey = `dict-en:${word.toLowerCase()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const entry = JSON.parse(cached);
    if (Date.now() - entry.cachedAt < 7 * 24 * 60 * 60 * 1000) {
      return entry;
    }
  }

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (res.ok) {
      const data = await res.json();
      const entry = parseFreeDictionary(data[0]);

      localStorage.setItem(cacheKey, JSON.stringify({
        ...entry,
        cachedAt: Date.now()
      }));
      return entry;
    }
  } catch (e) {
    console.error("Free Dictionary API failed:", e);
  }

  const geminiEntry = await lookupWithGemini(word, 'en');
  if (geminiEntry) {
    localStorage.setItem(cacheKey, JSON.stringify({
      ...geminiEntry,
      cachedAt: Date.now()
    }));
  }
  return geminiEntry;
}

export async function lookupChinese(word: string): Promise<DictEntry | null> {
  const cacheKey = `dict-zh:${word}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const entry = JSON.parse(cached);
    if (Date.now() - entry.cachedAt < 30 * 24 * 60 * 60 * 1000) {
      return entry;
    }
  }

  const entry = await lookupWithGemini(word, 'zh');
  if (!entry) return null;

  localStorage.setItem(cacheKey, JSON.stringify({
    ...entry,
    cachedAt: Date.now()
  }));
  return entry;
}

export async function lookupDictionary(word: string, lang: Lang): Promise<DictEntry | null> {
  if (lang.startsWith('zh')) {
    return lookupChinese(word);
  } else {
    return lookupEnglish(word);
  }
}
