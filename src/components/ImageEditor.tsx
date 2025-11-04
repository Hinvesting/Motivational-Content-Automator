
import React, { useState, useCallback } from 'react';
import { editImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { PhotoIcon, SparklesIcon, ArrowPathIcon, ArrowUpTrayIcon } from './Icons';
import { fileToBase64 } from '../utils/fileUtils';

export const ImageEditor: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setOriginalImage(base64);
                setEditedImage(null);
                setError(null);
            } catch (err) {
                setError("Failed to read the image file.");
                console.error(err);
            }
        }
    };
    
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!originalImage || !prompt) return;

        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            const result = await editImage(originalImage, prompt);
            setEditedImage(result);
        } catch (err) {
            setError("Failed to edit the image. Please try a different prompt or image.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [originalImage, prompt]);

    const handleReset = () => {
        setOriginalImage(null);
        setEditedImage(null);
        setPrompt('');
        setError(null);
    };

    if (!originalImage) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg">
                <ArrowUpTrayIcon className="h-12 w-12 text-gray-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-200">Upload an Image to Start Editing</h3>
                <p className="text-gray-400 mt-2">Select a file to begin the magical transformation.</p>
                <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                />
                <label
                    htmlFor="image-upload"
                    className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                >
                    Choose an Image
                </label>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'Add a retro filter' or 'Make the sky purple'"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    required
                />
                <button
                    type="submit"
                    disabled={isLoading || !prompt}
                    className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-semibold transition-all duration-200 disabled:bg-teal-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
                >
                    {isLoading ? <Spinner /> : <><SparklesIcon className="h-5 w-5 mr-2" /> Apply Edit</>}
                </button>
                 <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
                >
                    <ArrowPathIcon className="h-5 w-5 mr-2" /> Reset
                </button>
            </form>

            {error && <p className="text-red-400 text-center">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageDisplay title="Original" src={originalImage} />
                <ImageDisplay title="Edited" src={editedImage} isLoading={isLoading} />
            </div>
        </div>
    );
};


interface ImageDisplayProps {
    title: string;
    src: string | null;
    isLoading?: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ title, src, isLoading = false }) => (
    <div className="space-y-3">
        <h3 className="text-lg font-semibold text-center text-gray-300">{title}</h3>
        <div className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center p-2 overflow-hidden">
            {isLoading ? (
                <div className="text-center text-gray-400">
                    <Spinner size="large" />
                    <p className="mt-4">Gemini is working its magic...</p>
                </div>
            ) : src ? (
                <img src={src} alt={title} className="object-contain w-full h-full rounded-md" />
            ) : (
                <div className="text-center text-gray-500">
                    <PhotoIcon className="h-16 w-16 mx-auto" />
                    <p className="mt-2">The {title.toLowerCase()} image will appear here.</p>
                </div>
            )}
        </div>
    </div>
);