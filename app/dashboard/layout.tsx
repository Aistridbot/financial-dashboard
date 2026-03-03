"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Portfolio", href: "/dashboard/portfolio" },
  { label: "Signals", href: "/dashboard/signals" },
  { label: "Decision Queue", href: "/dashboard/decisions" },
  { label: "Execution Log", href: "/dashboard/execution-log" },
  { label: "News", href: "/dashboard/news" },
] as const

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Investment Dashboard</h1>
        </div>
      </header>

      <nav className="border-b" data-testid="dashboard-nav">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1" role="tablist">
            {tabs.map((tab) => {
              const isActive = pathname?.startsWith(tab.href) ?? false

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
