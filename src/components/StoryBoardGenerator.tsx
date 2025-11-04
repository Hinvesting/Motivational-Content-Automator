import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateStoryElements, generateImageForScene, savePackageToDrive } from '../services/geminiService';
import type { SceneCard, ThumbnailData } from '../types';
import { Spinner } from './Spinner';
import { FilmIcon, UserCircleIcon, ArrowUpTrayIcon, PhotoIcon, XMarkIcon, ArrowPathIcon, ArrowDownTrayIcon } from './Icons';
import { fileToBase64, blobToBase64 } from '../utils/fileUtils';
import JSZip from 'jszip';

type CharacterGender = 'male' | 'female';

const toneSuggestions = ['Cinematic', 'Humorous', 'Inspirational', 'Educational', 'Dramatic', 'Upbeat', 'Realistic'];
const aspectRatios = ["16:9", "1:1", "9:16", "4:3", "3:4"];

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const StoryBoardGenerator: React.FC = () => {
  // Form State
  const [topic, setTopic] = useState<string>('');
  const [sceneCount, setSceneCount] = useState<string>('7');
  const [tone, setTone] = useState<string>('');
  const [characterGender, setCharacterGender] = useState<CharacterGender>('female');
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>(aspectRatios[0]);

  // Generation State
  const [scenes, setScenes] = useState<SceneCard[]>([]);
  const [thumbnail, setThumbnail] = useState<ThumbnailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      setGoogleAccessToken(token);
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  const handleGoogleConnect = () => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      setError("Google integration is not configured. Please check environment variables.");
      return;
    }
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=token&scope=${GOOGLE_DRIVE_SCOPE}`;
    window.location.href = authUrl;
  };

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
    if (!topic) { setError('Please enter a topic or story idea.'); return; }
    setIsLoading(true); setScenes([]); setThumbnail(null); setError(null);
    setGenerationStatus('Crafting your story outline...');
    try {
      const numScenes = parseInt(sceneCount, 10) || 7;
      const { thumbnailPrompt, scenes: fetchedScenes } = await generateStoryElements(topic, numScenes, tone, characterGender, !!characterImage);
      setThumbnail({ prompt: thumbnailPrompt });
      for (let i = 0; i < fetchedScenes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setGenerationStatus(`Revealing Scene ${i + 1} of ${numScenes}...`);
        setScenes(prev => [...prev, { ...fetchedScenes[i], sceneNumber: i + 1 }]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate story. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false); setGenerationStatus('');
    }
  }, [topic, sceneCount, tone, characterGender, characterImage]);

  const handleGenerateImage = useCallback(async (type: 'thumbnail' | 'scene', prompt: string, sceneNumber?: number) => {
    if (type === 'thumbnail') setThumbnail(prev => prev ? { ...prev, isGeneratingImage: true } : null);
    else if (sceneNumber) setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, isGeneratingImage: true } : s));
    try {
      const imageUrl = await generateImageForScene(prompt, aspectRatio, characterImage);
      if (type === 'thumbnail') setThumbnail(prev => prev ? { ...prev, imageUrl, isGeneratingImage: false } : null);
      else if (sceneNumber) setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, imageUrl, isGeneratingImage: false } : s));
    } catch (err) {
      setError(`Failed to generate image for ${type} ${sceneNumber || ''}.`);
      console.error(err);
      if (type === 'thumbnail') setThumbnail(prev => prev ? { ...prev, isGeneratingImage: false } : null);
      else if (sceneNumber) setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, isGeneratingImage: false } : s));
    }
  }, [aspectRatio, characterImage]);

  const handleClear = () => {
    setTopic(''); setTone(''); setSceneCount('7'); setCharacterGender('female'); setCharacterImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setAspectRatio(aspectRatios[0]); setScenes([]); setThumbnail(null); setError(null); setGenerationStatus('');
  };

  const allImagesGenerated = !!(thumbnail?.imageUrl && scenes.length > 0 && scenes.every(s => !!s.imageUrl));

  const createZipBlob = async (): Promise<Blob> => {
    const zip = new JSZip();
    if (thumbnail?.imageUrl) {
      const response = await fetch(thumbnail.imageUrl);
      zip.file('thumbnail.png', await response.blob());
    }
    for (const scene of scenes) {
      if (scene.imageUrl) {
        const response = await fetch(scene.imageUrl);
        zip.file(`scene-${String(scene.sceneNumber).padStart(2, '0')}.png`, await response.blob());
      }
    }
    return zip.generateAsync({ type: 'blob' });
  };

  const handleDownloadAllImages = async () => {
    if (!allImagesGenerated) return;
    setIsZipping(true); setError(null);
    try {
      const content = await createZipBlob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError('Failed to create ZIP file.'); console.error(err);
    } finally { setIsZipping(false); }
  };

  const handleSaveToDrive = async () => {
    if (!allImagesGenerated || !googleAccessToken) return;
    setIsSavingToDrive(true); setError(null);
    try {
      const blob = await createZipBlob();
      const fileData = await blobToBase64(blob);
      const fileName = `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard'}.zip`;
      const result = await savePackageToDrive(googleAccessToken, fileData, fileName);
      alert(`Successfully saved to Google Drive! View file: ${result.webViewLink}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save to Google Drive. Your token may have expired. Please try connecting again.');
      console.error(err);
      setGoogleAccessToken(null);
    } finally { setIsSavingToDrive(false); }
  };

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
              <label htmlFor="scene-count" className="block text-sm font-medium text-gray-300 mb-2">Scene Count</label>
              <input
                type="number"
                id="scene-count"
                value={sceneCount}
                onChange={(e) => setSceneCount(e.target.value)}
                min="1"
                max="30"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
              <p className="text-xs text-gray-400 mt-1">Applies when generating a new script from a topic.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
              <input
                type="text"
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g., Dark and Gritty"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to let the AI determine the tone from the topic.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {toneSuggestions.map(suggestion => (
                  <button key={suggestion} onClick={() => setTone(suggestion)} className="px-3 py-1 text-sm bg-gray-600 hover:bg-indigo-500 rounded-full transition-colors text-gray-200">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-600/50 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Main Character</label>
            <div className="flex bg-gray-700/80 p-1 rounded-lg">
              <button onClick={() => setCharacterGender('female')} className={`w-1/2 py-2 rounded-md font-semibold transition-colors duration-200 flex items-center justify-center ${characterGender === 'female' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>Female</button>
              <button onClick={() => setCharacterGender('male')} className={`w-1/2 py-2 rounded-md font-semibold transition-colors duration-200 flex items-center justify-center ${characterGender === 'male' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>Male</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Image Aspect Ratio</label>
            <div className="bg-gray-700/80 p-1 rounded-lg">
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full px-2 py-2 bg-gray-800 border-none rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-center font-semibold">
                {aspectRatios.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Character Reference (Optional)</label>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-500 overflow-hidden">
                {characterImage ? <img src={characterImage} alt="Character Reference" className="w-full h-full object-cover" /> : <UserCircleIcon className="h-8 w-8 text-gray-500" />}
              </div>
              <div className="flex-grow">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                <button onClick={() => fileInputRef.current?.click()} className="w-full mb-1 flex items-center justify-center px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold text-sm transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2"/> Upload
                </button>
                {characterImage && <button onClick={() => setCharacterImage(null)} className="w-full flex items-center justify-center px-3 py-0.5 text-xs bg-red-800 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors">
                  <XMarkIcon className="h-3 w-3 mr-1"/> Remove
                </button>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-600 flex items-center gap-4">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !topic}
            className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
          >
            {isLoading ? <Spinner /> : <><FilmIcon className="h-5 w-5 mr-2" /> {scenes.length > 0 ? 'Regenerate Storyboard' : 'Generate Storyboard'}</>}
          </button>
          {scenes.length > 0 && !isLoading && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Start Over
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-center bg-red-900/20 p-3 rounded-lg">{error}</p>}

      {(isLoading || scenes.length > 0 || thumbnail) && (
        <div className="mt-8">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h3 className="text-2xl font-bold text-gray-100">Storyboard</h3>
            <div className="flex items-center gap-4">
              {googleAccessToken ? (
                <>
                  {allImagesGenerated && (
                    <button
                      onClick={handleSaveToDrive}
                      disabled={isSavingToDrive}
                      className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-blue-400"
                    >
                      {isSavingToDrive ? <Spinner size="small" /> : <img src="https://www.google.com/images/icons/product/drive-32.png" alt="Google Drive" className="w-5 h-5 mr-2"/>}
                      {isSavingToDrive ? 'Saving...' : 'Save to Drive'}
                    </button>
                  )}
                </>
              ) : (
                <button onClick={handleGoogleConnect} className="flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-200 rounded-lg text-gray-800 font-semibold transition-all duration-200">
                  <img src="https://www.google.com/images/icons/product/drive-32.png" alt="Google Drive" className="w-5 h-5 mr-2"/>
                  Connect Google Drive
                </button>
              )}
              {allImagesGenerated && (
                <button
                  onClick={handleDownloadAllImages}
                  disabled={isZipping}
                  className="flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-teal-400"
                >
                  {isZipping ? <Spinner size="small" /> : <ArrowDownTrayIcon className="h-5 w-5 mr-2" />}
                  {isZipping ? 'Zipping...' : 'Download (.zip)'}
                </button>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="text-center text-gray-400 p-8">
              <Spinner size="large" />
              <p className="mt-4 text-lg">{generationStatus}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
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
        {('isGeneratingImage' in imageData && imageData.isGeneratingImage) ? (
          <div className="text-center text-gray-400">
            <Spinner />
            <p className="text-sm mt-2">Generating Image...</p>
          </div>
        ) : ('imageUrl' in imageData && imageData.imageUrl) ? (
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
