'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWordLists, type WordListInfo } from '@/lib/codenames/words';
import { getImageLists, type ImageListInfo } from '@/lib/codenames/images';
import { generateGameCode } from '@/lib/codenames/game';

export default function CodenamesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'join' | 'create' | 'manage'>('join');

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
    const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
    const [groupName, setGroupName] = useState<string>('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');

    // Manage state
    const [manageSubTab, setManageSubTab] = useState<'lists' | 'upload' | 'create'>('lists');
    const [selectedList, setSelectedList] = useState<string>('');
    const [selectedListType, setSelectedListType] = useState<'word' | 'image' | null>(null);
    const [wordListWords, setWordListWords] = useState<any[]>([]);
    const [imageListImages, setImageListImages] = useState<any[]>([]);
    const [newWord, setNewWord] = useState<string>('');
    const [bulkAddWords, setBulkAddWords] = useState<string>('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Create list state
    const [createListType, setCreateListType] = useState<'word' | 'image'>('word');
    const [newListName, setNewListName] = useState<string>('');
    const [bulkWords, setBulkWords] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        // Load available word lists and image lists
        getWordLists().then(setWordLists);
        getImageLists().then(setImageLists);
    }, []);

    const handleJoin = async () => {
        if (!joinCode || !joinView) return;

        try {
            console.log(`🎮 [Frontend] Joining game: ${joinCode}`);
            const response = await fetch(`/api/codenames/game-sessions?code=${joinCode}`);
            const result = await response.json();

            if (response.ok) {
                const session = result.session;
                console.log('✅ [Frontend] Found session:', session.session_code);

                const params = new URLSearchParams({
                    code: joinCode,
                    mode: session.mode,
                    variant: session.variant,
                    view: joinView
                });

                if (joinView === 'table') {
                    router.push(`/codenames/table?${params.toString()}`);
                } else {
                    router.push(`/codenames/spymaster?${params.toString()}`);
                }
            } else {
                console.error('❌ [Frontend] Session not found:', result.error);
                alert(`Game code "${joinCode}" not found or has expired. Please check the code and try again, or create a new game.`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Error joining game:', error);
            alert('Failed to join game. Please try again.');
        }
    };

    const handleCreate = async () => {
        if (!createView || !createVariant) return;

        try {
            console.log('🎮 [Frontend] Creating game session...');
            const response = await fetch('/api/codenames/game-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: createMode,
                    variant: createVariant
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ [Frontend] Created session:', result.session.session_code);
                const params = new URLSearchParams({
                    code: result.session.session_code,
                    mode: createMode,
                    variant: createVariant,
                    view: createView
                });

                if (createView === 'table') {
                    router.push(`/codenames/table?${params.toString()}`);
                } else {
                    router.push(`/codenames/spymaster?${params.toString()}`);
                }
            } else {
                console.error('❌ [Frontend] Failed to create session:', result.error);
                alert(`Failed to create game: ${result.error}`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Error creating session:', error);
            alert('Failed to create game');
        }
    };

    const availableVariants = createMode === 'word' ? wordLists : imageLists;
    const canJoin = joinCode.length === 6 && joinView !== null;
    const canCreate = createView !== null && createVariant !== '';
    const canUpload = selectedFiles.length > 0 &&
        ((uploadMode === 'new' && groupName.trim() !== '') ||
            (uploadMode === 'existing' && selectedGroupId !== ''));

    // Load list content based on type
    const loadListContent = async (listId: string, type: 'word' | 'image') => {
        if (!listId) return;

        setIsLoading(true);
        try {
            console.log(`📖 [Frontend] Loading ${type}s for list: ${listId}`);
            const endpoint = type === 'word' ? 'manage-words' : 'manage-images';
            const response = await fetch(`/api/codenames/${endpoint}?listId=${listId}`);
            const result = await response.json();

            if (response.ok) {
                if (type === 'word') {
                    setWordListWords(result.words);
                    console.log(`✅ [Frontend] Loaded ${result.words.length} words`);
                } else {
                    setImageListImages(result.images);
                    console.log(`✅ [Frontend] Loaded ${result.images.length} images`);
                }
            } else {
                console.error(`❌ [Frontend] Failed to load ${type}s:`, result.error);
                alert(`Failed to load ${type}s: ${result.error}`);
            }
        } catch (error) {
            console.error(`💥 [Frontend] Error loading ${type}s:`, error);
            alert(`Failed to load ${type}s`);
        } finally {
            setIsLoading(false);
        }
    };

    const addWord = async () => {
        if (!selectedList || selectedListType !== 'word' || !newWord.trim()) return;

        try {
            console.log(`➕ [Frontend] Adding word: ${newWord.trim()}`);
            const response = await fetch('/api/codenames/manage-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listId: selectedList,
                    word: newWord.trim()
                })
            });

            const result = await response.json();

            if (response.ok) {
                setWordListWords(prev => [...prev, result.word].sort((a, b) => a.word.localeCompare(b.word)));
                setNewWord('');
                console.log(`✅ [Frontend] Added word: ${result.word.word}`);
            } else {
                console.error('❌ [Frontend] Failed to add word:', result.error);
                alert(`Failed to add word: ${result.error}`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Error adding word:', error);
            alert('Failed to add word');
        }
    };

    const addBulkWords = async () => {
        if (!selectedList || selectedListType !== 'word' || !bulkAddWords.trim()) return;

        const words = bulkAddWords
            .split(',')
            .map(word => word.trim())
            .filter(word => word.length > 0);

        if (words.length === 0) return;

        try {
            console.log(`📦 [Frontend] Adding ${words.length} words:`, words);
            const response = await fetch('/api/codenames/manage-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listId: selectedList,
                    words: words
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Add all new words to the list
                const newWords = result.words || [];
                setWordListWords(prev => [...prev, ...newWords].sort((a, b) => a.word.localeCompare(b.word)));
                setBulkAddWords('');
                console.log(`✅ [Frontend] Added ${newWords.length} words`);
                alert(`Successfully added ${newWords.length} words to the list!`);
            } else {
                console.error('❌ [Frontend] Failed to add words:', result.error);
                alert(`Failed to add words: ${result.error}`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Error adding words:', error);
            alert('Failed to add words');
        }
    };

    const removeWord = async (wordId: string) => {
        if (!selectedList || selectedListType !== 'word' || !confirm('Are you sure you want to remove this word?')) return;

        try {
            console.log(`🗑️ [Frontend] Removing word: ${wordId}`);
            const response = await fetch(`/api/codenames/manage-words?listId=${selectedList}&wordId=${wordId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                setWordListWords(prev => prev.filter(word => word.id !== wordId));
                console.log(`✅ [Frontend] Removed word: ${wordId}`);
            } else {
                console.error('❌ [Frontend] Failed to remove word:', result.error);
                alert(`Failed to remove word: ${result.error}`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Error removing word:', error);
            alert('Failed to remove word');
        }
    };

    // Handle list selection change
    const handleListSelection = (value: string) => {
        if (!value) {
            setSelectedList('');
            setSelectedListType(null);
            setWordListWords([]);
            setImageListImages([]);
            return;
        }

        const [type, id] = value.split(':');
        setSelectedList(id);
        setSelectedListType(type as 'word' | 'image');

        // Clear previous data
        setWordListWords([]);
        setImageListImages([]);
        setNewWord('');
        setBulkAddWords('');
        setIsBulkMode(false);

        // Load new data
        loadListContent(id, type as 'word' | 'image');
    };

    // Get all available lists combined
    const allLists = [
        ...wordLists.map(list => ({ ...list, type: 'word' as const, id: list.filename })),
        ...imageLists
            .filter(list => list.is_user_created)
            .map(list => ({ ...list, type: 'image' as const, id: list.folder }))
    ];

    const removeImage = async (imageId: string) => {
        if (!selectedList || selectedListType !== 'image' || !confirm('Are you sure you want to remove this image? This action cannot be undone.')) return;

        try {
            console.log(`🗑️ [Frontend] Removing image: ${imageId}`);
            const response = await fetch(`/api/codenames/manage-images?listId=${selectedList}&imageId=${imageId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                setImageListImages(prev => prev.filter(img => img.id !== imageId));
                console.log(`✅ [Frontend] Removed image: ${imageId}`);
            } else {
                console.error('❌ [Frontend] Failed to remove image:', result.error);
                alert(`Failed to remove image: ${result.error}`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Error removing image:', error);
            alert('Failed to remove image');
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files);
    };

    const compressImage = async (file: File): Promise<File> => {
        console.log(`🖼️ [Compress] Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;

            if (!ctx) {
                console.error('❌ [Compress] Could not get canvas context');
                resolve(file);
                return;
            }

            const img = new Image();

            img.onload = () => {
                console.log(`📏 [Compress] Original dimensions: ${img.width}x${img.height}`);

                // Calculate new dimensions (max 1920px on longest side)
                const maxDimension = 1920;
                let { width, height } = img;

                if (width > height) {
                    if (width > maxDimension) {
                        height = (height * maxDimension) / width;
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = (width * maxDimension) / height;
                        height = maxDimension;
                    }
                }

                console.log(`📏 [Compress] New dimensions: ${Math.round(width)}x${Math.round(height)}`);
                canvas.width = Math.round(width);
                canvas.height = Math.round(height);

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        console.log(`✅ [Compress] Compressed to ${(blob.size / 1024 / 1024).toFixed(2)}MB (${((1 - blob.size / file.size) * 100).toFixed(1)}% reduction)`);
                        resolve(compressedFile);
                    } else {
                        console.warn('⚠️ [Compress] Canvas toBlob failed, using original file');
                        resolve(file); // Fallback to original
                    }
                }, 'image/jpeg', 0.8); // 80% quality
            };

            img.onerror = () => {
                console.error('❌ [Compress] Failed to load image for compression');
                resolve(file);
            };

            img.src = URL.createObjectURL(file);
        });
    };

    const handleUpload = async () => {
        if (!canUpload) return;

        console.log('🚀 [Frontend] Starting upload process...');
        console.log('📊 [Frontend] Upload details:', {
            mode: uploadMode,
            groupName: groupName || 'N/A',
            selectedGroupId: selectedGroupId || 'N/A',
            fileCount: selectedFiles.length
        });

        setIsUploading(true);
        setUploadProgress('Processing images...');

        try {
            let processedFiles = [...selectedFiles];
            console.log('🗜️ [Frontend] Checking for compression needs...');

            // Compress images over 5MB
            const compressedFiles: File[] = [];
            for (const file of selectedFiles) {
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    console.log(`🗜️ [Frontend] Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);
                    setUploadProgress(`Compressing ${file.name}...`);
                    const compressed = await compressImage(file);
                    compressedFiles.push(compressed);
                    console.log(`✅ [Frontend] Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
                } else {
                    console.log(`⏭️ [Frontend] Skipping compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                    compressedFiles.push(file);
                }
            }

            processedFiles = compressedFiles;
            console.log(`📦 [Frontend] Ready to upload ${processedFiles.length} files`);

            const formData = new FormData();
            processedFiles.forEach((file, index) => {
                console.log(`📎 [Frontend] Adding file ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                formData.append('files', file);
            });

            if (uploadMode === 'new') {
                formData.append('groupName', groupName.trim());
                formData.append('mode', 'new');
                console.log('🆕 [Frontend] Creating new group:', groupName.trim());
            } else {
                formData.append('groupId', selectedGroupId);
                formData.append('mode', 'existing');
                console.log('📂 [Frontend] Adding to existing group:', selectedGroupId);
            }

            console.log('📡 [Frontend] Sending request to /api/codenames/upload-images...');
            setUploadProgress('Uploading images...');

            const response = await fetch('/api/codenames/upload-images', {
                method: 'POST',
                body: formData,
            });

            console.log(`📡 [Frontend] Response status: ${response.status}`);

            const result = await response.json();
            console.log('📡 [Frontend] Response body:', result);

            if (response.ok) {
                console.log('✅ [Frontend] Upload successful!');
                setUploadProgress(`Success! Uploaded ${result.uploadedCount}/${result.totalFiles} images`);

                // Show detailed success message
                if (result.uploadedCount < result.totalFiles) {
                    setUploadProgress(`Partial success: ${result.uploadedCount}/${result.totalFiles} images uploaded. Check console for details.`);
                }

                // Reset form
                setSelectedFiles([]);
                setGroupName('');
                setSelectedGroupId('');
                // Refresh image lists
                console.log('🔄 [Frontend] Refreshing image lists...');
                getImageLists().then(setImageLists);
                // Reset file input
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                console.error('❌ [Frontend] Upload failed:', result.error);

                // Show user-friendly error messages
                let errorMessage = result.error;
                if (result.error.includes('Bucket not found')) {
                    errorMessage = 'Storage bucket not found. Please create the "codenames-images" bucket in your Supabase Storage dashboard.';
                } else if (result.error.includes('already exists')) {
                    errorMessage = 'Group name already exists. Try a different name or add to existing group.';
                }

                setUploadProgress(`Error: ${errorMessage}`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Unexpected error:', error);
            setUploadProgress('Error uploading images');
        } finally {
            setIsUploading(false);
            console.log('🏁 [Frontend] Upload process completed');
        }
    };

    // Create new list function
    const createNewList = async () => {
        if (!newListName.trim()) return;

        setIsCreating(true);
        try {
            console.log(`🆕 [Frontend] Creating new ${createListType} list: ${newListName.trim()}`);

            // Parse words for word lists
            let words: string[] = [];
            if (createListType === 'word' && bulkWords.trim()) {
                words = bulkWords
                    .split(',')
                    .map(word => word.trim())
                    .filter(word => word.length > 0);
                console.log(`📝 [Frontend] Parsed ${words.length} words:`, words);
            }

            const response = await fetch('/api/codenames/create-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: createListType,
                    name: newListName.trim(),
                    words: words.length > 0 ? words : undefined
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`✅ [Frontend] Created ${createListType} list: ${result.list.name}`);
                if (result.wordsAdded > 0) {
                    console.log(`✅ [Frontend] Added ${result.wordsAdded} words to the list`);
                }

                // Reset form
                setNewListName('');
                setBulkWords('');

                // Refresh the lists
                console.log('🔄 [Frontend] Refreshing lists...');
                if (createListType === 'word') {
                    getWordLists().then(setWordLists);
                } else {
                    getImageLists().then(setImageLists);
                }

                const wordCountMsg = result.wordsAdded > 0 ? ` with ${result.wordsAdded} words` : '';
                alert(`Successfully created ${createListType} list: "${result.list.name}"${wordCountMsg}`);
            } else {
                console.error('❌ [Frontend] Failed to create list:', result.error);
                alert(`Failed to create list: ${result.error}`);
            }
        } catch (error) {
            console.error('💥 [Frontend] Error creating list:', error);
            alert('Failed to create list');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <main className="h-screen w-screen flex flex-col items-center py-8 overflow-y-auto" style={{ backgroundColor: '#fafafa' }}>
            <h1 className="text-6xl font-bold text-gray-900 mb-12">Codenames</h1>

            <div className="w-full max-w-4xl px-8 pb-8">
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
                        onClick={() => setActiveTab('manage')}
                        className={`flex-1 px-8 py-4 rounded-t-lg font-semibold text-xl transition-colors ${activeTab === 'manage'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                    >
                        Manage Lists
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

                {/* Manage Section */}
                {activeTab === 'manage' && (
                    <div className="bg-gray-50 rounded-b-lg p-8 flex flex-col gap-8">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Manage Lists & Upload</h3>
                            <p className="text-gray-600">Edit word lists, manage images, and upload new content</p>
                        </div>

                        {/* Sub-tabs for Manage section */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setManageSubTab('lists')}
                                className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${manageSubTab === 'lists'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                            >
                                Manage Lists
                            </button>
                            <button
                                onClick={() => setManageSubTab('create')}
                                className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${manageSubTab === 'create'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                            >
                                Create List
                            </button>
                            <button
                                onClick={() => setManageSubTab('upload')}
                                className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${manageSubTab === 'upload'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                            >
                                Upload Images
                            </button>
                        </div>

                        {/* Manage Lists Sub-section */}
                        {manageSubTab === 'lists' && (
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                {/* Combined List Selector */}
                                <div className="mb-6">
                                    <label className="block text-lg font-semibold text-gray-800 mb-2">
                                        Select a List to Manage:
                                    </label>
                                    <select
                                        value={selectedListType && selectedList ? `${selectedListType}:${selectedList}` : ''}
                                        onChange={(e) => handleListSelection(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                                    >
                                        <option value="">Choose a list to manage...</option>
                                        <optgroup label="Word Lists">
                                            {wordLists.map((list) => (
                                                <option key={`word:${list.filename}`} value={`word:${list.filename}`}>
                                                    {list.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Image Lists">
                                            {imageLists
                                                .filter(list => list.is_user_created)
                                                .map((list) => (
                                                    <option key={`image:${list.folder}`} value={`image:${list.folder}`}>
                                                        {list.name}
                                                    </option>
                                                ))}
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Dynamic Content Based on Selection */}
                                {selectedList && selectedListType && (
                                    <div>
                                        {selectedListType === 'word' ? (
                                            <div>
                                                <h4 className="text-xl font-semibold text-gray-800 mb-4">
                                                    Words in "{wordLists.find(l => l.filename === selectedList)?.name}"
                                                </h4>

                                                {isLoading ? (
                                                    <div className="text-center py-4">
                                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                        <p className="text-gray-600 mt-2">Loading words...</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {/* Add Mode Toggle */}
                                                        <div className="flex gap-2 mb-4">
                                                            <button
                                                                onClick={() => setIsBulkMode(false)}
                                                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${!isBulkMode
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                                    }`}
                                                            >
                                                                Single Word
                                                            </button>
                                                            <button
                                                                onClick={() => setIsBulkMode(true)}
                                                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isBulkMode
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                                    }`}
                                                            >
                                                                Bulk Add
                                                            </button>
                                                        </div>

                                                        {/* Add New Word */}
                                                        {!isBulkMode ? (
                                                            <div className="flex gap-2 mb-4">
                                                                <input
                                                                    type="text"
                                                                    value={newWord}
                                                                    onChange={(e) => setNewWord(e.target.value)}
                                                                    placeholder="Enter a new word"
                                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    onKeyPress={(e) => e.key === 'Enter' && addWord()}
                                                                />
                                                                <button
                                                                    onClick={addWord}
                                                                    disabled={!newWord.trim()}
                                                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                                >
                                                                    Add Word
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="mb-4">
                                                                <textarea
                                                                    value={bulkAddWords}
                                                                    onChange={(e) => setBulkAddWords(e.target.value)}
                                                                    placeholder="Paste words separated by commas&#10;e.g., apple, banana, cherry"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    rows={3}
                                                                    maxLength={5000}
                                                                />
                                                                <div className="flex gap-2 mt-2">
                                                                    <button
                                                                        onClick={addBulkWords}
                                                                        disabled={!bulkAddWords.trim()}
                                                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                                    >
                                                                        Add Words
                                                                    </button>
                                                                    <span className="text-sm text-gray-600 self-center">
                                                                        {bulkAddWords.trim() ?
                                                                            `${bulkAddWords.split(',').map(w => w.trim()).filter(w => w.length > 0).length} words detected`
                                                                            : 'Paste comma-separated words'
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Words List */}
                                                        <div className="max-h-64 overflow-y-auto border rounded-md">
                                                            {wordListWords.length === 0 ? (
                                                                <p className="text-gray-500 text-center py-4">No words in this list yet.</p>
                                                            ) : (
                                                                <ul className="divide-y divide-gray-200">
                                                                    {wordListWords.map((word) => (
                                                                        <li key={word.id} className="flex justify-between items-center px-4 py-3">
                                                                            <span className="text-gray-800">{word.word}</span>
                                                                            <button
                                                                                onClick={() => removeWord(word.id)}
                                                                                className="text-red-600 hover:text-red-800 p-1"
                                                                                title="Remove word"
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 011-1v1z" />
                                                                                </svg>
                                                                            </button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>

                                                        <p className="text-sm text-gray-600 mt-2">
                                                            Total words: {wordListWords.length}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="text-xl font-semibold text-gray-800 mb-4">
                                                    Images in "{imageLists.find(l => l.folder === selectedList)?.name}"
                                                </h4>

                                                {isLoading ? (
                                                    <div className="text-center py-4">
                                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                        <p className="text-gray-600 mt-2">Loading images...</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {/* Images Grid */}
                                                        <div className="max-h-96 overflow-y-auto">
                                                            {imageListImages.length === 0 ? (
                                                                <p className="text-gray-500 text-center py-8">No images in this list yet.</p>
                                                            ) : (
                                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                    {imageListImages.map((image) => (
                                                                        <div key={image.id} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                                                                            <img
                                                                                src={image.image_path}
                                                                                alt={image.original_filename}
                                                                                className="w-full h-24 object-cover"
                                                                                loading="lazy"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                                                                                <button
                                                                                    onClick={() => removeImage(image.id)}
                                                                                    className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-all duration-200"
                                                                                    title="Remove image"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 011-1v1z" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate">
                                                                                {image.original_filename}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <p className="text-sm text-gray-600 mt-2">
                                                            Total images: {imageListImages.length}
                                                        </p>

                                                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                            <p className="text-sm text-yellow-800">
                                                                <strong>Warning:</strong> Removing images is permanent and cannot be undone. Make sure you want to delete these images before proceeding.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Create List Sub-section */}
                        {manageSubTab === 'create' && (
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="text-center mb-6">
                                    <h4 className="text-xl font-bold text-gray-800 mb-2">Create New List</h4>
                                    <p className="text-gray-600">Create a new word list or image list for your games</p>
                                </div>

                                <div>
                                    <label className="block text-lg font-semibold text-gray-800 mb-2">
                                        List Type:
                                    </label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setCreateListType('word')}
                                            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-lg transition-colors ${createListType === 'word'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                }`}
                                        >
                                            📝 Word List
                                        </button>
                                        <button
                                            onClick={() => setCreateListType('image')}
                                            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-lg transition-colors ${createListType === 'image'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                }`}
                                        >
                                            🖼️ Image List
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label className="block text-lg font-semibold text-gray-800 mb-2">
                                        List Name:
                                    </label>
                                    <input
                                        type="text"
                                        value={newListName}
                                        onChange={(e) => setNewListName(e.target.value)}
                                        placeholder={createListType === 'word' ? 'e.g., Custom Words' : 'e.g., Family Photos'}
                                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                                        maxLength={100}
                                    />
                                </div>

                                {createListType === 'word' && (
                                    <div className="mt-4">
                                        <label className="block text-lg font-semibold text-gray-800 mb-2">
                                            Words (comma-separated):
                                        </label>
                                        <textarea
                                            value={bulkWords}
                                            onChange={(e) => setBulkWords(e.target.value)}
                                            placeholder="e.g., apple, banana, cherry, dog, elephant"
                                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                                            rows={4}
                                            maxLength={10000}
                                        />
                                        <p className="text-sm text-gray-600 mt-1">
                                            Paste or type words separated by commas. Extra spaces will be automatically removed.
                                        </p>
                                    </div>
                                )}


                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> {createListType === 'word'
                                            ? 'Add words now (comma-separated) or add them later in the "Manage Lists" tab.'
                                            : 'You can upload images to this list after creation in the "Upload Images" tab.'
                                        }
                                    </p>
                                </div>

                                <button
                                    onClick={createNewList}
                                    disabled={!newListName.trim() || isCreating}
                                    className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors mt-6 ${newListName.trim() && !isCreating
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {isCreating ? 'Creating...' : `Create ${createListType === 'word' ? 'Word' : 'Image'} List`}
                                </button>
                            </div>
                        )}

                        {/* Upload Images Sub-section */}
                        {manageSubTab === 'upload' && (
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="text-center mb-6">
                                    <h4 className="text-xl font-bold text-gray-800 mb-2">Upload Your Own Images</h4>
                                    <p className="text-gray-600">Create custom image sets for your Codenames games</p>
                                </div>

                                <div>
                                    <label className="block text-lg font-semibold text-gray-800 mb-2">
                                        Upload Mode:
                                    </label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setUploadMode('new')}
                                            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-lg transition-colors ${uploadMode === 'new'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                }`}
                                        >
                                            Create New Group
                                        </button>
                                        <button
                                            onClick={() => setUploadMode('existing')}
                                            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-lg transition-colors ${uploadMode === 'existing'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                }`}
                                        >
                                            Add to Existing Group
                                        </button>
                                    </div>
                                </div>

                                {uploadMode === 'new' && (
                                    <div>
                                        <label className="block text-lg font-semibold text-gray-800 mb-2">
                                            New Group Name:
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
                                )}

                                {uploadMode === 'existing' && (
                                    <div>
                                        <label className="block text-lg font-semibold text-gray-800 mb-2">
                                            Select Existing Group:
                                        </label>
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                                        >
                                            <option value="">Choose an existing group...</option>
                                            {imageLists
                                                .filter(group => group.is_user_created)
                                                .map((group) => (
                                                    <option key={group.folder} value={group.folder}>
                                                        {group.name}
                                                    </option>
                                                ))}
                                        </select>
                                        {imageLists.filter(group => group.is_user_created).length === 0 && (
                                            <p className="text-sm text-gray-500 mt-2">
                                                No custom groups yet. Create a new group first!
                                            </p>
                                        )}
                                    </div>
                                )}

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
                                        Supported formats: JPG, PNG, GIF, WebP, HEIC (max 5MB each)
                                    </p>
                                </div>

                                {selectedFiles.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-800 mb-2">
                                            Selected Files ({selectedFiles.length})
                                            {selectedFiles.some(file => file.size > 5 * 1024 * 1024) && (
                                                <span className="text-orange-600 text-sm ml-2">
                                                    • Large files will be compressed
                                                </span>
                                            )}
                                        </h4>
                                        <div className="max-h-32 overflow-y-auto">
                                            <ul className="text-sm text-blue-700 space-y-1">
                                                {selectedFiles.map((file, index) => {
                                                    const sizeMB = file.size / 1024 / 1024;
                                                    const willCompress = sizeMB > 5;
                                                    return (
                                                        <li key={index} className="flex justify-between items-center">
                                                            <span className="truncate mr-2">{file.name}</span>
                                                            <span className={`text-xs ${willCompress ? 'text-orange-600' : ''}`}>
                                                                {sizeMB.toFixed(2)} MB
                                                                {willCompress && ' → compressed'}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
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
                )}
            </div>
        </main>
    );
}
