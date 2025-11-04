
import type { VideoPrompt, SceneCard, Strategy, ThumbnailData } from '../types';

// This is a helper function to call our new serverless API endpoint
async function callApi<T>(action: string, payload: unknown): Promise<T> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.details || errorData.error || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling API for action "${action}":`, error);
    // Re-throw the error to be caught by the component
    throw error;
  }
}

// --- All functions are now simple wrappers around our API helper ---

export const generateContent = (type: 'quote' | 'tip' = 'quote'): Promise<string> => {
  return callApi('generateContent', { type });
};

export const generateImageWithQuote = (quote: string, aspectRatio: string = '1:1'): Promise<{ withOverlay: string, withoutOverlay: string }> => {
  return callApi('generateImageWithQuote', { quote, aspectRatio });
};

export const editImage = (base64Image: string, prompt: string): Promise<string> => {
  return callApi('editImage', { base64Image, prompt });
};

export const generateVideoPrompts = (quote: string, imageBase64?: string): Promise<VideoPrompt[]> => {
  return callApi('generateVideoPrompts', { quote, imageBase64 });
};

export const generateStoryElements = (
  topic: string,
  numScenes: number,
  style: string,
  characterGender: 'male' | 'female',
  hasCharacterImage: boolean,
): Promise<{ thumbnailPrompt: string, scenes: Omit<SceneCard, 'sceneNumber'>[] }> => {
  return callApi('generateStoryElements', { topic, numScenes, style, characterGender, hasCharacterImage });
};

export const generateImageForScene = (
  visualsPrompt: string, 
  aspectRatio: string, 
  characterImage?: string | null
): Promise<string> => {
  return callApi('generateImageForScene', { visualsPrompt, aspectRatio, characterImage });
};

export const getAutomationStrategies = (): Promise<Strategy[]> => {
  return callApi('getAutomationStrategies', {});
};