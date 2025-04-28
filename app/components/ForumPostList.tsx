import React, { useCallback } from 'react';

// 获取帖子函数
const fetchPosts = useCallback(async () => {
  setIsLoading(true);
  try {
    let url = `/api/posts?page=${page}&limit=${limit}&reviewStatus=approved`;
    
    if (selectedTags.length > 0) {
      const tagParams = selectedTags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&');
      url += `&${tagParams}`;
    }
    
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }

    if (sortOption) {
      url += `&sort=${encodeURIComponent(sortOption)}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('获取帖子失败');
    }
    
    const data = await response.json();
    const newPosts = page === 1 ? data.posts : [...posts, ...data.posts];
    
    setPosts(newPosts);
    setTotalPosts(data.total);
    setHasMore(newPosts.length < data.total);
  } catch (error) {
    console.error('获取帖子数据失败:', error);
  } finally {
    setIsLoading(false);
  }
}, [page, limit, selectedTags, searchTerm, sortOption, posts]); 