import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"

const ROOT = path.resolve(__dirname, "..")

describe("US-001: Project scaffold", () => {
  it("package.json has next, react, react-dom, typescript", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    )
    assert.ok(pkg.dependencies.next, "next dependency missing")
    assert.ok(pkg.dependencies.react, "react dependency missing")
    assert.ok(pkg.dependencies["react-dom"], "react-dom dependency missing")
    assert.ok(pkg.devDependencies.typescript, "typescript devDependency missing")
  })

  it("tailwind.config.ts exists", () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, "tailwind.config.ts")),
      "tailwind.config.ts missing"
    )
  })

  it("components.json exists (shadcn/ui)", () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, "components.json")),
      "components.json missing"
    )
  })

  it("app/layout.tsx exists and exports a default function", () => {
    const layoutPath = path.join(ROOT, "app", "layout.tsx")
    assert.ok(fs.existsSync(layoutPath), "app/layout.tsx missing")
    const content = fs.readFileSync(layoutPath, "utf-8")
    assert.ok(
      content.includes("export default function"),
      "layout.tsx must export a default function"
    )
    assert.ok(content.includes("<html"), "layout.tsx must render <html>")
    assert.ok(content.includes("<body"), "layout.tsx must render <body>")
  })

  it("app/page.tsx exists and redirects to /dashboard", () => {
    const pagePath = path.join(ROOT, "app", "page.tsx")
    assert.ok(fs.existsSync(pagePath), "app/page.tsx missing")
    const content = fs.readFileSync(pagePath, "utf-8")
    assert.ok(
      content.includes('redirect("/dashboard")'),
      "page.tsx must redirect to /dashboard"
    )
  })

  it("tsconfig.json exists", () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, "tsconfig.json")),
      "tsconfig.json missing"
    )
  })

  it("lib/utils.ts exports cn function", () => {
    const utilsPath = path.join(ROOT, "lib", "utils.ts")
    assert.ok(fs.existsSync(utilsPath), "lib/utils.ts missing")
    const content = fs.readFileSync(utilsPath, "utf-8")
    assert.ok(
      content.includes("export function cn"),
      "lib/utils.ts must export cn"
    )
  })
})
