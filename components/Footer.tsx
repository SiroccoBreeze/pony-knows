"use client";

import Link from "next/link"

const Footer = () => {
  return (
    <footer className="w-full border-t bg-background site-footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* 产品列 */}
          <div>
            <h3 className="text-sm font-semibold">产品</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">
                  服务
                </Link>
              </li>
              <li>
                <Link href="/services/database" className="text-sm text-muted-foreground hover:text-foreground">
                  数据库
                </Link>
              </li>
              <li>
                <Link href="/services/minio" className="text-sm text-muted-foreground hover:text-foreground">
                  存储服务
                </Link>
              </li>
            </ul>
          </div>

          {/* 公司列 */}
          <div>
            <h3 className="text-sm font-semibold">公司</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                  关于我们
                </Link>
              </li>
              <li>
                <Link href="/team" className="text-sm text-muted-foreground hover:text-foreground">
                  团队
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">
                  招聘
                </Link>
              </li>
            </ul>
          </div>

          {/* 资源列 */}
          <div>
            <h3 className="text-sm font-semibold">资源</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
                  博客
                </Link>
              </li>
              <li>
                <Link href="/forum" className="text-sm text-muted-foreground hover:text-foreground">
                  社区
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
                  文档
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系方式列 */}
          <div>
            <h3 className="text-sm font-semibold">联系方式</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                  联系我们
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">support@example.com</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">+86 12345678901</span>
              </li>
            </ul>
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