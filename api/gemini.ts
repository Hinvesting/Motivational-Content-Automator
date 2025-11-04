import { GoogleGenAI, Modality, Type } from "@google/genai";
import { marked } from 'marked';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VideoPrompt, Strategy } from '../src/types';

// This function runs on the server, so we can securely use process.env
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set in Vercel.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// This is the main handler for all requests to /api/gemini
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, payload } = req.body;

    switch (action) {
      case 'generateContent':
        const content = await generateContent(payload.type);
        return res.status(200).json(content);
      
      case 'generateImageWithQuote':
        const images = await generateImageWithQuote(payload.quote, payload.aspectRatio);
        return res.status(200).json(images);

      case 'editImage':
        const editedImage = await editImage(payload.base64Image, payload.prompt);
        return res.status(200).json(editedImage);
      
      case 'generateVideoPrompts':
        const prompts = await generateVideoPrompts(payload.quote, payload.imageBase64);
        return res.status(200).json(prompts);

      case 'generateStoryElements':
        const storyElements = await generateStoryElements(payload.topic, payload.numScenes, payload.style, payload.characterGender, payload.hasCharacterImage);
        return res.status(200).json(storyElements);
      
      case 'generateImageForScene':
        const sceneImage = await generateImageForScene(payload.visualsPrompt, payload.aspectRatio, payload.characterImage);
        return res.status(200).json(sceneImage);
        
      case 'getAutomationStrategies':
        const strategies = await getAutomationStrategies();
        return res.status(200).json(strategies);

      default:
        return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error: any) {
    console.error("Error in serverless function:", error);
    return res.status(500).json({ error: 'An internal server error occurred.', details: error.message });
  }
}


// --- All your original geminiService functions are now here, on the server ---

const generateContent = async (type: 'quote' | 'tip' = 'quote'): Promise<string> => {
    const prompt = type === 'quote'
      ? "Generate a short, motivational financial quote. It should be inspiring, concise, and easy to understand. Do not include author attribution."
      : "Generate a short, actionable financial tip of the day. It should be practical, easy to understand, and provide a clear piece of advice. Do not include author attribution.";
      
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim().replace(/"/g, '');
};

const generateImageWithQuote = async (quote: string, aspectRatio: string = '1:1'): Promise<{ withOverlay: string, withoutOverlay: string }> => {
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

    if (!withoutOverlay) throw new Error("Failed to generate the base image.");
    
    const overlayResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: baseImageData, mimeType: baseMimeType } },
                { text: `Overlay the following content on the image in an elegant, readable, and stylish script font: "${quote}". The text should be well-integrated into the image composition, perhaps with a subtle background blur or color grading to ensure legibility. The overall mood should be optimistic and inspiring.` },
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

    if (!withOverlay) throw new Error("Failed to add overlay to the image.");

    return { withOverlay, withoutOverlay };
};

const editImage = async (base64Image: string, prompt: string): Promise<string> => {
    const mimeType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
    const imageData = base64Image.split(',')[1];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }
    throw new Error("No edited image data found in response.");
};


const generateVideoPrompts = async (quote: string, imageBase64?: string): Promise<VideoPrompt[]> => {
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

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
};


const generateStoryElements = async (
  topic: string, numScenes: number, style: string, characterGender: 'male' | 'female', hasCharacterImage: boolean
) => {
    const characterInfo = `The main character is ${characterGender}. ${hasCharacterImage ? 'The character should be consistent with the user-provided reference image.' : ''}`;
    const styleInfo = style ? `*   **Story Style/Genre:** ${style}` : '*   **Story Style/Genre:** To be determined by the AI based on the story idea.';
    const prompt = `You are an expert screenwriter and cinematic storyteller. Your task is to generate a complete cinematic storyboard.

**Core Details:**
*   **Story Idea:** "${topic}"
${styleInfo}
*   **Main Character:** ${characterInfo}

**Your Task:**
Generate a response as a single, valid JSON object with two top-level keys: "thumbnailPrompt" and "scenes".
1.  **thumbnailPrompt**: A string containing a detailed, vivid prompt for generating a movie-poster-style thumbnail image for this story. It should capture the essence of the story's style and topic.
2.  **scenes**: An array of exactly **${numScenes}** scene objects that tell a complete, cohesive story from beginning to end.

Each scene object in the 'scenes' array must have the following structure:
*   **description**: A one-sentence summary of what happens in this scene.
*   **visuals**: A detailed prompt for an image generator. Describe the setting, camera work (movement, angle), lighting, and key actions. Be vivid and specific. If a character reference is used, ensure the description matches.
*   **dialogue**: The dialogue or narration for this scene. Use "N/A" if there is no dialogue.
*   **sound**: Describe the background music, foley, and any important sound effects.

The story must be compelling, logical, and respect all the core details provided.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thumbnailPrompt: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  visuals: { type: Type.STRING },
                  dialogue: { type: Type.STRING },
                  sound: { type: Type.STRING },
                },
                required: ['description', 'visuals', 'dialogue', 'sound']
              }
            }
          },
          required: ['thumbnailPrompt', 'scenes']
        }
      }
    });
    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return { thumbnailPrompt: result.thumbnailPrompt, scenes: result.scenes };
};


const generateImageForScene = async (
  visualsPrompt: string, aspectRatio: string, characterImage?: string | null
): Promise<string> => {
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    let textPrompt = `Generate a high-quality, cinematic image with an aspect ratio of ${aspectRatio}. The scene should be: "${visualsPrompt}".`;

    if (characterImage) {
      const mimeType = characterImage.substring(characterImage.indexOf(":") + 1, characterImage.indexOf(";"));
      const imageData = characterImage.split(',')[1];
      parts.push({ inlineData: { mimeType: mimeType, data: imageData } });
      textPrompt += " The main character in the generated image should be consistent with the reference image provided.";
    }
    
    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in the response.");
};

const getAutomationStrategies = async () => {
    const prompt = `You are an expert in content creation workflows. Generate a list of 4 creative automation strategies for a 'Motivational Content Automator' application. The application already generates quotes, creates images with text overlays, edits images, and generates video prompts.

For each strategy, provide a 'title' and a 'description'. The description should be a concise explanation of the strategy, formatted as markdown (e.g., use bullet points with *).

Return your response as a valid JSON array of objects. Each object must follow this exact structure:
{
  "title": "A short, catchy title for the strategy",
  "description": "A markdown-formatted description of the strategy."
}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['title', 'description'],
          },
        },
      },
    });
    const jsonString = response.text.trim();
    const strategies: { title: string; description: string }[] = JSON.parse(jsonString);
    return strategies.map(strategy => ({
      ...strategy,
      description: marked(strategy.description) as string,
    }));
};
