import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateStoryElements, generateImageForScene } from '../services/geminiService';
import type { SceneCard, ThumbnailData } from '../types';
import { Spinner } from './Spinner';
import { SparklesIcon, FilmIcon, TagIcon, UserCircleIcon, ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from './Icons';
import { fileToBase64 } from '../utils/fileUtils';

type Duration = 60 | 90 | 120 | 300;
type CharacterGender = 'male' | 'female';

const storyStyles = ['Drama', 'Gritty', 'Inspirational', 'Action', 'Romance', 'Sci-Fi', 'Urban Drama', 'Historic', 'Comedy', 'Thriller'];
const aspectRatios = ["16:9", "1:1", "9:16", "4:3", "3:4"];
const sceneCounts: Record<Duration, number> = { 60: 5, 90: 7, 120: 10, 300: 20 };

export const StoryBoardGenerator: React.FC = () => {
  // Form State
  const [topic, setTopic] = useState<string>('');
  const [duration, setDuration] = useState<Duration>(60);
  const [storyStyle, setStoryStyle] = useState<string>(storyStyles[0]);
  const [characterGender, setCharacterGender] = useState<CharacterGender>('female');
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>(aspectRatios[0]);

  // Generation State
  const [scenes, setScenes] = useState<SceneCard[]>([]);
  const [thumbnail, setThumbnail] = useState<ThumbnailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setCharacterImage(base64);
      } catch (err) {
        setError("Failed to read the image file.");
        console.error(err);
      }
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!topic) {
      setError('Please enter a topic or story idea.');
      return;
    }
    setIsLoading(true);
    setScenes([]);
    setThumbnail(null);
    setError(null);
    setGenerationStatus('Crafting your story outline...');

    try {
      const numScenes = sceneCounts[duration];
      const { thumbnailPrompt, scenes: fetchedScenes } = await generateStoryElements(
        topic,
        duration,
        numScenes,
        storyStyle,
        characterGender,
        !!characterImage
      );

      setThumbnail({ prompt: thumbnailPrompt });
      
      // Reveal scenes one by one for a better UX
      for (let i = 0; i < fetchedScenes.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Short delay
          setGenerationStatus(`Revealing Scene ${i + 1} of ${numScenes}...`);
          setScenes(prev => [...prev, { ...fetchedScenes[i], sceneNumber: i + 1 }]);
      }

    } catch (err) {
      const errorMessage = `Failed to generate story. Please try again.`;
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
      setGenerationStatus('');
    }
  }, [topic, duration, storyStyle, characterGender, characterImage]);

  const handleGenerateImage = useCallback(async (
    type: 'thumbnail' | 'scene', 
    prompt: string, 
    sceneNumber?: number
  ) => {
    if (type === 'thumbnail') {
      setThumbnail(prev => prev ? { ...prev, isGeneratingImage: true } : null);
    } else if (sceneNumber) {
      setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, isGeneratingImage: true } : s));
    }

    try {
      const imageUrl = await generateImageForScene(prompt, aspectRatio, characterImage);
      if (type === 'thumbnail') {
        setThumbnail(prev => prev ? { ...prev, imageUrl, isGeneratingImage: false } : null);
      } else if (sceneNumber) {
        setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, imageUrl, isGeneratingImage: false } : s));
      }
    } catch (err) {
      setError(`Failed to generate image for ${type} ${sceneNumber || ''}.`);
      console.error(err);
      if (type === 'thumbnail') {
        setThumbnail(prev => prev ? { ...prev, isGeneratingImage: false } : null);
      } else if (sceneNumber) {
        setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, isGeneratingImage: false } : s));
      }
    }
  }, [aspectRatio, characterImage]);


  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-100 mb-2">Cinematic Story Generator</h2>
        <p className="text-gray-400 max-w-3xl">
          Bring your ideas to life. Enter a topic, customize your character and style, and Gemini will craft a scene-by-scene storyboard, ready for visual generation.
        </p>
      </div>

      <div className="p-6 bg-gray-700/50 rounded-lg border border-gray-600/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          {/* Column 1 */}
          <div className="space-y-6">
             <div>
                <label htmlFor="story-topic" className="block text-sm font-medium text-gray-300 mb-2">Story Idea or Topic</label>
                <input
                    type="text"
                    id="story-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., A lost astronaut finds a mysterious artifact"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Story Style</label>
                <div className="relative">
                    <TagIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <select value={storyStyle} onChange={e => setStoryStyle(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                        {storyStyles.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Duration</label>
                <div className="flex bg-gray-700/80 p-1 rounded-lg">
                    {(Object.keys(sceneCounts) as unknown as Duration[]).map(d => (
                        <button key={d} onClick={() => setDuration(d)} className={`w-1/4 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${duration === d ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>
                            {d}s
                        </button>
                    ))}
                </div>
            </div>
          </div>
          {/* Column 2 */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Main Character</label>
                     <div className="flex bg-gray-700/80 p-1 rounded-lg">
                        <button onClick={() => setCharacterGender('female')} className={`w-1/2 py-2 rounded-md font-semibold transition-colors duration-200 flex items-center justify-center ${characterGender === 'female' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>Female</button>
                        <button onClick={() => setCharacterGender('male')} className={`w-1/2 py-2 rounded-md font-semibold transition-colors duration-200 flex items-center justify-center ${characterGender === 'male' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>Male</button>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Image Aspect Ratio</label>
                     <div className="flex bg-gray-700/80 p-1 rounded-lg">
                         <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full px-2 py-2 bg-gray-700 border-none rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-center font-semibold">
                            {aspectRatios.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">Character Reference (Optional)</label>
                 <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-500 overflow-hidden">
                        {characterImage ? <img src={characterImage} alt="Character Reference" className="w-full h-full object-cover" /> : <UserCircleIcon className="h-10 w-10 text-gray-500" />}
                    </div>
                    <div className="flex-grow">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                        <button onClick={() => fileInputRef.current?.click()} className="w-full mb-2 flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold transition-colors">
                            <ArrowUpTrayIcon className="h-5 w-5 mr-2"/> Upload Image
                        </button>
                         {characterImage && <button onClick={() => setCharacterImage(null)} className="w-full flex items-center justify-center px-4 py-1 text-sm bg-red-800 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors">
                            <XMarkIcon className="h-4 w-4 mr-1"/> Remove
                        </button>}
                    </div>
                 </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-600">
            <button
            onClick={handleGenerate}
            disabled={isLoading || !topic}
            className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
            >
            {isLoading ? <Spinner /> : <><FilmIcon className="h-5 w-5 mr-2" /> Generate Storyboard</>}
            </button>
        </div>
      </div>

       {error && <p className="text-red-400 text-center bg-red-900/20 p-3 rounded-lg">{error}</p>}

      {(isLoading || scenes.length > 0 || thumbnail) && (
        <div className="mt-8">
            <h3 className="text-2xl font-bold text-gray-100 mb-4">Storyboard</h3>
             {isLoading && (
                <div className="text-center text-gray-400 p-8">
                    <Spinner size="large" />
                    <p className="mt-4 text-lg">{generationStatus}</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {thumbnail && <ImageCard
                    title="Thumbnail"
                    prompt={thumbnail.prompt}
                    imageData={thumbnail}
                    onGenerate={() => handleGenerateImage('thumbnail', thumbnail.prompt)}
                    aspectRatio={aspectRatio}
                />}
                {scenes.map((scene) => (
                    <div key={scene.sceneNumber} className="bg-gray-700/50 rounded-lg border border-gray-600/50 flex flex-col animate-fade-in">
                        <div className="p-5 space-y-4 flex-grow">
                            <div className="flex justify-between items-start border-b border-gray-600 pb-3">
                                <h4 className="text-xl font-bold text-gray-100">Scene {scene.sceneNumber}</h4>
                                <p className="text-sm text-right text-gray-400 flex-shrink-1 ml-4">{scene.description}</p>
                            </div>
                            <SceneDetail label="Dialogue / Narration" content={scene.dialogue} />
                            <SceneDetail label="Sound & Music" content={scene.sound} />
                        </div>
                        <ImageCard
                            title={`Scene ${scene.sceneNumber} Visuals`}
                            prompt={scene.visuals}
                            imageData={scene}
                            onGenerate={() => handleGenerateImage('scene', scene.visuals, scene.sceneNumber)}
                            aspectRatio={aspectRatio}
                            isSceneCard
                        />
                    </div>
                ))}
            </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

const SceneDetail: React.FC<{label: string; content: string}> = ({ label, content }) => (
    <div>
        <h5 className="font-semibold text-indigo-400 mb-1">{label}</h5>
        <p className="text-gray-300 text-sm leading-relaxed">{content}</p>
    </div>
);

interface ImageCardProps {
    title: string;
    prompt: string;
    imageData: ThumbnailData | SceneCard;
    onGenerate: () => void;
    aspectRatio: string;
    isSceneCard?: boolean;
}
const ImageCard: React.FC<ImageCardProps> = ({ title, prompt, imageData, onGenerate, aspectRatio, isSceneCard }) => {
    const aspectRatioClass = {
        "16:9": "aspect-video",
        "1:1": "aspect-square",
        "9:16": "aspect-[9/16]",
        "4:3": "aspect-[4/3]",
        "3:4": "aspect-[3/4]",
    }[aspectRatio] || "aspect-video";
    
    const containerClasses = isSceneCard ? "bg-gray-800/50 p-5 border-t border-gray-600" : "bg-gray-700/50 rounded-lg border border-gray-600/50 p-5 animate-fade-in";
    
    return (
        <div className={containerClasses}>
            <h5 className="font-semibold text-teal-300 mb-2">{title}</h5>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{prompt}</p>
            <div className={`${aspectRatioClass} bg-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden`}>
                {imageData.isGeneratingImage ? (
                    <div className="text-center text-gray-400">
                        <Spinner />
                        <p className="text-sm mt-2">Generating Image...</p>
                    </div>
                ) : imageData.imageUrl ? (
                    <img src={imageData.imageUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <button onClick={onGenerate} className="flex flex-col items-center text-gray-400 hover:text-white transition-colors">
                        <PhotoIcon className="h-10 w-10 mb-2" />
                        <span className="font-semibold text-sm">Generate Image</span>
                    </button>
                )}
            </div>
        </div>
    );
};
