
import React, { useState, useEffect, useCallback } from 'react';
import { getAutomationStrategies } from '../services/geminiService';
import { Spinner } from './Spinner';
import { XMarkIcon, LightBulbIcon } from './Icons';
import type { Strategy } from '../types';

interface StrategyModalProps {
  onClose: () => void;
}

export const StrategyModal: React.FC<StrategyModalProps> = ({ onClose }) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedStrategies = await getAutomationStrategies();
      setStrategies(fetchedStrategies);
    } catch (err) {
      setError('Could not load automation strategies. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s ease-out forwards' }}
      >
        <div className="sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10 p-6 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <LightBulbIcon className="h-8 w-8 text-yellow-400" />
            <h2 className="text-2xl font-bold text-gray-100">Workflow Automation Strategies</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Spinner size="large" />
              <p className="mt-4 text-gray-400">Asking Gemini for automation ideas...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {strategies.map((strategy, index) => (
                <div key={index} className="bg-gray-700/50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-indigo-400 mb-2">{strategy.title}</h3>
                  <div className="prose prose-invert prose-p:text-gray-300 prose-li:text-gray-300" dangerouslySetInnerHTML={{ __html: strategy.description }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};