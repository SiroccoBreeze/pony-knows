"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Eye, MessageSquare, Calendar, List, X } from "lucide-react";
import Link from "next/link";
import MarkdownRenderer from "@/components/markdown/markdown-renderer";
import { Toaster } from "react-hot-toast";
import CommentList from "@/components/comments/CommentList";
import { isMobileDevice } from "@/lib/utils";
import ImageViewer from "@/components/ImageViewer";

// 定义帖子接口
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  author: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  postTags: {
    tag: {
      id: string;
      name: string;
    };
  }[];
  _count: {
    comments: number;
  };
}

// 定义目录项接口
interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // 获取帖子详情
  useEffect(() => {
    async function fetchPostDetails() {
      if (!params.id) return;
      console.log("页面请求帖子ID:", params.id);

      // 检查是否已经访问过该帖子
      const visitedPosts = localStorage.getItem('visitedPosts') ? 
        JSON.parse(localStorage.getItem('visitedPosts') || '[]') : [];
      
      // 是否是第一次访问
      const isFirstVisit = !visitedPosts.includes(params.id);
      
      // 如果是第一次访问，添加到访问列表
      if (isFirstVisit) {
        localStorage.setItem('visitedPosts', JSON.stringify([...visitedPosts, params.id]));
      }

      setIsLoading(true);
      try {
        // 使用查询参数API，传递是否首次访问
        const response = await fetch(`/api/post-details?id=${params.id}&firstVisit=${isFirstVisit}`);
        console.log("API响应状态:", response.status);
        
        // 记录原始响应文本
        const responseText = await response.text();
        
        if (!response.ok) {
          // 尝试解析错误信息
          let errorMessage = response.status === 404 ? "帖子不存在" : "获取帖子失败";
          try {
            if (responseText) {
              const errorData = JSON.parse(responseText);
              console.log("API错误详情:", errorData);
              if (errorData && errorData.details) {
                errorMessage = `${errorMessage}: ${errorData.details}`;
              }
            }
          } catch (parseError) {
            console.error("解析错误响应失败:", parseError);
          }
          throw new Error(errorMessage);
        }
        
        // 解析JSON响应
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("解析成功响应失败:", parseError);
          throw new Error("服务器返回了无效的数据格式");
        }
        
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
        console.error("获取帖子详情失败:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPostDetails();
  }, [params.id]);

  // 生成目录
  useEffect(() => {
    if (post && contentRef.current) {
      // 增加延迟时间，确保Markdown完全渲染
      setTimeout(() => {
        const headings = contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (headings && headings.length > 0) {
          // 获取所有标题
          const tocItems: TocItem[] = Array.from(headings).map((heading, index) => {
            const level = parseInt(heading.tagName.substring(1));
            const text = heading.textContent || '';
            
            // 使用标题文本生成稳定的ID，避免索引变化导致的问题
            let sanitizedText = text.toLowerCase()
              .replace(/[^\w\s-]/g, '') // 移除特殊字符
              .replace(/\s+/g, '-')     // 替换空格为连字符
              .trim()                    // 移除前后空格
              .substring(0, 50);        // 限制长度
            
            // 确保sanitizedText不为空
            if (!sanitizedText) {
              sanitizedText = `section-${level}`;
            }
            
            // 使用更一致的ID生成方式，必须加入索引确保唯一性
            const id = `heading-${sanitizedText}-${index}`;
            
            // 给标题添加ID以支持锚点跳转和滚动监测
            heading.id = id;
            
            // 确保heading属性包含对应文本，便于调试
            heading.setAttribute('data-title', text);
            
            // 为每个标题添加更大的上边距，防止被导航栏遮挡
            heading.setAttribute('style', 'scroll-margin-top: 100px;');
            
            return { id, text, level };
          });
          
          // 设置目录结构
          setToc(tocItems);
          
          // 添加调试日志
          console.log("已生成标题:", tocItems);
          
          // 初始检测当前可见标题
          setTimeout(() => {
            handleScrollForHighlight();
          }, 300);
          
          // 如果URL中包含锚点，尝试滚动到对应位置
          if (window.location.hash) {
            const hash = window.location.hash.slice(1);
            setTimeout(() => {
              const element = document.getElementById(hash);
              if (element) {
                const rect = element.getBoundingClientRect();
                const absoluteElementTop = rect.top + window.pageYOffset;
                const scrollPosition = absoluteElementTop - 100;
                
                window.scrollTo({
                  top: scrollPosition,
                  behavior: 'smooth'
                });
              }
            }, 100);
          }
        } else {
          setToc([]);
        }
      }, 500); // 增加延时确保DOM完全渲染
    }
  }, [post]);

  // 滚动监听函数
  const handleScrollForHighlight = () => {
    if (!contentRef.current) return;
    
    const headings = Array.from(contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLHeadingElement[];
    if (headings.length === 0) return;
    
    // 获取视窗高度和滚动位置
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    
    // 计算视窗中心点
    const viewportCenter = scrollTop + viewportHeight / 3;
    
    // 找到最接近视窗中心的标题
    let closestHeading: HTMLHeadingElement | null = null;
    let closestDistance = Infinity;
    
    headings.forEach(heading => {
      const rect = heading.getBoundingClientRect();
      const headingTop = rect.top + window.scrollY;
      
      // 计算与视窗中心的距离
      const distance = Math.abs(headingTop - viewportCenter);
      
      // 如果当前标题比之前找到的标题更靠近中心
      if (distance < closestDistance) {
        closestDistance = distance;
        closestHeading = heading;
      }
    });
    
    // 更新活动标题
    if (closestHeading && closestHeading.id) {
      if (activeHeading !== closestHeading.id) {
        setActiveHeading(closestHeading.id);
        console.log("当前活动标题更新为:", closestHeading.textContent, "ID:", closestHeading.id);
      }
    }
  };

  // 监听滚动以高亮当前目录项
  useEffect(() => {
    if (!contentRef.current || toc.length === 0) return;
    
    // 使用更高效的节流实现
    let scrollTimeout: ReturnType<typeof setTimeout>;
    let isScrolling = false;
    
    const scrollHandler = () => {
      if (!isScrolling) {
        isScrolling = true;
        
        // 使用requestAnimationFrame以确保平滑
        window.requestAnimationFrame(() => {
          handleScrollForHighlight();
          
          // 添加防抖，避免过于频繁的状态更新
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            handleScrollForHighlight();
          }, 100);
          
          isScrolling = false;
        });
      }
    };
    
    // 添加滚动事件监听
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', scrollHandler, { passive: true });
    
    // 添加内容变化的监听（例如图片加载完成后）
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        handleScrollForHighlight();
      });
    });
    
    if (contentRef.current) {
      observer.observe(contentRef.current, { 
        subtree: true, 
        childList: true,
        attributes: true,
        attributeFilter: ['src', 'style', 'class'] 
      });
    }
    
    // 初始调用确保首次加载时高亮正确
    setTimeout(scrollHandler, 300);
    
    return () => {
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', scrollHandler);
      observer.disconnect();
      clearTimeout(scrollTimeout);
    };
  }, [toc, activeHeading]);

  // 增强目录项点击高亮效果，确保点击后正确高亮
  const handleTocItemClick = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    
    // 立即更新高亮状态，提升用户体验
    setActiveHeading(itemId);
    
    // 延迟执行，确保DOM完全更新
    setTimeout(() => {
      const element = document.getElementById(itemId);
      if (element) {
        // 设置URL但不触发默认跳转
        window.history.pushState(null, '', `#${itemId}`);
        
        // 获取元素的位置
        const rect = element.getBoundingClientRect();
        
        // 考虑导航栏高度的偏移量
        const navHeight = 80; 
        
        // 计算绝对滚动位置，考虑当前滚动位置和元素的相对位置
        const absoluteElementTop = rect.top + window.pageYOffset;
        const scrollPosition = absoluteElementTop - navHeight;
        
        // 使用更精确的滚动方法
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
        
        // 在移动设备上点击后关闭目录
        setShowToc(false);
        
        // 确保滚动完成后再次检查高亮状态
        setTimeout(() => {
          handleScrollForHighlight();
        }, 500);
      } else {
        // 不输出控制台错误信息，而是尝试恢复
        // 添加错误恢复机制 - 尝试重新获取所有标题并找到最接近的
        const allHeadings = Array.from(contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6') || []) as HTMLHeadingElement[];
        if (allHeadings && allHeadings.length > 0) {
          // 获取点击的目录项文本（从toc数组中）
          const clickedItem = toc.find(item => item.id === itemId);
          if (clickedItem) {
            // 尝试通过文本内容匹配
            const matchingHeading = allHeadings.find(
              h => h.textContent === clickedItem.text
            );
            
            if (matchingHeading) {
              // 找到匹配的标题，滚动到该位置
              const rect = matchingHeading.getBoundingClientRect();
              const absoluteElementTop = rect.top + window.pageYOffset;
              const scrollPosition = absoluteElementTop - 100;
              
              window.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
              });
              
              // 手动设置活动标题
              if (matchingHeading.id) {
                setActiveHeading(matchingHeading.id);
              }
              
              // 在移动设备上点击后关闭目录
              setShowToc(false);
            }
          }
        }
      }
    }, 50);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">加载中...</h1>
          <p className="text-muted-foreground">正在获取帖子详情</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !post) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Toaster position="top-center" />
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">加载失败</h1>
          <p className="text-muted-foreground mb-4">{error || "找不到帖子"}</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/forum">返回论坛</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/forum/new">发布新帖</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 正常渲染状态
  return (
    <div className="container mx-auto py-6 px-4 forum-post">
      <Toaster position="top-center" />
      {/* 图片查看器组件 */}
      <ImageViewer />
      
      {/* 移动端提示 */}
      {isMobile && (
        <div className="bg-muted/30 p-4 rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">
            移动端仅支持浏览功能，如需回复或编辑请使用桌面端访问。
          </p>
        </div>
      )}

      {/* 布局使用flex布局，确保目录固定和内容滚动互不影响 */}
      <div className="flex flex-col lg:flex-row">
        {/* 目录区 - 桌面版固定在左侧 */}
        {toc.length > 0 && (
          <aside className="hidden lg:block w-64 flex-shrink-0 mr-8">
            <div className="fixed w-64">
              <Card className="p-4 shadow-md border-neutral-100 dark:border-neutral-800 bg-card/95 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium flex items-center text-primary">
                    <List className="h-4 w-4 mr-2" />
                    目录
                  </h3>
                </div>
                
                <div>
                  <div className="custom-scrollbar overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    <ul className="space-y-2.5 text-sm pl-1">
                      {toc.map((item) => {
                        const isActive = activeHeading === item.id;
                        return (
                          <li 
                            key={item.id} 
                            className={`relative hover:text-primary transition-colors duration-200 ease-in-out
                              ${isActive ? 'text-primary font-bold active bg-primary/10 rounded-md border-l-2 border-primary pl-2' : 'text-muted-foreground'}`}
                            style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-0 h-full w-2 bg-primary rounded-full"></div>
                            )}
                            <button 
                              className={`block w-full text-left py-1.5 px-2 rounded-md hover:bg-muted/50 ${isActive ? 'font-medium' : ''}`}
                              onClick={(e: React.MouseEvent) => handleTocItemClick(e, item.id)}
                            >
                              {item.text}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </aside>
        )}
        
        {/* 移动设备的悬浮目录按钮，保持固定位置 */}
        {toc.length > 0 && (
          <div className="fixed right-4 bottom-20 lg:hidden z-50">
            <Button
              variant="default"
              size="icon"
              className="rounded-full shadow-lg h-12 w-12"
              onClick={() => setShowToc(!showToc)}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* 移动设备的目录抽屉 */}
        {showToc && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden">
            <div className="fixed inset-0" onClick={() => setShowToc(false)}></div>
            <div className="fixed bottom-0 left-0 right-0 h-[70vh] bg-card p-4 shadow-lg border-t border-border rounded-t-xl overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium flex items-center">
                  <List className="h-4 w-4 mr-2" />
                  目录
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowToc(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-3rem)] pb-safe custom-scrollbar">
                {toc.length > 0 ? (
                  <ul className="space-y-2.5">
                    {toc.map((item) => {
                      const isActive = activeHeading === item.id;
                      return (
                        <li 
                          key={item.id} 
                          className={`relative hover:text-primary transition-colors duration-200 ease-in-out
                            ${isActive ? 'text-primary font-bold active bg-primary/10 rounded-md border-l-2 border-primary pl-2' : 'text-muted-foreground'}`}
                          style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-0 h-full w-2 bg-primary rounded-full"></div>
                          )}
                          <button 
                            className={`block w-full text-left py-1.5 px-2 rounded-md hover:bg-muted/50 ${isActive ? 'font-medium' : ''}`}
                            onClick={(e: React.MouseEvent) => handleTocItemClick(e, item.id)}
                          >
                            {item.text}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-muted-foreground py-4 text-center">无目录内容</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 帖子内容区 */}
        <div className="w-full">
          {/* 合并帖子标题、元数据和内容到一个卡片中 */}
          <Card className="p-6 md:p-8 shadow-md border-border/50 overflow-hidden bg-card">
            {/* 标题和标签 */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight text-foreground mb-4">{post?.title}</h1>
              
              {/* 作者信息和帖子元数据 - 更紧凑的设计 */}
              <div className="flex flex-wrap md:flex-nowrap items-center text-sm text-muted-foreground border-b border-border/30 pb-4">
                <div className="flex items-center mr-4 mb-2 md:mb-0">
                  <Avatar className="h-8 w-8 ring-1 ring-primary/10 mr-3">
                    <AvatarImage src={post?.author.image || ""} alt={post?.author.name} />
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                      {post?.author.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="font-medium text-sm text-foreground">{post?.author.name}</span>
                </div>
                
                <div className="flex flex-wrap md:flex-nowrap items-center space-x-2 md:space-x-4 text-xs w-full md:ml-auto">
                  <span className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 opacity-70" />
                    {post && formatDate(post.createdAt)}
                  </span>
                  
                  <span className="flex items-center">
                    <Eye className="h-3.5 w-3.5 mr-1 opacity-70" />
                    {post?.views} 浏览
                  </span>
                  
                  <span className="flex items-center">
                    <MessageSquare className="h-3.5 w-3.5 mr-1 opacity-70" />
                    {post?._count.comments} 评论
                  </span>
                </div>
              </div>
            
              {/* 标签 */}
              {post?.postTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {post.postTags.map(({ tag }) => (
                    <Badge 
                      key={tag.id} 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* 帖子内容 */}
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted/30 rounded w-3/4"></div>
                <div className="h-4 bg-muted/30 rounded w-1/2"></div>
                <div className="h-4 bg-muted/30 rounded w-5/6"></div>
              </div>
            ) : (
              <div ref={contentRef} className="prose prose-neutral dark:prose-invert max-w-none">
                <MarkdownRenderer content={post?.content || ''} />
              </div>
            )}
          </Card>
          
          {/* 评论区 */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-primary" />
              评论 ({post?._count.comments || 0})
            </h2>
            <Card className="p-6 shadow-md border-border/50 bg-card">
              <CommentList postId={params.id} />
            </Card>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        /* 为目录增加样式 */
        li.active {
          animation: highlight-pulse 2s ease-in-out infinite;
        }
        
        @keyframes highlight-pulse {
          0% { background-color: hsl(var(--primary) / 0.15); }
          50% { background-color: hsl(var(--primary) / 0.25); }
          100% { background-color: hsl(var(--primary) / 0.15); }
        }
        
        /* 增加目录项的过渡效果 */
        .custom-scrollbar li {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        /* 目录项高亮动画 */
        .custom-scrollbar li button {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        
        .custom-scrollbar li button:before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 0;
          background-color: hsl(var(--primary) / 0.12);
          z-index: -1;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-scrollbar li button:hover:before {
          width: 100%;
        }
        
        /* 当前活动项样式增强 */
        .custom-scrollbar li.active button {
          transform: translateX(5px) scale(1.02);
          font-weight: 600;
        }
        
        .custom-scrollbar li .absolute {
          transition: opacity 0.3s ease, transform 0.3s ease;
          opacity: 0;
          transform: scaleY(0.7);
        }
        
        .custom-scrollbar li.active .absolute {
          opacity: 1;
          transform: scaleY(1);
          animation: pulse-border 2s infinite ease-in-out;
        }
        
        @keyframes pulse-border {
          0% { background-color: hsl(var(--primary) / 0.7); box-shadow: 0 0 5px hsl(var(--primary) / 0.5); }
          50% { background-color: hsl(var(--primary) / 1); box-shadow: 0 0 8px hsl(var(--primary)); }
          100% { background-color: hsl(var(--primary) / 0.7); box-shadow: 0 0 5px hsl(var(--primary) / 0.5); }
        }

        /* 活跃目录项加入顶部条纹动画 */
        .custom-scrollbar li.active:before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary)), transparent);
          animation: stripe-animate 2s linear infinite;
        }
        
        @keyframes stripe-animate {
          0% { width: 0; left: 0; }
          50% { width: 100%; left: 0; }
          100% { width: 0; left: 100%; }
        }
        
        /* 强化活动项目的视觉显示 */
        .custom-scrollbar li.active {
          background-color: hsl(var(--primary) / 0.15);
          border-radius: 0.375rem;
          box-shadow: 0 0 0 1px hsl(var(--primary) / 0.2);
        }
        
        /* 其他样式保持不变 */
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 100px;
        }
        
        h1, h2, h3, h4, h5, h6 {
          scroll-margin-top: 100px !important;
        }
        
        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
        
        /* 自定义滚动条样式 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: hsl(var(--primary) / 0.2);
          border-radius: 20px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--primary) / 0.3);
        }
        
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--primary) / 0.2) transparent;
        }
        
        /* 为Markdown内容增加样式 */
        .prose img {
          border-radius: 0;
          margin: 1.5rem auto;
          box-shadow: none;
          border: none;
        }
        
        .dark .prose img {
          box-shadow: none;
          border: none;
        }
        
        .prose pre {
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: hsl(var(--foreground));
          font-weight: 600;
        }
        
        .prose p {
          margin-bottom: 1.25rem;
          line-height: 1.75;
        }
        
        .prose blockquote {
          border-left-color: hsl(var(--primary) / 0.5);
          background-color: hsl(var(--muted) / 0.3);
          padding: 1rem;
          border-radius: 0.25rem;
        }
        
        /* 优化页面布局 */
        .forum-post {
          position: relative;
          min-height: calc(100vh - 200px);
        }
        
        /* 目录固定在左侧，避免和内容重叠 */
        @media (min-width: 1024px) {
          .forum-post aside .fixed {
            position: fixed;
            top: 100px;
            z-index: 20;
          }
        }
      `}</style>
    </div>
  );
} 