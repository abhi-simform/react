import { HealthBadge } from "@/components/common/HealthBadge"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 p-4">
        <h1 className="mb-4 text-xl font-medium">ShopSphere</h1>
        <HealthBadge />
      </main>
      <Footer />
    </div>
  )
}
