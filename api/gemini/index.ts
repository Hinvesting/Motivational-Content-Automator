import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality, Type } from '@google/genai';

// Serverless handler for Vercel. Reads secret from process.env.GENAI_API_KEY
const apiKey = process.env.GENAI_API_KEY;
if (!apiKey) {
  // We throw at runtime to fail fast on deployment if not configured.
  // For local dev, the user should set GENAI_API_KEY in a .env file.
  console.warn('GENAI_API_KEY is not set. The /api/gemini endpoints will fail without it.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const jsonResponse = (res: VercelResponse, status: number, payload: any) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  const { action, payload } = req.body || {};
  if (!action) return jsonResponse(res, 400, { error: 'Missing action in request body' });

  if (!ai) return jsonResponse(res, 500, { error: 'Server misconfigured: GENAI_API_KEY is not set' });

  try {
    switch (action) {
      case 'generateContent': {
        const { type = 'quote' } = payload || {};
        const prompt = type === 'quote'
          ? 'Generate a short, motivational financial quote. It should be inspiring, concise, and easy to understand. Do not include author attribution.'
          : 'Generate a short, actionable financial tip of the day. It should be practical, easy to understand, and provide a clear piece of advice. Do not include author attribution.';

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return jsonResponse(res, 200, { text: response.text });
      }

      case 'generateImageWithQuote': {
        const { quote, aspectRatio = '1:1' } = payload || {};
        if (!quote) return jsonResponse(res, 400, { error: 'Missing quote in payload' });

        // Generate base image
        const baseImageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                text: `Generate a high-quality, visually appealing stock photo with an aspect ratio of ${aspectRatio} that represents the theme of: "${quote}". The image should be optimistic and inspiring. CRITICALLY IMPORTANT: Do NOT include any text, letters, or words on the image itself.`,
              },
            ],
          },
          config: { responseModalities: [Modality.IMAGE] },
        });

        let withoutOverlay = '';
        let baseMimeType = '';
        let baseImageData = '';

        for (const part of baseImageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            baseImageData = part.inlineData.data || '';
            baseMimeType = part.inlineData.mimeType || 'image/png';
            withoutOverlay = `data:${baseMimeType};base64,${baseImageData}`;
            break;
          }
        }

        if (!withoutOverlay) return jsonResponse(res, 500, { error: 'Failed to generate base image' });

        // Add overlay
        const overlayResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: baseImageData, mimeType: baseMimeType } },
              { text: `Overlay the following content on the image in an elegant, readable, and stylish script font: "${quote}".` },
            ],
          },
          config: { responseModalities: [Modality.IMAGE] },
        });

        let withOverlay = '';
        for (const part of overlayResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            withOverlay = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (!withOverlay) return jsonResponse(res, 500, { error: 'Failed to add overlay to image' });

        return jsonResponse(res, 200, { withOverlay, withoutOverlay });
      }

      case 'editImage': {
        const { base64Image, prompt: editPrompt } = payload || {};
        if (!base64Image || !editPrompt) return jsonResponse(res, 400, { error: 'Missing base64Image or prompt' });

        const mimeType = base64Image.substring(base64Image.indexOf(':') + 1, base64Image.indexOf(';'));
        const imageData = base64Image.split(',')[1];

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: imageData, mimeType } },
              { text: editPrompt },
            ],
          },
          config: { responseModalities: [Modality.IMAGE] },
        });

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return jsonResponse(res, 200, { edited: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
          }
        }

        return jsonResponse(res, 500, { error: 'No edited image returned' });
      }

      case 'generateVideoPrompts': {
        const { quote, imageBase64 } = payload || {};
        if (!quote) return jsonResponse(res, 400, { error: 'Missing quote' });

        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
        let instruction = '';
        if (imageBase64) {
          const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
          const imageData = imageBase64.split(',')[1];
          parts.push({ inlineData: { mimeType, data: imageData } });
          instruction = `You are an expert prompt engineer... The quote is: "${quote}"`;
        } else {
          instruction = `You are an expert prompt engineer... The quote is: "${quote}"`;
        }

        parts.push({ text: instruction + '\nReturn your response as a valid JSON array containing three objects.' });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: { parts },
          config: { responseMimeType: 'application/json' },
        });

        const jsonString = response.text?.trim() || '';
        try {
          const prompts = JSON.parse(jsonString);
          return jsonResponse(res, 200, { prompts });
        } catch (err) {
          return jsonResponse(res, 500, { error: 'Invalid JSON returned from model', raw: jsonString });
        }
      }

      case 'generateStoryElements': {
        const { topic, numScenes, style, characterGender, hasCharacterImage } = payload || {};
        if (!topic) return jsonResponse(res, 400, { error: 'Missing topic' });

        const prompt = `You are an expert screenwriter. Story idea: "${topic}"`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt, config: { responseMimeType: 'application/json' } });
        const jsonString = response.text?.trim() || '';
        try {
          const result = JSON.parse(jsonString);
          return jsonResponse(res, 200, { ...result });
        } catch (err) {
          return jsonResponse(res, 500, { error: 'Invalid JSON returned from model', raw: jsonString });
        }
      }

      case 'getAutomationStrategies': {
        const prompt = `Generate a list of 4 creative automation strategies for a 'Motivational Content Automator' application.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt, config: { responseMimeType: 'application/json' } });
        const jsonString = response.text?.trim() || '';
        try {
          const strategies = JSON.parse(jsonString);
          return jsonResponse(res, 200, { strategies });
        } catch (err) {
          return jsonResponse(res, 500, { error: 'Invalid JSON returned from model', raw: jsonString });
        }
      }

      default:
        return jsonResponse(res, 400, { error: `Unknown action: ${action}` });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini:', error);
    return jsonResponse(res, 500, { error: error?.message || String(error) });
  }
}
