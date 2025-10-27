
import React, { useState, useCallback } from 'react';
import { generateVideoPrompts } from '../services/geminiService';
import type { VideoPrompt } from '../types';
import { Spinner } from './Spinner';
import { SparklesIcon, VideoCameraIcon, ClipboardIcon, CheckIcon, PhotoIcon } from './Icons';

interface VideoPromptGeneratorProps {
  quote: string;
  image?: string;
}

export const VideoPromptGenerator: React.FC<VideoPromptGeneratorProps> = ({ quote, image }) => {
  const [prompts, setPrompts] = useState<VideoPrompt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePrompts = useCallback(async () => {
    if (!quote || !image) return;
    setIsLoading(true);
    setError(null);
    setPrompts([]);
    try {
      const newPrompts = await generateVideoPrompts(quote, image);
      setPrompts(newPrompts);
    } catch (err) {
      setError('Failed to generate video prompts. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [quote, image]);

  if (!quote || !image) {
    return (
      <div className="text-center text-gray-400 p-8 bg-gray-700/50 rounded-lg">
        <VideoCameraIcon className="h-12 w-12 mx-auto text-gray-500" />
        <p className="mt-4 text-lg font-semibold">Please generate content and an image first.</p>
        <p className="text-gray-500">Go to the "Content Generator" tab to create a quote and a corresponding image. They will be used here to craft a contextual video narrative.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Generate Video Action Prompts</h2>
        <p className="text-gray-400 mb-4">
          Using the generated quote and image, create a series of 3 detailed prompts for a text-to-video model like VEO.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 bg-gray-700/50 p-4 rounded-lg mb-4">
            <div className="flex-shrink-0">
                <p className="font-semibold text-gray-300 mb-2">Context Image:</p>
                <img src={image} alt="Context for video prompt" className="w-24 h-24 rounded-md object-cover"/>
            </div>
            <div>
                <p className="font-semibold text-gray-300 mb-2">Context Quote/Tip:</p>
                <p className="text-md italic text-gray-300">"{quote}"</p>
            </div>
        </div>
        <button
          onClick={handleGeneratePrompts}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
        >
          {isLoading ? <Spinner /> : <><SparklesIcon className="h-5 w-5 mr-2" /> Generate Prompts</>}
        </button>
      </div>
      
      {error && <p className="text-red-400 text-center">{error}</p>}

      {isLoading && (
         <div className="text-center text-gray-400 p-8">
            <Spinner size="large" />
            <p className="mt-4">Gemini is crafting your video prompts...</p>
          </div>
      )}

      {prompts.length > 0 && (
        <div className="space-y-8">
            {prompts.map((prompt, index) => (
                <PromptCard key={index} prompt={prompt} index={index} />
            ))}
        </div>
      )}
    </div>
  );
};

interface PromptCardProps {
    prompt: VideoPrompt;
    index: number;
}
const PromptCard: React.FC<PromptCardProps> = ({ prompt, index }) => {
    const [copied, setCopied] = useState(false);
    const promptJsonString = JSON.stringify(prompt, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(promptJsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-700/50 rounded-lg p-6 relative border border-gray-600/50">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-sm font-semibold bg-indigo-500/50 text-indigo-200 px-3 py-1 rounded-full">Prompt {index + 1}</span>
                    <h3 className="text-xl font-bold text-gray-100 mt-2">{prompt.sceneTitle}</h3>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-semibold text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-indigo-500"
                    aria-label="Copy prompt JSON to clipboard"
                >
                    {copied ? <CheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}
                    <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <PromptDetail label="Action" value={prompt.action} highlight />
                <PromptDetail label="Dialog" value={`"${prompt.dialog}"`} highlight />
                
                <div className="md:col-span-2">
                     <PromptDetail label="Text Overlay" value={`"${prompt.textOverlay.content}" (${prompt.textOverlay.style}, ${prompt.textOverlay.transition})`} />
                </div>
               
                <div>
                    <h4 className="font-semibold text-gray-300 mb-1 text-base">Camera</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 pl-1">
                        <li><strong>Movement:</strong> {prompt.camera.movement}</li>
                        <li><strong>Angle:</strong> {prompt.camera.angle}</li>
                        <li><strong>Lighting:</strong> {prompt.camera.lighting}</li>
                    </ul>
                </div>
                
                 <div>
                    <h4 className="font-semibold text-gray-300 mb-1 text-base">Setting</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 pl-1">
                        <li><strong>Location:</strong> {prompt.setting.location}</li>
                        <li><strong>Weather:</strong> {prompt.setting.weather}</li>
                        <li><strong>Props:</strong> {prompt.setting.props.join(', ')}</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-300 mb-1 text-base">Audio</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 pl-1">
                        <li><strong>Music:</strong> {prompt.audio.music}</li>
                        <li><strong>SFX:</strong> {prompt.audio.sfx}</li>
                    </ul>
                </div>

                 <div>
                    <h4 className="font-semibold text-gray-300 mb-1 text-base">Visuals</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 pl-1">
                         <li><strong>Mood:</strong> {prompt.mood}</li>
                         <li><strong>Cues:</strong> {prompt.visualCues}</li>
                         <li><strong>Duration:</strong> {prompt.duration}</li>
                    </ul>
                </div>

            </div>
        </div>
    )
}

const PromptDetail: React.FC<{label: string, value: string, highlight?: boolean}> = ({ label, value, highlight }) => (
    <div>
        <h4 className="font-semibold text-gray-300 text-base">{label}</h4>
        <p className={highlight ? "text-teal-300" : "text-gray-400"}>{value}</p>
    </div>
)
