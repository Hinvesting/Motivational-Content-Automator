
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateContent, generateImageWithQuote } from '../services/geminiService';
import { Spinner } from './Spinner';
import { SparklesIcon, PhotoIcon, SettingsIcon, EyeIcon } from './Icons';
import { ImageModal } from './ImageModal';
import type { GeneratedImages } from '../App';

interface ContentGeneratorProps {
  quote: string;
  setQuote: (quote: string) => void;
  generatedImages: GeneratedImages;
  setGeneratedImages: (images: GeneratedImages) => void;
}

export const ContentGenerator: React.FC<ContentGeneratorProps> = ({ quote, setQuote, generatedImages, setGeneratedImages }) => {
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<'quote' | 'tip'>('quote');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [isAspectRatioMenuOpen, setIsAspectRatioMenuOpen] = useState(false);

  const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
  const menuRef = useRef<HTMLDivElement>(null);

  const { withOverlay: imageUrl, withoutOverlay: imageWithoutOverlay } = generatedImages;

  const handleGenerateContent = useCallback(async () => {
    setIsLoadingContent(true);
    setError(null);
    setQuote('');
    setGeneratedImages({ withOverlay: '', withoutOverlay: '' });
    try {
      const newContent = await generateContent(generationType);
      setQuote(newContent);
    } catch (err) {
      setError(`Failed to generate ${generationType}. Please try again.`);
      console.error(err);
    } finally {
      setIsLoadingContent(false);
    }
  }, [setQuote, generationType, setGeneratedImages]);

  const handleGenerateImage = useCallback(async () => {
    if (!quote) return;
    setIsLoadingImage(true);
    setError(null);
    setGeneratedImages({ withOverlay: '', withoutOverlay: '' });
    try {
      const { withOverlay, withoutOverlay } = await generateImageWithQuote(quote, aspectRatio);
      setGeneratedImages({ withOverlay, withoutOverlay });
    } catch (err) {
      setError('Failed to generate image. Please try again.');
      console.error(err);
    } finally {
      setIsLoadingImage(false);
    }
  }, [quote, aspectRatio, setGeneratedImages]);

  useEffect(() => {
    if (!quote) {
        setGeneratedImages({ withOverlay: '', withoutOverlay: '' });
    }
  }, [quote, setGeneratedImages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAspectRatioMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-200 mb-2">Step 1: Generate Content</h2>
            <p className="text-gray-400 mb-4">
              Select whether you want a motivational quote or an actionable tip, then click generate.
            </p>
            <div className="flex bg-gray-700/80 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setGenerationType('quote')}
                  className={`w-1/2 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${generationType === 'quote' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`}
                >
                  Quote
                </button>
                <button
                  onClick={() => setGenerationType('tip')}
                  className={`w-1/2 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${generationType === 'tip' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`}
                >
                  Tip of the Day
                </button>
              </div>
            <button
              onClick={handleGenerateContent}
              disabled={isLoadingContent}
              className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
            >
              {isLoadingContent ? (
                <Spinner />
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  {`Generate ${generationType === 'quote' ? 'Quote' : 'Tip'}`}
                </>
              )}
            </button>
          </div>

          {quote && (
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-lg italic text-gray-300">"{quote}"</p>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-2xl font-bold text-gray-200">Step 2: Create Image</h2>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsAspectRatioMenuOpen(prev => !prev)}
                  className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                  aria-haspopup="true"
                  aria-expanded={isAspectRatioMenuOpen}
                  aria-label="Image settings"
                >
                  <SettingsIcon className="h-6 w-6" />
                </button>
                {isAspectRatioMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 border border-gray-600">
                    <div className="p-2">
                      <p className="px-2 py-1 text-sm font-semibold text-gray-300">Aspect Ratio</p>
                      {aspectRatios.map(ratio => (
                        <button
                          key={ratio}
                          onClick={() => {
                            setAspectRatio(ratio);
                            setIsAspectRatioMenuOpen(false);
                          }}
                          className={`block w-full text-left px-2 py-2 text-sm rounded-md transition-colors ${aspectRatio === ratio ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                        >
                          {ratio}
                          <span className="text-gray-400 ml-2">
                            {ratio === '1:1' && '(Square)'}
                            {ratio === '16:9' && '(Landscape)'}
                            {ratio === '9:16' && '(Portrait)'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Use the generated content to create a beautiful image with the text automatically overlaid.
            </p>
            <button
              onClick={handleGenerateImage}
              disabled={!quote || isLoadingImage || isLoadingContent}
              className="w-full flex items-center justify-center px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-teal-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
            >
              {isLoadingImage ? (
                <Spinner />
              ) : (
                <>
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  Generate Image
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-200">Result</h2>
          <div className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center p-4">
            {isLoadingImage ? (
              <div className="text-center text-gray-400">
                <Spinner size="large" />
                <p className="mt-4">Generating your masterpiece... this may take a moment.</p>
              </div>
            ) : imageUrl && imageWithoutOverlay ? (
              <div
                className="relative group w-full h-full cursor-pointer"
                onClick={() => setIsModalOpen(true)}
                role="button"
                tabIndex={0}
                aria-label="View larger image"
                onKeyDown={(e) => { if (e.key === 'Enter') setIsModalOpen(true); }}
              >
                  <img
                      src={imageUrl}
                      alt="Generated motivational content"
                      className="object-contain w-full h-full rounded-md"
                  />
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md">
                      <div className="text-center text-white pointer-events-none">
                          <EyeIcon className="h-12 w-12 mx-auto" />
                          <p className="font-bold text-lg mt-2">View Image</p>
                      </div>
                  </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <PhotoIcon className="h-16 w-16 mx-auto" />
                <p className="mt-2">Your generated image will appear here.</p>
              </div>
            )}
          </div>
          {error && <p className="text-red-400 text-center">{error}</p>}
        </div>
      </div>
      {isModalOpen && imageUrl && imageWithoutOverlay && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrlWithOverlay={imageUrl}
          imageUrlWithoutOverlay={imageWithoutOverlay}
        />
      )}
    </>
  );
};
