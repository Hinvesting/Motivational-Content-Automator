
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Strategy, VideoPrompt } from '../types';
import { marked } from 'marked';

// IMPORTANT: Do not expose this key in a production environment.
// This key should be sourced from a secure environment variable.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateContent = async (type: 'quote' | 'tip' = 'quote'): Promise<string> => {
  try {
    const prompt = type === 'quote'
      ? "Generate a short, motivational financial quote. It should be inspiring, concise, and easy to understand. Do not include author attribution."
      : "Generate a short, actionable financial tip of the day. It should be practical, easy to understand, and provide a clear piece of advice. Do not include author attribution.";
      
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim().replace(/"/g, ''); // Clean up quotes
  } catch (error) {
    console.error(`Error generating ${type}:`, error);
    throw new Error(`Failed to communicate with Gemini API for ${type} generation.`);
  }
};

export const generateImageWithQuote = async (quote: string, aspectRatio: string = '1:1'): Promise<{ withOverlay: string, withoutOverlay: string }> => {
  try {
    // Step 1: Generate the base image without text
    const baseImageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a high-quality, visually appealing stock photo with an aspect ratio of ${aspectRatio} that represents the theme of: "${quote}". The image should be optimistic and inspiring. CRITICALLY IMPORTANT: Do NOT include any text, letters, or words on the image itself.`,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    let withoutOverlay = '';
    let baseMimeType = '';
    let baseImageData = '';

    for (const part of baseImageResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        baseImageData = part.inlineData.data;
        baseMimeType = part.inlineData.mimeType;
        withoutOverlay = `data:${baseMimeType};base64,${baseImageData}`;
        break;
      }
    }

    if (!withoutOverlay) {
        throw new Error("Failed to generate the base image.");
    }
    
    // Step 2: Add text overlay to the base image
    const overlayResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: baseImageData,
                        mimeType: baseMimeType,
                    },
                },
                {
                    text: `Overlay the following content on the image in an elegant, readable, and stylish script font: "${quote}". The text should be well-integrated into the image composition, perhaps with a subtle background blur or color grading to ensure legibility. The overall mood should be optimistic and inspiring.`,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    let withOverlay = '';
    for (const part of overlayResponse.candidates[0].content.parts) {
        if (part.inlineData) {
            withOverlay = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
        }
    }

    if (!withOverlay) {
        throw new Error("Failed to add overlay to the image.");
    }

    return { withOverlay, withoutOverlay };

  } catch (error) {
    console.error("Error generating image with quote:", error);
    throw new Error("Failed to communicate with Gemini API for image generation.");
  }
};


export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
    try {
        const mimeType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
        const imageData = base64Image.split(',')[1];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No edited image data found in response.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to communicate with Gemini API for image editing.");
    }
};

export const getAutomationStrategies = async (): Promise<Strategy[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Based on a workflow that generates a financial quote, overlays it on a relevant image, and saves it to Google Drive, describe 3 distinct strategies to fully automate this process. The strategies MUST use only free tools, software, or custom-built solutions with generous free tiers. For each strategy, provide a title and a detailed description. Format the output as a valid JSON array of objects, where each object has "title" and "description" keys. The description should be a string containing markdown for formatting (e.g., using ### for subheadings, * for italics, and - for bullet points).`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING }
                        },
                         required: ['title', 'description']
                    }
                }
            }
        });

        const jsonString = response.text;
        const strategies: Strategy[] = JSON.parse(jsonString);

        // Parse markdown in descriptions to HTML
        return strategies.map(strategy => ({
            ...strategy,
            description: marked(strategy.description) as string,
        }));
    } catch (error) {
        console.error("Error getting automation strategies:", error);
        throw new Error("Failed to communicate with Gemini API for strategies.");
    }
};

export const generateVideoPrompts = async (quote: string, imageBase64?: string): Promise<VideoPrompt[]> => {
  try {
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    let instruction = '';

    if (imageBase64) {
      const mimeType = imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"));
      const imageData = imageBase64.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageData,
        },
      });
      instruction = `You are an expert prompt engineer for generative video models like Google's VEO. Your task is to create a sequence of three detailed and concise action prompts.

First, analyze the provided image. Then, create the video prompts as a narrative continuation of the scene depicted in the image, using the theme from the provided quote. Each prompt should describe an 8-second video clip that builds upon the previous one, creating a continuous story. The final video should be inspiring and visually stunning.

The quote is: "${quote}"

Adhere to the best practices from the VEO 3 Prompt Guide. Be highly specific about camera movement, angles, lighting, setting, props, actions, mood, dialog, and visual cues.
`;
    } else {
      instruction = `You are an expert prompt engineer for generative video models like Google's VEO. Your task is to create a sequence of three detailed and concise action prompts based on a given motivational quote. Each prompt should describe an 8-second video clip that builds upon the previous one, creating a continuous narrative. The final video should be inspiring and visually stunning.

The quote is: "${quote}"

Adhere to the best practices from the VEO 3 Prompt Guide. Be highly specific about camera movement, angles, lighting, setting, props, actions, mood, dialog, and visual cues.
`;
    }

    parts.push({ text: `${instruction}
Return your response as a valid JSON array containing three objects. Each object must follow this exact structure:
{
  "sceneTitle": "A descriptive title for the scene",
  "duration": "8s",
  "dialog": "A concise and necessary line of spoken dialog for the scene.",
  "camera": {
    "movement": "e.g., slow dolly-in, crane shot up",
    "angle": "e.g., eye-level, low-angle shot",
    "lighting": "e.g., golden hour sunlight, dramatic neon glow"
  },
  "setting": {
    "location": "e.g., modern balcony, misty forest",
    "props": ["list", "of", "props"],
    "weather": "e.g., clear and warm, light rain"
  },
  "action": "A clear description of the primary action in the scene.",
  "visualCues": "e.g., lens flare, cinematic depth of field, slow motion",
  "textOverlay": {
    "content": "A part of the quote or related text.",
    "style": "e.g., elegant cursive, bold sans-serif",
    "transition": "e.g., fade-in, slide from left"
  },
  "mood": "The emotional tone of the scene.",
  "audio": {
    "music": "A description of the background music.",
    "sfx": "Key sound effects."
  }
}
Ensure the 'textOverlay.content' for the three prompts, when combined, forms the full original quote or a cohesive message derived from it. The entire output must be a single JSON array.` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneTitle: { type: Type.STRING },
              duration: { type: Type.STRING },
              dialog: { type: Type.STRING },
              camera: {
                type: Type.OBJECT,
                properties: {
                  movement: { type: Type.STRING },
                  angle: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                },
                required: ['movement', 'angle', 'lighting'],
              },
              setting: {
                type: Type.OBJECT,
                properties: {
                  location: { type: Type.STRING },
                  props: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weather: { type: Type.STRING },
                },
                required: ['location', 'props', 'weather'],
              },
              action: { type: Type.STRING },
              visualCues: { type: Type.STRING },
              textOverlay: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  style: { type: Type.STRING },
                  transition: { type: Type.STRING },
                },
                required: ['content', 'style', 'transition'],
              },
              mood: { type: Type.STRING },
              audio: {
                type: Type.OBJECT,
                properties: {
                  music: { type: Type.STRING },
                  sfx: { type: Type.STRING },
                },
                required: ['music', 'sfx'],
              },
            },
            required: ['sceneTitle', 'duration', 'dialog', 'camera', 'setting', 'action', 'visualCues', 'textOverlay', 'mood', 'audio'],
          }
        }
      }
    });

    const jsonString = response.text;
    const prompts: VideoPrompt[] = JSON.parse(jsonString);
    return prompts;

  } catch (error) {
    console.error("Error getting video prompts:", error);
    throw new Error("Failed to communicate with Gemini API for video prompts.");
  }
};
