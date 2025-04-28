'use client';

import { useEffect, useState } from 'react';

/**
 * 图片查看器组件 - 为帖子详情页的图片添加点击放大功能
 */
export function initImageViewer() {
  // 确保代码在浏览器环境中运行
  if (typeof window === 'undefined') return;
  
  // 检查是否已经初始化
  if (window.document.querySelector('.image-modal')) return;
  
  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  
  // 添加图片元素
  const img = document.createElement('img');
  modal.appendChild(img);
  
  // 添加关闭按钮
  const closeButton = document.createElement('button');
  closeButton.className = 'image-modal-close';
  closeButton.innerHTML = '×';
  closeButton.onclick = () => modal.classList.remove('active');
  modal.appendChild(closeButton);
  
  // 添加点击模态框背景关闭的功能
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  };
  
  // 添加按ESC键关闭的功能
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });
  
  // 添加到body
  document.body.appendChild(modal);
  
  // 为所有帖子图片添加点击事件
  function attachClickHandlers() {
    // 获取所有帖子详情页的图片
    const postImages = document.querySelectorAll('.forum-post img, .post-detail img');
    
    postImages.forEach(image => {
      if (!(image instanceof HTMLImageElement)) return;
      
      // 确保每个图片只附加一次点击事件
      if (image.dataset.viewerInitialized) return;
      image.dataset.viewerInitialized = 'true';
      
      image.onclick = () => {
        const src = image.src;
        img.src = src;
        modal.classList.add('active');
      };
    });
  }
  
  // 初始调用一次
  attachClickHandlers();
  
  // 创建MutationObserver以监听DOM变化，动态添加点击事件
  const observer = new MutationObserver((mutations) => {
    attachClickHandlers();
  });
  
  // 配置观察选项
  const config = { childList: true, subtree: true };
  
  // 开始观察文档的变化
  observer.observe(document.body, config);
  
  // 返回用于清理的函数
  return () => {
    observer.disconnect();
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };
}

/**
 * 图片查看器组件 - 用于在React组件中初始化图片查看器
 */
export default function ImageViewer() {
  useEffect(() => {
    const cleanup = initImageViewer();
    return cleanup;
  }, []);
  
  return null; // 这是一个功能性组件，不渲染任何内容
} 