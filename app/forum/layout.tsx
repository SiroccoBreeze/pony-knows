import { Footer } from "@/components/Footer"
import Navbar from "@/components/Navbar"

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  )
} 