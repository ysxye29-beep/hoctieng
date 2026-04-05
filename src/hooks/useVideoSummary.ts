import { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

export interface SummaryVocabulary {
  word: string;
  pinyin?: string;
  phonetic?: string;
  type: string;
  meaning_vi: string;
  example: string;
  example_vi: string;
}

export interface SummaryGrammar {
  pattern: string;
  explanation_vi: string;
  example: string;
  example_vi: string;
}

export interface UsefulPhrase {
  phrase: string;
  function: string;
  context: string;
  example: string;
}

export interface VideoSummary {
  summary: string;
  level: string;
  vocabulary: SummaryVocabulary[];
  grammar: SummaryGrammar[];
  useful_phrases: UsefulPhrase[];
  exercises: string[];
}

export function useVideoSummary(youtubeId: string, language: string, transcript: string) {
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `summary_${youtubeId}`;

  const fetchSummary = useCallback(async (force = false) => {
    if (!transcript || transcript.length < 50) return;
    
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setSummary(JSON.parse(cached));
          return;
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const isChinese = language.startsWith('zh') || language === 'cn';
      
      const systemInstruction = isChinese 
        ? `Bạn là giáo viên tiếng Trung. Phân tích đoạn hội thoại/video tiếng Trung sau và trả về JSON với cấu trúc:
{
  "summary": "Tóm tắt nội dung 3-5 câu bằng tiếng Việt",
  "level": "HSK1/HSK2/HSK3/HSK4/HSK5/HSK6",
  "vocabulary": [
    {
      "word": "船",
      "pinyin": "chuán", 
      "type": "Danh từ",
      "meaning_vi": "Thuyền",
      "example": "一个人在船上",
      "example_vi": "Một người ở trên thuyền"
    }
  ],
  "grammar": [
    {
      "pattern": "S + 很 + Adj",
      "explanation_vi": "Diễn tả trạng thái mạnh mẽ",
      "example": "他很着急",
      "example_vi": "Anh ấy rất lo lắng"
    }
  ],
  "useful_phrases": [
    {
      "phrase": "大家好",
      "function": "Mở đầu",
      "context": "Khi bắt đầu bài học",
      "example": "大家好，今天 we come to learn..."
    }
  ],
  "exercises": [
    "Viết lại câu ... thành dạng phủ định",
    "Thay thế từ ... bằng ... và viết lại câu"
  ]
}
Chỉ trả về JSON, không giải thích thêm.`
        : `Bạn là giáo viên tiếng Anh. Phân tích đoạn hội thoại/video tiếng Anh sau và trả về JSON với cấu trúc:
{
  "summary": "Tóm tắt nội dung 3-5 câu bằng tiếng Việt",
  "level": "A1/A2/B1/B2/C1/C2",
  "vocabulary": [
    {
      "word": "welcome",
      "phonetic": "/ˈwɛlkəm/", 
      "type": "Verb/Noun",
      "meaning_vi": "Chào mừng",
      "example": "Welcome to our channel",
      "example_vi": "Chào mừng đến với kênh của chúng tôi"
    }
  ],
  "grammar": [
    {
      "pattern": "Present Perfect (S + have/has + V3/ed)",
      "explanation_vi": "Diễn tả hành động xảy ra trong quá khứ và kéo dài đến hiện tại",
      "example": "I have lived here for 5 years",
      "example_vi": "Tôi đã sống ở đây được 5 năm"
    }
  ],
  "useful_phrases": [
    {
      "phrase": "How's it going?",
      "function": "Greeting",
      "context": "Informal conversation",
      "example": "Hey man, how's it going?"
    }
  ],
  "exercises": [
    "Change the sentence ... into negative form",
    "Fill in the blanks with the correct form of the verb"
  ]
}
Chỉ trả về JSON, không giải thích thêm.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Nội dung video: ${transcript}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              level: { type: Type.STRING },
              vocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    type: { type: Type.STRING },
                    meaning_vi: { type: Type.STRING },
                    example: { type: Type.STRING },
                    example_vi: { type: Type.STRING },
                  },
                  required: ["word", "type", "meaning_vi", "example", "example_vi"]
                }
              },
              grammar: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pattern: { type: Type.STRING },
                    explanation_vi: { type: Type.STRING },
                    example: { type: Type.STRING },
                    example_vi: { type: Type.STRING },
                  },
                  required: ["pattern", "explanation_vi", "example", "example_vi"]
                }
              },
              useful_phrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    function: { type: Type.STRING },
                    context: { type: Type.STRING },
                    example: { type: Type.STRING },
                  },
                  required: ["phrase", "function", "context", "example"]
                }
              },
              exercises: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["summary", "level", "vocabulary", "grammar", "useful_phrases", "exercises"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        setSummary(data);
        localStorage.setItem(cacheKey, text);
      }
    } catch (err: any) {
      console.error("Summary analysis failed:", err);
      setError(err.message || "Failed to analyze video");
    } finally {
      setIsLoading(false);
    }
  }, [youtubeId, language, transcript, cacheKey]);

  useEffect(() => {
    if (transcript && transcript.length > 50 && !summary && !isLoading) {
      fetchSummary();
    }
  }, [transcript, summary, isLoading, fetchSummary]);

  return { summary, isLoading, error, refresh: () => fetchSummary(true) };
}
