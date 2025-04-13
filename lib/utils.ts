import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 从Markdown内容中提取预览文本
 * @param content Markdown内容
 * @param maxLength 最大长度
 * @returns 处理后的预览文本
 */
export function getPreviewText(content: string, maxLength: number = 200): string {
  // 移除Markdown语法标记
  let text = content
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // 保留链接文本
    .replace(/[#*`_~>]/g, '') // 移除特殊字符
    .replace(/\|.*?\|/g, '') // 移除表格行
    .replace(/[-|]+/g, '') // 移除表格分隔符
    .replace(/\n+/g, ' ') // 将换行替换为空格
    .replace(/\s+/g, ' ') // 将多个空格合并为一个
    .trim();

  // 如果文本超过最大长度，截取并添加省略号
  if (text.length > maxLength) {
    // 在单词边界处截断
    text = text.slice(0, maxLength).replace(/\s+\S*$/, '');
    text += '...';
  }

  return text;
}
