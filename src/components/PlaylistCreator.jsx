import React, { useState, useEffect } from 'react';

function PlaylistCreator({ spotifyApi, supabase, spotifyUserId, supabaseUserId }) {
  const [tracks, setTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  // すべてのタグ付けされた曲を取得
  useEffect(() => {
    if (!supabaseUserId) return;

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
        
        // 曲ごとにグループ化
        const trackMap = new Map();
        const tagSet = new Set();

        if (data && data.length > 0) {
          data.forEach(item => {
          tagSet.add(item.tag);
          
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

        const uniqueTracks = Array.from(trackMap.values());
        console.log('Unique tracks for playlist:', uniqueTracks);
        setTracks(uniqueTracks);
        setFilteredTracks(uniqueTracks);
        setAllTags(Array.from(tagSet));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tagged tracks:', err);
        setError('タグ付けされた曲の取得中にエラーが発生しました。');
        setLoading(false);
      }
    };

    fetchTaggedTracks();
  }, [supabase, supabaseUserId]);

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

  // 選択されたタグに基づいて曲をフィルタリング
  useEffect(() => {
    if (selectedTags.length === 0) {
      setFilteredTracks(tracks);
    } else {
      const filtered = tracks.filter(track => 
        selectedTags.every(tag => track.tags.includes(tag))
      );
      setFilteredTracks(filtered);
    }
    // 曲のフィルタリングが変わったら選択をリセット
    setSelectedTrackIds([]);
  }, [selectedTags, tracks]);

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
        <div className="tags-filter">
          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag-filter ${selectedTags.includes(tag) ? 'selected' : ''}`}
              onClick={() => toggleTag(tag)}
              disabled={creating}
            >
              {tag}
            </button>
          ))}
        </div>
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
          <h3>曲を選択 ({selectedTrackIds.length}/{filteredTracks.length})</h3>
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
          <div className="tracks-list">
            {filteredTracks.length > 0 ? (
              filteredTracks.map(track => (
                <div 
                  key={track.id} 
                  className={`track-card ${selectedTrackIds.includes(track.id) ? 'selected' : ''}`}
                  onClick={() => toggleTrackSelection(track.id)}
                >
                  <div className="track-image">
                    {track.image ? (
                      <img src={track.image} alt={`${track.album} album cover`} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </div>
                  <div className="track-info">
                    <h4>{track.name}</h4>
                    <p className="artist">{track.artist}</p>
                    <p className="album">{track.album}</p>
                    <div className="track-tags">
                      {track.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="selection-indicator">
                    {selectedTrackIds.includes(track.id) && <span>✓</span>}
                  </div>
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
