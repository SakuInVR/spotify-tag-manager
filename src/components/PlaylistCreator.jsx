import React, { useState, useEffect } from 'react';

function PlaylistCreator({ spotifyApi, supabase, spotifyUserId, supabaseUserId, isLoggedIn }) {
  const [tracks, setTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagCounts, setTagCounts] = useState({}); // タグの使用回数を保存
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [tagSearchText, setTagSearchText] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [filteredTagList, setFilteredTagList] = useState([]);
  const [compactView, setCompactView] = useState(true); // デフォルトでシンプル表示（true）に設定
  const [searchMode, setSearchMode] = useState('AND'); // 検索モード（初期値はAND検索）

  // すべてのタグ付けされた曲を取得
  useEffect(() => {
    if (!supabaseUserId || !isLoggedIn) return;

    const fetchTaggedTracks = async () => {
      setLoading(true);
      try {
        // タグ付けされた曲を取得（ユーザーIDまたはSpotifyユーザーIDで検索）
        let query = supabase
          .from('tagged_tracks')
          .select('*')
          .eq('user_id', supabaseUserId);
          
        // Spotifyユーザーが設定されている場合は、そのユーザーのデータも取得
        if (spotifyUserId) {
          query = supabase
            .from('tagged_tracks')
            .select('*')
            .or(`user_id.eq.${supabaseUserId},spotify_user_id.eq.${spotifyUserId}`);
        }
        
        const { data, error } = await query.order('added_at', { ascending: false });

        if (error) throw error;

        console.log('Fetched tracks for playlist:', data);
        
        // 曲ごとにグループ化し、重複を排除
        const trackMap = new Map();
        const tagCountsObj = {}; // タグのカウント用オブジェクト
        const processedTags = new Set(); // 処理済みのtrack_id+tagの組み合わせを記録

        if (data && data.length > 0) {
          data.forEach(item => {
            const trackTagKey = `${item.track_id}-${item.tag}`;
            
            // 同じ曲の同じタグは一度だけ処理
            if (!processedTags.has(trackTagKey)) {
              processedTags.add(trackTagKey);
              // タグの使用回数をカウント
              tagCountsObj[item.tag] = (tagCountsObj[item.tag] || 0) + 1;
            }
            
            if (!trackMap.has(item.track_id)) {
              trackMap.set(item.track_id, {
                id: item.track_id,
                name: item.track_name,
                artist: item.artist_name,
                album: item.album_name,
                image: item.album_image,
                tags: [item.tag],
                added_at: item.added_at
              });
            } else {
              const track = trackMap.get(item.track_id);
              if (!track.tags.includes(item.tag)) {
                track.tags.push(item.tag);
              }
            }
          });
        }

        // タグを使用回数順にソート
        const sortedTags = Object.keys(tagCountsObj).sort((a, b) => tagCountsObj[b] - tagCountsObj[a]);

        const uniqueTracks = Array.from(trackMap.values());
        console.log('Unique tracks for playlist:', uniqueTracks);
        console.log('Tag counts:', tagCountsObj);
        
        setTracks(uniqueTracks);
        setFilteredTracks(uniqueTracks);
        setAllTags(sortedTags);
        setTagCounts(tagCountsObj);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tagged tracks:', err);
        setError('タグ付けされた曲の取得中にエラーが発生しました。');
        setLoading(false);
      }
    };

    fetchTaggedTracks();
  }, [supabase, supabaseUserId, spotifyUserId]);

  // タグを選択/解除
  const toggleTag = (tag) => {
    setSelectedTags(prevTags => {
      if (prevTags.includes(tag)) {
        return prevTags.filter(t => t !== tag);
      } else {
        return [...prevTags, tag];
      }
    });
  };

  // タグ検索テキストが変更されたときにタグリストをフィルタリング
  useEffect(() => {
    if (tagSearchText.trim() === '') {
      setFilteredTagList(allTags);
    } else {
      const searchLower = tagSearchText.toLowerCase().trim();
      const filtered = allTags.filter(tag => 
        tag.toLowerCase().includes(searchLower)
      );
      setFilteredTagList(filtered);
      setShowAllTags(true); // 検索時は全てのタグを表示
    }
  }, [tagSearchText, allTags]);

  // 選択されたタグに基づいて曲をフィルタリング（検索モードに応じて異なる）
  useEffect(() => {
    if (selectedTags.length === 0) {
      setFilteredTracks(tracks);
    } else {
      let filtered;
      
      if (searchMode === 'AND') {
        // AND検索：すべてのタグを含む曲をフィルタリング
        filtered = tracks.filter(track => 
          selectedTags.every(tag => track.tags.includes(tag))
        );
      } else {
        // OR検索：いずれかのタグを含む曲をフィルタリング
        filtered = tracks.filter(track => 
          selectedTags.some(tag => track.tags.includes(tag))
        );
      }
      
      setFilteredTracks(filtered);
    }
    // 曲のフィルタリングが変わったら選択をリセット
    setSelectedTrackIds([]);
  }, [selectedTags, tracks, searchMode]);

  // 曲の選択/解除
  const toggleTrackSelection = (trackId) => {
    setSelectedTrackIds(prevSelected => {
      if (prevSelected.includes(trackId)) {
        return prevSelected.filter(id => id !== trackId);
      } else {
        return [...prevSelected, trackId];
      }
    });
  };

  // すべての曲を選択/解除
  const toggleSelectAll = () => {
    if (selectedTrackIds.length === filteredTracks.length) {
      setSelectedTrackIds([]);
    } else {
      setSelectedTrackIds(filteredTracks.map(track => track.id));
    }
  };

  // プレイリストを作成
  const createPlaylist = async () => {
    if (selectedTrackIds.length === 0) {
      setMessage('プレイリストに追加する曲を選択してください。');
      return;
    }

    if (!playlistName.trim()) {
      setMessage('プレイリスト名を入力してください。');
      return;
    }

    setCreating(true);
    setMessage('プレイリストを作成中...');

    try {
      // 新しいプレイリストを作成
      const playlistResponse = await spotifyApi.createPlaylist(spotifyUserId, {
        name: playlistName,
        description: playlistDescription || `Created with Spotify Tag Manager - Tags: ${selectedTags.join(', ')}`,
        public: true
      });

      // 選択した曲をプレイリストに追加
      await spotifyApi.addTracksToPlaylist(
        playlistResponse.id,
        selectedTrackIds.map(id => `spotify:track:${id}`)
      );

      setMessage(`プレイリスト "${playlistName}" が正常に作成されました！`);
      setPlaylistName('');
      setPlaylistDescription('');
      setSelectedTrackIds([]);
    } catch (err) {
      console.error('Error creating playlist:', err);
      setMessage('プレイリストの作成中にエラーが発生しました。');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="playlist-creator-container">
      <h2>プレイリスト作成</h2>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="message">{message}</div>}
      
      <div className="filter-section">
        <h3>タグで絞り込む</h3>
        <p className="tags-filter-help">タグは使用頻度順に表示されています。</p>
        
        <div className="tag-search-container">
          <input
            type="text"
            className="tag-search-input"
            placeholder="タグを検索..."
            value={tagSearchText}
            onChange={(e) => setTagSearchText(e.target.value)}
            disabled={creating}
          />
          
          {/* 検索モード選択ラジオボタン */}
          <div className="search-mode-selector">
            <label className="search-mode-label">
              <input
                type="radio"
                name="searchMode"
                value="AND"
                checked={searchMode === 'AND'}
                onChange={() => setSearchMode('AND')}
                disabled={creating}
              />
              <span>AND検索 (すべてのタグを含む)</span>
            </label>
            <label className="search-mode-label">
              <input
                type="radio"
                name="searchMode"
                value="OR"
                checked={searchMode === 'OR'}
                onChange={() => setSearchMode('OR')}
                disabled={creating}
              />
              <span>OR検索 (いずれかのタグを含む)</span>
            </label>
          </div>
        </div>
        
        <div className="tags-filter">
          {(showAllTags ? filteredTagList : filteredTagList.slice(0, 20)).map(tag => (
            <button
              key={tag}
              className={`tag-filter ${selectedTags.includes(tag) ? 'selected' : ''}`}
              onClick={() => toggleTag(tag)}
              disabled={creating}
            >
              <span className="tag-filter-name">{tag}</span>
              <span className="tag-filter-count">{tagCounts[tag]}回</span>
            </button>
          ))}
        </div>
        
        {filteredTagList.length > 20 && !showAllTags && (
          <button 
            className="show-more-tags"
            onClick={() => setShowAllTags(true)}
            disabled={creating}
          >
            もっと見る ({filteredTagList.length - 20} タグ)
          </button>
        )}
        
        {showAllTags && tagSearchText === '' && (
          <button 
            className="show-less-tags"
            onClick={() => setShowAllTags(false)}
            disabled={creating}
          >
            表示を減らす
          </button>
        )}
        
        {selectedTags.length > 0 && (
          <button 
            className="clear-filters"
            onClick={() => setSelectedTags([])}
            disabled={creating}
          >
            フィルターをクリア
          </button>
        )}
      </div>
      
      <div className="playlist-form">
        <div className="form-group">
          <label htmlFor="playlist-name">プレイリスト名:</label>
          <input
            id="playlist-name"
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="新しいプレイリスト名"
            disabled={creating}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="playlist-description">説明 (オプション):</label>
          <textarea
            id="playlist-description"
            value={playlistDescription}
            onChange={(e) => setPlaylistDescription(e.target.value)}
            placeholder="プレイリストの説明"
            disabled={creating}
          />
        </div>
      </div>
      
      <div className="tracks-selection">
        <div className="selection-header">
          <div className="selection-header-left">
            <h3>曲を選択 ({selectedTrackIds.length}/{filteredTracks.length})</h3>
            <button 
              className={`view-toggle-button ${compactView ? 'compact-active' : ''}`}
              onClick={() => setCompactView(!compactView)}
              disabled={creating}
            >
              {compactView ? '詳細表示' : 'シンプル表示'}
            </button>
          </div>
          <button 
            className="select-all"
            onClick={toggleSelectAll}
            disabled={creating || filteredTracks.length === 0}
          >
            {selectedTrackIds.length === filteredTracks.length ? 'すべて解除' : 'すべて選択'}
          </button>
        </div>
        
        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : (
          <div className={`tracks-list ${compactView ? 'compact-view' : ''}`}>
            {filteredTracks.length > 0 ? (
              filteredTracks.map(track => (
                <div 
                  key={track.id} 
                  className={`track-card ${selectedTrackIds.includes(track.id) ? 'selected' : ''}`}
                  onClick={() => toggleTrackSelection(track.id)}
                >
                  {!compactView && (
                    <div className="track-image">
                      {track.image ? (
                        <img src={track.image} alt={`${track.album} album cover`} />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                  )}
                  <div className="track-info">
                    {compactView && track.image && (
                      <div className="compact-album-cover">
                        <img src={track.image} alt={`${track.album} album cover`} />
                      </div>
                    )}
                    <div className="track-title-container">
                      <h4>{track.name}</h4>
                    </div>
                    {!compactView && (
                      <>
                        <p className="artist">{track.artist}</p>
                        <p className="album">{track.album}</p>
                      </>
                    )}
                    <div className="track-tags">
                      {track.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  {selectedTrackIds.includes(track.id) && (
                    <div className="selection-indicator">
                      <span>✓</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-tracks">
                選択したタグに一致する曲はありません。
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="create-playlist-action">
        <button 
          className="create-playlist-button"
          onClick={createPlaylist}
          disabled={creating || selectedTrackIds.length === 0 || !playlistName.trim()}
        >
          {creating ? '作成中...' : 'プレイリストを作成'}
        </button>
      </div>
    </div>
  );
}

export default PlaylistCreator;
