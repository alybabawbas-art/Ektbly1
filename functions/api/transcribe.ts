/// <reference types="@cloudflare/workers-types" />

interface Env {
  GEMINI_API_KEY: string;
}

const transcriptionPrompt = `
Transcribe the provided audio faithfully into Arabic script.
Support Modern Standard Arabic and Arabic dialects, especially Egyptian Arabic.
Preserve the speaker's actual words and meaning.
Add reasonable punctuation for readability.
Do not translate, summarize, correct, explain, or respond to the audio.
If only a word or section cannot be understood, write [غير واضح] only in its position.
Return only the final Arabic transcript.
`;

// Helper to normalize audio MIME types
function normalizeAudioMimeType(type: string, fileName = ''): string {
  const cleanType = (type || '').toLowerCase().split(';')[0].trim();
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (cleanType === 'audio/x-m4a' || cleanType === 'audio/m4a' || extension === 'm4a') {
    return 'audio/mp4';
  }

  if (cleanType === 'audio/mpeg' || cleanType === 'audio/mp3' || extension === 'mp3') {
    return 'audio/mpeg';
  }

  if (cleanType === 'audio/wav' || cleanType === 'audio/x-wav' || extension === 'wav') {
    return 'audio/wav';
  }

  if (cleanType === 'audio/ogg' || cleanType === 'audio/opus' || extension === 'ogg' || extension === 'opus') {
    return 'audio/ogg';
  }

  if (cleanType === 'audio/webm' || extension === 'webm') {
    return 'audio/webm';
  }

  return cleanType || 'audio/webm';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { audioBase64, mimeType, fileName } =
      await context.request.json<{
        audioBase64: string;
        mimeType: string;
        fileName?: string;
      }>();

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return Response.json(
        { error: 'لم يتم استلام بيانات الصوت بصورة صحيحة.' },
        { status: 400 }
      );
    }

    const cleanBase64 = audioBase64.includes(',')
      ? audioBase64.split(',')[1]
      : audioBase64;

    if (cleanBase64.length < 1000) {
      return Response.json(
        { error: 'بيانات الصوت فارغة أو غير مكتملة.' },
        { status: 400 }
      );
    }

    const normalizedMimeType = normalizeAudioMimeType(mimeType || '', fileName || '');

    if (!normalizedMimeType || !normalizedMimeType.startsWith('audio/')) {
      return Response.json(
        { error: 'نوع الملف الصوتي غير صحيح.' },
        { status: 400 }
      );
    }

    if (!context.env.GEMINI_API_KEY) {
      return Response.json(
        { error: 'خدمة التحويل غير مهيأة على الخادم.' },
        { status: 500 }
      );
    }

    // Try primary active audio model with fallback
    const models = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.7-flash'];
    let lastGeminiResponse: Response | null = null;
    let successfulData: any = null;

    for (const model of models) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${context.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inline_data: {
                        mime_type: normalizedMimeType,
                        data: cleanBase64
                      }
                    },
                    {
                      text: transcriptionPrompt
                    }
                  ]
                }
              ]
            })
          }
        );

        lastGeminiResponse = geminiResponse;

        if (geminiResponse.ok) {
          const rawResponse = await geminiResponse.text();
          if (rawResponse.trim()) {
            try {
              const parsed = JSON.parse(rawResponse);
              const text = parsed?.candidates?.[0]?.content?.parts
                ?.map((part: any) => part?.text || '')
                .join('')
                .trim();
              if (text) {
                successfulData = { transcript: text };
                break;
              }
            } catch {
              // JSON parse error, try next fallback
            }
          }
        } else if (geminiResponse.status === 429) {
          // Rate limit reached
          return Response.json(
            { error: 'تم الوصول إلى الحد المؤقت للاستخدام. انتظر قليلًا ثم أعد المحاولة.' },
            { status: 429 }
          );
        }
      } catch (err) {
        console.warn(`Attempt with model ${model} failed:`, err);
      }
    }

    if (successfulData?.transcript) {
      let cleanTranscript = successfulData.transcript;
      if (cleanTranscript.startsWith('```') && cleanTranscript.endsWith('```')) {
        cleanTranscript = cleanTranscript.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
      }
      return Response.json({ transcript: cleanTranscript });
    }

    if (lastGeminiResponse && !lastGeminiResponse.ok) {
      const status = lastGeminiResponse.status;
      return Response.json(
        {
          error:
            status === 429
              ? 'تم الوصول إلى الحد المؤقت للاستخدام. انتظر قليلًا ثم أعد المحاولة.'
              : 'تعذر الاتصال بخدمة التحويل مؤقتًا.'
        },
        { status: status >= 400 && status < 600 ? status : 502 }
      );
    }

    return Response.json(
      { error: 'لم يتم استخراج نص من الملف الصوتي.' },
      { status: 502 }
    );
  } catch (error) {
    console.error('Cloudflare transcription error:', error);

    return Response.json(
      { error: 'حدث خطأ مؤقت أثناء التحويل. يرجى إعادة المحاولة.' },
      { status: 500 }
    );
  }
};
