import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CopyButtonProps {
  text: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  showText?: boolean;
  buttonText?: string;
  successText?: string;
  iconClassName?: string;
}

export function CopyButton({
  text,
  className = '',
  variant = 'ghost',
  size = 'sm',
  showIcon = true,
  showText = true,
  buttonText = '复制',
  successText = '已复制',
  iconClassName = 'h-4 w-4',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
    >
      {showIcon && (
        copied ? 
          <Check className={`${iconClassName} ${showText ? 'mr-2' : ''} ${copied ? 'text-green-500' : ''}`} /> : 
          <Copy className={`${iconClassName} ${showText ? 'mr-2' : ''}`} />
      )}
      {showText && (copied ? successText : buttonText)}
    </Button>
  );
} 