'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWordLists, type WordListInfo } from '@/lib/chameleon/words';
import { getImageLists, type ImageListInfo } from '@/lib/chameleon/images';
import { generateGameCode } from '@/lib/chameleon/game';

export default function ChameleonPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'join' | 'create' | 'manage'>('join');

  // Join state
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinPlayerName, setJoinPlayerName] = useState<string>('');

  // Create state
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

  // Create game mode - whether to join as player or display board only
  const [createAsPlayer, setCreateAsPlayer] = useState(true);

  useEffect(() => {
    // Load available word lists and image lists
    console.log('📋 [Chameleon Page] Loading lists on mount...');
    getWordLists().then((lists) => {
      console.log('✅ [Chameleon Page] Loaded word lists:', lists);
      setWordLists(lists);
    }).catch((err) => {
      console.error('❌ [Chameleon Page] Error loading word lists:', err);
    });
    getImageLists().then((lists) => {
      console.log('✅ [Chameleon Page] Loaded image lists:', lists);
      setImageLists(lists);
    }).catch((err) => {
      console.error('❌ [Chameleon Page] Error loading image lists:', err);
    });
  }, []);

  const handleJoin = async () => {
    if (!joinCode || !joinPlayerName.trim()) return;

    try {
      console.log(`🎮 [Frontend] Joining game: ${joinCode}`);
      const response = await fetch(`/api/chameleon/game-sessions?code=${joinCode}`);
      const result = await response.json();

      if (response.ok) {
        const session = result.session;
        console.log('✅ [Frontend] Found session:', session.session_code);

        // Join as player
        const joinResponse = await fetch('/api/chameleon/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionCode: joinCode,
            playerName: joinPlayerName.trim(),
          }),
        });

        const joinResult = await joinResponse.json();

        if (joinResponse.ok) {
          console.log('✅ [Frontend] Joined as player:', joinResult.player.player_id);
          router.push(`/chameleon/player?code=${joinCode}&playerId=${joinResult.player.player_id}`);
        } else {
          console.error('❌ [Frontend] Failed to join:', joinResult.error);
          alert(`Failed to join: ${joinResult.error}`);
        }
      } else {
        console.error('❌ [Frontend] Session not found:', result.error);
        alert(`Game code "${joinCode}" not found. Please check and try again.`);
      }
    } catch (error) {
      console.error('💥 [Frontend] Error joining game:', error);
      alert('Failed to join game. Please try again.');
    }
  };

  const handleCreate = async () => {
    if (!createVariant) return;

    try {
      console.log('🎮 [Frontend] Creating display board...');
      const response = await fetch('/api/chameleon/game-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: createMode,
          variant: createVariant,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ [Frontend] Created display board:', result.session.session_code);
        console.log('📺 [Frontend] Opening display board...');
        router.push(`/chameleon/table?code=${result.session.session_code}&mode=${createMode}`);
      } else {
        console.error('❌ [Frontend] Failed to create display board:', result.error);
        alert(`Failed to create display board: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 [Frontend] Error creating display board:', error);
      alert('Failed to create display board');
    }
  };

  const availableVariants = createMode === 'word' ? wordLists : imageLists;
  const canJoin = joinCode.length === 6 && joinPlayerName.trim().length > 0;
  const canCreate = createVariant !== '';
  const canUpload =
    selectedFiles.length > 0 &&
    ((uploadMode === 'new' && groupName.trim() !== '') || (uploadMode === 'existing' && selectedGroupId !== ''));

  const loadListContent = async (listId: string, type: 'word' | 'image') => {
    if (!listId) return;

    setIsLoading(true);
    try {
      console.log(`📖 [Frontend] Loading ${type}s for list: ${listId}`);
      const endpoint = type === 'word' ? 'manage-words' : 'manage-images';
      const response = await fetch(`/api/chameleon/${endpoint}?listId=${listId}`);
      const result = await response.json();

      if (response.ok) {
        if (type === 'word') {
          setWordListWords(result.words || []);
          console.log(`✅ [Frontend] Loaded ${result.words?.length || 0} words`);
        } else {
          setImageListImages(result.images || []);
          console.log(`✅ [Frontend] Loaded ${result.images?.length || 0} images`);
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
      const response = await fetch('/api/chameleon/manage-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedList,
          word: newWord.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setWordListWords((prev) =>
          [...prev, result.word].sort((a, b) => a.word.localeCompare(b.word))
        );
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
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    if (words.length === 0) return;

    try {
      console.log(`📦 [Frontend] Adding ${words.length} words:`, words);
      const response = await fetch('/api/chameleon/manage-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedList,
          words: words,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const newWords = result.words || [];
        setWordListWords((prev) =>
          [...prev, ...newWords].sort((a, b) => a.word.localeCompare(b.word))
        );
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
    if (!selectedList || selectedListType !== 'word') return;

    try {
      console.log(`🗑️ [Frontend] Removing word: ${wordId} from list: ${selectedList}`);
      const response = await fetch(
        `/api/chameleon/manage-words?listId=${selectedList}&wordId=${wordId}`,
        {
          method: 'DELETE',
        }
      );

      console.log(`📡 [Frontend] Response status: ${response.status}`);
      const result = await response.json();
      console.log(`📡 [Frontend] Response body:`, result);

      if (response.ok) {
        setWordListWords((prev) => prev.filter((w) => w.id !== wordId));
        console.log(`✅ [Frontend] Removed word: ${wordId}`);
      } else {
        console.error('❌ [Frontend] Failed to remove word:', result.error);
      }
    } catch (error) {
      console.error('💥 [Frontend] Error removing word:', error);
    }
  };

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

    setWordListWords([]);
    setImageListImages([]);
    setNewWord('');
    setBulkAddWords('');
    setIsBulkMode(false);

    loadListContent(id, type as 'word' | 'image');
  };

  const removeImage = async (imageId: string) => {
    if (!selectedList || selectedListType !== 'image') return;

    try {
      console.log(`🗑️ [Frontend] Removing image: ${imageId} from list: ${selectedList}`);
      const response = await fetch(
        `/api/chameleon/manage-images?listId=${selectedList}&imageId=${imageId}`,
        {
          method: 'DELETE',
        }
      );

      console.log(`📡 [Frontend] Response status: ${response.status}`);
      const result = await response.json();
      console.log(`📡 [Frontend] Response body:`, result);

      if (response.ok) {
        setImageListImages((prev) => prev.filter((img) => img.id !== imageId));
        console.log(`✅ [Frontend] Removed image: ${imageId}`);
      } else {
        console.error('❌ [Frontend] Failed to remove image:', result.error);
      }
    } catch (error) {
      console.error('💥 [Frontend] Error removing image:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!canUpload) return;

    console.log('🚀 [Frontend] Starting upload process...');

    setIsUploading(true);
    setUploadProgress('Uploading images...');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        console.log(`📎 [Frontend] Adding file: ${file.name}`);
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

      console.log('📡 [Frontend] Sending request to /api/chameleon/upload-images...');

      const response = await fetch('/api/chameleon/upload-images', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ [Frontend] Upload successful!');
        setUploadProgress(`Success! Uploaded ${result.uploadedCount}/${result.totalFiles} images`);

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
        setUploadProgress(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 [Frontend] Unexpected error:', error);
      setUploadProgress('Error uploading images');
    } finally {
      setIsUploading(false);
      console.log('🏁 [Frontend] Upload process completed');
    }
  };

  const createNewList = async () => {
    if (!newListName.trim()) return;

    setIsCreating(true);
    try {
      console.log(`🆕 [Frontend] Creating new ${createListType} list: ${newListName.trim()}`);

      let words: string[] = [];
      if (createListType === 'word' && bulkWords.trim()) {
        words = bulkWords
          .split(',')
          .map((word) => word.trim())
          .filter((word) => word.length > 0);
        console.log(`📝 [Frontend] Parsed ${words.length} words:`, words);
      }

      const response = await fetch('/api/chameleon/create-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: createListType,
          name: newListName.trim(),
          words: words.length > 0 ? words : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ [Frontend] Created ${createListType} list: ${result.list.name}`);

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
      <h1 className="text-6xl font-bold text-gray-900 mb-12">Chameleon</h1>

      <div className="w-full max-w-4xl px-8 pb-8">
        {/* Tab Selection */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 px-8 py-4 rounded-t-lg font-semibold text-xl transition-colors ${
              activeTab === 'join' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Join Game
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-8 py-4 rounded-t-lg font-semibold text-xl transition-colors ${
              activeTab === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Create Game
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 px-8 py-4 rounded-t-lg font-semibold text-xl transition-colors ${
              activeTab === 'manage' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Manage Lists
          </button>
        </div>

        {/* Join Section */}
        {activeTab === 'join' && (
          <div className="bg-gray-50 rounded-b-lg p-8 flex flex-col gap-6">
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-2">Game Code:</label>
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
              <label className="block text-lg font-semibold text-gray-800 mb-2">Your Name:</label>
              <input
                type="text"
                value={joinPlayerName}
                onChange={(e) => setJoinPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={!canJoin}
              className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors ${
                canJoin ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Join Game
            </button>
          </div>
        )}

        {/* Create Section */}
        {activeTab === 'create' && (
          <div className="bg-gray-50 rounded-b-lg p-8 flex flex-col gap-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Create Display Board</h3>
              <p className="text-gray-600">Set up a display board to share with your group</p>
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-2">Content Mode:</label>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCreateMode('word');
                    setCreateVariant('');
                  }}
                  className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${
                    createMode === 'word'
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
                  className={`flex-1 px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${
                    createMode === 'image'
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
                    const key = createMode === 'word' ? (variant as WordListInfo).filename : (variant as ImageListInfo).folder;
                    const value = createMode === 'word' ? (variant as WordListInfo).filename : (variant as ImageListInfo).folder;
                    return (
                      <option key={key} value={value}>
                        {variant.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!createVariant}
              className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors ${
                createVariant ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Create Display Board
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

            {/* Sub-tabs */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setManageSubTab('lists')}
                className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                  manageSubTab === 'lists'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Manage Lists
              </button>
              <button
                onClick={() => setManageSubTab('create')}
                className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                  manageSubTab === 'create'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Create List
              </button>
              <button
                onClick={() => setManageSubTab('upload')}
                className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                  manageSubTab === 'upload'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Upload Images
              </button>
            </div>

            {/* Manage Lists */}
            {manageSubTab === 'lists' && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="mb-6">
                  <label className="block text-lg font-semibold text-gray-800 mb-2">Select a List to Manage:</label>
                  <select
                    value={selectedListType && selectedList ? `${selectedListType}:${selectedList}` : ''}
                    onChange={(e) => handleListSelection(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-lg"
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
                      {imageLists.map((list) => (
                        <option key={`image:${list.folder}`} value={`image:${list.folder}`}>
                          {list.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {selectedList && selectedListType && (
                  <div>
                    {selectedListType === 'word' ? (
                      <div>
                        <h4 className="text-xl font-semibold text-gray-800 mb-4">
                          Words in &quot;{wordLists.find((l) => l.filename === selectedList)?.name}&quot;
                        </h4>

                        {isLoading ? (
                          <div className="text-center py-4">
                            <p className="text-gray-600">Loading words...</p>
                          </div>
                        ) : (
                          <div>
                            {/* Add Mode Toggle */}
                            <div className="flex gap-2 mb-4">
                              <button
                                onClick={() => setIsBulkMode(false)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                  !isBulkMode
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                              >
                                Single Word
                              </button>
                              <button
                                onClick={() => setIsBulkMode(true)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                  isBulkMode
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                              >
                                Bulk Add
                              </button>
                            </div>

                            {/* Add Words */}
                            {!isBulkMode ? (
                              <div className="flex gap-2 mb-4">
                                <input
                                  type="text"
                                  value={newWord.toUpperCase()}
                                  onChange={(e) => setNewWord(e.target.value)}
                                  placeholder="Enter a new word"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
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
                                  value={bulkAddWords.toUpperCase()}
                                  onChange={(e) => setBulkAddWords(e.target.value)}
                                  placeholder="Paste words separated by commas"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                  rows={3}
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={addBulkWords}
                                    disabled={!bulkAddWords.trim()}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    Add Words
                                  </button>
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
                                      <span className="text-gray-800">{word.word.toUpperCase()}</span>
                                      <button
                                        onClick={() => removeWord(word.id)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                      >
                                        🗑️
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mt-2">Total words: {wordListWords.length}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-xl font-semibold text-gray-800 mb-4">
                          Images in &quot;{imageLists.find((l) => l.folder === selectedList)?.name}&quot;
                        </h4>

                        {isLoading ? (
                          <div className="text-center py-4">
                            <p className="text-gray-600">Loading images...</p>
                          </div>
                        ) : (
                          <div>
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
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all">
                                        <button
                                          onClick={() => removeImage(image.id)}
                                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mt-2">Total images: {imageListImages.length}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Create List */}
            {manageSubTab === 'create' && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-gray-800 mb-2">Create New List</h4>
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-2">List Type:</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setCreateListType('word')}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                        createListType === 'word'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      📝 Word List
                    </button>
                    <button
                      onClick={() => setCreateListType('image')}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                        createListType === 'image'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      🖼️ Image List
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-lg font-semibold text-gray-800 mb-2">List Name:</label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Animals, Nature, Food"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
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
                    />
                  </div>
                )}

                <button
                  onClick={createNewList}
                  disabled={!newListName.trim() || isCreating}
                  className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors mt-6 ${
                    newListName.trim() && !isCreating
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isCreating ? 'Creating...' : `Create ${createListType === 'word' ? 'Word' : 'Image'} List`}
                </button>
              </div>
            )}

            {/* Upload Images */}
            {manageSubTab === 'upload' && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-gray-800 mb-2">Upload Your Own Images</h4>
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-2">Upload Mode:</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setUploadMode('new')}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                        uploadMode === 'new'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      Create New Group
                    </button>
                    <button
                      onClick={() => setUploadMode('existing')}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                        uploadMode === 'existing'
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
                    <label className="block text-lg font-semibold text-gray-800 mb-2">New Group Name:</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., My Vacation"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                    />
                  </div>
                )}

                {uploadMode === 'existing' && (
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-2">Select Existing Group:</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                    >
                      <option value="">Choose an existing group...</option>
                      {imageLists.map((group) => (
                        <option key={group.folder} value={group.folder}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-2">Select Images:</label>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-lg"
                  />
                  <p className="text-sm text-gray-500 mt-2">Supported formats: JPG, PNG, GIF, WebP, HEIC</p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Selected Files ({selectedFiles.length})</h4>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="text-sm text-blue-700 space-y-1">
                        {selectedFiles.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {uploadProgress && (
                  <div
                    className={`p-4 rounded-lg ${
                      uploadProgress.includes('Success')
                        ? 'bg-green-50 border border-green-200'
                        : uploadProgress.includes('Error')
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <p
                      className={`font-semibold ${
                        uploadProgress.includes('Success')
                          ? 'text-green-800'
                          : uploadProgress.includes('Error')
                            ? 'text-red-800'
                            : 'text-blue-800'
                      }`}
                    >
                      {uploadProgress}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!canUpload || isUploading}
                  className={`px-8 py-4 rounded-lg font-semibold text-xl transition-colors ${
                    canUpload && !isUploading
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Upload Images'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
