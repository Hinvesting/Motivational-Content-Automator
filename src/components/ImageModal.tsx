
import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ChatBubbleBottomCenterTextIcon } from './Icons';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrlWithOverlay: string;
  imageUrlWithoutOverlay: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrlWithOverlay, imageUrlWithoutOverlay }) => {
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const currentImage = isOverlayVisible ? imageUrlWithOverlay : imageUrlWithoutOverlay;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700 transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s ease-out forwards' }}
      >
        <div className="p-4 border-b border-gray-700 flex justify-end items-center">
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Close image viewer">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-grow p-4 flex items-center justify-center overflow-hidden">
            <img src={currentImage} alt="Generated content" className="max-w-full max-h-full object-contain rounded-md" />
        </div>

        <div className="p-4 border-t border-gray-700 flex flex-wrap items-center justify-center gap-4">
             <button
                onClick={() => setIsOverlayVisible(prev => !prev)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
            >
                <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
                <span>{isOverlayVisible ? 'Hide Text Overlay' : 'Show Text Overlay'}</span>
            </button>
            <a
                href={currentImage}
                download="motivational-image.png"
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
            >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Download Image</span>
            </a>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};