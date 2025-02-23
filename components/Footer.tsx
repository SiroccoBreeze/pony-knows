import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col gap-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-3">关于我们</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">公司介绍</Link></li>
              <li><Link href="#" className="hover:text-primary">加入我们</Link></li>
              <li><Link href="#" className="hover:text-primary">联系方式</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">帮助中心</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">使用指南</Link></li>
              <li><Link href="#" className="hover:text-primary">常见问题</Link></li>
              <li><Link href="#" className="hover:text-primary">意见反馈</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">条款</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">服务条款</Link></li>
              <li><Link href="#" className="hover:text-primary">隐私政策</Link></li>
              <li><Link href="#" className="hover:text-primary">免责声明</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">关注我们</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">微信公众号</Link></li>
              <li><Link href="#" className="hover:text-primary">知乎</Link></li>
              <li><Link href="#" className="hover:text-primary">GitHub</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          <p>© 2024 PnoyKonws. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 