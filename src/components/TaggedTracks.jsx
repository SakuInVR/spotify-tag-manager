import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function TaggedTracks({ supabase, spotifyApi, spotifyUserId, supabaseUserId, isLoggedIn }) {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagCounts, setTagCounts] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [tagSearchText, setTagSearchText] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [filteredTagList, setFilteredTagList] = useState([]);
  const [compactView, setCompactView] = useState(false);

  // すべてのタグ付けされた曲を取得
  useEffect(() => {
    if (!supabaseUserId || !isLoggedIn) return;

    const fetchTaggedTracks = async () => {
      setLoading(true);
      try {
        // タグ付けされた曲を取得（ユーザーIDまたはSpotifyユーザーIDで検索）
        // 重複を避けるために、track_id, tag, user_idの組み合わせでユニークになるようにする
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

        console.log('Fetched tracks:', data);
        
        // 曲ごとにグループ化し、重複を排除
        const trackMap = new Map();
        const tagCountsObj = {};
        const processedTags = new Set(); // 処理済みのtrack_id+tagの組み合わせを記録

        if (data && data.length > 0) {
          data.forEach(item => {
            const trackTagKey = `${item.track_id}-${item.tag}`;
            
            // 同じ曲の同じタグは一度だけカウント
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
        console.log('Unique tracks:', uniqueTracks);
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
  }, [selectedTags, tracks]);

  // 曲を再生してNowPlayingページに遷移
  const playTrack = async (trackId) => {
    try {
      setPlayingTrackId(trackId);
      
      try {
        // Spotifyで曲を再生
        await spotifyApi.play({
          uris: [`spotify:track:${trackId}`]
        });
        
        // 少し待ってからNowPlayingページに遷移（曲の再生が始まるのを待つ）
        setTimeout(() => {
          navigate('/now-playing');
        }, 500);
      } catch (playError) {
        console.error('Error playing track:', playError);
        
        // 再生エラーが発生しても、NowPlayingページに遷移
        if (playError.status === 401) {
          setError('Spotify Premiumアカウントが必要です。または再認証が必要です。');
          // 再認証のためにログアウト
          localStorage.removeItem('spotify_access_token');
          window.location.reload();
        } else {
          setError('曲の再生中にエラーが発生しましたが、NowPlayingページに遷移します。');
          // エラーが発生しても、NowPlayingページに遷移
          navigate('/now-playing');
        }
      }
    } catch (error) {
      console.error('General error:', error);
      setError('予期せぬエラーが発生しました。');
      setPlayingTrackId(null);
    }
  };

  return (
    <div className="tagged-tracks-container">
      <h2>タグ付けされた曲</h2>
      
      {error && <div className="error-message">{error}</div>}
      
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
        
        {selectedTags.length > 0 && (
          <button 
            className="clear-filters"
            onClick={() => setSelectedTags([])}
          >
            フィルターをクリア
          </button>
        )}
      </div>
      
      <div className="tracks-count-container">
        <div className="tracks-count">
          {filteredTracks.length} 曲が見つかりました
        </div>
        <button 
          className={`view-toggle-button ${compactView ? 'compact-active' : ''}`}
          onClick={() => setCompactView(!compactView)}
        >
          {compactView ? '詳細表示' : 'シンプル表示'}
        </button>
      </div>
      
      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <div className={`tracks-list ${compactView ? 'compact-view' : ''}`}>
          {filteredTracks.length > 0 ? (
            filteredTracks.map(track => (
              <div key={track.id} className="track-card">
                {!compactView && (
                  <div className="track-image">
                    {track.image ? (
                      <img src={track.image} alt={`${track.album} album cover`} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                    <div 
                      className={`play-button ${playingTrackId === track.id ? 'playing' : ''}`}
                      onClick={() => playTrack(track.id)}
                    >
                      {playingTrackId === track.id ? '■' : '▶'}
                    </div>
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
                    {compactView && (
                      <div 
                        className={`compact-play-button ${playingTrackId === track.id ? 'playing' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation(); // クリックイベントの伝播を停止
                          playTrack(track.id);
                        }}
                      >
                        {playingTrackId === track.id ? '■' : '▶'}
                      </div>
                    )}
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
  );
}

export default TaggedTracks;
