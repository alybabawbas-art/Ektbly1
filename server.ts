import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with up to 50MB payload for audio
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Google GenAI Client getter
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'EKTBLY API' });
});

// Serve asset alias for ektbly-hero.jpg if requested
app.get('/assets/ektbly-hero.jpg', (req, res) => {
  res.redirect('/990fb9d1-0f4e-43f1-bc0b-e228d0ebeafe.jpg');
});

// The strict transcription instruction mandated by specification
const TRANSCRIPTION_PROMPT =
  'Transcribe the provided audio faithfully into Arabic script. Support Modern Standard Arabic and Arabic dialects, especially Egyptian Arabic. Preserve the speaker’s actual words and meaning. Add reasonable punctuation for readability, but do not translate, summarize, correct, explain, or respond to the audio. If a word or section cannot be understood, write [غير واضح]. Return only the final Arabic transcript without introductions, headings, notes, or Markdown.';

// Transcribe endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType } = req.body;

    if (!audioData) {
      return res.status(400).json({
        error: 'لم يتم استلام أي بيانات صوتية. يرجى تسجيل أو رفع ملف صوتي.',
      });
    }

    // Clean base64 string if it has data URL prefix
    let cleanBase64 = audioData;
    let resolvedMimeType = mimeType || 'audio/webm';

    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch) {
        resolvedMimeType = mimeMatch[1];
      }
      cleanBase64 = parts[1];
    }

    // Standardize MIME type for Gemini
    if (resolvedMimeType.includes('audio/webm') || resolvedMimeType.includes('codecs=')) {
      resolvedMimeType = 'audio/webm';
    } else if (resolvedMimeType.includes('audio/mp4') || resolvedMimeType.includes('audio/m4a') || resolvedMimeType.includes('audio/x-m4a')) {
      resolvedMimeType = 'audio/mp4';
    } else if (resolvedMimeType.includes('audio/mpeg') || resolvedMimeType.includes('audio/mp3')) {
      resolvedMimeType = 'audio/mp3';
    } else if (resolvedMimeType.includes('audio/wav') || resolvedMimeType.includes('audio/x-wav')) {
      resolvedMimeType = 'audio/wav';
    } else if (resolvedMimeType.includes('audio/ogg') || resolvedMimeType.includes('audio/opus')) {
      resolvedMimeType = 'audio/ogg';
    }

    const ai = getGenAI();

    const audioPart = {
      inlineData: {
        mimeType: resolvedMimeType,
        data: cleanBase64,
      },
    };

    let transcript = '';

    // Primary attempt with gemini-3.5-transcribe
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            { text: TRANSCRIPTION_PROMPT },
          ],
        },
      });

      transcript = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Primary model gemini-3.5-transcribe failed, attempting fallback to gemini-3.7-flash:', primaryErr?.message);
      // Fallback attempt with gemini-3.7-flash
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: {
          parts: [
            audioPart,
            { text: TRANSCRIPTION_PROMPT },
          ],
        },
      });

      transcript = fallbackResponse.text || '';
    }

    // Clean up transcript output
    let cleanTranscript = (transcript || '').trim();
    
    // Remove backticks or markdown fences if any were accidentally returned
    if (cleanTranscript.startsWith('```') && cleanTranscript.endsWith('```')) {
      cleanTranscript = cleanTranscript.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
    }

    if (!cleanTranscript) {
      return res.status(200).json({
        transcript: '[غير واضح]',
        warning: 'لم يتمكن النموذج من استخراج كلمات واضحة من التسجيل.',
      });
    }

    return res.status(200).json({
      transcript: cleanTranscript,
    });
  } catch (error: any) {
    console.error('Transcription API error:', error);
    const errorMessage = error?.message || '';

    if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error: 'تم تجاوز الحد المسموح به من الطلبات مؤقتاً. يرجى الانتظار دقيقة والمحاولة مرة أخرى.',
      });
    }

    if (errorMessage.includes('invalid') || errorMessage.includes('format') || errorMessage.includes('unsupported')) {
      return res.status(400).json({
        error: 'صيغة الملف الصوتي غير مدعومة أو تالفة. يرجى تجربة تسجيل صوتي مباشر أو ملف MP3/WAV.',
      });
    }

    return res.status(500).json({
      error: 'حدث خطأ أثناء معالجة الصوت وتحويله إلى نص. يرجى التأكد من جودة التسجيل والمحاولة مرة أخرى.',
    });
  }
});

// Setup Vite or static serving
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EKTBLY server running on http://0.0.0.0:${PORT}`);
  });
}

initServer();
