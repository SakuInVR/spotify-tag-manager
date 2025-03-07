import React, { useState, useEffect, useRef } from 'react';
import './TaggedTracks.css';

function TaggedTracks({ supabase, spotifyApi, supabaseUserId, isLoggedIn }) {
  const [tracks, setTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [tagInput, setTagInput] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedTrack, setExpandedTrack] = useState(null);
  const tagInputRefs = useRef({});
  
  // タグフィルター用の状態
  const [allTags, setAllTags] = useState([]);
  const [tagCounts, setTagCounts] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearchText, setTagSearchText] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [filteredTagList, setFilteredTagList] = useState([]);
  const [searchMode, setSearchMode] = useState('AND');

  // タグ付けされた曲を取得
  useEffect(() => {
    if (!supabaseUserId || !isLoggedIn) return;

    const fetchTaggedTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('tagged_tracks')
          .select('*')
          .eq('user_id', supabaseUserId)
          .order('added_at', { ascending: false });

        if (error) throw error;

        // 曲ごとにグループ化
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
        
        setTracks(uniqueTracks);
        setFilteredTracks(uniqueTracks);
        setAllTags(sortedTags);
        setTagCounts(tagCountsObj);
        setFilteredTagList(sortedTags);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tracks:', err);
        setError('曲の取得中にエラーが発生しました');
        setLoading(false);
      }
    };

    fetchTaggedTracks();
  }, [supabase, supabaseUserId, isLoggedIn]);

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

  // 選択されたタグに基づいて曲をフィルタリング
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
  }, [selectedTags, tracks, searchMode]);

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

  // タグを追加
  const addTag = async (trackId) => {
    const tag = tagInput[trackId]?.trim();
    if (!tag) return;

    try {
      const track = tracks.find(t => t.id === trackId);
      if (!track) return;

      const { data, error } = await supabase
        .from('tagged_tracks')
        .insert([
          {
            user_id: supabaseUserId,
            track_id: trackId,
            track_name: track.name,
            artist_name: track.artist,
            album_name: track.album,
            album_image: track.image,
            tag: tag,
            added_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // 新しいタグを追加
      setTracks(tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            tags: [...t.tags, tag]
          };
        }
        return t;
      }));

      // 入力をクリア
      setTagInput(prev => ({
        ...prev,
        [trackId]: ''
      }));

      // メッセージを表示
      setMessage('タグを追加しました');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } catch (err) {
      console.error('Error adding tag:', err);
      setError('タグの追加中にエラーが発生しました');
    }
  };

  // タグを削除
  const removeTag = async (trackId, tagToRemove) => {
    try {
      const { error } = await supabase
        .from('tagged_tracks')
        .delete()
        .match({
          user_id: supabaseUserId,
          track_id: trackId,
          tag: tagToRemove
        });

      if (error) throw error;

      // タグを削除
      setTracks(tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            tags: t.tags.filter(tag => tag !== tagToRemove)
          };
        }
        return t;
      }));

      // メッセージを表示
      setMessage('タグを削除しました');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } catch (err) {
      console.error('Error removing tag:', err);
      setError('タグの削除中にエラーが発生しました');
    }
  };

  // Spotifyで再生
  const playTrack = async (trackId) => {
    try {
      await spotifyApi.play({
        uris: [`spotify:track:${trackId}`]
      });
    } catch (err) {
      console.error('Error playing track:', err);
      setError('再生中にエラーが発生しました');
    }
  };

  // SpotifyのWeb版を開く
  const openSpotifyWeb = (trackId) => {
    window.open(`https://open.spotify.com/track/${trackId}`, '_blank');
  };

  const handleKeyPress = (e, trackId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(trackId);
    }
  };

  // トラックの詳細表示を切り替え
  const toggleTrackExpansion = (trackId) => {
    setExpandedTrack(expandedTrack === trackId ? null : trackId);
  };

  return (
    <div className="tagged-tracks-container">
      <h2>タグ付けした曲</h2>
      
      {error && <div className="error-message">{error}</div>}
      {showMessage && <div className="success-message">{message}</div>}

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
            disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
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
            disabled={loading}
          >
            もっと見る ({filteredTagList.length - 20} タグ)
          </button>
        )}
        
        {showAllTags && tagSearchText === '' && (
          <button 
            className="show-less-tags"
            onClick={() => setShowAllTags(false)}
            disabled={loading}
          >
            表示を減らす
          </button>
        )}
        
        {selectedTags.length > 0 && (
          <button 
            className="clear-filters"
            onClick={() => setSelectedTags([])}
            disabled={loading}
          >
            フィルターをクリア
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : filteredTracks.length === 0 ? (
        <div className="no-tracks">
          {tracks.length === 0 ? (
            <>
              <p>タグ付けされた曲はありません</p>
              <p>Now Playingページから曲にタグを付けることができます</p>
            </>
          ) : (
            <p>選択したタグに一致する曲はありません。</p>
          )}
        </div>
      ) : (
        <div className="tracks-list">
          {filteredTracks.map(track => (
            <div 
              key={track.id} 
              className={`track-card ${expandedTrack === track.id ? 'expanded' : ''}`}
              onClick={() => toggleTrackExpansion(track.id)}
            >
              <div className="track-header">
                <div className="track-info">
                  <div className="album-cover">
                    <img src={track.image} alt={`${track.album} album cover`} />
                  </div>
                  <div className="track-details">
                    <h3>{track.name}</h3>
                    <p className="artist">{track.artist}</p>
                    <p className="album">{track.album}</p>
                  </div>
                </div>
                
                <div className="track-controls">
                  <button
                    className="play-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track.id);
                    }}
                    title="Spotifyで再生"
                  >
                    ▶
                  </button>
                  <button
                    className="spotify-web-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSpotifyWeb(track.id);
                    }}
                    title="Spotify Webで開く"
                  >
                    🌐
                  </button>
                </div>
              </div>

              <div className="track-content">
                <div className="tags-section">
                  <div className="current-tags">
                    {track.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                        <button
                          className="remove-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTag(track.id, tag);
                          }}
                          title="タグを削除"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="add-tag-form" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      ref={el => tagInputRefs.current[track.id] = el}
                      value={tagInput[track.id] || ''}
                      onChange={e => setTagInput(prev => ({
                        ...prev,
                        [track.id]: e.target.value
                      }))}
                      onKeyPress={e => handleKeyPress(e, track.id)}
                      placeholder="新しいタグを追加 (Enterで確定)"
                      className="tag-input"
                    />
                    <button
                      className="add-tag-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addTag(track.id);
                      }}
                    >
                      追加
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaggedTracks;
