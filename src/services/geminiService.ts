import type { VideoPrompt, SceneCard, Strategy } from '../types';

// This client service now proxies requests to the serverless /api/gemini endpoint
// so the real GenAI API key remains server-side.
const postToServer = async (action: string, payload: any) => {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`/api/gemini ${action} failed:`, res.status, body);
    throw new Error(`Server error (${res.status}) when calling /api/gemini/${action}`);
  }

  const json = await res.json();
  if (json?.error) throw new Error(json.error);
  return json;
};

export const generateContent = async (type: 'quote' | 'tip' = 'quote'): Promise<string> => {
  try {
    const result = await postToServer('generateContent', { type });
    return (result.text || '').trim();
  } catch (err) {
    console.error('generateContent error:', err);
    throw err;
  }
};

export const generateImageWithQuote = async (quote: string, aspectRatio: string = '1:1'): Promise<{ withOverlay: string, withoutOverlay: string }> => {
  try {
    const result = await postToServer('generateImageWithQuote', { quote, aspectRatio });
    return { withOverlay: result.withOverlay, withoutOverlay: result.withoutOverlay };
  } catch (err) {
    console.error('generateImageWithQuote error:', err);
    throw err;
  }
};

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const result = await postToServer('editImage', { base64Image, prompt });
    return result.edited;
  } catch (err) {
    console.error('editImage error:', err);
    throw err;
  }
};

export const generateVideoPrompts = async (quote: string, imageBase64?: string): Promise<VideoPrompt[]> => {
  try {
    const result = await postToServer('generateVideoPrompts', { quote, imageBase64 });
    return result.prompts as VideoPrompt[];
  } catch (err) {
    console.error('generateVideoPrompts error:', err);
    throw err;
  }
};

export const generateStoryElements = async (
  topic: string,
  numScenes: number,
  style: string,
  characterGender: 'male' | 'female',
  hasCharacterImage: boolean,
): Promise<{ thumbnailPrompt: string, scenes: Omit<SceneCard, 'sceneNumber'>[] }> => {
  try {
    const result = await postToServer('generateStoryElements', { topic, numScenes, style, characterGender, hasCharacterImage });
    return { thumbnailPrompt: result.thumbnailPrompt, scenes: result.scenes };
  } catch (err) {
    console.error('generateStoryElements error:', err);
    throw err;
  }
};

export const generateImageForScene = async (
  visualsPrompt: string,
  aspectRatio: string,
  characterImage?: string | null,
): Promise<string> => {
  try {
    const result = await postToServer('generateImageForScene', { visualsPrompt, aspectRatio, characterImage });
    return result.image as string;
  } catch (err) {
    console.error('generateImageForScene error:', err);
    throw err;
  }
};

export const getAutomationStrategies = async (): Promise<Strategy[]> => {
  try {
    const result = await postToServer('getAutomationStrategies', {});
    return result.strategies as Strategy[];
  } catch (err) {
    console.error('getAutomationStrategies error:', err);
    throw err;
  }
};

