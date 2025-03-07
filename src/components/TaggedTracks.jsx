import React, { useState, useEffect, useRef } from 'react';
import './TaggedTracks.css';

function TaggedTracks({ supabase, spotifyApi, supabaseUserId, spotifyUserId, isLoggedIn }) {
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
      setLoading(true);
      try {
        // タグ付けされた曲を取得（ユーザーIDで検索）
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

    // Supabaseのリアルタイム更新をサブスクライブ
    const subscription = supabase
      .channel('tagged_tracks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tagged_tracks',
          filter: spotifyUserId 
            ? `user_id=eq.${supabaseUserId} OR spotify_user_id=eq.${spotifyUserId}`
            : `user_id=eq.${supabaseUserId}`
        }, 
        () => {
          fetchTaggedTracks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, supabaseUserId, spotifyUserId, isLoggedIn]);

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

  // タグを追加
  const addTag = async (trackId) => {
    if (!tagInput[trackId] || !tagInput[trackId].trim()) return;

    const newTag = tagInput[trackId].trim();
    const track = tracks.find(t => t.id === trackId);
    
    if (!track) return;

    try {
      const { error } = await supabase
        .from('tagged_tracks')
        .insert([
          {
            user_id: supabaseUserId,
            spotify_user_id: spotifyUserId,
            track_id: track.id,
            track_name: track.name,
            artist_name: track.artist,
            album_name: track.album,
            album_image: track.image,
            tag: newTag,
            added_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      setTagInput(prev => ({ ...prev, [trackId]: '' }));
      setMessage(`タグ "${newTag}" を追加しました`);
      setShowMessage(true);
      
      // メッセージを5秒後に非表示
      setTimeout(() => {
        setShowMessage(false);
      }, 5000);
    } catch (err) {
      console.error('Error adding tag:', err);
      setError('タグの追加中にエラーが発生しました。');
    }
  };

  // タグを削除
  const removeTag = async (trackId, tagToRemove) => {
    try {
      const { error } = await supabase
        .from('tagged_tracks')
        .delete()
        .eq('track_id', trackId)
        .eq('tag', tagToRemove)
        .eq('user_id', supabaseUserId);

      if (error) throw error;

      setMessage(`タグ "${tagToRemove}" を削除しました`);
      setShowMessage(true);
      
      // メッセージを5秒後に非表示
      setTimeout(() => {
        setShowMessage(false);
      }, 5000);
    } catch (err) {
      console.error('Error removing tag:', err);
      setError('タグの削除中にエラーが発生しました。');
    }
  };

  // タグをトグル（選択/解除）
  const toggleTag = (tag) => {
    setSelectedTags(prevTags => {
      if (prevTags.includes(tag)) {
        return prevTags.filter(t => t !== tag);
      }
      return [...prevTags, tag];
    });
  };

  // 曲の展開/折りたたみをトグル
  const toggleTrackExpansion = (trackId) => {
    setExpandedTrack(expandedTrack === trackId ? null : trackId);
  };

  return (
    <div className="tagged-tracks-container">
      <h2>タグ付けした曲</h2>
      
      {error && <div className="error-message">{error}</div>}
      {showMessage && <div className="message">{message}</div>}

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
          />
          
          <div className="search-mode-selector">
            <label>
              <input
                type="radio"
                name="searchMode"
                value="AND"
                checked={searchMode === 'AND'}
                onChange={(e) => setSearchMode(e.target.value)}
              />
              AND検索 (すべてのタグを含む)
            </label>
            <label>
              <input
                type="radio"
                name="searchMode"
                value="OR"
                checked={searchMode === 'OR'}
                onChange={(e) => setSearchMode(e.target.value)}
              />
              OR検索 (いずれかのタグを含む)
            </label>
          </div>
        </div>
        
        <div className="tags-filter">
          {(showAllTags ? filteredTagList : filteredTagList.slice(0, 20)).map(tag => (
            <button
              key={tag}
              className={`tag-filter ${selectedTags.includes(tag) ? 'selected' : ''}`}
              onClick={() => toggleTag(tag)}
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
          >
            もっと見る ({filteredTagList.length - 20} タグ)
          </button>
        )}
        
        {showAllTags && tagSearchText === '' && (
          <button 
            className="show-less-tags"
            onClick={() => setShowAllTags(false)}
          >
            表示を減らす
          </button>
        )}
      </div>

      <div className="tracks-list">
        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : filteredTracks.length > 0 ? (
          filteredTracks.map(track => (
            <div key={track.id} className="track-card">
              <div className="track-header" onClick={() => toggleTrackExpansion(track.id)}>
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
                      <span key={index} className="tag">
                        {tag}
                        <button 
                          className="remove-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTag(track.id, tag);
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {expandedTrack === track.id && (
                <div className="track-expanded">
                  <div className="add-tag">
                    <input
                      ref={el => tagInputRefs.current[track.id] = el}
                      type="text"
                      value={tagInput[track.id] || ''}
                      onChange={(e) => setTagInput(prev => ({ ...prev, [track.id]: e.target.value }))}
                      placeholder="新しいタグを追加"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addTag(track.id);
                        }
                      }}
                    />
                    <button onClick={() => addTag(track.id)}>追加</button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-tracks">
            {selectedTags.length > 0 
              ? '選択したタグに一致する曲はありません。'
              : 'タグ付けされた曲はありません。'}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaggedTracks;
