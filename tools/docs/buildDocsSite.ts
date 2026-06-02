import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

type PackageJson = {
  name: string;
  version: string;
  bin: Record<string, string>;
};

type Page = {
  slug: string;
  sourcePath: string;
  title: string;
  description: string;
  order: number;
  bodyMarkdown: string;
};

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "docs", "site", "pages");
const OUTPUT_DIR = path.join(ROOT, "docs", "site-dist");
const REQUIRED_SLUGS = [
  "index",
  "install",
  "upgrade",
  "cli-basics",
  "ui",
  "skills",
  "release",
  "pages"
] as const;

async function main(): Promise<void> {
  const packageJson = await readPackageJson();
  const pages = await readPages();
  validateRequiredPages(pages);

  await rm(OUTPUT_DIR, { force: true, recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(path.join(OUTPUT_DIR, "styles.css"), stylesheet, "utf8");

  const nav = buildNav(pages);
  for (const page of pages) {
    const html = renderPage(page, nav, packageJson);
    const outputName = page.slug === "index" ? "index.html" : `${page.slug}.html`;
    await writeFile(path.join(OUTPUT_DIR, outputName), html, "utf8");
  }

  const outputList = pages
    .map((page) => (page.slug === "index" ? "index.html" : `${page.slug}.html`))
    .join(", ");
  console.log(`Built docs site in ${path.relative(ROOT, OUTPUT_DIR)}: ${outputList}`);
}

async function readPackageJson(): Promise<PackageJson> {
  const raw = await readFile(path.join(ROOT, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as Partial<PackageJson>;
  if (
    typeof parsed.name !== "string" ||
    typeof parsed.version !== "string" ||
    !parsed.bin ||
    typeof parsed.bin !== "object"
  ) {
    throw new Error("package.json must define name, version, and bin entries");
  }
  return {
    name: parsed.name,
    version: parsed.version,
    bin: parsed.bin
  };
}

async function readPages(): Promise<Page[]> {
  await validatePageSourceInventory();
  const pages = await Promise.all(
    REQUIRED_SLUGS.map(async (slug) => {
      const sourcePath = path.join(SOURCE_DIR, `${slug}.md`);
      const raw = await readFile(sourcePath, "utf8");
      return parsePage(sourcePath, slug, raw);
    })
  );
  return [...pages].sort((left: Page, right: Page) => left.order - right.order);
}

async function validatePageSourceInventory(): Promise<void> {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const actualSlugs = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.slice(0, -".md".length))
    .sort();
  const expectedSlugs: string[] = [...REQUIRED_SLUGS].sort();
  const missing = expectedSlugs.filter((slug) => !actualSlugs.includes(slug));
  const extra = actualSlugs.filter((slug) => !expectedSlugs.includes(slug));
  if (missing.length > 0 || extra.length > 0) {
    const parts = [
      missing.length > 0 ? `missing required pages: ${missing.join(", ")}` : null,
      extra.length > 0 ? `unlisted page sources: ${extra.join(", ")}` : null
    ].filter((part): part is string => part !== null);
    throw new Error(`docs site page inventory mismatch (${parts.join("; ")})`);
  }
}

function parsePage(sourcePath: string, slug: string, raw: string): Page {
  const lines = raw.split(/\r?\n/u);
  if (lines[0] !== "---") {
    throw new Error(`${sourcePath} must start with frontmatter`);
  }
  const endIndex = lines.indexOf("---", 1);
  if (endIndex === -1) {
    throw new Error(`${sourcePath} must close frontmatter with ---`);
  }

  const frontmatter = new Map<string, string>();
  for (const line of lines.slice(1, endIndex)) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new Error(`${sourcePath} has invalid frontmatter line: ${line}`);
    }
    frontmatter.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  const title = frontmatter.get("title");
  const description = frontmatter.get("description");
  const order = Number(frontmatter.get("order"));
  if (!title || !description || !Number.isInteger(order)) {
    throw new Error(`${sourcePath} frontmatter must define title, description, and integer order`);
  }

  return {
    slug,
    sourcePath,
    title,
    description,
    order,
    bodyMarkdown: lines.slice(endIndex + 1).join("\n").trim()
  };
}

function validateRequiredPages(pages: Page[]): void {
  const slugs = new Set(pages.map((page) => page.slug));
  const missing = REQUIRED_SLUGS.filter((slug) => !slugs.has(slug));
  if (missing.length > 0) {
    throw new Error(`Missing required docs pages: ${missing.join(", ")}`);
  }
}

function buildNav(pages: Page[]): string {
  return pages
    .map((page) => {
      const href = page.slug === "index" ? "index.html" : `${page.slug}.html`;
      return `<a href="${href}">${escapeHtml(page.title)}</a>`;
    })
    .join("\n");
}

function renderPage(page: Page, nav: string, packageJson: PackageJson): string {
  const commandName = Object.keys(packageJson.bin)[0];
  if (!commandName) {
    throw new Error("package.json must expose at least one CLI binary");
  }
  const replacements = new Map<string, string>([
    ["PACKAGE_NAME", packageJson.name],
    ["PACKAGE_VERSION", packageJson.version],
    ["CLI_BIN", commandName]
  ]);
  const body = renderMarkdown(applyReplacements(page.bodyMarkdown, replacements));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} | Pairflow Docs</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="index.html">Pairflow Docs</a>
    <nav aria-label="Documentation">${nav}</nav>
  </header>
  <main>
    ${body}
  </main>
  <footer>
    Generated from repo docs. Package: ${escapeHtml(packageJson.name)} ${escapeHtml(packageJson.version)}.
  </footer>
</body>
</html>
`;
}

function applyReplacements(input: string, replacements: Map<string, string>): string {
  let output = input;
  for (const [key, value] of replacements) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

function renderMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/u);
  const output: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushLists = (): void => {
    if (listItems.length > 0) {
      output.push(`<ul>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }
    if (orderedItems.length > 0) {
      output.push(`<ol>${orderedItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      orderedItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph();
      flushLists();
      if (inCode) {
        output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      flushLists();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (heading) {
      flushParagraph();
      flushLists();
      const level = heading[1]?.length ?? 1;
      const text = heading[2] ?? "";
      output.push(`<h${level}>${renderInline(text)}</h${level}>`);
      continue;
    }

    const unordered = /^-\s+(.+)$/u.exec(line);
    if (unordered) {
      flushParagraph();
      orderedItems = [];
      listItems.push(unordered[1] ?? "");
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/u.exec(line);
    if (ordered) {
      flushParagraph();
      listItems = [];
      orderedItems.push(ordered[1] ?? "");
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) {
    throw new Error("Unclosed Markdown code fence in docs site source");
  }
  flushParagraph();
  flushLists();
  return output.join("\n");
}

function renderInline(input: string): string {
  let rendered = escapeHtml(input);
  rendered = rendered.replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>");
  rendered = rendered.replace(/`([^`]+)`/gu, "<code>$1</code>");
  rendered = rendered.replace(
    /\[([^\]]+)\]\(([^)]+)\)/gu,
    '<a href="$2">$1</a>'
  );
  return rendered;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const stylesheet = `:root {
  color-scheme: light;
  --background: #fbfbf9;
  --surface: #ffffff;
  --text: #171717;
  --muted: #5f656d;
  --border: #d9dee4;
  --accent: #1f6feb;
  --accent-soft: #eaf2ff;
  --code: #f1f3f5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--text);
  font: 16px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.site-header {
  align-items: center;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  padding: 14px clamp(16px, 4vw, 48px);
  position: sticky;
  top: 0;
}

.brand {
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

nav a {
  border-radius: 6px;
  color: var(--accent);
  padding: 4px 8px;
  text-decoration: none;
}

nav a:hover {
  background: var(--accent-soft);
}

main {
  margin: 0 auto;
  max-width: 920px;
  padding: 48px clamp(16px, 4vw, 40px);
}

h1,
h2,
h3 {
  line-height: 1.25;
  margin: 32px 0 12px;
}

h1 {
  font-size: 2.3rem;
  margin-top: 0;
}

a {
  color: var(--accent);
}

code {
  background: var(--code);
  border-radius: 4px;
  padding: 0.1em 0.35em;
}

pre {
  background: #101418;
  border-radius: 8px;
  color: #f7f7f7;
  overflow-x: auto;
  padding: 16px;
}

pre code {
  background: transparent;
  padding: 0;
}

footer {
  border-top: 1px solid var(--border);
  color: var(--muted);
  margin: 0 auto;
  max-width: 920px;
  padding: 24px clamp(16px, 4vw, 40px) 40px;
}
`;

await main();
