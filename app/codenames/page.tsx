'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWordLists, type WordListInfo } from '@/lib/codenames/words';
import { getImageLists, type ImageListInfo } from '@/lib/codenames/images';
import { generateGameCode } from '@/lib/codenames/game';

export default function CodenamesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'join' | 'create' | 'upload'>('join');

    // Join state
    const [joinCode, setJoinCode] = useState<string>('');
    const [joinView, setJoinView] = useState<'table' | 'spymaster' | null>(null);

    // Create state
    const [createView, setCreateView] = useState<'table' | 'spymaster' | null>(null);
    const [createMode, setCreateMode] = useState<'word' | 'image'>('word');
    const [createVariant, setCreateVariant] = useState<string>('');
    const [wordLists, setWordLists] = useState<WordListInfo[]>([]);
    const [imageLists, setImageLists] = useState<ImageListInfo[]>([]);

    // Upload state
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [groupName, setGroupName] = useState<string>('');
    const [groupDescription, setGroupDescription] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');

    useEffect(() => {
        // Load available word lists and image lists
        getWordLists().then(setWordLists);
        getImageLists().then(setImageLists);
    }, []);

    const handleJoin = () => {
        if (!joinCode || !joinView) return;

        // Load game state to get mode and variant from the code
        // Game state is stored in localStorage when created
        const storedState = typeof window !== 'undefined'
            ? localStorage.getItem(`codenames-${joinCode}`)
            : null;

        if (storedState) {
            try {
                const state = JSON.parse(storedState);
                const params = new URLSearchParams({
                    code: joinCode,
                    mode: state.mode,
                    variant: state.variant,
                });

                if (joinView === 'table') {
                    router.push(`/codenames/table?${params.toString()}`);
                } else {
                    router.push(`/codenames/spymaster?${params.toString()}`);
                }
            } catch (error) {
                alert('Invalid game code. Please check the code and try again.');
            }
        } else {
            // Game not found in localStorage - might be on different device
            // Show helpful message
            alert(`Game code "${joinCode}" not found. Make sure:\n1. The game has been created first\n2. You're using the same device/browser\n\nIf creating a new game, use the "Create Game" tab.`);
        }
    };

    const handleCreate = () => {
        if (!createView || !createVariant) return;

        // Auto-generate code
        const code = generateGameCode();

        const params = new URLSearchParams({
            code,
            mode: createMode,
            variant: createVariant,
        });

        if (createView === 'table') {
            router.push(`/codenames/table?${params.toString()}`);
        } else {
            router.push(`/codenames/spymaster?${params.toString()}`);
        }
    };

    const availableVariants = createMode === 'word' ? wordLists : imageLists;
    const canJoin = joinCode.length === 6 && joinView !== null;
    const canCreate = createView !== null && createVariant !== '';
    const canUpload = selectedFiles.length > 0 && groupName.trim() !== '';

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files);
    };

    const handleUpload = async () => {
        if (!canUpload) return;

        setIsUploading(true);
        setUploadProgress('Starting upload...');

        try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });
            formData.append('groupName', groupName.trim());
            formData.append('groupDescription', groupDescription.trim());

            setUploadProgress('Uploading images...');
            const response = await fetch('/api/codenames/upload-images', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                setUploadProgress(`Success! Uploaded ${result.uploadedCount}/${result.totalFiles} images`);
                // Reset form
                setSelectedFiles([]);
                setGroupName('');
                setGroupDescription('');
                // Refresh image lists
                getImageLists().then(setImageLists);
                // Reset file input
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                setUploadProgress(`Error: ${result.error}`);
            }
        } catch (error) {
            setUploadProgress('Error uploading images');
            console.error('Upload error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <main className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#fafafa' }}>
            <h1 className="text-6xl font-bold text-gray-900 mb-12">Codenames</h1>

            <div className="w-full max-w-4xl px-8">
                {/* Tab Selection */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('join')}
                        className={`flex-1 px-8 py-4 rounded-t-lg font-semibold text-xl transition-colors ${activeTab === 'join'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                    >
                        Join Game
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 px-8 py-4 rounded-t-lg font-semibold text-xl transition-colors ${activeTab === 'create'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                    >
                        Create Game
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 px-8 py-4 rounded-t-lg font-semibold text-xl transition-colors ${activeTab === 'upload'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                    >
                        Upload Images
                    </button>
                </div>

                {/* Join Section */}
                {activeTab === 'join' && (
                    <div className="bg-gray-50 rounded-b-lg p-8 flex flex-col gap-6">
                        <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-2">
                                Game Code:
                            </label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                placeholder="Enter 6-character code"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg uppercase font-mono"
                                maxLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-2">
                                View:
                            </label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setJoinView('table')}
                                    className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${joinView === 'table'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                >
                                    Table
                                </button>
                                <button
                                    onClick={() => setJoinView('spymaster')}
                                    className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${joinView === 'spymaster'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                >
                                    Spymaster
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleJoin}
                            disabled={!canJoin}
                            className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors ${canJoin
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Join Game
                        </button>
                    </div>
                )}

                {/* Create Section */}
                {activeTab === 'create' && (
                    <div className="bg-gray-50 rounded-b-lg p-8 flex flex-col gap-6">
                        <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-2">
                                View:
                            </label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setCreateView('table')}
                                    className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${createView === 'table'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                >
                                    Table
                                </button>
                                <button
                                    onClick={() => setCreateView('spymaster')}
                                    className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${createView === 'spymaster'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                >
                                    Spymaster
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-2">
                                Mode:
                            </label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setCreateMode('word');
                                        setCreateVariant('');
                                    }}
                                    className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${createMode === 'word'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                >
                                    Words
                                </button>
                                <button
                                    onClick={() => {
                                        setCreateMode('image');
                                        setCreateVariant('');
                                    }}
                                    className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${createMode === 'image'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                >
                                    Images
                                </button>
                            </div>
                        </div>

                        {availableVariants.length > 0 && (
                            <div>
                                <label className="block text-lg font-semibold text-gray-800 mb-2">
                                    Select {createMode === 'word' ? 'Word List' : 'Image Set'}:
                                </label>
                                <select
                                    value={createVariant}
                                    onChange={(e) => setCreateVariant(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                                >
                                    <option value="">Choose a {createMode === 'word' ? 'word list' : 'image set'}...</option>
                                    {availableVariants.map((variant) => {
                                        const key = createMode === 'word'
                                            ? (variant as WordListInfo).filename
                                            : (variant as ImageListInfo).folder;
                                        const value = createMode === 'word'
                                            ? (variant as WordListInfo).filename
                                            : (variant as ImageListInfo).folder;
                                        const isUserCreated = createMode === 'image' && (variant as any).is_user_created;
                                        return (
                                            <option key={key} value={value}>
                                                {variant.name}{isUserCreated ? ' (Custom)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={handleCreate}
                            disabled={!canCreate}
                            className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors ${canCreate
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Create Game
                        </button>
                    </div>
                )}

                {/* Upload Section */}
                {activeTab === 'upload' && (
                    <div className="bg-gray-50 rounded-b-lg p-8 flex flex-col gap-6">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Your Own Images</h3>
                            <p className="text-gray-600">Create custom image sets for your Codenames games</p>
                        </div>

                        <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-2">
                                Image Group Name:
                            </label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="e.g., Family Vacation 2024"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                                maxLength={100}
                            />
                        </div>

                        <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-2">
                                Description (optional):
                            </label>
                            <textarea
                                value={groupDescription}
                                onChange={(e) => setGroupDescription(e.target.value)}
                                placeholder="Describe your image collection..."
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg resize-none"
                                rows={3}
                                maxLength={500}
                            />
                        </div>

                        <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-2">
                                Select Images:
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                Supported formats: JPG, PNG, GIF, WebP (max 5MB each)
                            </p>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-800 mb-2">Selected Files ({selectedFiles.length})</h4>
                                <div className="max-h-32 overflow-y-auto">
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        {selectedFiles.map((file, index) => (
                                            <li key={index} className="flex justify-between">
                                                <span>{file.name}</span>
                                                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {uploadProgress && (
                            <div className={`p-4 rounded-lg ${uploadProgress.includes('Success')
                                    ? 'bg-green-50 border border-green-200'
                                    : uploadProgress.includes('Error')
                                        ? 'bg-red-50 border border-red-200'
                                        : 'bg-blue-50 border border-blue-200'
                                }`}>
                                <p className={`font-semibold ${uploadProgress.includes('Success')
                                        ? 'text-green-800'
                                        : uploadProgress.includes('Error')
                                            ? 'text-red-800'
                                            : 'text-blue-800'
                                    }`}>
                                    {uploadProgress}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={!canUpload || isUploading}
                            className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors ${canUpload && !isUploading
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {isUploading ? 'Uploading...' : 'Upload Images'}
                        </button>

                        <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <strong>Note:</strong> Uploaded images will be available for all players to use in their games.
                            Make sure you have permission to share these images.
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
