"use client";

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
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              产品
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products/feature1" className="text-muted-foreground hover:text-foreground">
                  功能一
                </Link>
              </li>
              <li>
                <Link href="/products/feature2" className="text-muted-foreground hover:text-foreground">
                  功能二
                </Link>
              </li>
              <li>
                <Link href="/products/feature3" className="text-muted-foreground hover:text-foreground">
                  功能三
                </Link>
              </li>
              <li>
                <Link href="/products/feature4" className="text-muted-foreground hover:text-foreground">
                  功能四
                </Link>
              </li>
            </ul>
          </div>

          {/* 资源列 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              资源
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/resources/docs" className="text-muted-foreground hover:text-foreground">
                  文档
                </Link>
              </li>
              <li>
                <Link href="/resources/guides" className="text-muted-foreground hover:text-foreground">
                  指南
                </Link>
              </li>
              <li>
                <Link href="/resources/api" className="text-muted-foreground hover:text-foreground">
                  API参考
                </Link>
              </li>
              <li>
                <Link href="/resources/examples" className="text-muted-foreground hover:text-foreground">
                  示例
                </Link>
              </li>
            </ul>
          </div>

          {/* 公司列 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              公司
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  关于我们
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-muted-foreground hover:text-foreground">
                  博客
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-muted-foreground hover:text-foreground">
                  招聘
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  联系我们
                </Link>
              </li>
            </ul>
          </div>

          {/* 社交媒体列 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              关注我们
            </h3>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Button>
              <Button variant="ghost" size="icon">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PonyKnows. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 