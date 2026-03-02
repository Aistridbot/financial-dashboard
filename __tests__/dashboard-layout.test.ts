import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"

const appDir = path.join(__dirname, "..", "app", "dashboard")

describe("Dashboard shell structure", () => {
  it("app/dashboard/layout.tsx exists", () => {
    assert.ok(fs.existsSync(path.join(appDir, "layout.tsx")))
  })

  it("app/dashboard/page.tsx exists (redirect page)", () => {
    assert.ok(fs.existsSync(path.join(appDir, "page.tsx")))
  })

  const tabPages = [
    "portfolio",
    "signals",
    "decisions",
    "execution-log",
    "news",
  ]

  for (const tab of tabPages) {
    it(`app/dashboard/${tab}/page.tsx exists`, () => {
      assert.ok(
        fs.existsSync(path.join(appDir, tab, "page.tsx")),
        `Missing page: app/dashboard/${tab}/page.tsx`
      )
    })
  }
})

describe("Dashboard layout content", () => {
  it("layout.tsx contains navigation links for all 5 tabs", () => {
    const content = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf-8")
    assert.ok(content.includes("/dashboard/portfolio"), "Missing portfolio link")
    assert.ok(content.includes("/dashboard/signals"), "Missing signals link")
    assert.ok(content.includes("/dashboard/decisions"), "Missing decisions link")
    assert.ok(content.includes("/dashboard/execution-log"), "Missing execution-log link")
    assert.ok(content.includes("/dashboard/news"), "Missing news link")
  })

  it("layout.tsx uses usePathname for active tab highlighting", () => {
    const content = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf-8")
    assert.ok(content.includes("usePathname"), "Should use usePathname for active tab detection")
  })

  it("layout.tsx has 'use client' directive (needed for usePathname)", () => {
    const content = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf-8")
    assert.ok(content.trimStart().startsWith('"use client"'), "Should start with 'use client'")
  })

  it("layout.tsx renders children", () => {
    const content = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf-8")
    assert.ok(content.includes("{children}"), "Should render children prop")
  })

  it("layout.tsx uses role=tablist for accessibility", () => {
    const content = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf-8")
    assert.ok(content.includes('role="tablist"'), "Navigation should have role=tablist")
  })

  it("layout.tsx uses aria-selected for active state", () => {
    const content = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf-8")
    assert.ok(content.includes("aria-selected"), "Active tab should use aria-selected")
  })
})

describe("Dashboard redirect page", () => {
  it("page.tsx redirects to /dashboard/portfolio", () => {
    const content = fs.readFileSync(path.join(appDir, "page.tsx"), "utf-8")
    assert.ok(content.includes('redirect("/dashboard/portfolio")'), "Should redirect to portfolio")
  })

  it("page.tsx imports redirect from next/navigation", () => {
    const content = fs.readFileSync(path.join(appDir, "page.tsx"), "utf-8")
    assert.ok(content.includes("from \"next/navigation\""), "Should import from next/navigation")
  })
})

describe("Tab page content", () => {
  const tabPages: Array<{ dir: string; title: string }> = [
    { dir: "portfolio", title: "Portfolio" },
    { dir: "signals", title: "Signals" },
    { dir: "decisions", title: "Decision Queue" },
    { dir: "execution-log", title: "Execution Log" },
    { dir: "news", title: "News" },
  ]

  for (const { dir, title } of tabPages) {
    it(`${dir}/page.tsx renders "${title}" heading`, () => {
      const content = fs.readFileSync(path.join(appDir, dir, "page.tsx"), "utf-8")
      assert.ok(
        content.includes(`<CardTitle>${title}</CardTitle>`),
        `${dir}/page.tsx should render "${title}" as CardTitle`
      )
    })

    it(`${dir}/page.tsx uses shadcn/ui Card component`, () => {
      const content = fs.readFileSync(path.join(appDir, dir, "page.tsx"), "utf-8")
      assert.ok(
        content.includes("@/components/ui/card"),
        `${dir}/page.tsx should import from @/components/ui/card`
      )
    })
  }
})

describe("shadcn/ui components installed", () => {
  const uiDir = path.join(__dirname, "..", "components", "ui")
  const requiredComponents = ["tabs", "card", "button", "badge", "input", "table"]

  for (const component of requiredComponents) {
    it(`components/ui/${component}.tsx exists`, () => {
      assert.ok(
        fs.existsSync(path.join(uiDir, `${component}.tsx`)),
        `Missing shadcn/ui component: ${component}.tsx`
      )
    })
  }
})
