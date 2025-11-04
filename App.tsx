
import React, { useState, useCallback } from 'react';
import { ContentGenerator } from './components/ContentGenerator';
import { ImageEditor } from './components/ImageEditor';
import { StoryBoardGenerator } from './components/StoryBoardGenerator';
import { SparklesIcon, PhotoIcon, FilmIcon, VideoCameraIcon } from './components/Icons';
import { VideoPromptGenerator } from './components/VideoPromptGenerator';

type Tab = 'generator' | 'editor' | 'video' | 'storyboard';

export interface GeneratedImages {
  withOverlay: string;
  withoutOverlay: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [quote, setQuote] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages>({ withOverlay: '', withoutOverlay: '' });

  const renderActiveTab = useCallback(() => {
    switch (activeTab) {
      case 'generator':
        return <ContentGenerator 
                  quote={quote} 
                  setQuote={setQuote} 
                  generatedImages={generatedImages}
                  setGeneratedImages={setGeneratedImages}
                />;
      case 'editor':
        return <ImageEditor />;
      case 'video':
        return <VideoPromptGenerator quote={quote} image={generatedImages.withoutOverlay} />;
      case 'storyboard':
        return <StoryBoardGenerator />;
      default:
        return <ContentGenerator 
                  quote={quote} 
                  setQuote={setQuote} 
                  generatedImages={generatedImages}
                  setGeneratedImages={setGeneratedImages}
                />;
    }
  }, [activeTab, quote, generatedImages]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-start h-16">
            <div className="flex items-center space-x-3">
              <SparklesIcon className="h-8 w-8 text-indigo-400" />
              <h1 className="text-xl font-bold tracking-tight text-gray-200">
                Motivational Content Automator
              </h1>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-1 p-2">
              <TabButton
                label="Content Generator"
                icon={<SparklesIcon className="h-5 w-5 mr-2" />}
                isActive={activeTab === 'generator'}
                onClick={() => setActiveTab('generator')}
              />
              <TabButton
                label="Image Editor"
                icon={<PhotoIcon className="h-5 w-5 mr-2" />}
                isActive={activeTab === 'editor'}
                onClick={() => setActiveTab('editor')}
              />
              <TabButton
                label="Video Prompts"
                icon={<VideoCameraIcon className="h-5 w-5 mr-2" />}
                isActive={activeTab === 'video'}
                onClick={() => setActiveTab('video')}
              />
              <TabButton
                label="Story Board"
                icon={<FilmIcon className="h-5 w-5 mr-2" />}
                isActive={activeTab === 'storyboard'}
                onClick={() => setActiveTab('storyboard')}
              />
            </nav>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            {renderActiveTab()}
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>Powered by Gemini API. Designed for creative automation.</p>
      </footer>
    </div>
  );
};

interface TabButtonProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => {
    const baseClasses = "flex items-center font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500";
    const activeClasses = "bg-indigo-600 text-white";
    const inactiveClasses = "text-gray-400 hover:bg-gray-700 hover:text-gray-200";

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {icon}
            {label}
        </button>
    );
}

export default App;
