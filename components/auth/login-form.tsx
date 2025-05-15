"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect } from "react";

// 登录表单验证模式
const loginFormSchema = z.object({
  email: z.string().email({
    message: "请输入有效的电子邮箱地址",
  }),
  password: z.string().min(6, {
    message: "密码至少需要6个字符",
  }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// 登录按钮组件（弹窗形式）
export function LoginButton() {
  const [open, setOpen] = React.useState(false);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">登录</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>登录账户</DialogTitle>
          <DialogDescription>
            请输入您的电子邮箱和密码登录
          </DialogDescription>
        </DialogHeader>
        <LoginForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// 登录表单组件
interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, error: authError, loading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const loginCompleted = React.useRef(false);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // 检查URL是否包含needKey参数，这表示需要密钥验证
  const hasNeedKeyParam = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      return url.searchParams.get('needKey') === 'true';
    }
    return false;
  }, []);
  
  // 添加一个钩子，监听登录完成的标记，显示验证框
  useEffect(() => {
    const loginPending = localStorage.getItem('login_pending_key_verification');
    if (loginPending === 'true' && hasNeedKeyParam) {
      console.log("检测到登录后等待密钥验证标记，准备调用onSuccess");
      // 准备调用onSuccess以显示密钥验证框
      if (onSuccess) {
        // 直接调用onSuccess回调以显示密钥验证框
        onSuccess();
      }
    }
  }, [hasNeedKeyParam, onSuccess]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setError(null);
    
    try {
      const success = await login(data.email, data.password);
      if (success) {
        form.reset();
        loginCompleted.current = true;
        
        // 如果有needKey参数，表示需要密钥验证
        if (hasNeedKeyParam) {
          console.log("登录成功，需要密钥验证");
          
          // 标记为已完成一阶段登录，避免多次处理
          localStorage.setItem('login_pending_key_verification', 'true');
          // 设置cookie以便中间件能够识别
          document.cookie = 'login_pending_key_verification=true; path=/; max-age=300'; // 5分钟有效
          
          // 立即调用onSuccess回调显示密钥验证框
          onSuccess?.();
          return;
        }
        
        // 如果不需要密钥验证，正常调用onSuccess回调
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录时发生错误");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>电子邮箱</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <div className="text-sm font-medium text-destructive">{error}</div>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>
    </Form>
  );
} 