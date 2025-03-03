import React, { useState, useEffect, useRef } from 'react';

function NowPlaying({ spotifyApi, supabase, spotifyUserId, supabaseUserId, isSidebar = false }) {
  const inputRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [previousTrackId, setPreviousTrackId] = useState(null);
  const [customTag, setCustomTag] = useState('');
  const [newDefaultTag, setNewDefaultTag] = useState('');
  const [tags, setTags] = useState([]);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [defaultTags, setDefaultTags] = useState([]);
  const [showDefaultTagSelector, setShowDefaultTagSelector] = useState(false);
  const [authError, setAuthError] = useState(false);

  // ローカルストレージからデフォルトタグを読み込む
  useEffect(() => {
    const savedDefaultTags = localStorage.getItem('spotify_default_tags');
    if (savedDefaultTags) {
      try {
        setDefaultTags(JSON.parse(savedDefaultTags));
      } catch (error) {
        console.error('Error parsing saved default tags:', error);
      }
    }
  }, []);

  // デフォルトタグをローカルストレージに保存
  useEffect(() => {
    if (defaultTags.length > 0) {
      localStorage.setItem('spotify_default_tags', JSON.stringify(defaultTags));
    }
  }, [defaultTags]);

  // メッセージを一定時間後に消すタイマー
  useEffect(() => {
    if (!message) return;
    
    const timer = setTimeout(() => {
      setMessage('');
    }, 5000); // 5秒後にメッセージを消す
    
    return () => clearTimeout(timer);
  }, [message]);

  // 現在再生中の曲を取得
  useEffect(() => {
    if (!spotifyApi) return;

    const fetchCurrentTrack = async () => {
      try {
        const response = await spotifyApi.getMyCurrentPlayingTrack();
        
        if (response && response.item) {
          // 新しい曲が検出されたらメッセージをリセット
          if (currentTrack?.id !== response.item.id) {
            setMessage('');
          }
          
          setCurrentTrack(response.item);
          
          // 再生位置、曲の長さ、再生状態を設定
          setProgress(response.progress_ms || 0);
          setDuration(response.item.duration_ms || 0);
          setIsPlaying(response.is_playing || false);
          
          // 曲が変わったら自動的にタグを追加
          if (previousTrackId !== response.item.id) {
            setPreviousTrackId(response.item.id);
            await addDefaultTags(response.item);
          }
        } else {
          // 再生中の曲がない場合はリセット
          setProgress(0);
          setDuration(0);
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Error fetching current track:', error);
        
        // 401エラー（Unauthorized）の場合は認証エラーとして処理
        if (error.status === 401) {
          setAuthError(true);
          setMessage('Spotifyの認証が切れました。再ログインが必要です。');
        } else {
          setMessage('曲の取得中にエラーが発生しました。');
        }
      }
    };

    fetchCurrentTrack();
    const interval = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(interval);
  }, [spotifyApi, previousTrackId, supabaseUserId, currentTrack]);

  // 再生位置を更新するロジック
  useEffect(() => {
    if (!isPlaying || !duration) return;

    // 1秒ごとにプログレスを更新
    const progressInterval = setInterval(() => {
      setProgress(prevProgress => {
        // 曲の終わりに達したら更新を停止
        if (prevProgress >= duration) {
          clearInterval(progressInterval);
          return prevProgress;
        }
        return prevProgress + 1000; // 1秒（1000ミリ秒）進める
      });
    }, 1000);

    return () => clearInterval(progressInterval);
  }, [isPlaying, duration]);

  // 時間をフォーマットする関数（mm:ss形式）
  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // デフォルト設定タグを追加
  const addToDefaultTags = (tag) => {
    if (!defaultTags.includes(tag)) {
      setDefaultTags([...defaultTags, tag]);
      setMessage(`"${tag}" をデフォルト設定タグに追加しました。`);
    }
  };

  // デフォルト設定タグから削除
  const removeFromDefaultTags = (tag) => {
    setDefaultTags(defaultTags.filter(t => t !== tag));
    setMessage(`"${tag}" をデフォルト設定タグから削除しました。`);
  };

  // デフォルト設定タグセレクターの表示/非表示を切り替え
  const toggleDefaultTagSelector = () => {
    setShowDefaultTagSelector(!showDefaultTagSelector);
  };

  // デフォルトタグを追加（曲名、アーティスト名、アルバム名、日付、ユーザー設定タグ）
  const addDefaultTags = async (track) => {
    if (!track || !supabaseUserId) return;
    
    console.log('Adding default tags for track:', track.name);

    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    const systemDefaultTags = [
      track.name,                          // 曲名
      ...track.artists.map(a => a.name),   // アーティスト名（複数の場合あり）
      track.album.name,                    // アルバム名
      `date:${dateString}`                 // 日付
    ];
    
    // システムデフォルトタグとユーザー設定タグを結合
    const allDefaultTags = [...systemDefaultTags, ...defaultTags];
    
    try {
      // 各タグをデータベースに保存
      for (const tag of allDefaultTags) {
        await saveTag(track, tag);
      }
      
      setTags(allDefaultTags);
      setMessage('新しい曲を検出しました。デフォルトタグが追加されました。');
    } catch (error) {
      console.error('Error adding default tags:', error);
      setMessage('デフォルトタグの追加中にエラーが発生しました。');
    }
  };

  // カスタムタグを追加
  const addCustomTag = async () => {
    if (!currentTrack || !customTag.trim() || !supabaseUserId) return;

    try {
      await saveTag(currentTrack, customTag.trim());
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
      setMessage('タグが追加されました。');
      
      // タグ追加後にテキストフィールドにフォーカスを戻す
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    } catch (error) {
      console.error('Error adding custom tag:', error);
      setMessage('タグの追加中にエラーが発生しました。');
    }
  };

  // タグをデータベースに保存
  const saveTag = async (track, tag) => {
    console.log('Saving tag:', tag, 'for track:', track.name);
    console.log('User IDs - Supabase:', supabaseUserId, 'Spotify:', spotifyUserId);
    
    try {
      const { data, error } = await supabase
        .from('tagged_tracks')
        .insert([
          {
            track_id: track.id,
            track_name: track.name,
            artist_name: track.artists.map(a => a.name).join(', '),
            album_name: track.album.name,
            album_image: track.album.images[0]?.url || '',
            tag: tag,
            user_id: supabaseUserId,
            spotify_user_id: spotifyUserId || null,
            added_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      console.log('Tag saved successfully:', data);
    } catch (error) {
      console.error('Error in saveTag:', error);
      throw error;
    }
  };

  // タグ一覧を取得
  useEffect(() => {
    if (!currentTrack || !supabaseUserId) return;

    const fetchTags = async () => {
      try {
        const { data, error } = await supabase
          .from('tagged_tracks')
          .select('tag')
          .eq('track_id', currentTrack.id)
          .eq('user_id', supabaseUserId);

        if (error) throw error;
        
        if (data) {
          const uniqueTags = [...new Set(data.map(item => item.tag))];
          setTags(uniqueTags);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, [currentTrack, supabase, supabaseUserId]);

  // すべてのタグを取得（サジェスト用）
  useEffect(() => {
    if (!supabaseUserId) return;

    const fetchAllTags = async () => {
      try {
        const { data, error } = await supabase
          .from('tagged_tracks')
          .select('tag')
          .eq('user_id', supabaseUserId);

        if (error) throw error;
        
        if (data) {
          // 重複を除去して、使用頻度順にソート
          const tagCounts = {};
          data.forEach(item => {
            tagCounts[item.tag] = (tagCounts[item.tag] || 0) + 1;
          });
          
          // 使用頻度順に並べ替え
          const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
          
          // タグと使用回数の両方を保存
          const tagsWithCounts = sortedTags.map(tag => ({
            name: tag,
            count: tagCounts[tag]
          }));
          
          setAllTags(tagsWithCounts);
        }
      } catch (error) {
        console.error('Error fetching all tags:', error);
      }
    };

    fetchAllTags();
  }, [supabase, supabaseUserId]);

  // 入力に基づいてタグをフィルタリング
  useEffect(() => {
    if (customTag.trim() === '') {
      setSuggestedTags([]);
      setShowSuggestions(false);
      return;
    }

    const input = customTag.toLowerCase().trim();
    const filtered = allTags
      .filter(tag => 
        tag.name.toLowerCase().includes(input) && 
        !tags.includes(tag.name) // 既に追加されているタグは除外
      )
      .slice(0, 5); // 最大5件まで表示
    
    setSuggestedTags(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [customTag, allTags, tags]);

  // サジェストされたタグを選択
  const selectSuggestedTag = (tag) => {
    setCustomTag(tag.name);
    setShowSuggestions(false);
    // フォーカスを入力フィールドに戻す
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 再生コントロール関数
  const handlePlayPause = async () => {
    if (!spotifyApi) return;
    
    try {
      if (isPlaying) {
        await spotifyApi.pause();
        setIsPlaying(false);
      } else {
        await spotifyApi.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      setMessage('再生コントロール中にエラーが発生しました。');
    }
  };

  const handlePrevious = async () => {
    if (!spotifyApi) return;
    
    try {
      await spotifyApi.skipToPrevious();
      // 曲が変わるまで少し待つ
      setTimeout(async () => {
        const response = await spotifyApi.getMyCurrentPlayingTrack();
        if (response && response.item) {
          setCurrentTrack(response.item);
          setProgress(0);
          setDuration(response.item.duration_ms || 0);
          setIsPlaying(response.is_playing || false);
        }
      }, 500);
    } catch (error) {
      console.error('Error skipping to previous track:', error);
      setMessage('前の曲への移動中にエラーが発生しました。');
    }
  };

  const handleNext = async () => {
    if (!spotifyApi) return;
    
    try {
      await spotifyApi.skipToNext();
      // 曲が変わるまで少し待つ
      setTimeout(async () => {
        const response = await spotifyApi.getMyCurrentPlayingTrack();
        if (response && response.item) {
          setCurrentTrack(response.item);
          setProgress(0);
          setDuration(response.item.duration_ms || 0);
          setIsPlaying(response.is_playing || false);
        }
      }, 500);
    } catch (error) {
      console.error('Error skipping to next track:', error);
      setMessage('次の曲への移動中にエラーが発生しました。');
    }
  };

  return (
    <div className={`now-playing-container ${isSidebar ? 'sidebar-mode' : ''}`}>
      <h2>再生中の曲</h2>
      
      {message && <div className="message">{message}</div>}
      
      {authError ? (
        <div className="auth-error">
          <p>Spotifyの認証が切れました。再認証が必要です。</p>
          <button 
            className="reauth-button"
            onClick={() => {
              // ローカルストレージからトークンを削除
              localStorage.removeItem('spotify_access_token');
              // ページをリロードして再認証
              window.location.reload();
            }}
          >
            再認証する
          </button>
        </div>
      ) : currentTrack ? (
        <div className="track-info">
          {/* サイドバーモードでは異なるレイアウト */}
          {isSidebar ? (
            <>
              <div className="sidebar-track-header">
                <div className="sidebar-album-cover">
                  {currentTrack.album.images[0] && (
                    <img 
                      src={currentTrack.album.images[0].url} 
                      alt={`${currentTrack.album.name} album cover`} 
                    />
                  )}
                </div>
                
                <div className="sidebar-track-info">
                  <h3 className="sidebar-track-name">{currentTrack.name}</h3>
                  <p className="sidebar-artist">{currentTrack.artists.map(a => a.name).join(', ')}</p>
                </div>
              </div>
              
              {/* プログレスバー */}
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${(progress / duration) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-time">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* 再生コントロール */}
              <div className="playback-controls">
                <button 
                  className="control-button previous-button" 
                  onClick={handlePrevious}
                  title="前の曲"
                >
                  ◀︎◀︎
                </button>
                <button 
                  className="control-button play-pause-button" 
                  onClick={handlePlayPause}
                  title={isPlaying ? "一時停止" : "再生"}
                >
                  {isPlaying ? "⏸" : "▶︎"}
                </button>
                <button 
                  className="control-button next-button" 
                  onClick={handleNext}
                  title="次の曲"
                >
                  ▶︎▶︎
                </button>
              </div>
              
              <div className="sidebar-tags-container">
                <h4>タグ:</h4>
                <div className="sidebar-tags-list">
                  {tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
              
              <div className="add-tag-container">
                <div className="add-tag">
                  <input
                    ref={inputRef}
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="新しいタグを追加"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addCustomTag();
                      }
                    }}
                  />
                  <button onClick={addCustomTag}>追加</button>
                </div>
                
                {/* タグのサジェスト表示 */}
                {showSuggestions && (
                  <div className="tag-suggestions">
                    {suggestedTags.map((tag, index) => (
                      <div 
                        key={index} 
                        className="suggested-tag"
                        onClick={() => selectSuggestedTag(tag)}
                      >
                        <span className="suggested-tag-name">{tag.name}</span>
                        <span className="suggested-tag-count">{tag.count}回</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* デフォルト設定タグセクション */}
              <div className="default-tags-section">
                <div className="default-tags-header">
                  <h4>デフォルト設定タグ:</h4>
                  <button 
                    className="toggle-default-tags-button"
                    onClick={toggleDefaultTagSelector}
                    title={showDefaultTagSelector ? "閉じる" : "設定"}
                  >
                    {showDefaultTagSelector ? "閉じる" : "設定"}
                  </button>
                </div>
                
                {/* デフォルト設定タグの表示 */}
                <div className="default-tags-list">
                  {defaultTags.length > 0 ? (
                    defaultTags.map((tag, index) => (
                      <span key={index} className="default-tag">
                        {tag}
                        {showDefaultTagSelector && (
                          <button 
                            className="remove-default-tag-button"
                            onClick={() => removeFromDefaultTags(tag)}
                            title="削除"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="no-default-tags">設定されていません</span>
                  )}
                </div>
                
                {/* デフォルト設定タグセレクター */}
                {showDefaultTagSelector && (
                  <div className="default-tag-selector">
                    <p className="default-tag-help">
                      タグをクリックして、デフォルト設定タグに追加します。
                      次の曲が再生されたとき、これらのタグが自動的に付与されます。
                    </p>
                    
                    {/* 新しいタグを追加するためのテキストエリア */}
                    <div className="new-default-tag-input">
                      <input
                        type="text"
                        placeholder="新しいデフォルト設定タグを入力"
                        value={newDefaultTag}
                        onChange={(e) => setNewDefaultTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newDefaultTag.trim()) {
                            addToDefaultTags(newDefaultTag.trim());
                            setNewDefaultTag('');
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if (newDefaultTag.trim()) {
                            addToDefaultTags(newDefaultTag.trim());
                            setNewDefaultTag('');
                          }
                        }}
                      >
                        追加
                      </button>
                    </div>
                    
                    <div className="all-tags-for-default">
                      {allTags.slice(0, 20).map((tag, index) => (
                        <div 
                          key={index} 
                          className={`tag-for-default ${defaultTags.includes(tag.name) ? 'selected' : ''}`}
                          onClick={() => defaultTags.includes(tag.name) 
                            ? removeFromDefaultTags(tag.name) 
                            : addToDefaultTags(tag.name)}
                        >
                          <span className="tag-for-default-name">{tag.name}</span>
                          <span className="tag-for-default-count">{tag.count}回</span>
                        </div>
                      ))}
                    </div>
                    <p className="default-tag-help">
                      タグは使用頻度順に表示されています。
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="album-cover">
                {currentTrack.album.images[0] && (
                  <img 
                    src={currentTrack.album.images[0].url} 
                    alt={`${currentTrack.album.name} album cover`} 
                  />
                )}
              </div>
              
              <div className="track-details">
                <h3>{currentTrack.name}</h3>
                <p className="artist">{currentTrack.artists.map(a => a.name).join(', ')}</p>
                <p className="album">{currentTrack.album.name}</p>
                
                {/* プログレスバー */}
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(progress / duration) * 100}%` }}
                    ></div>
                  </div>
                  <div className="progress-time">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                
                {/* 再生コントロール */}
                <div className="playback-controls">
                  <button 
                    className="control-button previous-button" 
                    onClick={handlePrevious}
                    title="前の曲"
                  >
                    ◀︎◀︎
                  </button>
                  <button 
                    className="control-button play-pause-button" 
                    onClick={handlePlayPause}
                    title={isPlaying ? "一時停止" : "再生"}
                  >
                    {isPlaying ? "⏸" : "▶︎"}
                  </button>
                  <button 
                    className="control-button next-button" 
                    onClick={handleNext}
                    title="次の曲"
                  >
                    ▶︎▶︎
                  </button>
                </div>
                
                <div className="tags-container">
                  <h4>タグ:</h4>
                  <div className="tags-list">
                    {tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div className="add-tag-container">
                  <div className="add-tag">
                    <input
                      ref={inputRef}
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      placeholder="新しいタグを追加"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCustomTag();
                        }
                      }}
                    />
                    <button onClick={addCustomTag}>追加</button>
                  </div>
                  
                  {/* タグのサジェスト表示 */}
                  {showSuggestions && (
                    <div className="tag-suggestions">
                      {suggestedTags.map((tag, index) => (
                        <div 
                          key={index} 
                          className="suggested-tag"
                          onClick={() => selectSuggestedTag(tag)}
                        >
                          <span className="suggested-tag-name">{tag.name}</span>
                          <span className="suggested-tag-count">{tag.count}回</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <p>現在再生中の曲はありません。Spotifyで曲を再生してください。</p>
      )}
    </div>
  );
}

export default NowPlaying;
