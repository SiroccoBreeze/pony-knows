import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github, Twitter } from "lucide-react"

const Footer = () => {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* 产品列 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">产品</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/features" className="hover:text-foreground">功能</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground">价格</Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-foreground">文档</Link>
              </li>
            </ul>
          </div>

          {/* 资源列 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">资源</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/blog" className="hover:text-foreground">博客</Link>
              </li>
              <li>
                <Link href="/showcase" className="hover:text-foreground">案例展示</Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-foreground">社区</Link>
              </li>
            </ul>
          </div>

          {/* 公司列 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">公司</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground">关于我们</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground">联系我们</Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-foreground">加入我们</Link>
              </li>
            </ul>
          </div>

          {/* 法律列 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">法律</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground">隐私政策</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">服务条款</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* 版权信息 */}
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Your Company, Inc. All rights reserved.
            </p>

            {/* 社交媒体链接 */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  <span className="sr-only">GitHub</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 