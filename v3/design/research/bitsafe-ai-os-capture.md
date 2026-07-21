# BitSafe — "How BitSafe Runs on AI": Complete Information Capture

> **What this is.** A single, comprehensive capture of BitSafe's public writing on how they
> rebuilt their company to run on AI — every article in the blog series, plus the two GitHub
> references it points to. The goal here is **information capture, not analysis**: this document
> deliberately does *not* filter the material through any product/design lens. It aims to preserve
> *all* the information from the sources, with duplication tolerated where the sources overlap.
> (Source set captured 2026-06-20.)

## Sources

1. **The blog series** at `blog.bitsafe.finance` (14 posts, 2026-05-12 → 2026-06-10), comprising:
   - *How BitSafe Runs on Notion* — Parts 1–5
   - *NanoClaw* — Parts 1–5
   - Three standalone deep-dives (*Why Not Just Use the Claude App?*, *The Invisible Seam*, *Measuring an AI OS, Honestly*)
   - The overview/index post (*The Infrastructure Mindset Turned Inward*)
2. **`github.com/Akibalogh/bitsafe-ai-docs`** — BitSafe's own case-study docs repo (the article source
   markdowns + worked examples + a forward-looking spec). This is the "article-like" GitHub reference.
3. **`github.com/qwibitai/nanoclaw`** — the upstream **NanoClaw framework** (the open-source engine
   BitSafe's implementation is built on). Captured as a structural assessment (Part III).

## How this was captured (method & fidelity notes)

- **Article text.** The blog is behind Cloudflare; its RSS/feed endpoints are also challenged, so direct
  scraping was not possible, and the in-browser path was unavailable this session. Text was captured two ways:
  - **Verbatim from the `bitsafe-ai-docs` repo** where a canonical source markdown exists — this covers
    **6 of the 14 posts**: *Notion Part 2* (= repo `02-architecture.md`) and *NanoClaw Parts 1, 3, 4, 5*
    (= repo `01`, `03`, `04`, `05`). These sections are word-for-word from the repo.
  - **Section-by-section faithful extraction** for the other **8 posts** (Notion Parts 1/3/4/5,
    NanoClaw Part 2, the three deep-dives, and the overview). Each section was pulled individually to
    preserve all specifics (facts, numbers, names, examples, lists, quotes). Wording is faithful-close
    but **not guaranteed strictly verbatim** for these eight — the extraction model paraphrases lightly
    while preserving content. Flagged per-section where relevant.
- **Images.** All 25 images (14 cover/title cards + 11 in-body diagrams) were downloaded from the
  beehiiv CDN and visually analysed. Each appears under its article's **Images** subsection as a prose
  description **plus an ASCII / text-structure rendering**. Cover cards are described briefly; in-body
  diagrams (the information-rich ones) are described exhaustively. Local files live in `/tmp/bitsafe/images/`.
- **Repo-only material** (Part II): the *Lessons* articles `06`–`10` and the *Code Factory MVP* spec are
  in the docs repo but are **not** separate posts in the captured blog series; they are included verbatim.

## Cross-source divergence notes (worth knowing)

- **Two series share source files.** The repo frontmatter shows the same markdowns dual-purposed: e.g.
  repo `02-architecture.md` is titled *"How BitSafe Runs on Notion — Part 2"* yet the README files it under
  the *NanoClaw* series. Repo `03`/`04`/`05` carry frontmatter `series: How BitSafe Runs on Notion` and
  `published: 2026-05-14`, but their **content** matches the blog's *NanoClaw* Parts 3/4/5 (Autonomous
  Engine / Substrate / Working With NanoClaw). The blog re-organised and re-dated these into the NanoClaw run.
- **Notion Part 2 ≠ NanoClaw Part 2.** Both are titled "The Architecture" but are *different articles*:
  Notion P2 covers the Notion workspace architecture (Pillars→Projects→Tasks, Documents, Meetings);
  NanoClaw P2 covers the agent engine architecture (Task Queue, Goals, Memory, Context, Swarm, 24 SQLite
  caches, Ship Pipeline).
- **Dates.** Ordering below uses the **blog publication dates**. Repo frontmatter dates frequently differ
  (the repo versions often predate the blog posts).
- **Authorship.** Bylines are mixed: most posts are credited to **Kadeem Clarke**; the docs repo is owned
  by **Aki Balogh** (`Akibalogh`).

## Master index (blog publication order)

| # | Date | Title | Series | Text source | Images |
|---|------|-------|--------|-------------|--------|
| 01 | 2026-05-12 | Notion as the Company OS | Notion P1 | extracted | cover + 1 diagram |
| 02 | 2026-05-14 | The Architecture (Notion) | Notion P2 | **repo verbatim** (`02`) | cover + 1 diagram |
| 03 | 2026-05-17 | Agents, Automations, and the AI Layer | Notion P3 | extracted | cover + 1 diagram |
| 04 | 2026-05-19 | Replacing Salesforce with Notion | Notion P4 | extracted | cover + 1 diagram |
| 05 | 2026-05-21 | The Agent Governance Model | Notion P5 | extracted | cover |
| 06 | 2026-05-24 | Building a Company-Wide AI Assistant | NanoClaw P1 | **repo verbatim** (`01`) | cover + 1 diagram |
| 07 | 2026-05-26 | The Architecture (NanoClaw) | NanoClaw P2 | extracted | cover + 1 diagram |
| 08 | 2026-05-28 | The Autonomous Engine | NanoClaw P3 | **repo verbatim** (`03`) | cover |
| 09 | 2026-05-31 | The Substrate | NanoClaw P4 | **repo verbatim** (`04`) | cover |
| 10 | 2026-06-02 | Working With NanoClaw | NanoClaw P5 | **repo verbatim** (`05`) | cover |
| 11 | 2026-06-07 | Why Not Just Use the Claude App? | Deep-dive | extracted | cover + 1 diagram |
| 12 | 2026-06-08 | The Invisible Seam | Deep-dive | extracted | cover + 1 diagram |
| 13 | 2026-06-09 | Measuring an AI OS, Honestly | Deep-dive | extracted | cover + 1 diagram |
| 14 | 2026-06-10 | The Infrastructure Mindset Turned Inward | Overview | extracted | cover + 2 diagrams |

**Part II** (repo-only): Lessons `06`–`10` (Cost Discipline; Monitors & Alerts; Capability Coverage &
Harness Guards; Guard Parity; The Completeness Trap) + the *Code Factory MVP* spec.
**Part III**: `qwibitai/nanoclaw` framework structural assessment.

---

# Part I — The Blog Article Series (chronological)


---

## [01] How BitSafe Runs on Notion — Part 1: Notion as the Company OS
**Published:** 2026-05-12 · **Series:** How BitSafe Runs on Notion · **Source:** https://blog.bitsafe.finance/p/how-bitsafe-runs-on-notion-part-1-notion-as-the-company-os

Most teams using AI today are stitching it onto a workspace that wasn't built for it. Individual ChatGPT accounts. A few Notion agents. A scattered handful of automations. Each one helpful in isolation, none of them compounding. The team gets a little faster, then plateaus.

We took a different approach. We rebuilt the company itself so AI could use it.

Three layers do the work at BitSafe:

- **Notion** is the system of record — the structured, queryable memory of how the company actually operates.
- **Claude** is every employee's daily leverage layer, in two forms: inside Notion (Notion AI is Claude-powered, so the workspace itself is agentic) and outside Notion through the standalone Claude apps — Claude Code for engineering, plus Claude Chat, Cowork, and Design for everyone else.
- **NanoClaw** is the autonomous fleet — roughly 80 scheduled agent tasks running in the background, monitoring, executing, and surfacing what matters.

This is Part 1 of a four-part series on how that stack came together at BitSafe. Aki has already written about NanoClaw — the harness, the security model, the local caches, the knowledge compiler. We won't re-cover that ground here. This series is about the part that makes the rest of it work: Notion. Specifically, what it took to turn Notion from a wiki into a substrate that AI agents can actually do work on top of.

### The trifecta

BitSafe's AI infrastructure rests on three distinct layers:

**Notion** serves as "the system of record — the structured, queryable memory of how the company actually operates." Pages have hierarchical relationships, databases maintain defined schemas, properties are typed, and relations create connections between entities. When autonomous agents query "which Canton ecosystem apps have an open opportunity in Negotiation with a close date this quarter," they receive accurate results because the company structure enables such questions.

**Claude** provides unstructured leverage in two modes. Within Notion, Claude powers the built-in AI features, enabling users to access "agentic Q&A, summarization, and writing assistance" without leaving their workspace. Externally, the team accesses Claude Code for engineering work and Claude Chat, Cowork, and Design for other functions. The pattern remains consistent: "drop into a Claude conversation and operate on real data." However, Claude lacks persistent memory—each session begins anew, relying on whatever Notion auto-retrieves or humans provide.

**NanoClaw** functions as "the persistent fleet" running "roughly 80 scheduled agent tasks" in the background. It operates ephemeral Claude Code containers on schedules, writes results to Slack and Notion, maintains "24 indexed knowledge caches," and effectively serves as "a chief-of-staff layer the whole company shares."

The foundational principle states: "the AI layer is only as good as the substrate underneath it."

### Why Notion has to be first

BitSafe's team initially operated with fragmented systems across departments. As described in the article: "Each team had their own corner. Marketing had its projects-and-tasks setup. Sales had a sprawl of Google Docs and a separately-managed Salesforce instance. Engineering had multiple disconnected databases."

While teams functioned productively in isolation, the organization faced a critical problem: "nothing they read was structured the same way twice." The company entity in Salesforce differed from the same concept in Notion, and project definitions varied between marketing and product teams.

When BitSafe began developing NanoClaw, agents encountered a fundamental obstacle. They could access all information but encountered inconsistent data structures across systems. This rendered agents "brilliant inside any one silo and useless across them."

The team identified two potential solutions: either develop more sophisticated prompts and retrieval logic to compensate for inconsistencies, or resolve the underlying inconsistency itself. They selected the latter approach, recognizing that "The first approach scales linearly with how many edge cases you can think of. The second approach scales with how disciplined you are willing to be once."

This structural foundation proved essential before deploying the AI layer at scale.

### Handbook-first, signal-not-noise

The organization emphasizes a principle they describe as "handbook-first." According to their framework, "Every decision worth remembering becomes a document. Every recurring process becomes an SOP. Every meeting produces a structured record (decisions, owners, due dates), not a transcript anyone has to re-read."

Two foundational principles guide what content gets documented:

**Signal, not noise.** The team maintains that "A page that nobody reads is worse than no page, because it dilutes search." To address this, every database includes Status (Drafting / In Review / Published / Archived) and Verification properties. Pages are archived aggressively, with a low bar for publishing but stricter accountability for staying published.

**The campsite principle.** Rather than conducting large-scale reorganization, the team follows this rule: "if you touch it, you clean it up to the new standard." Active workstreams transition first; inactive content naturally decays over time. This approach avoids lengthy migration projects that often remain incomplete.

Both principles share an underlying philosophy: "the workspace is a tool for the people working in it, not an archive for posterity." This user-centric design ensures that when systems work well for teams, they simultaneously function effectively for AI agents operating within that same infrastructure.

### The three-tier user model

The hardest aspect of maintaining a company-wide Notion workspace mirrors the challenge inherent in any shared system: establishing governance frameworks. BitSafe addresses this through three distinct tiers.

**Everyday users** comprise the majority of the organization. These individuals read, write, capture, and modify content "inside the structures someone else built." Their activities include creating Tasks, logging meetings, drafting Documents, and capturing Companies in the CRM. They operate without responsibility for schema design or database reorganization.

**Champions** are department-level stewards—one assigned per functional area. They maintain "the surface area of their domain — the Documents their team produces, the dashboards, the SOPs." Champions can modify views and templates within their domain but cannot alter global schemas, preserving system-wide consistency without creating architectural bottlenecks.

**Architects** represent a restricted group overseeing "global schemas, top-level page hierarchies, and any change that touches more than one pillar." Their purview includes new database properties, new Pillar databases, integration tokens, and custom agent permissions.

The framework prioritizes predictability. When NanoClaw queries specific data, "it has to return the same answer to everyone, every time." This consistency requires that properties exist with fixed option sets applied uniformly across users. The governance model enables aggressive AI write-access permissions while maintaining safety—agents can create Companies and log Opportunities because schemas remain locked "to the Architect tier _by policy_, not by capability."

### What this gets us in practice

BitSafe identifies three concrete outcomes from their AI-integrated Notion system:

**Onboarding acceleration**: New employees can immediately query the company's institutional knowledge. As the article states, they can "ask 'what did we tell this customer last quarter' and get a sourced answer in seconds — across every meeting note, every Slack thread, every Notion doc" without waiting for senior team availability.

**Organizational transparency**: Information flows freely across departments. The piece notes that "Marketing sees the sales pipeline. Engineering sees the customer roadmap. Leadership sees Rocks roll up to Projects roll up to Tasks," eliminating information silos.

**Infrastructure replacement**: The company transitioned away from Salesforce to Notion-based CRM operations in under eight weeks without operational disruption to the sales function, demonstrating the substrate's maturity.

The authors highlight a less immediately quantifiable benefit: the system generates compounding returns. Each documented SOP becomes an executable agent capability; each correction prevents repeated errors; each new database expands query surfaces without code modifications. The thesis is that a twelve-month implementation outperforms a one-month deployment through accumulated leverage.

### What we'd do differently

BitSafe identified three areas for improvement if starting over:

1. **Unify earlier.** The company allowed "single-player Notion" to persist too long. According to the article, "Each team's local optimum was the company's global problem." The recommendation is to "Pull the trigger on global databases at the first sign of overlap, not the third."

2. **Build the AI layer second, not first.** The article cautions against deploying agents on unprepared workspaces. The authors note that "The agents looked good; the answers weren't trustworthy. The fix wasn't better prompts — it was a better Notion." The lesson: establish substrate quality before scaling AI capabilities.

3. **Treat schema as a security property, not a UX property.** This approach proved critical for safe write access. The piece explains: "The reason our agents can have broad write access without burning the building down is that the schema is locked and Architect-owned." The warning is direct: "Loose schemas + write-capable agents is a class of disaster."

### Images

#### Cover — art01-cover.png
A dark-themed title card / newsletter cover. Top-left corner shows the BitSafe logo: a small red/orange square mark followed by the wordmark "BITSAFE" in white uppercase. Centered on the card is a small red/orange tab or pill shape (a colored accent block) above the main title. The large white headline text reads "Part 1:" on the first line and "Notion as the Company OS" on the second line. Below the title, in smaller muted gray text, is the subtitle/tagline: "Before AI could run the company, we had to rebuild the company into something a machine could read." The bottom edge carries small footer text in the left and right corners (faint attribution/branding text). Overall palette: near-black background, white primary type, red/orange accent.

```
+--------------------------------------------------------------+
| [■ BITSAFE]                                                  |
|                                                              |
|                        [ ▭ red tab ]                         |
|                                                              |
|                         Part 1:                              |
|                Notion as the Company OS                      |
|                                                              |
|     Before AI could run the company, we had to rebuild       |
|     the company into something a machine could read.         |
|                                                              |
| [footer text]                                  [footer text] |
+--------------------------------------------------------------+
```

#### Diagram — art01-diagram2.jpg
A three-box flow diagram on a white background showing how two upper layers feed into a central system of record. Two gray rectangular boxes sit at the top, side by side. The top-left gray box contains the text: "NanoClaw — the autonomous fleet / ~80 scheduled tasks: monitoring, executing, surfacing." The top-right gray box contains the text: "Claude — the daily leverage layer / Notion AI inside the workspace · Claude apps outside it." Below and centered between them is a single larger orange (red-orange) box with white text reading: "Notion — the system of record / Structured, queryable memory of how the company operates."

Two arrows flow downward from the top boxes into the orange box. From the bottom of the NanoClaw (top-left) box, an arrow curves down and to the right toward the orange box; its connector is labeled "writes results back into". From the bottom of the Claude (top-right) box, an arrow curves down and to the left toward the orange box; its connector is labeled "operates on". Both arrowheads point down into the top edge of the orange Notion box. The visual hierarchy: NanoClaw and Claude are peer layers above; Notion is the foundational/central layer they both connect into. Color coding: gray = the agent/leverage layers, orange = the Notion substrate (system of record).

```
   +---------------------------+      +---------------------------+
   |  NanoClaw —               |      |  Claude —                 |
   |  the autonomous fleet     |      |  the daily leverage layer |
   |  ~80 scheduled tasks:     |      |  Notion AI inside the     |
   |  monitoring, executing,   |      |  workspace · Claude apps  |
   |  surfacing                |      |  outside it               |
   +---------------------------+      +---------------------------+
              |                                    |
   "writes results back into"              "operates on"
              |                                    |
              v                                    v
            +----------------------------------------+
            |  Notion — the system of record         |
            |  Structured, queryable memory of how   |
            |  the company operates                  |
            +----------------------------------------+
```


---

## [02] How BitSafe Runs on Notion — Part 2: The Architecture
**Published:** 2026-05-14 · **Series:** How BitSafe Runs on Notion · **Source:** https://blog.bitsafe.finance/p/how-bitsafe-runs-on-notion-part-2-the-architecture · **Verbatim from repo:** docs/articles/02-architecture.md

Notion gives you infinite flexibility, which is why most workspaces become unusable. The constraint is the feature. Every database we have at BitSafe exists because the cost of *not* having a structured representation of that thing turned out to be higher than the cost of designing one.

This is a tour of the actual architecture. What we built, what we cut, and the principles behind every load-bearing decision.

### The Pillars → Projects → Tasks spine

Project work at BitSafe lives in a three-level hierarchy.

**Pillars** are the long-lived domains of the company. Sales. Marketing. Product. Engineering. Operations. Community & Developer Relations. Each is its own database, with its own home page, dashboards, Documents, SOPs, and Champion. A pillar is the unit of *accountability* — somebody owns the pillar, and everything underneath it.

**Projects** are time-bound, scoped efforts inside a pillar. The CBTC Incentive Program 2.0 is a project. The Q2 partner-launch campaign is a project. The Salesforce → Notion migration was a project. Projects have an owner, a status, a target date, and a set of Tasks rolling up.

**Tasks** are the unit of work. Every task is on a project (or, rarely, free-floating under a pillar). Every task has an owner, a status, and ideally a due date. The Tasks database is the single place where work-to-be-done lives, and it's the database that NanoClaw, the daily standup dashboard, and every team's "what's on" view all read from.

We resisted adding a fourth level. Sub-tasks exist as a self-relation on Tasks, but we don't model them as their own type. Every level you add multiplies the surface area the team has to keep clean.

Above the spine, **Rocks** (our quarterly company goals, in the EOS framework) plug in by relating to Pillars and Projects. Rocks aren't tracked in real time; they're a strategic layer that exists so the rest of the system can be checked against them.

### Documents is the gravitational center

If we had to keep one database, it would be Documents.

Documents holds every artifact that isn't a meeting, a project, or a task: Policies, SOPs, PRDs, Technical Specs, Proposals, Reports, Research, Memos, Guides, Reference, Analyses, Trial Reports. There are 17 Types currently, and the list grows when there's a real reason and not before.

Three properties make Documents work as the workspace's source of truth:

- **Responsible.** Every document has exactly one. It's the person who is accountable for whether this document is true. If they leave the company, this property gets reassigned before anything else.
- **Verification.** A built-in Notion property. Verified documents bubble up in search; verified documents are what the AI layer is told to prefer when it answers a question. Unverified documents are still useful — but the trust signal is explicit.
- **Status.** Drafting → In Review → Published → Archived. The default view filters out Archived, so old content doesn't pollute search.

The principle we drill in: **when in doubt, create a document.** Slack messages are not durable. DMs are not durable. Meeting transcripts are not durable. A document is. If a decision was important enough to make, it's important enough to write down — and the cost of writing it down is lower than the cost of someone re-asking the question in three weeks.

This is the property of Documents that makes the AI layer useful. Notion AI's retrieval is good. NanoClaw's local Notion cache (90MB, FTS5-indexed, ~15,000 pages) is good. Neither is good enough to compensate for content that doesn't exist. The retrieval problem is mostly a "did somebody write this down" problem.

### Meetings as structured output

Meetings is its own database, and every external/internal meeting we record automatically files there.

Fathom (our recorder) pipes the transcript and AI summary into a new Meetings row. A post-processing step extracts decisions and action items into the Tasks database, related back to the Meeting. The Companies and Contacts mentioned in the call get linked. The owner of the meeting gets a notification with a one-paragraph summary and a list of follow-ups.

The principle: **meetings produce structured output, not transcripts.** The transcript is there if you need it; you almost never do. What you need is the decisions, the owners, and the actions. That's what makes it onto the page.

This is also the database that makes meeting-prep automation possible. Our weekly KinCloud sync, the Wednesday marketing meeting, advisory calls — all of them have an SOP that runs against Notion's meeting history, recent CRM activity, and the agenda template, and produces a draft prep doc every week. The humans review it for ten minutes instead of writing it from scratch for an hour.

### Supporting databases that punch above their weight

A few smaller databases do disproportionate work.

**Updates** is a qualitative event log. When something happens to a Company or a Wallet that's worth remembering — a partner went quiet, a competitor showed up, a key person changed jobs — somebody (or some agent) writes an Update. Updates are short, dated, related to the entity they're about, and searchable. They're how we keep history without bloating the parent record.

**Event Log** is the quantitative cousin of Updates. Every state transition on an Opportunity (Stage moved, Amount changed, Owner reassigned) writes a row. This is what powers our pipeline-velocity dashboards and our "stalled deals" detection — without it, you'd be inferring state changes from comparing snapshots.

**Skills** holds the prompts and instructions that drive Notion's custom agents and (synced hourly) NanoClaw's container skills. Skills are documents — the agent capabilities are configured by editing a Notion page, not by deploying code. There are currently 74 skills across the system. New skills don't need a release cycle.

**Sales Routing Rules** is a one-table CRM lookup (region → owner). When an Opportunity is added to a Company, an n8n automation reads this table and assigns the right owner. To change routing, you edit the Notion table. No engineer required.

**Global Tags, Teams, People, Companies, Apps, Contacts, Canton Ecosystem Apps** — the directory layer. Master data, owned by Architects. Everything else relates into these. They're the reason we can join across the workspace at all.

### The dashboard layer

Notion shipped Dashboards in March 2026, and it changed what the architecture is for. Until that point, dashboards were a stack of linked database views with global filters that you had to set seven times. After it, a dashboard is a real first-class layout — multiple databases, cross-DB filters, KPI cards, charts, all responsive.

We rebuilt our home pages around this. Sales Home is one dashboard. The Daily Standup Dashboard is one dashboard. Each Pillar has a dashboard. The trick — and this is in the same family as Documents discipline — is that **dashboards come last**. You build the data first, you live in the data for a few weeks, you find the questions you actually ask, and *then* you build the dashboard. Dashboarding half-baked data ships a tool that nobody trusts.

### Schema discipline as a security model

We touched on this in Part 1; it's worth being concrete here.

The reason we can give a Slack-resident agent permission to create Companies, Opportunities, Apps, Contacts, and Tasks — and to update fields on existing records — is not that we trust the agent. It's that the agent works against a schema it cannot change.

It can't add a property. It can't rename a status option. It can't archive a database. The Architect tier holds those capabilities. Even if a prompt-injection attack convinced the agent to do something destructive, the worst it could do is create well-formed records inside a frozen schema. The blast radius is small and reversible.

This is the same logic, applied at a different layer, that NanoClaw uses with its dual-token Notion integration: a broad read-only token, and a narrow read+write token explicitly excluded from CRM and finance databases. The schema is the perimeter.

### What we cut

A short, useful list of things we built and then removed.

- **A separate Leads database.** Leads turned out to be Companies with an early-stage Engagement Status. Modeling them as their own object created a constant reconciliation problem ("did this Lead become a Company?"). We folded it back in.
- **Forecast Category, Node Operator, Custodians/Wallets, Source/Referred By on Opportunities.** The sales team didn't use them. The fields cluttered the capture flow and made the AI capture agent's job harder. Cut.
- **Per-Pillar Documents databases.** We tried it briefly. It made search across the workspace worse, and Champions ended up duplicating SOPs. One central Documents database with a Pillars relation is strictly better.
- **Inline databases inside meeting notes.** They didn't propagate sharing correctly to integrations and confused the AI layer's retrieval. We use related rows in the central Meetings DB instead.

### What we'd do differently

1. **Lock schemas before you build dashboards.** We didn't, the first time. Schema changes invalidate views. Every change cost us time we shouldn't have spent.
2. **Default to a Notion agent skill before adding a property.** Half the time, the thing you want is a derived view, not a new field. Properties are forever; skills aren't.
3. **Documents is the highest-leverage database.** Spend more time on it than on the CRM. The CRM is replaceable; the company's documented memory isn't.

---

> **📚** **How BitSafe Runs on Notion — series**
> Part 1: [Notion as the Company OS](https://hub.bitsafe.finance/how-bitsafe-runs-on-notion-part-1)
> Part 2: The Architecture *(you are here)*
> Part 3: [Agents, Automations, and the AI Layer](https://hub.bitsafe.finance/how-bitsafe-runs-on-notion-part-3)
> Part 4: [Replacing Salesforce with Notion](https://hub.bitsafe.finance/how-bitsafe-runs-on-notion-part-4)
>

### Images

#### Cover — art02-cover.png

**Prose description:** A dark charcoal/near-black title card in landscape format. In the top-left corner sits the BitSafe logo: a small white geometric/shield-like mark followed by the wordmark "BITSAFE" in white uppercase letters. Centered slightly above the vertical middle is a small orange rounded pill/badge (a thin horizontal accent element). Below it, the main title is rendered in large white serif/display type across two lines: "Part 2:" on the first line and "The Architecture" on the second line. Beneath the title, in smaller, muted grey sans-serif text spanning two lines, is the subtitle: "The schemas, relations, and design patterns that turn a workspace into an agent-ready substrate." The bottom-left and bottom-right corners contain very small, faint grey text (footer/branding labels, illegible at this resolution but positioned symmetrically at the lower edge). The overall aesthetic is minimal, high-contrast, dark-mode editorial, with orange as the single accent color.

```
+--------------------------------------------------------------+
| [▣ BITSAFE]                                                  |
|                                                              |
|                          ( orange pill )                     |
|                                                              |
|                         Part 2:                              |
|                     The Architecture                         |
|                                                              |
|        The schemas, relations, and design patterns that      |
|        turn a workspace into an agent-ready substrate.       |
|                                                              |
| (faint footer text)                       (faint footer text)|
+--------------------------------------------------------------+
```

#### Diagram — art02-diagram3.jpg

**Prose description:** A flowchart on a white background composed of seven rounded-corner rectangular boxes connected by arrows. Six boxes are light grey with black text; one box ("Documents") is filled solid orange with white text, visually highlighting it as the central/emphasized node.

Boxes and their labels:
- Top-left box (grey): "Rocks — quarterly company goals"
- Top-right box (grey): "Directory layer — Companies · Contacts · Teams · People · Tags"
- Middle box (orange, white text): "Documents — the gravitational center"
- Center-left box (grey): "Pillars — long-lived domains, one Champion each"
- Right-of-center box (grey): "Meetings — structured output"
- Lower-left box (grey): "Projects — time-bound, scoped, owned"
- Bottom box (grey): "Tasks — the unit of work"

Connections (arrows) and edge labels:
- "Rocks" connects downward to "Pillars" via a **dotted** arrow, labeled "strategic check" (the dotted line curves down and right into the top of the Pillars box). This is the only dotted/dashed edge; it signals the loose strategic relationship.
- "Directory layer" connects straight down (solid line) to "Documents."
- "Documents" connects downward (solid line, curving left) into the top of "Pillars."
- "Pillars" connects straight down (solid arrow) to "Projects."
- "Projects" connects down and curves right (solid arrow) into "Tasks."
- "Meetings" connects straight down (solid arrow), curving left into "Tasks," and this edge is labeled "decisions become" (i.e., meeting decisions become Tasks).

The layout reads as a vertical spine on the left side: Pillars → Projects → Tasks, with Rocks feeding a strategic check into Pillars, the Directory layer flowing through Documents into Pillars, and Meetings feeding decisions into Tasks. Documents (orange) sits at the top-center as the highlighted gravitational center connecting the directory layer down into the project spine.

```
  [Rocks — quarterly          [Directory layer —
   company goals]              Companies · Contacts ·
        |                      Teams · People · Tags]
        |                              |
        | (dotted)                     | (solid)
        | "strategic                   v
        |   check"            +---------------------------+
        |                     | Documents — the           |  <-- ORANGE
        |                     | gravitational center      |      (highlighted)
        |                     +---------------------------+
        |                              |
        v                              | (solid, curves left)
  +--------------------------+ <-------+
  | Pillars — long-lived     |
  | domains, one Champion    |        [Meetings — structured
  | each                     |         output]
  +--------------------------+              |
        |                                   |
        v (solid)                           | (solid)
  +--------------------------+              | "decisions
  | Projects — time-bound,   |              |   become"
  | scoped, owned            |              |
  +--------------------------+              |
        |                                   |
        v (solid, curves right)             v (curves left)
  +--------------------------------------------------+
  |          Tasks — the unit of work                |
  +--------------------------------------------------+
```


---

## [03] How BitSafe Runs on Notion — Part 3: Agents, Automations, and the AI Layer

**Published: 2026-05-17 · Series: "How BitSafe Runs on Notion" · Source: https://blog.bitsafe.finance/p/how-bitsafe-runs-on-notion-part-3-agents-automations-and-the-ai-layer (captured via WebFetch, section-by-section)**

### Introduction

**Title:** How BitSafe Runs on Notion — Part 3: Agents, Automations, and the AI Layer

**Subtitle / dek:** How Notion AI, Claude, and NanoClaw divide the labor, and the MCP layer that connects them.

**Author:** Kadeem Clarke

**Date:** May 17, 2026

**Opening line:** "We don't have one AI strategy. We have three, and they only work because they don't compete."

This article examines how a trifecta of AI systems divides labor atop the Notion substrate described in Parts 1 and 2. It explores what Notion AI and Notion's custom agents excel at, what Claude and Claude Code handle best, what NanoClaw provides, and how these systems avoid overlap.

The foundational principle is preventing these layers from competing by being precise about what each is *not* well-suited for. The connective tissue binding these systems is the Model Context Protocol (MCP), which allows Notion to expose the workspace and be consumed by other tools without requiring cross-platform awareness.

### Three strategies, one division of labor

BitSafe employs three distinct AI approaches that operate without competition:

**Notion AI and custom agents** function where the data lives. They handle tasks centered on reading or writing workspace content — "CRUD on the CRM, lookups in the sidebar, autofill on a database, agentic Q&A against pages." These tools benefit from native Notion access without network latency.

**Claude and Claude Code** serve as the leverage layer for employees. They excel at "Long-form thinking. Code. Ad-hoc analysis on a CSV. Drafts that don't fit a database." These are appropriate for work that is "primarily unstructured" — work involving "a conversation with a smart collaborator."

**NanoClaw** functions as the persistent operational fleet. It handles tasks requiring scheduling, queue monitoring, Slack surveillance, code deployment, or cross-system coordination. "NanoClaw's superpower is that it doesn't need a human to start it."

The integrating layer is **MCP** (Model Context Protocol), which enables workspace exposure. Notion provides native MCP service; NanoClaw accesses Notion through both this server and its SQLite cache; Claude uses both channels. The approach prevents conflicts through specialization — each tool recognizes what it handles poorly and delegates accordingly.

### Custom agents living inside Notion

BitSafe operates a fleet of specialized custom agents within Notion, each with a single responsibility: "Each one owns one entity and one verb."

**The CRM Capture Agent** appears across three interfaces — a Slack channel (#bd-ai-crm), the Notion AI sidebar, and standard Notion forms. Its function is transforming natural language descriptions into structured database records. Example: "New lead: Temple Digital, met at Canton Summit, interested in CBTC" becomes a properly filed row. The agent also manages updates and lookups, handling requests like "set Temple Digital partnership status to Qualified" and "what's our pipeline in Commit?"

**Companies CRM Enricher** is an autofill agent operating on existing Companies rows. It populates metadata fields including Region, Company Size, AUM/Revenue Band, ICP Segment, and BitSafe Products of Interest — information typically laborious to capture manually. The system works because "the Companies schema is frozen."

**Canton Apps Classifier** applies the same pattern to the Canton Ecosystem Apps database, categorizing new applications by category, stage, and relationship to BitSafe offerings.

**BitSafe CRM Agent** serves as the read-focused counterpart to Capture, answering natural-language CRM questions in Slack such as "show me all open opps for Temple" and "who owns the Dreamtech deal?" It also creates linked Tasks for specific Opportunities, routing follow-ups appropriately.

The underlying principle across all agents: "one entity, one verb, frozen schema." This framework ensures safety even with broad permissions.

### AI-powered SOPs

A distinct category of agent work executes according to a schedule, operating against an SOP written once.

**Meeting preparation.** The Monday RevOps sync, the Wednesday marketing meeting, and advisory calls each have a Notion document SOP describing how to assemble the prep doc — which databases to pull from, which fields matter, what the agenda template looks like. "An hour before each meeting, the SOP runs and produces a draft prep doc. The owner edits it for ten minutes."

**Meeting Notes Processing.** Every Fathom-recorded meeting receives a post-processing pass that extracts decisions, action items, and entity mentions. "Action items become Tasks. Mentioned Companies and Contacts get linked. The summary is short, structured, and actually used."

**Salesforce → Notion automation migration.** This SOP has been operating for the past two months. Every Salesforce automation still in use gets analyzed to determine whether it writes data, merely reports on it, or triggers an external workflow — then either rebuilt in Notion or deprecated.

The organizing principle: "humans write the SOP once, agents run it every week." The leverage derives not from the model itself, but from "the SOP being good enough that the model has nothing to argue about."

### Autofill agents as the silent workhorse

Autofill is an underrated capability in Notion's AI features. Rather than viewing it merely as a UX enhancement, BitSafe treats it as critical infrastructure maintaining database integrity.

The organization follows a three-tier hierarchy for determining when to use autofill versus other approaches:

1. **Autofill** — applied when values are derivable from existing content. Examples: Region, ICP Segment, App Category assignments.
2. **Manual field retention** — preserved for judgments requiring human discretion, such as Partnership Status and Priority determinations.
3. **Formula** — reserved for purely deterministic transformations like display name generation and score combinations.

Autofill's effectiveness remains largely invisible: "Autofill doesn't get credit because nobody sees it work." Employees observe only the outcome — a consistently populated CRM — rather than the underlying automation. This anonymity reflects the feature's success in maintaining data quality without requiring active user attention or intervention across their most frequently used databases.

### Notion ↔ NanoClaw via MCP

The communication between NanoClaw and Notion is bidirectional:

**NanoClaw → Notion (via Notion's MCP server).** NanoClaw employs the native Notion MCP for searching, reading pages, querying databases, creating pages, updating properties, and appending content. The implementation uses two integration tokens: "a broad read-only token, and a narrow read+write token that explicitly excludes the CRM and finance databases." This is "the dual-token model from the NanoClaw architecture piece — applied here at the Notion boundary."

**NanoClaw → Notion AI (the compilation layer).** "Notion AI does its own retrieval — semantic search, BM25, query expansion — across the workspace." For certain questions, this retrieval performs better than NanoClaw's local FTS5 over cached Notion content. Consequently, NanoClaw can invoke Notion AI as a sub-agent: "it sends a question, Notion AI compiles an answer from the workspace, and NanoClaw uses that answer in whatever larger task it's running."

This represents fundamental design rather than a workaround: "Every layer of the trifecta does what it's best at, and the layers call each other when one of them has the better tool."

### Worked example: the CRM Hygiene Monitor

**The problem.** CRMs deteriorate over time. Stages become outdated. Accounts lose momentum. Deadlines are missed. Required fields remain incomplete. Most organizations address this through a Monday-morning hygiene meeting that proves unpopular.

**The implementation.** Four agent capabilities, each housed in the Notion Skills database:

- **Stale Stage** — identifies any Opportunity remaining in the same stage beyond its expected duration.
- **Dormant Account** — identifies any partnered Company showing no recent engagement.
- **Overdue Close Date** — identifies Opportunities past their scheduled closing date.
- **Missing Required Fields** — identifies rows failing to meet locked capture-layer specifications.

Each executes every weekday at 9 AM ET, with output directed to a #crm-alerts Slack channel.

**Cross-layer cooperation.**

- The *schema* (Notion, Architect-owned) establishes timing definitions by setting expected stage dwell times.
- The *skills* (Notion Skills DB) specify execution methodology for each check.
- *NanoClaw* executes them according to schedule and publishes to Slack.
- The *BitSafe CRM Agent* (Notion-resident) processes human responses: "fix Temple — set close date to next Tuesday" gets translated and recorded back to Notion.

No engineer participation is required in this workflow. Modifying a check involves editing the skill page. Adjusting a routing rule involves modifying the routing-rules table. System behavior is configured entirely within Notion.

### Governance

BitSafe's agent control framework:

**Schema Protection.** Databases where agents write have "closed sets of options on every status, select, and multi-select property. The agent can't introduce new states."

**Master Data Ownership.** Core entities (Companies, People, Apps, Tags) remain architect-controlled. Agents may create new company rows but "can't mint a new Country or Region."

**Action Tiering.** Read operations and routine writes proceed freely. However, "Destructive actions (deletes, archives, mass updates, anything touching financial data) require explicit human approval — not at the model layer, but at the harness layer where it can't be talked out of it."

**Token Scoping.** Two integration tokens with "mutually exclusive scopes" limit blast radius if either token is compromised.

**API Access Model.** The organization deliberately rejected distributing API keys to all employees. Instead, they centralized "API access at the top of the page tree, scoped by integration," reasoning this maintains workspace coherence and enables agent governance. Per-user keys would "create silent silos."

Governance happens primarily through design-phase decisions rather than runtime enforcement.

### What we'd do differently

**1. Implementation Sequencing.** Build the three-layer system intentionally in this sequence: Notion first, then Claude, then NanoClaw. The team partially followed this approach and believes deliberate ordering "would have saved us a quarter."

**2. Layer Specialization.** Prevent overlap among tools. When Notion-specific questions arise in NanoClaw, the system should invoke Notion AI. When long-form thinking tasks appear in Notion's sidebar, routing to Claude becomes the appropriate response. The core principle: "Tools that try to be all three become bad at all three."

**3. Infrastructure Investment.** Often-overlooked technical foundations are critical to success: "MCP timeouts. Integration tokens. Sync drift. Permission scopes." This middleware layer is "where the project lives or dies," while it generates minimal external documentation or visibility compared to more prominent features.

### The compounding bet

The trifecta "gets better the more you use it." Each recurring SOP written becomes a skill the AI layer can execute. Corrections saved become memory entries agents stop repeating. New databases create additional structured surfaces queryable across layers without code changes. New employees inherit the system's institutional memory from day one — context previously requiring months to absorb becomes immediately accessible.

The article concludes that "a company running this for twelve months is materially different from a company running this for one." This represents the core strategic wager, with the authors noting "so far it's playing out."

Continuous use creates compounding advantages through accumulated SOPs, institutional knowledge integration, and system maturity rather than through individual model improvements.

### Images

**Cover image (`art03-cover.png`)** — prose:
A dark, near-black banner graphic in the "How BitSafe Runs on Notion" series style. Top-left corner shows the BITSAFE logo (small triangular/prism mark followed by the "BITSAFE" wordmark in white). Centered below is a small rounded orange tab/pill (a numeric "Part" marker). The large centered white headline reads "Part 3:" on the first line and "Agents, Automations, and the AI Layer" on the second. Beneath it, in lighter gray subtitle text: "How Notion AI, Claude, and NanoClaw divide the labor, and the MCP layer that connects them." Faint subtle background texture/lines along the bottom edge.

```
+--------------------------------------------------------------+
|  [△ BITSAFE]                                                 |
|                                                              |
|                        [ orange tab ]                        |
|                                                              |
|                          Part 3:                             |
|         Agents, Automations, and the AI Layer                |
|                                                              |
|   How Notion AI, Claude, and NanoClaw divide the labor,      |
|        and the MCP layer that connects them.                 |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |
+--------------------------------------------------------------+
```

**Diagram (`art03-diagram4.jpg`)** — exhaustive prose:
A flowchart on a white background showing the three-layer AI "trifecta" converging on MCP and the Notion substrate.

Top row — three side-by-side light-gray rectangular boxes (the three strategies):
- Left box: "Notion AI + custom agents / live where the data lives / CRUD · lookups · autofill · / · agentic Q&A"
- Center box: "Claude + Claude Code / the daily leverage layer / long-form thinking · code · / ad-hoc analysis"
- Right box: "NanoClaw / the persistent fleet / schedules · queues · / monitoring · shipping"

From the bottom edge of each of the three top boxes, a thin connector line runs downward and inward, all three merging/joining into a single central light-gray box in the middle row:
- Middle box: "MCP — the connective tissue"

From the bottom of the MCP box, a single vertical line runs straight down into the bottom box, which is highlighted in solid orange with white text:
- Bottom box (orange): "The Notion substrate — / structured, queryable, / schema-locked"

Flow direction: the three specialized layers (top) all connect down through MCP (middle), which connects down to the Notion substrate (bottom, orange). MCP is the single bridge between the three AI layers and the underlying Notion data foundation.

```
 +------------------------+  +------------------------+  +------------------------+
 | Notion AI + custom     |  | Claude + Claude Code   |  | NanoClaw               |
 | agents                 |  | the daily leverage     |  | the persistent fleet   |
 | live where the data    |  | layer                  |  | schedules · queues ·   |
 | lives                  |  | long-form thinking ·   |  | monitoring · shipping  |
 | CRUD · lookups ·       |  | code ·                 |  |                        |
 | autofill · agentic Q&A |  | ad-hoc analysis        |  |                        |
 +-----------+------------+  +-----------+------------+  +-----------+------------+
             \                           |                          /
              \                          |                         /
               +-----------------+   +---+---+   +-----------------+
                                 \   |       |   /
                              +--------------------------+
                              |  MCP — the connective    |
                              |        tissue            |
                              +------------+-------------+
                                           |
                              +------------------------------+
                              |  The Notion substrate —      |   (ORANGE)
                              |  structured, queryable,      |
                              |  schema-locked               |
                              +------------------------------+
```


---

## [04] How BitSafe Runs on Notion — Part 4: Replacing Salesforce with Notion

**Published: 2026-05-19 · Series: "How BitSafe Runs on Notion" · Author: Kadeem Clarke · URL: https://blog.bitsafe.finance/p/how-bitsafe-runs-on-notion-part-4-replacing-salesforce-with-notion**

### Introduction

BitSafe turned off Salesforce in May 2026. This article documents why, how, and what we'd do differently.

The piece presents concrete evidence supporting the broader series argument: a well-designed Notion substrate plus the AI layer on top of it can replace a category of SaaS that most companies treat as untouchable.

The authors qualify the claim: "We don't think every company should make this move. We do think most companies overestimate the switching cost and underestimate what they're paying for the status quo."

The narrative covers the decision rationale, the implementation approach, what actually occurred during the transition, and retrospective insights about what the team would modify in hindsight.

### Why we left Salesforce

BitSafe identified three primary drivers for discontinuing Salesforce:

**Integration isolation.** The CRM had become disconnected from the rest of the company's infrastructure. Everything else at BitSafe had migrated to Notion: the product roadmap, the partner directory, the Canton ecosystem app catalog, the meetings system, the SOPs, the agent skills — all in Notion. This fragmentation created manual reconciliation burdens for cross-system inquiries.

**Agent layer limitations.** The NanoClaw AI system could query Notion natively, but synced Salesforce into a local SQLite cache, where writes had to cross the API boundary. A meaningful share of agent work *needs* writes — capture an opportunity from a Slack message, update a stage from a meeting summary, log an outreach. This dual-system architecture expanded security surface area and prompt complexity.

**Financial considerations.** "Salesforce is expensive. The total cost of ownership — license, integrations, the engineering time to keep the integrations working, the consulting required to make any meaningful change — was meaningfully higher than what Notion costs us."

What was *not* motivating the move: dissatisfaction with Salesforce as a product. "Salesforce is good at what it does. It just wasn't the right tool for the architecture we were building."

### What "good enough" had to look like

Before commencing work, BitSafe documented requirements in a single-page specification.

**Must-haves:**
- Each Salesforce object required a Notion counterpart.
- All active Salesforce automations needed either a Notion equivalent or explicit deprecation.
- Sales team capture speed for opportunities, companies, apps, and contacts matched or exceeded Salesforce performance.
- Reporting and dashboards covered every chart leadership reviewed weekly.
- BDR tooling (Salesloft) continued functioning without disruption, with outputs redirected to Notion.

**Explicit non-goals:**
- Migration of every historical Salesforce automation (many merely generated reports).
- Perfect mirroring of Salesforce's object model; fewer types were intentional.
- Day-one migration of all historical records; active opportunities moved immediately while closed records were archived.

This foundational document shaped all subsequent work phases throughout the eight-week transition.

### The eight-week sprint

#### Week 1: Data architecture

The initial phase involved a comprehensive schema redesign. BitSafe restructured company records by splitting the Type field into two separate properties: Category and BitSafe Role. The team introduced additional company-level fields including Region, Company Size, AUM/Revenue Band, ICP Segment, MSA Status, and BitSafe Products of Interest.

For partnership tracking, they constructed a hybrid Partnership Status pipeline (Prospecting → Qualified → Scoping → Integrating → Live Partner) as a structured Status property rather than unstructured text.

On the Opportunities side, the design locked four required fields at capture (Company, Product, Close Date, Sales Stage) while designating all other fields as optional. The system established flexible relationship mappings between Opportunities and both Companies and Apps, enabling opportunities to roll up multiple ways.

The critical design principle was avoiding a Salesforce replica. The team explicitly rejected features like maintaining Leads as a separate object type — treating leads instead as Companies with early Engagement Status. They also eliminated unused Salesforce fields: Forecast Category, Node Operator, Custodians/Wallets, and Source/Referred By, because the team didn't use them. The resulting schema prioritized how the actual team operated over legacy system structures.

#### Week 2: The capture layer

This phase marked when the migration became operationally real for the sales team. The team introduced the CRM Capture Agent across three interfaces — Slack (#bd-ai-crm), the Notion AI sidebar, and conventional forms — all directing data to identical databases.

The Slack agent proved to be the critical breakthrough. Users could drop a brief message describing an event ("Closed Won with Rho Labs DEX, MSA signed today"), receive clarifying follow-up questions in-thread from the agent, and have the record created in Notion before reading the response. By Wednesday of week 2, the business development representative was employing this system in live operations.

#### Week 3: Reporting, dashboards, and automations

During this phase, BitSafe implemented several key systems.

**Dashboard development.** The initial sales dashboard, introduced as a draft in week 2, underwent refinement based on team feedback. Changes included replacing the kanban with a table organized by stage, removing the Recently Closed section, prominently displaying Commits, and adding hygiene flags to identify Closed Won opportunities missing MSA or Party ID documentation.

**Monitoring systems.** The organization deployed the CRM Hygiene Monitor, which conducted four daily checks, posting to #crm-alerts, as described in Part 3 of the series.

**Automation updates.** Lead routing transitioned from its previous system to a Notion lookup table plus an n8n trigger.

**Reporting capabilities.** The Reporting skill was launched, enabling users to request various analyses through the Slack agent. Users could query pipeline summary, partner status, app ecosystem, activity, project, or custom view, with the system generating a linked database view with headline stats.

This week represented the transition from infrastructure building to functional business intelligence, establishing the reporting layer that would support ongoing operations post-migration.

#### Weeks 4–7: Migration, automation audit, and the long tail

During this phase, BitSafe catalogued every remaining Salesforce automation impacting their sales workflow. The team evaluated each one to determine whether it required rebuilding in Notion, replacement, or elimination. KinCloud consultant Filip assisted with much of this inventory work.

Several specific migrations occurred:

**Dropbox Sign integration.** The company processed their e-signature workflows through a decision framework, keeping some flows while substituting others with Notion-native alternatives.

**Dashboard reconstruction.** BitSafe rebuilt the Salesforce Reveneer SDR KPIs dashboard in Notion's new Dashboards view. This had been "our strongest Salesforce report, and we weren't willing to lose it."

**Event tracking system.** They created a Transition Dashboard showing movement counts by stage weekly, built directly against an Event Log database that NanoClaw populates automatically whenever state changes occur.

This four-week stretch represented the unglamorous middle section of the project — methodical execution of migration tasks and comprehensive automation auditing rather than flashy feature launches. The work involved both technical rebuilding and strategic decisions about what legacy functionality truly mattered for ongoing operations.

#### Week 8: Shutoff

The final phase occurred after the team had been operating in Notion for two weeks. At this point, BitSafe discontinued their Salesforce subscription. The company preserved their historical Salesforce data through an export stored in cold storage, though, according to the article, "Nobody has asked for it."

This shutoff phase followed the completion of three preceding conditions: every active workflow had been migrated, every leadership dashboard had been rebuilt in Notion, and the sales team had been functioning within the new system long enough to validate its effectiveness.

### What helped

**The substrate was already there.** BitSafe's existing Notion infrastructure — the Pillars→Projects→Tasks framework, Documents database, and Meetings system from Parts 1 and 2 — were operational before the Salesforce migration began. This eliminated the need to build foundational components during the eight-week sprint, allowing the team to focus exclusively on CRM implementation.

**The Capture Agent moved before the dashboards.** The article identifies a common migration pitfall: building leadership dashboards first due to visibility. BitSafe reversed this sequence, prioritizing data capture mechanisms because "if the team can't easily put data in, none of the dashboards matter."

**Forms, sidebar, and Slack all wrote to the same place.** Multiple data entry interfaces — traditional forms, Notion's AI sidebar, and Slack's #bd-ai-crm channel — all populated identical databases. Team members selected their preferred surface without creating data fragmentation.

**Locked schemas + AI capture + autofill enrichment.** This combination represented "the closest thing to a free lunch." Minimum-required information entered conversationally triggered autofill completion, resulting in cleaner CRM data than Salesforce previously maintained.

### What didn't transfer (and why we didn't miss it)

The article identifies several Salesforce capabilities that were not carried over to the Notion system:

**Simplified object structure.** BitSafe consolidated from six Salesforce object types down to three, reducing cognitive overhead for team members deciding which database to use.

**Leads database removal.** The separate Leads object was eliminated and instead integrated into the Companies database through an "Engagement Status" property.

**Historical reports.** The team discontinued most legacy Salesforce reports, noting that "half of them were reports about reports." Leadership dashboards that received weekly use were rebuilt natively in Notion; others were dropped entirely.

**Retained external tools.** Two systems remained connected but redirected their outputs:
- Salesloft (the BDR sequencer) stayed operational, with its data writing back through the Updates and Event Log databases.
- Dropbox Sign flows were largely preserved, with their write destinations rerouted to Notion.

These omissions were intentional design choices rather than losses, allowing the team to operate with a cleaner, more streamlined architecture aligned with their actual workflow patterns.

### What we'd do differently

BitSafe identified four key adjustments for future migrations:

1. **Lock the schema in week 1, fully** — rather than allowing fields to drift into week 2, as modifications invalidate views, dashboards, and the AI agent's understanding of which fields to ask for.

2. **Don't let the team see a half-baked dashboard.** They recommend against showing incomplete dashboards to teams. While useful internally, the team's initial impression matters significantly.

3. **Plan the Salesforce automation audit before starting the migration.** The Salesforce automation review should occur during planning phases, not mid-migration. They conducted this in weeks 4–5 but acknowledge it should have been week 0–1, even if some entries had to be filled in as they went.

4. **Outreach data modeling.** The organization should have clarified what constituted "outreach" or "response" before building capture systems, avoiding subsequent rework.

These adjustments reflect lessons learned from their eight-week cutover timeline, prioritizing upfront architectural decisions and sequencing visibility appropriately.

### What it was actually like

The migration proved less dramatic than anticipated. The sales team maintained their regular operations and continued closing deals — two MSAs were signed during the transition and are now recorded as Closed Won in Notion. A 16-hour flight stand-up conducted the day a team member (Aki) returned from travel occurred on the new system without anyone recognizing the infrastructure had changed. The BDR successfully entered records via Slack from an informal location. Leadership accessed pipeline metrics from a recently constructed dashboard.

The most unexpected outcome centered not on the migration process itself, but on the organizational shift that followed. The company experienced a marked reduction in complexity: one unified CRM, a single authoritative database, an AI agent layer functioning across all systems, fewer active integrations requiring maintenance, reduced manual reconciliation tasks, and fewer inquiries about data location.

The author concludes that the eight-week effort delivered something beyond cost savings: "a simpler company."

### Images

#### Cover image (art04-cover.png)

**Prose description:** A dark, near-black title card for the series. In the top-left corner is the BITSAFE wordmark in white accompanied by a small white logo glyph. Centered on the card is a small orange/red square divider element above the main title. The main title reads "Part 4:" on the first line and "Replacing Salesforce with Notion" on the second line, both in large bold white serif/sans type. Below the title, in smaller muted gray text, is the subtitle: "Why we turned Salesforce off after an eight-week cutover, and what we would do differently." Faint small footer text runs along the bottom edge.

```
+--------------------------------------------------------------+
|  [▪] BITSAFE                                                   |
|                                                              |
|                          [ orange square ]                   |
|                                                              |
|                         Part 4:                              |
|              Replacing Salesforce with Notion                |
|                                                              |
|     Why we turned Salesforce off after an eight-week         |
|         cutover, and what we would do differently.           |
|                                                              |
|  ............ (faint footer text) ............               |
+--------------------------------------------------------------+
```

#### Diagram (art04-diagram5.jpg) — the eight-week sprint timeline

**Prose description:** A horizontal left-to-right flow diagram of five boxes connected by right-pointing arrows, depicting the phases of the migration sprint. The first four boxes are light gray with thin borders; the final box (Week 8) is filled solid orange with white text, signaling the terminal/shutoff state. Each box stacks a week label, a phase name, and a short description of the work in that phase.

- Box 1 (gray): **Week 1** — Data architecture — schema redesign, locked capture fields
- Box 2 (gray): **Week 2** — Capture layer — CRM Capture Agent in Slack, sidebar, forms
- Box 3 (gray): **Week 3** — Reporting & automations — dashboards, hygiene monitor, lead routing
- Box 4 (gray): **Weeks 4–7** — Migration & automation audit — rebuild, replace, or retire
- Box 5 (orange): **Week 8** — Shutoff — Salesforce subscription cut

```
+----------------+     +----------------+     +-----------------+     +-----------------+     +====================+
|    Week 1      |     |    Week 2      |     |    Week 3       |     |   Weeks 4–7     |     ‖     Week 8         ‖
| Data           | --> | Capture layer  | --> | Reporting &     | --> | Migration &     | --> ‖    Shutoff         ‖
| architecture   |     | CRM Capture    |     | automations     |     | automation      |     ‖ Salesforce         ‖
| schema         |     | Agent in       |     | dashboards,     |     | audit           |     ‖ subscription cut   ‖
| redesign,      |     | Slack, sidebar,|     | hygiene         |     | rebuild,        |     ‖   (ORANGE FILL)    ‖
| locked         |     | forms          |     | monitor, lead   |     | replace, or     |     ‖                    ‖
| capture fields |     |                |     | routing         |     | retire          |     ‖                    ‖
+----------------+     +----------------+     +-----------------+     +-----------------+     +====================+
```


---

## [05] How BitSafe Runs on Notion — Part 5: The Agent Governance Model

**Published: 2026-05-21 · Series: "How BitSafe Runs on Notion" · URL: https://blog.bitsafe.finance/p/how-bitsafe-runs-on-notion-part-5-the-agent-governance-model**

### Introduction

The exact pattern that allows a small team to operate approximately 60 AI agents while maintaining control involves a registry, narrow scopes, and propose, approve, apply change control.

One agent constitutes a demonstration. Sixty agents present an operations challenge. Establishing the first AI agent requires minimal effort—roughly an afternoon's work. However, complications emerge subsequently, when multiple agents exist and nobody can clearly articulate each agent's function, permitted actions, or accountability when misbehavior occurs. Most teams respond to this situation in one of two ways: they halt expansion at five agents due to perceived risk, or they continue adding agents until the fleet becomes incomprehensible. BitSafe chose a third approach. Currently, approximately 60 governed agents operate within their workspace, and their capacity to continue expanding results not from inherent caution but from implementing identical governance patterns for every agent.

BitSafe operates as an infrastructure company. They introduced Bitcoin to Canton via CBTC and are open-sourcing the Decentralization Manager, described as "one of the first decentralization layers for Canton." The organizational philosophy—constructing layers upon which others build—mirrors how they manage their internal team. The governance pattern is detailed in the following sections.

### Sprawl is the real problem, not capability

The core challenge with scaling agent operations isn't individual agent quality, but rather the ability to answer fundamental questions about the entire fleet: "Which agents are running right now? What can each one change? Who approves a change to one of them? When something looks wrong, where do you look first?"

Without readily available answers to these questions, each new agent introduces risk. As the article puts it, "every new agent raises the odds that two of them quietly step on each other, or that one keeps acting on a rule nobody remembers writing."

Governance infrastructure is the solution. Rather than a tax on operations, it functions as "how you keep those answers cheap to retrieve, no matter how many agents you run."

### The registry: if it is not in the registry, it does not run

**Every agent is a row in one database.** That database serves as the authoritative source for the entire fleet. Each row documents the owner, a concise statement of purpose, a category, the agent type, and a status field that progresses through In development, Active, and Retired stages. The registry also captures the agent's scope, its triggers, which tools it may access, a link to its instructions documentation, and a connection to its change history.

The foundational principle is straightforward: "if an agent is not in the registry, it does not run." This constraint prevents the most prevalent failure mode—shadow agents created for temporary assignments and never deactivated. A simple review of the registry table reveals the complete automation footprint across the organization, preserving visibility that typically disappears as agents accumulate without formal tracking.

### Four shapes cover almost everything

Most of the fleet falls into four patterns, and naming them keeps the system legible.

- **Watchers** react to something appearing: a new page, a new row, a new message. They classify it, enrich it, or flag it for a person.

- **Schedulers** run on a clock. They prep the day, score the pipeline before the week starts, or check what is due.

- **Autofillers** classify and fill database properties at volume. They are the quiet workhorses, doing one narrow labeling job across thousands of rows.

- **Assistants** wait to be asked. You mention one when you want it, and it answers in context.

Once you know which of the four shapes an agent is, you already know roughly how it behaves, how it gets triggered, and what could go wrong with it. A new agent inherits a category instead of inventing one.

### One job per agent

"Narrow scope is the design rule, not an accident." Rather than granting broad mandates to capable models, BitSafe implements the opposite approach. A storyline-mapping agent modifies exactly one property and nothing else. Their contact-classification agent performs a single labeling task and has executed approximately 7,700 times doing only that work. The meeting-preparation agent does not access the CRM system.

This constraint in scope provides two advantages. First, behavior becomes predictable—an agent restricted to changing one field cannot generate unexpected consequences in other database tables. Second, failures are straightforward to isolate; when issues arise, you already know which specific job requires inspection. The article contends that "a fleet of single-purpose agents is far easier to reason about than a handful of clever generalists."

### Propose, approve, apply: change control for instructions

The core governance mechanism ensures that "No agent can edit its own instructions." An agent capable of rewriting its own rules risks unmonitored behavior drift.

The controlled loop operates in three stages:

1. **Propose.** Changes are documented in a dedicated database, including the proposed wording, source of the suggestion, and current status.

2. **Approve.** The proposal goes to the agent's human owner listed in the registry. The owner serves as the approver—not a centralized administrator reviewing everything, but the individual responsible for that specific agent.

3. **Apply.** After approval, a dedicated tuning agent applies the change, which is its sole function.

This structure creates an auditable record: "There is always a written record of what changed, who asked for it, and who approved it." Agent behavior only changes through a logged, owner-approved process.

### Agents that govern the agents

The change-control loop is managed by agents themselves, but with careful divisions of responsibility to prevent any single agent from holding excessive power.

A tuning agent handles the application of approved changes exclusively—it never decides what should change and never approves anything. Meanwhile, a separate oversight agent is designed as read-only: it "cannot edit any agent, and its job is to watch." This oversight agent "posts a weekly digest of every change across the fleet and raises an alert whenever a change is actually applied." The audit trail exists not as a static log file but "as a database, queryable like everything else in the workspace."

The authors emphasize that "Splitting the work this way matters. The agent that can act cannot approve, and the agent that watches cannot act." This separation of powers ensures the governance loop maintains integrity as the fleet expands.

### Approval gates for anything that leaves the building

Inside the workspace, agents have room to work. The moment anything points outward, a person stands in the path. **"Agents propose, people approve."** The agent that handles outbound communication requires three separate human sign-offs before a single message goes out. The newsletter agent drafts but never publishes. The scheduling agent proposes dates, and a person confirms them.

None of this is friction for its own sake. The gates sit exactly where a mistake would be public or hard to undo, and nowhere else, so the routine internal work stays fast.

### Why this is what makes scale possible

It is tempting to read all of this as overhead, the bureaucracy you take on once you have too many agents. It is the reverse. Because each agent is narrow and owned, with every change logged, the marginal cost of one more agent is low. Adding the 61st agent does not add fog: it enters the same registry, fits one of the same four shapes, gets one job, and inherits the same propose, approve, apply loop. The structure is what lets the number keep climbing without the team losing track of it.

That is the quiet argument underneath the whole system. "Governance is not the tax you pay for scale. It is the thing that makes scale safe to reach for."

### Where to start

If you are building on Canton and want to compare notes on running an agent fleet without losing control, find **Kadeem Clarke** on the Canton ecosystem Slack. Happy to walk through any part of the model.

### Images

**Cover image (prose description):** A dark navy/charcoal horizontal banner. Top-left shows the BitSafe logo (a small red/orange diamond-shaped mark next to the white "BITSAFE" wordmark). Centered in large white serif/bold type is the title across two lines: "Part 5:" above "The Agent Governance Model", with a small red/orange accent block sitting just above the title. Below the title, in smaller muted grey text, runs the subtitle: "Keeping 60 agents accountable: a registry where every agent is a row, and a propose, approve, apply loop for every change." A faint thin divider/footer line sits at the very bottom edge.

```
+--------------------------------------------------------------+
| [#] BITSAFE                                                  |
|                                                              |
|                          [##]                                |
|                                                              |
|                      Part 5:                                 |
|             The Agent Governance Model                       |
|                                                              |
|   Keeping 60 agents accountable: a registry where every     |
|   agent is a row, and a propose, approve, apply loop for    |
|                     every change.                            |
| ____________________________________________________________ |
+--------------------------------------------------------------+
```


---

## [06] NanoClaw — Part 1: Building a Company-Wide AI Assistant

**Published:** 2026-05-24 · **Series:** NanoClaw · **Source:** https://blog.bitsafe.finance/p/nanoclaw-part-1-building-a-company-wide-ai-assistant · **Verbatim-from-repo:** docs/articles/01-company-wide-ai-assistant.md

Most teams using AI today are doing it one person at a time — individual ChatGPT accounts, scattered API experiments, no shared memory. I took a different approach: building a shared, company-wide AI assistant that knows the business, has access to company data sources, and gets smarter over time. Here's what I built and how it works.

### The Core Architecture

The system runs as a multi-user platform on top of a frontier LLM (Claude by Anthropic). Each conversation runs in an isolated Docker container with its own workspace. Containers are ephemeral — they spin up per session — but persistent state lives in mounted volumes: one private volume per user, one shared volume per team channel.

A host orchestration layer handles container lifecycle, message routing, and scheduled task persistence. Scheduled tasks are stored in a host database, not crontab — so they survive container restarts and are manageable via API. The agent surfaces in Slack, is thread-aware, uses @mentions, and can spawn named sub-agents that appear as distinct Slack bot identities for complex multi-step workflows.

The tool interface between the LLM and the host uses the **Model Context Protocol (MCP)**. Every tool call — file reads, bash commands, Slack messages, Notion writes, secret retrieval — goes through MCP servers that the harness exposes to the container over stdio. The LLM requests a tool call; the harness checks the permission tier; if approved, executes it and returns the result. This gives the harness fine-grained control over every action the model takes, with a complete audit trail at the harness layer rather than relying on the model to self-report.

Workspace layout: `/workspace/global` (read-only system config and skills, synced from host), `/workspace/group` (shared team channel workspace — memory, daily logs, conversation archives), `/workspace/user` (private per-user workspace, mounted on every container start — secrets, personal config, scripts). Session state in the user workspace persists across ephemeral containers because the volume is mounted from the host, not the container filesystem. The model is explicitly instructed to write intermediate results and decisions to files rather than holding them in context, which also protects against context rot as conversations grow long.

Not every task needs the same model. A model router directs requests to different tiers based on complexity: lightweight checks and simple summaries go to a fast, cheap model; multi-step reasoning, code generation, and anything requiring judgment goes to a more capable one. The routing logic lives in the harness, not the prompt — so it can't be talked out of it. In practice this cuts costs significantly without any quality regression, because most of the volume is low-complexity work that a smaller model handles fine.

### Why NanoClaw Instead of OpenClaw

The harness layer is built on NanoClaw, a ~500-line TypeScript wrapper around the Anthropic SDK. The closest comparison is OpenClaw, a popular open-source framework for running AI agents. The design differs in one central dimension: surface area.

OpenClaw is full-featured and handles a lot of the plumbing automatically. NanoClaw deliberately stays small. At ~500 lines, you can audit the entire harness in an afternoon, understand every code path, and modify it for your environment without fighting framework conventions. That size constraint is itself a security property: with a minimal harness and a strict egress firewall, the attack surface is enumerable.

The permission model is split between two explicit tiers: admin-level operations (harness process — container lifecycle, volume mounts, network config, MCP server registration) and user-level agent operations (runs inside the container with minimal permissions). The agent can only take actions the harness exposes via MCP. There is no path for a model to escalate from user-level to admin through prompt manipulation, because the privilege boundary is enforced by the OS process model, not the application layer.

The tradeoff: you own more of the plumbing. SDK upgrades, tool permission changes, and new MCP server integrations all require editing the harness. For a team that wants deep customization and a clear security story, that's a feature. For a team that wants to stay on autopilot, OpenClaw is the better starting point.

### Security and Permissioning

Security was first-class from day one, not retrofitted:

- Network egress firewall. Containers have an allowlist-only outbound policy. Adding a domain requires an explicit config change and a live reload — the model can't silently reach arbitrary external endpoints.
- No secrets on disk. All credentials are stored encrypted in Google Secret Manager and auto-injected at session start. The model writes secrets via a dedicated MCP tool — never to a plaintext file.
- Per-user isolation. Each user's private workspace is inaccessible to other users and to agents in different channels. Information never crosses workspace boundaries.
- Least-privilege IAM. The GCP service account uses a custom role scoped to exactly the permissions needed, with an audit script to validate configuration drift.
- Tool permission tiers. Operators configure which tool calls require human approval. Destructive actions — database writes, deploys, deletes — require explicit confirmation. Read operations run freely.
- Hook-based automation. Automated behaviors are configured as hooks executed by the harness, not the model — so they can't be bypassed via prompt manipulation.
- Prompt injection defense. Content from web pages, emails, and cached external data is tagged as untrusted and treated as data, never instructions.

Permission modes run a spectrum: `auto` (model decides, high-stakes actions prompt the user), `acceptEdits` (file edits auto-approved, bash requires confirmation), `bypassPermissions` (everything runs without prompts — used only in fully automated scheduled tasks with no human in the loop). All hooks execute in the harness process, not in the container — so even a fully autonomous agent operating in bypassPermissions mode cannot suppress or rewrite them.

The egress firewall is implemented at the container network level using iptables rules applied when the container starts. The allowlist is read from a config file and can be reloaded live without restarting containers: the model can request a new domain by editing the config, but a reload MCP call is required to apply it — creating an observable, auditable step between request and effect rather than a silent background connection.

### Data Sources and Local Caching

The most impactful architectural decision was mirroring all major company data sources into local SQLite databases, synced on schedules from each source's API. Here's the full picture at our current scale:

- Slack — ~78,000 messages, 648MB. The full internal communication history.
- Notion — 15,000+ pages, 90MB. The entire company wiki, specs, and documents.
- CRM (Salesforce) — 38,000+ records: 3,000 accounts, 465 open deals, 5,000 leads, 6,000 contacts, 23,000 tasks.
- Meeting transcripts — 1,700 recorded meetings with 663,000 transcript entries spanning 16+ months.
- Google Calendar — 5,900 events across 21 calendars, categorized by meeting type.
- Codebase snapshots — key repos indexed at file-level granularity for code search.
- Domain documentation — technical specs, protocol docs, standards, indexed and searchable.
- Gmail — per-user via OAuth, with tiered permission scopes (read-only, draft creation, archive/label).

Syncs run on different schedules based on volatility: Slack messages every 30 minutes, Notion pages hourly, Salesforce records every 6 hours, calendar events daily. Each sync is incremental, tracking a high-water mark and pulling only new or modified records since the last run. This keeps sync duration short (seconds to low minutes) regardless of total corpus size.

All databases are opened with the `?immutable=1` URI parameter for agent reads. This disables WAL checkpoint and journal file checks, allowing fully concurrent reads across multiple containers without any locking overhead. Only the sync process holds a write connection. A typical agent container opens 10–12 SQLite databases simultaneously at session start; the immutable flag means none of them block each other or the sync writer.

### Semantic Search

All caches use SQLite's FTS5 (Full-Text Search version 5) extension, which builds inverted indexes over text columns. What this gives you:

- Phrase queries — "settlement finality" matches that exact phrase, not just documents containing both words in isolation.
- Prefix search — "settl*" matches settlement, settling, settler.
- Column-scoped queries — search only message body, not sender name; or only document title, not body.
- BM25 relevance ranking — results ranked by term frequency and inverse document frequency, the same algorithm used by traditional search engines.

A unified search script queries all caches simultaneously in parallel and merges ranked results across every source. Total latency across the full corpus is consistently under 100ms — no API calls, no rate limits, no per-query cost. The model is instructed to always search local caches first before ever claiming it doesn't have access to something.

Beyond text search, each cache exposes domain-specific structured queries: the CRM cache has pipeline (deal funnel view), account-summary (all activity for an account), and contacts-for commands. The calendar cache has upcoming, meetings-for (everyone's schedule with a given person), and meeting-type filters. These aren't just keyword search — they're normalized relational queries.

I'm deliberately not using vector embeddings for semantic similarity. FTS5 + BM25 has been sufficient for the retrieval tasks that come up in practice. The main gap is synonym and paraphrase matching, which matters occasionally but not often enough to justify maintaining a vector store. I'll add embeddings when the failure cases accumulate.

Under the hood, each cache uses stemming so that variant forms of a word ("settling", "settled", "settlement") all match the same query. The ranking algorithm is BM25, which weights results by term frequency and document rarity. Because scores aren't directly comparable across databases of different sizes, the unified search layer normalizes them before merging — with configurable weights per source so that, for example, an exact phrase match in a Notion doc ranks higher than a loose keyword hit in a Slack message.

### Knowledge Compilation

I implemented the Karpathy LLM knowledge base pattern for entity-level intelligence. The idea: instead of doing multi-source retrieval at query time (slow, expensive, context-heavy), a scheduled job pre-compiles all evidence about key entities into structured wiki articles.

Two phases: (1) Gather — pull every piece of evidence about an entity (an account, partner, deal) from CRM, Slack, docs, and calendar into structured JSON. Every message, every meeting, every activity. (2) Summarize — an agent reads that JSON and writes a concise, opinionated entity profile using a template. Query-time retrieval becomes a single-document read. Profiles stay fresh via scheduled re-compilation.

The key insight: pre-compilation shifts cost from query time (every conversation, many users) to batch time (once per schedule run), and produces a single coherent document instead of raw evidence scattered across four databases.

The gather phase produces a structured evidence object like this:

```json
{
  "entity": "Acme Corp",
  "crm": { "stage": "Negotiation", "arr": 120000, "close_date": "2026-06-30", "owner": "..." },
  "slack_messages": [
    { "ts": "1743200000.000000", "sender": "...", "channel": "#bd", "body": "..." }
  ],
  "meetings": [
    { "date": "2026-03-15", "participants": ["...", "..."], "summary": "..." }
  ],
  "docs": [
    { "title": "...", "url": "...", "excerpt": "..." }
  ]
}
```

The summarizer prompt is deliberately opinionated: it's told to surface risks, blockers, and momentum signals rather than just describe activity. The output template has fixed sections — relationship status, key contacts, open items, recommended next steps — so the profiles are structurally consistent and can be compared across entities. An agent writing "they went quiet after the last call" is more useful than an agent writing "last contact was 2026-03-15."

### Agentic Workflows

Beyond single-turn queries, the system supports several patterns for multi-step and parallel work:

- Agent swarms. A coordinator spawns named sub-agents that work in parallel. Each appears as a distinct Slack identity ("Researcher", "Coder", "Reviewer"). Sub-agents return results to the coordinator — never message the user directly.
- Pair programming loop. Coder implements, Reviewer critiques, Coder revises. Hard cap of three iterations, then ship. Prevents endless refinement.
- Pre-flight scripts. Every scheduled task can include a bash check that returns {wakeAgent: true/false}. The LLM only spins up if needed. A monitoring task running hourly only invokes the model when something actually changed.
- Heartbeat monitors. Recurring tasks diff state against a saved JSON snapshot and only alert on changes — useful for pipeline monitoring, PR queues, or any "notify me when X changes" pattern.

### Quality Metrics and Monitoring

An internal metrics API (no external auth, accessible from agent containers) exposes per-run cost breakdowns, daily cost history, agent run stats and error rates, active container counts, cache sync coverage and freshness, and task run history with failure detection.

Alert rules define when to fire vs. stay silent: urgent events always alert; low-priority items and out-of-hours events (10pm–8am) are suppressed. A platform that could generate constant noise needs explicit suppression rules to remain useful.

A use-case monitor tracks what the system is actually being used for across all conversations: which skill categories are invoked most, which queries hit the caches vs. fall back to the API, which tasks get corrected. This feeds a reinforcement loop. High-frequency use cases get dedicated skills and better prompts. Repeated corrections become durable memory entries. Queries that consistently miss in the local caches flag data sources worth adding. The system learns what it needs to be better at by watching itself work.

When a pattern appears consistently across multiple users — the same kind of query, the same multi-step workflow, the same correction — that's a signal to generalize it into a proper skill. A one-off prompt becomes a reusable template. A repeated workflow gets its own orchestration logic. The monitor surfaces these patterns; the skill system absorbs them. New users immediately benefit from what earlier users encountered and refined.

Closing the loop also means running UAT before shipping changes that affect how the system behaves for users. Prompt changes, new skills, modified memory rules — anything that touches the interaction model gets tested against representative queries before it goes live. The goal is catching regressions that unit tests won't find: cases where the system technically works but produces worse answers, or where a new skill conflicts with an existing one.

### Memory Model and Context Management

There are two distinct memory problems in a system like this, and they require different solutions. The first is in-session context: the LLM's active window fills up over a long conversation, degrading quality as irrelevant history crowds out recent signal. The second is cross-session persistence: the model starts each new session knowing nothing about what happened before.

For in-session context, the main countermeasure is treating the file system as external memory. Rather than holding intermediate results in the conversation thread, the agent writes them to files and references them by path. Tool output gets capped — extract what you need, discard the rest. Structured plans survive compaction better than freeform prose, because the plan file is always re-readable. Scheduled tasks always run in isolated context mode: no conversation history, all necessary context in the prompt. This eliminates an entire class of failures where a stale, hours-old conversation poisons a recurring job.

For cross-session persistence, the system uses a typed memory store: four categories (user profile, feedback, project context, external references), each stored as a markdown file with a one-line pointer in a central index. A separate FTS5-indexed search layer makes memories retrievable by keyword. The discipline that matters most: the model is explicitly told that saying "noted" without a file write means nothing was actually remembered. Without that rule, corrections evaporate.

### Self-Improvement

- Persistent memory. Four typed categories: user profile, feedback, project context, external references. Stored as markdown files with a searchable FTS5 index. The model is explicitly told: "noted" without a file write means nothing persisted.
- Feedback capture. Corrections and confirmed approaches are written as structured entries with a Why: and How to apply: line. Goal: the model is never corrected on the same thing twice. Each correction becomes a durable behavior change.
- Skills as config. Agent capabilities (prompts, workflows, domain knowledge) live in a Notion database, synced hourly to disk. Updating a skill means editing a Notion page — no deployment or code change.
- The skills database is private to employees. A company's skills repo isn't just prompts — it encodes how the business actually operates: the workflows people use, the judgment calls built into each skill, the domain knowledge that took years to accumulate. Publishing it would hand competitors a detailed map of your internal processes. Treating the skills repo as a proprietary asset, and building it deliberately, is one of the highest-leverage things a company can do with this kind of system. It compounds: every skill added makes the system more capable for everyone, and the gap between a well-maintained skills repo and a bare installation widens over time.
- Context rot prevention. Long sessions degrade as context fills with irrelevant history. Countermeasures: write intermediate results to files rather than hold in context, use isolated context mode for scheduled tasks, structured plans for multi-step work.

One of the stranger properties that emerges at this level of capability: the system can improve itself by reading other people's setups. An agent can look at how someone else configured their skills, notice a pattern that would work well here, and propose — or directly implement — the change. What's crazy about the current moment is that this loop is real. The system reaches a point where it understands its own scope well enough to keep extending it. You stop adding features to your AI assistant and start having it add features to itself.

### Who Can Build This — and What It Takes

Building something like this requires a surprisingly broad skill set in one person or a small team: sysadmin access to wire up integrations and manage infrastructure, enough coding ability to write skills and debug data pipelines, access to internal data sources (Slack, Notion, GitHub, CRM), a working understanding of what each team actually does, and the ongoing willingness to watch how people use the system and keep improving it. No single piece is especially hard — but you need all of them at once.

The goal also has to be scoped correctly. Not "enable the finance team to run their entire close process end-to-end," but "help a specific accountant speed up the part of their job where they personally create journal entries." Start with one person, one workflow, one bottleneck. Prove it works. Expand when the next bottleneck becomes obvious.

At 22 employees I can pull this off alone — I'm a super admin on every system, I understand the business context end-to-end, and I have the technical background to debug whatever breaks. At larger companies this probably needs a small dedicated team: someone to own the infrastructure, someone embedded in each business unit who understands the actual workflows, and someone responsible for maintaining and improving the system as it grows. The skills are real; they're just spread across multiple roles at scale.

### What I'd Do Differently

Build the web sanitizer on day one — wrapping all external content (web pages, emails, cached data) as untrusted is what actually stops prompt injection at the entry point, and retrofitting it means auditing every place the system reads outside data. The egress firewall is the network-layer counterpart and worth doing early too. Invest in the local cache layer earlier — the speed and cost difference versus live API calls at query time is larger than I expected, and the cross-source unified search turns out to be the most-used feature by far. Be more aggressive about the feedback memory system from the start — the compounding benefit is real but takes weeks to accumulate.

The biggest unlock wasn't any single feature. It was making the system's knowledge persistent and cumulative rather than starting from scratch each session. That's the shift from "an AI you query" to "an AI that knows your business."

> **📖** This is Part 1 of a two-part series. [Read Part 2: NanoClaw Architecture →](https://hub.bitsafe.finance/nanoclaw-architecture)

### Images

#### Cover (`art06-cover.png`)

**Prose:** A dark, near-black banner image. In the top-left corner is the BITSAFE wordmark/logo, preceded by a small angular bracket-style icon, rendered in white. Centered in the image is a small orange rounded-square badge/tab (a decorative accent above the title). Below it, large bold white headline text reads "Part 1:" on the first line and "Building a Company-Wide AI Assistant" on the second line. Beneath the headline, in smaller muted gray text, is the subtitle: "The architecture, security model, and self-improvement loop behind an assistant the whole team shares." At the very bottom there is a faint, very small line of lighter text (a footer/byline, too small to read clearly). The overall design is a minimalist newsletter cover with a black background, white primary text, and an orange accent.

```
+--------------------------------------------------------------+
|  > BITSAFE                                                   |
|                                                              |
|                          [orange badge]                      |
|                                                              |
|                          Part 1:                             |
|            Building a Company-Wide AI Assistant              |
|                                                              |
|   The architecture, security model, and self-improvement     |
|     loop behind an assistant the whole team shares.          |
|                                                              |
|                  (faint small footer text)                   |
+--------------------------------------------------------------+
```

#### Diagram 6 (`art06-diagram6.jpg`)

**Prose:** A horizontal architecture flow diagram on a white background with five rounded-rectangle boxes. Four boxes are gray (light gray fill, thin gray border); the central box is filled solid orange with white text.

Reading left to right:

1. Left-most gray box — title "Slack", subtitle "threads · @mentions · named sub-agents".
2. A bidirectional arrow (double-headed, pointing both left and right) connects the Slack box to the central orange box.
3. Central orange box (white text) — title "Host orchestration layer", subtitle "routing · permission tiers · scheduled tasks".
4. To the right of the orange box is a floating text label "MCP tool calls, checked by the harness". A left-pointing arrow runs from this label region toward the orange box (i.e., from the Docker container back toward the host orchestration layer). A separate right-pointing arrow runs from the label toward the "Ephemeral Docker container" box.
5. Gray box — title "Ephemeral Docker container", subtitle "one per session".
6. From the Ephemeral Docker container box, two arrows branch out to the right toward two stacked gray boxes:
   - Upper-right gray box — title "Persistent volumes", subtitle "private per user · shared per channel". (Arrow curves up-right to it.)
   - Lower-right gray box — title "Local SQLite caches", subtitle "Slack · Notion · CRM · transcripts · calendar". (Arrow curves down-right to it.)

Flow summary: Slack ↔ Host orchestration layer; the host communicates with the Ephemeral Docker container via MCP tool calls checked by the harness (arrow from container back to host, and host out to container); the Docker container connects out to both Persistent volumes and Local SQLite caches.

```
                                      MCP tool calls,
                                      checked by the harness
                                            |
  +-----------+      +------------------+   |   +------------------+      +-----------------------+
  |  Slack    |<---->| Host orchestr.   |<--+   | Ephemeral Docker |--->  | Persistent volumes    |
  | threads · |      | layer            |       | container        |  \   | private per user ·    |
  | @mentions |      | routing ·        |--------->                 |   \  | shared per channel    |
  | · named   |      | permission tiers |       | one per session  |    \ +-----------------------+
  | sub-agents|      | · scheduled tasks|       |                  |     \
  +-----------+      +------------------+       +------------------+      +-----------------------+
                       (ORANGE box)                                       | Local SQLite caches   |
                                                                          | Slack · Notion · CRM ·|
                                                                          | transcripts · calendar|
                                                                          +-----------------------+
```


---

## [07] NanoClaw — Part 2: The Architecture

**Published: 2026-05-26 · Series: "NanoClaw" · URL: https://blog.bitsafe.finance/p/nanoclaw-part-2-the-architecture**
**Note: This is DISTINCT from the Notion "Architecture" article — it covers NanoClaw's internal architecture.**

### Intro

NanoClaw functions as a fleet of short-lived Claude Code containers orchestrated by a host-side scheduler, featuring three persistence layers: a task queue (execution instructions), a memory store (learned information), and a context layer (agent boot awareness). While individual containers are ephemeral, the persistence infrastructure remains durable.

The system operates around a central question: "what does a company look like when an AI agent has continuous organizational memory and the authority to act on it?" Current AI tools fall into two categories — Q&A systems (Notion AI, ChatGPT, Claude.ai) that respond to queries against fixed corpora, and coding agents (Claude Code, Cursor) operating on single repositories per session with no cross-session context retention. Neither maintains business continuity, initiates autonomous work, nor executes consequential actions.

### Why NanoClaw exists

NanoClaw commits to three principles absent from existing categories.

**Continuous Business Context, Shared Across Team**

Every agent invocation boots with awareness of: current work priorities (WORK_CONTEXT.md, refreshed hourly), recent channel/DM thread history, long-term memory per user and group, and 24 indexed knowledge caches covering Slack, Notion, email, GitHub, Canton/Splice/CIP documentation, and source code. New employees receive day-one domain expertise equivalent to 2-year veterans; historical queries (8-month-old deals) receive fidelity matching recent inquiries. This architecture enables chief-of-staff functionality without repetitive briefings on company operations, customer relationships, or blocking issues.

**Proactive Execution, Not Reactive Answering**

Approximately 80 scheduled tasks operate continuously — daily BD digests, hourly knowledge-compiler crons, heartbeat monitors, dev-pipeline auto-promotes, DR drills, customer-channel watchers. The system initiates work autonomously according to schedule and surfaces results. Q&A systems answer when prompted; NanoClaw identifies questions warranting answers and delivers them proactively. This shifts organizational orientation from human-driven triage to agent-driven monitoring, reducing cost-per-watch to near-zero and enabling monitoring of previously unjustifiable systems.

**Authority to Act, With Structured Human-in-the-Loop**

NanoClaw ships code through CI to dev to production, posts in Slack with named identities, drafts and sends email, files research items in ARQ, creates Notion pages, runs database queries, and manages market-maker bots. Graduated permission tiers exist: routine actions execute freely; high-risk actions (mass cross-channel posting, production deploys with schema changes, financial transactions) require explicit human approval via admin-bot RPC patterns or 3-of-3 review. Correct actions eliminate corresponding human tasks; errors surface through audit logs and severity-tagged admin notifications; corrections become memory entries preventing similar future errors.

### What this gets us that Notion AI / Claude Code can't

**versus Q&A systems (Notion AI, ChatGPT, Claude.ai):**

- "Multi-turn conversations persist across sessions and across days, not just within a single chat window."
- Delivers both personalized per-user context (own DM history, preferences) AND shared organizational knowledge simultaneously.
- Executes on answers rather than returning text — sends messages, files documents, ships code.
- Operates across interconnected systems (Slack, Notion, GitHub, Gmail, Heroku, Fly) instead of functioning within single product silos.
- Initiates work on schedules and triggers rather than waiting for human prompts.

**versus coding agents (Claude Code, Cursor):**

- Maintains business context awareness around code — understands customers, open deals, strategy — not merely repository content.
- Preserves context across sessions rather than restarting each invocation fresh.
- Coordinates ~80 parallel scheduled tasks plus per-trigger spawns instead of sequential single-agent execution.
- Functions as persistent team member with stable identity (Slack handle, continuous memory, defined role) versus per-session tool.

### How NanoClaw multiplies every person we hire

- Provides "24/7 backup for every person on the team," eliminating single points of failure on customer threads, deals, and alerts; sleep, vacation, and focus time cease being business risks.
- Delivers "perfect institutional recall on demand" — employees query "what did we tell this customer last quarter" or reasoning behind past decisions, receiving sourced answers within seconds across millions of Slack messages, tens of thousands of Notion pages, all commits, all email.
- New workflows compound company-wide; adding a skill means adding a file; upon shipping, every person benefits immediately without rollout, training, or lossy handoff.
- Dramatically accelerates onboarding; new hires inherit system memory on day one — context previously requiring months of pattern-matching becomes queryable from week one.

### Business value (part evidence, part bet)

**Multiplier Effect on Hiring**

The system multiplies every hire by handling work that scales poorly with headcount. BitSafe aims to hire top talent at ROI-positive levels, with each person operating at higher leverage through NanoClaw's support layer.

**Key Business Value Points:**

- Provides chief-of-staff, sales-ops, and dev-ops layers accessible to all employees.
- "Compounds with use. Every correction becomes a memory entry; every recurring task becomes a skill" — capability costs decrease over time.
- Accelerates deal velocity through BD digests, LinkedIn signal collection, customer-channel monitoring, and marketing-ABM workflows.
- Reduces single-points-of-knowledge fragility when senior employees hold critical context.
- Creates defensible operating advantage versus competitors using off-the-shelf AI tools.
- **Lower-bound financial estimate:** If the executive team saves ~1 hour daily on digests and triage, this represents "over $100k annually in time wasted, miscommunications, and bad data, against a fully-loaded infra cost in the low five figures."
- Team size drives linear return scaling; workflow integration drives superlinear gains.
- The foundational bet: organizations with persistent agent memory plus autonomous execution operate in a different category than those merely using AI tools.

### 1. Task Queue

**Storage & Replication**

All recurring and future jobs live in a single SQLite table (`store/messages.db`) on the host VM, replicated to Google Cloud Storage via Litestream approximately every 1 second.

**Three Schedule Types:**

- Cron (example: "0 9 *" for daily 9am execution)
- Interval (milliseconds between runs)
- Once (one-shot jobs, auto-deleted after firing)

**Execution Model**

When a task fires, the host spawns a fresh Claude Code container, mounts the workspace, runs the prompt, captures output, and terminates the container. The design recognizes that "crontab inside a container is useless — it dies on restart." Every job must register via the `schedule_task` MCP tool, which writes to the host database and survives container churn, host reboots, and VM rebuilds.

**Pre-flight Scripts**

Each task can include a bash script (30-second timeout) that runs first and emits `{wakeAgent: true/false}`. If nothing changed, the agent doesn't activate — saving API credits. Approximately 40% of recurring tasks use this optimization.

**Execution Modes**

- Isolated: fresh session, no history
- Group: joins the Slack thread
- Default is isolated to prevent stale history pollution in scheduled execution.

**Auto-Repair Mechanism**

A nightly cron walks the table fixing drifted `next_run` columns (timezone bugs, daylight savings). This was deployed after one job ran 12 hours late.

**Current Scale (May 2026)**

Approximately 80 active scheduled tasks include: BD digests, knowledge compilers, doc cache syncs, DR drills, agent-credit watchdogs, and design pipelines.

### 2. Goals — Notion as the Control Plane

NanoClaw's task prioritization derives from three Notion databases that drive system behavior:

**Open Decisions** tracks items awaiting Aki's input, preventing agent work that overlaps pending calls. The system currently maintains 13 open decisions.

**Admin Research Queue (ARQ)** catalogs capability gaps and skill proposals. When agents encounter tasks beyond their current abilities, they file ARQ entries rather than failing silently. Aki performs weekly triage of these submissions.

**Active Projects** mirrors current sprint work. An hourly cron synchronizes top entries into `WORK_CONTEXT.md`, ensuring every container boot accesses the current priorities.

The Skills database follows parallel architecture — 74 skills exist as Notion pages, syncing hourly to `/workspace/skills/<name>/SKILL.md`. This on-disk cache remains read-only; edits in Notion propagate globally to future agent invocations without requiring deployment.

### 3. Memory Management

Each agent maintains a memory directory at `/home/node/.claude/projects/-workspace-group/memory/` containing individual memory files and a flat `MEMORY.md` index.

**Four memory categories** structure information:

- **user**: role, expertise, communication style
- **feedback**: corrections AND validated approaches (saving both prevents drift toward excessive caution)
- **project**: shipping status, rationale, timelines (entries include "Why:" lines for temporal relevance assessment)
- **reference**: pointers to external systems (Linear projects, Grafana dashboards, Notion DB IDs)

The foundational discipline: unwritten information doesn't persist. File writes constitute actual memory; verbal acknowledgment alone produces no retention.

The `MEMORY.md` index is intentionally capped at 200 lines, respecting finite context windows and preserving capacity for substantive work. The system employs FTS5 full-text search across memory files for on-demand detail retrieval.

### 4. Context Management

Every container initialization loads files in sequence:

- **THREAD_CONTEXT.md** — preceding N messages from current Slack thread (per-thread file, written by host before spawn)
- **WORK_CONTEXT.md** — global operational status (refreshed hourly, sourced from Notion + memory + recent commits)
- **MEMORY.md** — curated long-term memory index
- **Daily logs** — current and prior day session records
- **User CLAUDE.md** — individual preferences (Aki, Mayank, Anna receive distinct defaults)

The system eliminated an earlier pattern: "stuffing the entire conversation into every prompt." Extended sessions caused degradation termed "context rot." The solution involves writing intermediate results to files and having agents reference them by path rather than reload complete histories. Research-heavy sub-agents receive fresh context windows and return condensed findings.

### 5. Agent Swarm + Parallelism

Build tasks spawn sub-agents in isolated git worktrees enabling concurrent writes to the same repository without collision. Two mechanisms ensure coordination safety:

**File-claim locks** — via `claim_file` / `release_file` / `list_locks` tools for shared external state (Notion rows, package.json, state JSON). Default five-minute TTL with heartbeat refresh. Conflicting agents receive the owner's ID.

**Commit-message trailers** — instead of direct CHANGELOG.md editing (parallel collision risk), agents emit `CHANGELOG-Features:` trailers in commit bodies. The orchestrator runs `consolidate-changelog.py --apply` serially post-merge, eliminating merge-conflict-on-CHANGELOG issues entirely.

Agent swarms employ named sender identities (Researcher, Coder, Reviewer) appearing as distinct bot identities in Slack for readable multi-step workflows. Sub-agents never invoke `send_message` — only the main agent outputs to users.

### 6. Knowledge Layer — 24 SQLite Caches

**Data Sources Mirrored Locally:**

NanoClaw maintains SQLite databases with FTS5 indexes for 24 data sources updated via background crons:

- Communication: Slack history, Notion content, Fathom transcripts, Google Calendar
- Financial systems: Salesforce, QuickBooks Online, Cryptio
- Code repositories: GitHub (DLC-Link source, Canton Foundation repos)
- Documentation: Splice docs, Canton CIPs, DA docs, Brale docs, Temple docs, Nightly docs
- Operations: n8n workflows, Ninety.io KPIs, Telegram community

**Search Architecture:**

The `search-all` function queries all 24 caches in parallel within approximately 400 milliseconds. Three caches (Slack, Fathom, Calendar) received SQLCipher encryption at rest in Phase 2 (May 2026). Phase 3 encompasses Notion and Salesforce encryption.

**Protocol Rule:**

Agents must execute `search-all` before any external API call, dramatically reducing latency and API expenses during information retrieval tasks.

### 7. Ship Pipeline

**Environment Topology:**

Three environments operate: prod (nanoclaw-01, us-central1-c), dev (nanoclaw-staging, us-central1-a), and test (Litestream replica with Sunday DR drill).

**Deployment Flow:**

Branch push → CI (lint, typecheck, Vitest) → staging-deploy rebuilds dev VM → auto-merge-after-staging-smoke sleeps 30 minutes monitoring journalctl → promotion to prod main → prod cron restarts within 5 minutes.

**Manual Review Requirements:**

Hard exceptions requiring human review include: container/Dockerfile modifications, `src/db.ts` schema migrations, `scripts/setup-egress-firewall.sh` changes, and package.json major version bumps. The automation refuses these; humans execute `promote-to-prod.sh` post-review.

**Data Durability:**

Litestream replicates `store/messages.db` to Google Cloud Storage continuously with ~1-second RPO. The Sunday DR drill (`run-litestream-drill.sh`) serves as the standing health check for test environments.

### The Unifying Principle

The system operates on one foundational concept: "write everything to durable storage; treat each agent invocation as fresh." Since containers terminate, persistence occurs through memory, tasks, caches, and skills. This architecture enables continuous organizational improvement without requiring individual agent session memory retention.

### Images

**Cover image** (`art07-cover.png`)

Prose: A dark, near-black banner with subtle horizontal texture. Top-left shows the BITSAFE logo (small orange square icon followed by "BITSAFE" in white). Near the center top is a small orange tab/pill element. The main title is centered in large white serif/sans text reading "Part 2:" on the first line and "The Architecture" on the second line. Below the title, in lighter gray text, a subtitle reads: "Persistent memory, scheduled task queues, and a fleet of containers that never lose business context." Faint small text appears in the bottom corners (publication/branding metadata).

```
+-------------------------------------------------------------+
| [#] BITSAFE                                                 |
|                                                             |
|                        [ orange tab ]                       |
|                                                             |
|                          Part 2:                            |
|                      The Architecture                       |
|                                                             |
|   Persistent memory, scheduled task queues, and a fleet of  |
|       containers that never lose business context.          |
|                                                             |
+-------------------------------------------------------------+
```

**Architecture diagram** (`art07-diagram7.jpg`)

Prose: A flowchart of the NanoClaw architecture with six boxes. At the top center is a gray box labeled "Host-side scheduler / ~80 scheduled tasks · cron, interval, once." In the center (highlighted in orange with white text) is the box "Ephemeral Claude Code containers / spin up · do one job · die." On the right is a gray box "24 SQLite knowledge caches / Slack · Notion · transcripts · docs · code." Along the bottom row are three gray boxes: "Task queue / what to run — survives container churn"; "Memory store / what was learned — typed, indexed"; and "Context layer / what the agent sees at boot."

Arrows and labels:
- A solid arrow runs from the Host-side scheduler DOWN to the Ephemeral Claude Code containers box, labeled "spawns per run."
- A dotted/dashed line runs from the Task queue (bottom-left) UP to the Host-side scheduler, labeled "persistence outlives every container" (arrowhead pointing up into the scheduler).
- From the Ephemeral Claude Code containers box, solid arrows fan down to all three bottom boxes: to Task queue (bottom-left), to Memory store (bottom-center), and to Context layer (bottom-right).
- From the 24 SQLite knowledge caches box (right), a solid arrow goes down to the Context layer box, and another solid arrow curves down/left to the Context layer as well (the caches feed the context layer at boot).

```
            +-----------------------------------+
            |        Host-side scheduler        |
            |  ~80 scheduled tasks ·            |
            |    cron, interval, once           |
            +-----------------------------------+
              ^                  |
   "persistence|                 | "spawns per run"
    outlives    |                 v
    every       |    +-------------------------------+    +---------------------------+
    container"  |    |  Ephemeral Claude Code        |    |  24 SQLite knowledge      |
    (dotted)    |    |  containers                   |    |  caches                   |
              |     |  spin up · do one job · die   |    |  Slack · Notion ·         |
              |     +-------------------------------+    |  transcripts · docs · code|
              |        |          |          |           +---------------------------+
              |        |          |          |                  |        |
              |        v          v          v                  v        v
   +------------------+  +----------------+  +-----------------------------+
   | Task queue       |  | Memory store   |  | Context layer               |
   | what to run —    |  | what was       |  | what the agent sees at boot |
   | survives         |  | learned —      |  |                             |
   | container churn  |  | typed, indexed |  |                             |
   +------------------+  +----------------+  +-----------------------------+
```


---

## [08] NanoClaw — Part 3: The Autonomous Engine

**Series:** NanoClaw · **Part:** 3 · **Published:** 2026-05-28 · **Audience:** App Developers, Trading Firms, Investors · **URL:** https://blog.bitsafe.finance/p/nanoclaw-part-3-the-autonomous-engine · **Verbatim-from-repo:** docs/articles/03-autonomous-engine.md

### The Autonomous Engine — Loops, CI/CD, ARQ + Swarms, Observability

This is Part 3 of BitSafe's NanoClaw case study series. Part 1 covered the company-wide AI assistant pattern. Part 2 covered architecture. Part 3 covers the part most readers ask about first: how the system runs *itself* — without an operator hitting "go" in the morning.

### NanoClaw vs Notion AI

Most readers arrive with the same question: how is this different from Notion AI? The honest answer is that they solve different problems, and we use both.

| | NanoClaw | Notion AI |
|---|---|---|
| Surface | Slack, Telegram, calendar, email, X — wherever you work | Inside Notion only |
| Activation | Proactive (scheduled tasks, alerts, dashboards) + reactive | Reactive only |
| Memory | Persistent across sessions, file-based | Per-conversation only |
| Personas | Multiple named bots (Naval, legalbot, hrbot) | Single voice |
| Sub-agent orchestration | Fan-out swarms, bot-to-bot via MCP | No |
| Data sources | 20+ caches (Slack, Notion, GDrive, Canton, Fathom...) | Notion content only |
| Autonomy | Runs ops loops, ships own code, self-heals | Conversation-bound |

{callout: 💡}
Notion AI helps you write inside Notion. NanoClaw is the company's operating system.
{/callout}

The dividing line is not "which one is smarter." It is what each is allowed to do. Notion AI is a smart cursor inside a document. NanoClaw is a process supervisor with hands on every system the company uses — Slack channels, Notion pages, the Canton ledger, the calendar, the deploy pipeline. The article you are reading was drafted by NanoClaw, reviewed in Notion (where Notion AI can help polish prose), and published back to a public URL by NanoClaw's tooling.

The thesis of this article is that the leverage of a company-wide AI is not in the model — it is in the loops the model runs inside. The rest of this piece is a tour of those loops.

### The operating loops

Five loops keep the company moving when nobody is at a keyboard. Each is a few lines of cron, a script, and a state file. None of them is special; the leverage is that they all run together, all the time, and pass work to each other.

**The host-session loop runs every 30 minutes.** `*/30 * * * * root bash /root/nanoclaw/scripts/claude-host-session.sh` fires under a flock at `/var/lock/nanoclaw-host-session.lock`, so overlapping ticks queue rather than collide. Each tick does four things in order: drains the admin inbox at `data/ipc/admin-inbox/req-*.json` (where container agents file requests that need root), runs the goals-vs-ARQ gap scan, picks up the highest-priority admin task from the Notion Tasks DB, and dumps short-term memory back to the persistent memory files. The loop runs `claude --print` inside a `systemd-run` transient scope (`MemoryMax=8G`, `MemorySwapMax=0`, `MemoryHigh=6G`) so a runaway prompt dies in its own scope instead of taking the box down. A sibling cron checks the admin inbox every minute and triggers the same script if a new request lands, so the worst-case latency for an inbox item is one minute, not thirty.

**The ARQ dispatcher runs every 15 minutes during business hours and every hour overnight.** `research-queue-dispatch.py --apply --min-priority P2 --include-surface-actions` reads the Active Research Queue (a Notion database with priority and status), enforces a daily cap of 10 dispatches, and spawns sub-agents for the eligible rows. P3 work has its own slower cadence (every 30 minutes during business hours) so it does not starve P1/P2. The dispatcher writes findings child pages back into Notion and auto-flips parent rows to `Findings ready` when a child page is detected (a 2026-05-13 pre-dispatch guard, after one ARQ row accumulated 26 duplicate findings pages because the dispatcher kept re-picking a row whose status was stuck at "In investigation"). The dispatcher is intentionally separate from the work; it is the planner, not the worker.

**The daily monitor-investigator publishes a dashboard at 09:00 UTC.** A scheduled task generated from `src/monitor.ts` posts a 15-section health report to `#ai-projects-nanoclaw-admin`: cron drift, container counts, scheduled-task staleness, Anthropic spend, security audit status, backup checkpoint age, dead-man heartbeat, and the rest. Some sections auto-remediate before posting — root-owned cache DBs get chowned back to `nanoclaw`, stale lock files get reaped — and Aki is pinged only on judgment calls (a sync that has been silent for three days, a daily spend that just crossed 2× the trailing-7d average, a cron that has not run in 6 hours). The output is structured: every check returns ok / warn / fail with the next-step command inlined, so reading the dashboard takes ~30 seconds.

**The skill reconciler runs hourly.** `/etc/cron.d/skills-sync` fires `scripts/sync-skills-from-notion.py` every hour at :00. The script reads the Notion Skills DB, mirrors each row to disk at three paths (`/root/nanoclaw-skills/<name>/SKILL.md`, `container/skills/<name>/SKILL.md`, `marketing-ai-system/design_system/skills/<name>/SKILL.md`), and parses the frontmatter of each `SKILL.md` for a `scheduled_tasks:` block. Any tasks declared in frontmatter that are not yet present in `store/messages.db` get inserted; tasks that have been removed from frontmatter get marked inactive. The reconciler is the reason a new skill ships with its scheduled cron declaratively in one place — author the SKILL.md row in Notion, and within the hour the on-disk copies update and the schedule is live.

**The dead-man's switch runs every minute from inside the host, monitored from outside.** A cron drop-in at `/etc/cron.d/dead-mans-heartbeat` fires `scripts/dead-mans-heartbeat.sh` every minute, which POSTs to `https://uptime.betterstack.com/api/v1/heartbeat/<id>`. BetterStack's heartbeat monitor has a 5-minute period plus a 10-minute grace window — the 1-minute cadence tolerates five consecutive misses before alerting. The reason the monitor itself lives off-host (BetterStack, not an on-host cron) is that every on-host monitor would die simultaneously in a kernel panic or networking failure. If NanoClaw goes silent for >15 minutes, a separate piece of infrastructure pages the team. RECOVERED on resume.

The thing none of these loops do is wait. The dispatcher does not block; it queues. The host-session does not poll; it acts on what is in front of it and exits. The monitor does not loop forever; it runs once per scheduled tick and writes its findings. This matters because the failure mode of an autonomous system is a stuck process — a daemon that thinks it is doing something but is not. Short-lived ticks with state files are easier to reason about than long-running daemons, and they make the system trivial to restart: kill the cron, the next tick picks up where the last one left off.

### The ship-itself loop (CI/CD)

The most consequential loop is the one that ships its own code.

**Dev pipeline.** A push to any `feat/*` or `fix/*` branch triggers `dev-deploy.yml` on GitHub Actions. The workflow builds the container, deploys to the dev VM (`nanoclaw-dev`, `34.29.73.19`, port 8847), and runs a 30-minute smoke watch. The `auto-promote-listener.py` daemon polls the dev VM's health endpoint and, if the watch passes clean, merges the branch to `main` automatically. Prod (`port 8848`) restarts shortly after — `pending-restart.sh` runs every 5 minutes, waits for 0 active container agents, and obeys a 30-minute rate-limit gate to prevent thrash. The whole loop is hands-off: an agent pushes a feature branch, and the code lands on main without anyone clicking merge.

**Hotfix lane.** Any commit message containing `[hotfix]` activates the fast lane. `auto-promote-listener.py` shortens the smoke watch from 30 minutes to 5, writes `data/restart-pending-hotfix` instead of `data/restart-pending`, and `pending-restart.sh` skips its 30-minute rate-limit gate (it still waits for 0 active agents, unless `NANOCLAW_HOTFIX_FORCE_RESTART=1` overrides). Lead time for a typo fix drops from ~36 minutes to ~11. The `[hotfix]` tag is engineer judgment, not a default — it is for fixes that matter now, not cosmetic changes.

**Pre-commit hooks.** Three guards run on every commit. The first is prettier — staged `.ts` files are auto-formatted and re-staged, so a format issue never reaches CI. The second is the encrypted-DB audit — a guard that refuses to commit a SQLite cache that should be encrypted but is not. The third is a worktree-mass-deletion guard that aborts the commit if `git diff --cached --stat` shows >20 deleted files or >2000 net lines removed. The third guard exists because on 2026-05-08, a `git add .` in a stale-baseline worktree wiped 83 files / 6400 lines from a branch that was 90 commits ahead. The hook now blocks that pattern; intentional mass deletions go through `ALLOW_MASS_DELETE=1 git commit`.

**Build cache and rollback.** `npm run build` auto-snapshots `dist/` and sets `data/restart-pending`. `./container/build.sh` auto-tags with release timestamps so an agent can `docker run nanoclaw-agent:2026-05-13T11:51:36Z` to reproduce a specific dispatch. These are disciplines wired into the tools, not into anyone's habit.

The CI pipeline makes every other loop safe to change. An agent can push a fix at 03:00 UTC and the fix ships before anyone wakes up.

### ARQ + swarms + parallelism

The interactive system runs a pool of concurrent agent containers, sized by a single `MAX_CONCURRENT_TASKS` config (in the teens — we tune it up and down as the cost and throughput data come in). Most AI-team setups run one chatbot at a time. The concurrency is not a vanity number — it is what is required to keep a small company's worth of Slack threads, scheduled tasks, and ARQ items moving in parallel. (We deliberately keep the live number out of the prose: it's a config that drifts, and a document that hard-codes it becomes wrong the next time we tune it — exactly the stale-memorized-fact trap Part 8 is about.)

**Worktree isolation.** Each sub-agent gets its own git worktree under `.claude/worktrees/<task-id>` so two agents working on the same repo cannot stomp each other's branches. The worktree pattern was hard-won: before it landed, parallel agents would commit to the wrong branch when HEAD drifted mid-session. Now an agent does `git checkout <their-branch>` immediately before staging, and the worktree contract enforces the isolation. Build agents are wired with `isolation: "worktree"` by default; Notion-only research agents run unisolated because they do not touch the filesystem.

**Dispatch governors.** Three guardrails prevent a runaway swarm. First: per-host-session cap of 8 sub-agent dispatches (override via `NANOCLAW_HOST_DISPATCH_CAP`). A soft warning fires at 5 dispatches; exceeding 8 returns exit 7 and refuses the dispatch. Second: ARQ daily cap of 10 dispatches (`NANOCLAW_ARQ_DAILY_CAP`). Hitting the cap stops the dispatcher in `apply` mode and reports the queue depth to admin. Third: a cross-source burst detector (`scripts/dispatch-burst-detector.py`) joins the per-host-session counter and the ARQ daily count and fires admin ping when the union crosses a threshold — catches the failure mode where the host loop and the ARQ dispatcher both fan out on the same morning.

**The cost of getting parallel wrong.** Today's session surfaced a subtle one. The `Bash` tool's working directory does not persist across calls — `cd /path/to/repo && ...` in one tool call has no effect on the next. An agent building in a worktree had been issuing `cd <worktree>` then a separate `npm run build`, which ran in the wrong directory. The fix is the rule: chain `cd` with the work in a single bash call, or pass absolute paths. The meta-fix: when a parallel agent's behavior surprises you, audit the tool contract before the logic.

**Pipeline bottleneck.** Running 4+ parallel feature branches at once chokes auto-promote. Smoke watches serialize on `flock`; five branches in flight queue end-to-end for ~2.5 hours. `[hotfix]` shortens the watch to 5 minutes, and `promote-to-prod.sh --auto --hotfix <branch>` can inject a branch into the front of the queue. Parallelizing the smoke watch is on the roadmap.

The shape worth noting: parallelism is not free, and it is not the model that makes it valuable. The model is fast. The shipped, tested, deployed code path is what is slow. The investment in dispatch governors, worktree isolation, and the auto-promote pipeline is what lets a pool of agents work concurrently without melting the host.

### Cost tracking + cost telemetry

An autonomous AI burns tokens fast. Twenty concurrent containers, 30-minute cron loops, sub-agent fan-out — a single broken prompt that retries in a loop can rack up real money in a day. Most AI tools have no concept of "I'm getting expensive"; they just bill. Self-awareness about cost is not a feature you can bolt on at the end. It has to be wired into the same surfaces that run the work.

NanoClaw composes three layers of cost telemetry. **Per-API-call telemetry** is the lowest layer: the credential proxy that fronts every Anthropic request logs the response `usage` block — input tokens, output tokens, cache-read tokens, cache-write tokens — along with the model and the calling container's source IP to `logs/anthropic-cost-telemetry.jsonl`. A pricing table is pinned in code (Haiku at $0.80/$4 per million in/out, Sonnet at $3/$15, Opus at $15/$75, with the standard cache modifiers) so the proxy computes `cost_usd` per call before writing the line. The whole layer toggles off with `ANTHROPIC_COST_TELEMETRY=0`, which matters because the volume is high and we want a kill-switch for high-throughput experiments. **Container-context join** is the middle layer: at every container spawn, the runner writes one line to `logs/container-context.jsonl` recording `chat_jid`, `scheduled_task_id`, `group_folder`, `model_tier`, `started_at`, and the container's IP. The two JSONLs join on `container_ip + time-window` so every dollar of Anthropic spend resolves to a skill or a chat thread — not "the agents cost $X this month" but "the BD digest cost $Y yesterday and the knowledge-compiler cost $Z." **Per-skill spend reports** are the top layer: `scripts/cost-by-skill-report.py` joins the two feeds and aggregates by `scheduled_task_id` first (the cleanest attribution), then `chat_jid` (for ad-hoc chat traffic), then `group_folder` (final fallback). The daily digest surfaces the top spenders and gives first-light visibility on what burned overnight.

Telemetry without governors is just an itemized receipt. NanoClaw runs three control loops on top of the feeds. The **MTD throttle** reads a CSV-driven monthly running total and runs in three states. Below 70% of the configured monthly target it is in `normal` and does nothing. Between 70% and 90% it switches to `warning` and routes mid-tier traffic down a notch. At 90% and above it goes `hard` and forces Haiku for everything except an explicit `use opus` from a user. Manual `use opus` always wins — the design intent is that users self-escalate when they need it, the system does not silently downgrade a hard request. The override `NANOCLAW_THROTTLE_OVERRIDE=1` bypasses the throttle entirely for incident-response work. The **Karpathy cost playbook** sets the routing defaults: a Haiku-first cascade with `HAIKU_BOUNDARY=0.05` widened and `OPUS_BOUNDARY=0.07` narrowed, and a classifier-fallback default of Haiku instead of Sonnet. Most chat traffic routes Haiku; code-shaped input and manual escalations route Opus. Every routing decision lands in `logs/model-routing.jsonl` with the classifier score, so the policy is auditable after the fact. The **dispatch budget governors** are the third governor and they double as cost AND rate-limit protection: per-host-session cap of 8 sub-agent dispatches, daily ARQ ceiling of 10, and a cross-source burst detector that pings admin when the sliding-15-minute count crosses threshold.

The daily monitor at 08:00 UTC stitches everything together and posts to the admin channel: yesterday's spend split by tier (Haiku / Sonnet / Opus), cache-hit ratio, MTD pacing with a linear projection to month-end, vs the trailing-7-day average. It alerts on three conditions: cache hit ratio below 80% (someone broke a prompt cache, almost always a model-input change), daily spend ≥2× the trailing-7-day average (something is in a retry loop), or MTD spend over 90% of target by day 15 or earlier (we are on track to blow the budget). The dashboard turns cost from a quarterly surprise into a daily signal that anyone in the company can read in 30 seconds.

Most AI tools have no concept of "I'm getting expensive." NanoClaw does — and self-throttles before someone has to.

### Observability

If the agents are doing the work, the only thing left for humans to do is read what happened.

**The audit log.** `audit_log` is a SQLite table inside `store/messages.db` with one row per action: sender, agent, model, tool calls, reasoning trace, cost. As of this writing the table holds 63,535 rows. The table is queryable from any agent (read-only) and from the host (read-write). When an investor or a teammate asks "why did the bot send that message," the answer is one query away. Audit log retention is unbounded by design; storage is cheap, and the value of a one-year-old audit trail is "did we miss this back then" — exactly the question SQLite can answer in milliseconds.

**JSONL telemetry layers.** Three append-only logs sit next to the audit log: `logs/model-routing.jsonl` (every routing decision — Haiku vs Sonnet vs Opus — with the score that produced it), `logs/anthropic-cost-telemetry.jsonl` (per-container Anthropic cost attribution from response headers, joined by `container_src_ip` and time window), and `logs/container-context.jsonl` (which skill ran for which thread). The point of three separate JSONL files instead of one wide table is composability — each log is uniform (one JSON object per line, fixed schema), each is independently rotatable, and the `daily-anthropic-cost-monitor.py` script joins them on-demand to produce the morning cost digest.

**Self-modification monitoring.** The R2 anomaly detector watches for unauthorized code changes (commit-author drift, file-mode flips on root-owned files, semgrep rules silently disabled). It runs hourly, in shadow mode for the first 30 days of each rule, then flips to active and starts firing admin pings. The whole point is to catch the failure mode where the system modifies itself in ways an operator did not authorize — an important property in a system that can ship its own code.

**The dashboard as the daily interface.** Aki's morning is a 30-second scan of the 09:00 UTC dashboard post in `#ai-projects-nanoclaw-admin`. Items that are green get a glance; items that are yellow or red have an inlined next-step command. This is the inverse of the usual ops pattern — most teams keep Grafana open and hope to notice. We keep nothing open and trust the system to summon a human when summoning is warranted.

### Closing — today

I want to close with what happened on 2026-05-13, because it is the cleanest example of why the loops matter.

At 11:51 UTC, a python3 process inside an interactive `claude` session ate 19 GB of RAM and got OOM-killed. At 12:08 and 12:35, the same pattern repeated — three OOM kills in 44 minutes. Root cause was an ad-hoc port of the `bitsafe-gdrive-permissions` full-Drive accumulator: `all_files = []; for page in pages: all_files.extend(page)`, which works fine on a Heroku dyno serving a slow UI and explodes on the company-wide Drive (tens of thousands of files × an arbitrary permissions array each). The 32 GB host had zero swap. The third kill rebooted the box.

Within four hours, with no human commit-by-commit babysitting:

- 8 GB swap added (`fallocate -l 8G /swapfile`, `vm.swappiness=10`).
- 10 GB cap on interactive `claude` via `systemd-run` transient scope in `/root/.bashrc`.
- 8 GB cap on the cron `host-session` via a self-reexec into a `systemd-run` scope.
- OOM-backoff sentinel at `/tmp/host-session-last-oom`: if a tick exits with rc=137, the next tick within 1800s skips the claude call and pings admin instead of thundering-retrying.
- Dead-man's switch wired to the external uptime monitor.
- A dashboard sidecar counter shape-gate fix (separate finding, same recovery window).
- The autoflow cursor-bootstrap gap identified and fixed — a silent-drop class where a thread's first @-mention queued past `MAX_CONCURRENT_INTERACTIVE=3` would never get processed because the cursor never got written; 16 stuck production threads on the day of the fix.

The dev pipeline auto-promoted the fixes to main. The memory files were updated mid-session, not at the end. The OOM pattern is now documented at `feedback_gdrive-accumulator-pattern.md` so the next agent that touches that code reads "never reproduce `all_files = []; for ...: all_files.append(...)`" before it writes a line.

The autonomous engine is not AI without humans. It is machinery that runs while humans steer — and recovers itself fast enough that humans can stay focused on judgment, not janitorial work.

### Images

**Cover.** A dark, near-black title card in the BitSafe newsletter template. The "BITSAFE" wordmark with its hexagon logo sits top-left. A small orange tab/divider centers above the headline. Large white centered title reads "Part 3: The Autonomous Engine." A muted-gray subtitle below reads: "Cron-driven operating loops, CI/CD that ships its own code, and the telemetry that lets the system run itself." Thin footer text runs along the bottom edge. 1200×630.

```
+--------------------------------------------------------------+
|  ▣ BITSAFE                                                    |
|                                                              |
|                          [▬]                                 |
|                                                              |
|                      Part 3:                                 |
|                The Autonomous Engine                         |
|                                                              |
|     Cron-driven operating loops, CI/CD that ships its        |
|     own code, and the telemetry that lets the system         |
|                      run itself.                             |
|                                                              |
|  ____________________________                  ____________  |
+--------------------------------------------------------------+
```


---

## [09] NanoClaw — Part 4: The Substrate

**Series:** NanoClaw · **Part:** 4 · **Published:** 2026-05-31 · **URL:** https://blog.bitsafe.finance/p/nanoclaw-part-4-the-substrate · **Verbatim-from-repo:** docs/articles/04-substrate.md

### The Substrate — Notion-as-OS, Data, Code, Knowledge, and Tools

If Part 3 showed the engine, Part 4 shows the substrate it runs on. Everything BitSafe's bots compose against — read, query, learn from, act on — lives in one of three layers: Notion (the operational substrate), local caches (the read-mirrors), or the engineered tool surface (the hands).

> Bots compose against Notion (substrate) + caches (mirrors) + tools (capabilities). The leverage isn't in the AI model — it's in what the AI can read and act on.

That sentence is the whole article. The rest is a case study: how a 14-person company built a substrate that bots can stand on, what's in it after six months of compounding, and what we'd do differently if we started over yesterday.

### Notion as the operational substrate

BitSafe doesn't use Notion as a wiki. We use Notion as the operating system.

The distinction matters because of how agents discover capability. A wiki is a place humans go to read. An operating system is a place where state lives, where verbs are defined, where any process — human or agent — can read, write, and coordinate. Every important entity in our company — capabilities, prose, customers, deals, contacts, third-party apps, tasks, research, and decisions — has a Notion database as its system of record. Bots discover what they can do by querying that database. Humans see the same rows in the same UI.

**Skills DB** (`c4c5db26-c776-4cea-9538-5619c05a94a1`). This is the canonical source for what any bot can do. Each row is a skill — a single capability with a name, a description, a trigger phrase, and a body. Rows are synced to disk hourly by `scripts/sync-skills-from-notion.py` into three locations (`/root/nanoclaw-skills/<name>/SKILL.md`, `container/skills/<name>/SKILL.md`, `marketing-ai-system/design_system/skills/<name>/SKILL.md`) where running agents can read them. Edits flow Notion → disk, never the other way around. On-disk edits are clobbered on the next sync. The cron is paired with a worktree-aware loader so an agent in a feature branch sees the same skill catalog as production.

**Documents DB**. Prose memory of the company. Every Notion page that codifies something — a strategy doc, a meeting prep template, a runbook, a customer-facing explainer — has a row in Documents with a Pillars relation and a status workflow (Draft / In Review / Live / Outdated / Archived). The article you're reading is a row in that database.

**Companies / Opportunities / Contacts / Apps DBs**. Post the 2026-05-13 Salesforce → Notion migration, this *is* the CRM. The migration replaced what had been our Salesforce instance: five downstream skills (`sales-leaderboard`, `investor-update`, `knowledge-compiler`, `commission-analysis`, `shortlist-from-corpus`) were repointed to read from Notion-resident company and opportunity caches; the ~130 MB Salesforce cache DB was scheduled for deletion; ongoing Salesforce cost dropped to zero. The Companies DB came across with 1,966 rows live during the cutover. Opportunities, Contacts, and Apps came across the same week. The most important thing about the migration is the thing it didn't require: no new "AI data layer." Notion was already that layer.

**Tasks DB** (`0018e560-d515-46b9-b205-b5a6e5e06c13`). Every significant task — engineering, marketing, research, ops — gets a row before work begins. Rows carry Tier, Priority, Pillar, and an SDLC checklist (verify, test, document, monitor, security, push). Agents executing a task tick the checkboxes as each phase completes. The day this article was drafted, seven new rows landed across the SF migration, a CRM autoflow fix, a reconciler refresh, a LegalBot ARQ item, and three others — each with its own auditable SDLC trail.

**ARQ DB** (Active Research Queue). Research items with priority (P1–P4), a circuit breaker (`research-queue-dispatch.py` enforces a daily ceiling of 10 to prevent runaway costs), and dispatch windows (P1/P2 every 15 min via cron; P3/P4 off-hours, 22:00–05:00 UTC). When an agent identifies a question that needs deep work — "what's our exposure to validator X" — it files an ARQ row instead of trying to answer in-stream. The queue is durable; the dispatcher is rate-limited; the work happens whether or not anyone is awake.

**Live Sales Collateral DB** (`2e3636dd-0ba5-80f0-8896-c8fe4e89d1e1`). The publishing pattern: a wrapper page in the DB carries metadata (Status, Type, Audience, Owner, Short Description, Last Reviewed); the body lives in a child page underneath. When the bot publishes a draft, the wrapper is created with `Status: In Review`, the markdown is converted to Notion blocks via `notion-writer/notion_blocks.js`, and a workspace-scoped URL is returned. Humans review in place. This article is being published through that same pipeline.

The thesis worth stating plainly: **no separate AI data layer because the company already has one.** Every team that's tried to build an "AI knowledge graph" alongside their CRM has discovered, six months in, that the AI knowledge graph and the CRM are the same object. We skipped that lesson by treating Notion as both from day one.

### Data connectors

Notion is the substrate. Everything else is a mirror.

BitSafe runs roughly 28 SQLite caches against non-Notion sources, each on its own sync cadence. The point of a cache is not redundancy. It's composition speed: an agent answering a sales question shouldn't pay a Slack API round-trip per query, and an agent compiling an investor update shouldn't be rate-limited by Google Calendar. The caches are read-only mirrors that let bots compose against external systems at SQLite latency.

The live inventory: `slack-cache` (every 10 min for hot channels, every 4 hours full), `notion-cache` and `notion-companies-cache` / `notion-contacts-cache` / `notion-opportunities-cache` / `notion-apps-cache` / `notion-event-logs-cache` (post-SF migration, the CRM mirrors), Notion-linked Drive files via `sync-notion-linked-files.py`, `pqs-cache` (Canton ledger via the Canton PQS endpoint), `fathom-cache` (meeting transcripts), `calendar-cache` (Google Calendar), `telegram-cache`, `canton-foundation-cache` (Canton ecosystem repos), `canton-docs-cache` (Playwright-rendered, because Canton's docs site is client-side rendered), `cips-cache` and `cip-discuss-cache` (Canton Improvement Proposals), `splice-cache`, `dlc-code-cache`, `cantex-docs-cache`, `cypherock-docs-cache`, `brale-docs-cache`, `nightly-docs-cache`, `ninety-docs-cache`, `cryptio-cache`, `qbo-cache`, `meet-cache`, `n8n-workflow-cache`, `temple-docs-cache`. Each cache lives at `data/<source>-cache/` on the host and mounts into containers at `/workspace/<source>-cache/`.

The architecture per cache is uniform: SQLite + FTS5 + (where embedding cost is justified) `sqlite-vec` for vector search. The uniformity is what makes the search layer composable — the `search-all` skill is a hybrid FTS5 + vector fusion across all caches with intent-keyed source selection, and adding a new source means producing a SQLite with the same FTS5 schema, not rewriting search.

**Sync cadence is engineered, not defaulted.** Hot Slack channels sync every 10 minutes because deals move there. The full Slack cache (incl. historical threads, bookmarks, group DMs) refreshes every 4 hours because the marginal value of fresher cold data doesn't justify the API cost. Notion CRM tables sync hourly because the CRM Capture Agent writes through Notion, and the agent population is reading. Canton Foundation repos sync nightly because they're large and they don't change every minute. Each cadence is a deliberate trade between staleness, API rate limits, and dollar cost.

**Memory-safe streaming is non-negotiable.** A cache sync that loads its corpus into memory before writing is fine — until it isn't. Today's lesson, courtesy of a 4 GB OOM in `bitsafe-gdrive-permissions/core/drive_api.py:426`: an accumulator pattern (`all_files = []; for page in pages: all_files.extend(page)`) that worked at 2,000 files crashed at 60,000. The fix is generators, not accumulators — yield each page as it's fetched, write it as it's processed, never hold the corpus in memory. Every new sync script in the fleet is now scaffolded from a generator template. We didn't learn this in theory; we learned it because a sync killed itself on a Sunday afternoon.

Composition over the caches happens through the `search-all` skill. An agent asking "what's the latest on Temple Digital" doesn't reach out to Slack, Notion, Fathom, and Calendar separately — it issues one hybrid query, the skill fuses FTS5 keyword hits with vector neighbors across the relevant caches, and the agent reasons over a unified result set. The intent layer — the keys in the cheat sheet that map "search company history" → `[notion-companies-cache, slack-cache, fathom-cache, calendar-cache]` — is what keeps the result set focused enough to actually be useful.

### Code ingestion

Data and code are different substrates and the distinction matters more than people expect.

A bot reads *data* to answer a query: who did we meet last week, what's the open pipeline, how many Slack mentions did Temple get. A bot reads *code* to learn a pattern: how does an existing skill structure its arguments, how does the Notion sync handle pagination, how does this internal app authenticate against the Canton ledger. The first is read-once-per-query; the second is read-once-per-author-cycle. They live in different parts of the substrate and they're consumed differently.

**Internal apps as readable corpora.** Four BitSafe-built apps are routinely cloned and indexed by sub-agents before they extend them: `cbtc-financials` (CBTC reserve accounting), `bitsafe-slack-admin` (Slack workspace admin tooling), `ccview-api` (Canton ledger view API), and `bitsafe-gdrive-permissions` (Drive permissions auditor). When an agent gets a task that touches one of these, the first action is to clone the repo, read the relevant module, and reason about the patch *before* generating code. This eliminates the entire class of "the model invented an API that doesn't exist" failures, because the model has the actual API in context.

**External libraries on demand.** Any `github.com` repo can be cloned (the egress firewall allows GitHub by default) and indexed. When Aki says "use the Daml SDK pattern for this," the agent clones `daml-lang/daml`, reads the relevant examples, and composes against them. The marginal cost of a clone is seconds; the marginal value of correctness is hours.

**Skill bootstrapping.** New skill authors — human or bot — read existing skills as exemplars. `cache-base/` is the canonical example for SQLite + FTS5 caches. `notion-writer/` is the canonical example for Notion publishing. `sync-notion-opportunities` is the canonical example for incremental sync from a Notion DB. This is why new skills land in hours, not weeks: the patterns are in the corpus, the corpus is mountable, and the bootstrapping cost is approximately one clone + one read.

Today's example is unusually concrete. The SF → Notion migration spawned three new sync scripts (`sync-notion-event-logs.py`, `sync-notion-companies.py`, plus the existing `sync-notion-opportunities.py`). Two of the three were drafted by sub-agents that read `scripts/sync-notion-linked-files.py` first as the canonical pattern. The migration shipped in a single afternoon because none of the sub-agents had to invent the sync pattern — they just adapted it. Code as exemplar, not just reference.

### Knowledge graph

Caches answer queries. The knowledge graph synthesizes understanding.

The `knowledge-compiler` skill compiles an entity graph nightly from the caches: companies, contacts, opportunities, Slack mentions, meeting attendees from Fathom, calendar invitees, partner relationships from internal Notion docs. The output is one Notion page per entity (company or contact), each with a synthesized summary, a fingerprint, a relationship list, and a links section. The graph isn't queried directly by humans much — it's queried by the daily standup generator, the investor update generator, and the BD digest, which fold it into prose.

The compiler was migrated today as part of the SF → Notion cutover. The new version reads the Notion Companies cache directly (no more Salesforce round-trip) and uses the new Notion Event Logs DB for stage history. The 1,966 companies that landed during the migration were populated live, with the compiler tracking the sync state in `data/knowledge-compiler-notion-state.json` so a restart wouldn't re-process rows it had already seen.

The abstraction worth naming: raw data is for queries; the knowledge graph is for *understanding*. An investor-update generator that pulls raw rows from twelve caches will produce a list. An investor-update generator that reads from a pre-compiled entity graph — where the "what changed about Temple Digital this month" question has already been answered offline — produces a narrative. The compiler is the place we pay the synthesis cost once, so every downstream consumer pays nothing.

### The tool surface (MCP)

The substrate is what the bots read. The tools are what they invoke.

BitSafe's bots run inside agent containers that expose a fixed surface of tools via the Model Context Protocol (MCP). The tool list is short and intentional: `send_message` (post to a channel), `store_secret` / `list_secrets` / `delete_secret` (manage per-user credentials), `list_agents` / `send_to_agent` / `check_agent_inbox` (the IPC bus that lets agents coordinate), `search-all` (the hybrid search across caches), `refresh_egress` (per-user egress allowlist refresh). Each tool is ~50 lines of TypeScript plus a Zod schema in `container/agent-runner/src/`, and each one is documented in the Skills DB so agents discover it the same way they discover any other capability.

Tool grants are scope-aware. Which tools an agent gets depends on its `group_folder` (the per-user or per-channel mount it runs against) and its role. A finance-channel agent gets QBO read access; a marketing-channel agent does not. A BD agent gets Salesforce-replacement Notion writes; a public-content agent gets read-only. The scope-wiring lives in `container-runner.ts` and the matching Notion routing-rules table — the table is canonical, the code reads from it.

Adding a new tool is approximately a day of work and produces a capability available to every container thereafter. The unit cost matters because it's what determines how many tools we have. A bot fleet with five tools is a different animal from a bot fleet with thirty. We're closer to thirty.

### Secrets as tools

Credentials are a substrate too, and the design choice that matters is who can *use* them, not just who can *read* them.

Google Secret Manager (project `ai-bots-488013`) is the canonical store. Per-user secrets follow the naming convention `nanoclaw-{userId}-{secretName}` with labels (`user={userId}`, `managed-by=nanoclaw`) so a fleet-wide audit is one filtered list call. A custom IAM role (`nanoclawSecretsManager`) bound to a single service account (`nanoclaw-meet@ai-bots-488013.iam.gserviceaccount.com`) carries only the seven permissions the code actually uses; nothing more.

The injection path: `container-runner` fetches all of a user's secrets at container spawn, passes them via stdin, and `agent-runner` writes them to `/workspace/user/.secrets/` with mode `0o600` (a daily audit cron at 04:23 UTC verifies this and pings admin if any file regresses). Agents call `store_secret` / `list_secrets` / `delete_secret` over the IPC bus, which forwards to the host, which writes through to GSM. Storing a secret writes to the local filesystem immediately *and* persists to GSM for next session — no restart needed.

Custom secret types trigger type-aware injection. `github-pat` auto-sets `GH_TOKEN` and writes `.git-credentials`. `gpg-key` imports into the user's GPG keyring and configures `git commit.gpgSign=true`. `vercel-token` exposes itself to the Vercel CLI. The type is inferred from the name (`*gpg*key*` → `gpg-key`, `github-pat*` → `github-pat`), so the storage step is uniform but the consumption step is correct.

Today's example: a fresh GitHub PAT for the `bitsafe-ai-docs` repo was provisioned through this exact path. Bootstrap cost was one `gcloud secrets create` call; this article was published using that PAT minutes later.

### Closing

A bot fleet is only as smart as what it can read and only as useful as what it can do. The model — Opus 4.7, Sonnet, Haiku, whatever ships next — is interchangeable on a 12-month horizon. The substrate is not. Notion, the 28 caches, the read-on-demand code corpus, the synthesized knowledge graph, the MCP tool surface, and Google Secret Manager are the things our bots are actually composing against. Replacing the model is a routing-table edit. Replacing the substrate would take a year.

> The AI is just the surface. The substrate is the strength.

### Images

**Cover** (brief prose): A dark, near-black gradient banner (1200×630) with the BitSafe wordmark and logo in the top-left corner. A small rust/orange accent marker sits centered above the large white headline "Part 4: The Substrate." Beneath it, a muted gray subtitle reads "The leverage is not in the model. It is in what the model can read and act on." A faint footer line of fine print runs along the bottom edge. The aesthetic is minimal, editorial, and dark-mode.

```
+----------------------------------------------------------+
|  [#] BITSAFE                                             |
|                                                          |
|                          [=]                             |
|                                                          |
|                      Part 4:                             |
|                   The Substrate                          |
|                                                          |
|     The leverage is not in the model. It is in what      |
|          the model can read and act on.                  |
|                                                          |
|  .................  .............  ...................   |
+----------------------------------------------------------+
```


---

## [10] NanoClaw — Part 5: Working With NanoClaw

**Series:** NanoClaw · **Part:** 5 · **Published:** 2026-06-02 · **Audience:** App Developers, Trading Firms, Investors, Liquidity Providers · **URL:** https://blog.bitsafe.finance/p/nanoclaw-part-5-working-with-nanoclaw · **Verbatim-from-repo:** docs/articles/05-working-with-nanoclaw.md

The first four parts of this series described what NanoClaw *is*. This part is about what it's like to *work with*. If you're an engineer deciding whether to build something like this, the architecture matters. If you're deciding whether your team would actually use it after the novelty wears off, this is the part that decides it.

> Humans collaborate by remembering. NanoClaw collaborates by never forgetting.

Most "AI in the workplace" stories are about a smarter chatbot. The interesting story is what changes when the AI shows up across every surface where the work happens, with infinite recall, continuous follow-up, and no social cost to interrupting it. The model isn't doing the heavy lifting. The relationship is.

### Why this feels different

Six months in, the deltas between "team with NanoClaw" and "team without" aren't what we expected. We thought we were buying a faster assistant. We got a force multiplier. Eight ways it changes the day:

1. **Perfect memory.** It never asks "what did we decide last quarter?" It quotes you exactly, surfaces the dissent in the room when you made the call, and flags it when the rationale stops applying.
2. **Continuous follow-up.** Commitments don't fall through. The bot tracks "you said you'd ping X by Y" and surfaces it the day Y arrives. The system of things you owe the world is no longer your prefrontal cortex; it's a database with cron jobs.
3. **Zero context-switching cost.** It holds a hundred simultaneous threads with full context each. Humans lose twenty-plus minutes per switch. The bot loses zero.
4. **Async-first work.** Fire a task at midnight, wake to results at 8am. Work happens in your absence — sub-tasks dispatched, errors handled, output delivered.
5. **Cross-domain translation.** Engineering speaks finance via the right persona; finance hears engineering's constraints in an actionable register. What used to be a person on the leadership team is now a tool.
6. **Always-on niche expertise.** Legalbot at 3am on a Saturday. Security review between flights. HR without scheduling. The bottleneck on niche expertise used to be a calendar.
7. **No social cost to asking.** You can bug the bot freely. It doesn't get annoyed, doesn't compute "is this worth their time," doesn't gossip. Junior team members stop self-censoring dumb questions; senior members stop self-censoring tactical asks.
8. **Auditable by default.** Every action is logged. Post-mortems become reconstruction, not detective work. "What happened at 14:23 UTC on the deploy" is a query, not a meeting.

The rest of the article shows the mechanism behind each delta. Four interfaces — who you talk to, what gets pushed to you, what stays, and how you teach it. The leverage is in how they compose.

### The personas you talk to

> We didn't build one AI. We built a cast.

The active interface — the one most people picture when they hear "AI assistant" — is the conversation. NanoClaw's distinguishing move is that the conversation isn't with one entity. It's with a cast of *personas*, each with a name, a voice, an icon, and a memory namespace, all running on the same agent substrate. People-modeled and function-modeled personas are equal-status examples of one pattern: vary the system prompt, the skill assignment, the memory namespace, and the sender identity. Substrate uniform; surface differentiated.

**People-modeled personas** are recognizable thinking styles, grounded in a corpus.

- **Naval** (in the spirit of Naval Ravikant) is the first-principles synthesizer. Brief, asks questions, network-thinking, uncomfortable with consensus. Summon Naval when a decision feels too easy — when the room has lined up but nobody has stress-tested why. The corpus lives at `data/naval-corpus/` (Almanack, Venture Hacks essays, podcast transcripts).
- **The red-team** is the adversarial persona. Argues against any proposal by default. Naval summons it when his own synthesis feels too clean — "make the strongest case against this." It has earned its keep most clearly on security review, where the cost of a missed objection is high and the cost of an extra round of paranoia is low.
- **Matthiasbot** is a retrievable knowledge base of Matthias Frank's published Notion information-architecture work, sourced from his website and YouTube channel. Grounds the bot in the framework (PARA, atomic databases, rollups vs. relations) so BitSafe agents can answer Notion-IA questions without scheduling time with Matthias. Every thread opens with the disclaimer: *"I'm Matthiasbot, trained on Matthias Frank's public content, not Matthias himself."*

**Function-modeled personas** are domain roles.

- **legalbot** is a contract analyzer, shipped 2026-05-13 at `/root/nanoclaw-skills/legalbot/`. Reads a Google Drive link (READ-ONLY — never writes back to the source), benchmarks against BitSafe's standard positions in Notion principle pages, and produces a separate redline grouped by priority (must-fix, material-risk, nice-to-fix). What makes legalbot trustworthy is the two-round independent-agent review: round one drafts; round two is a fresh agent with *no context from round one* that checks for self-introduced conflicts.
- **hrbot** for HR questions. Same pattern, different corpus.

All of them run on the same Claude substrate (Opus 4.7 today, whatever ships tomorrow). What differs is the system prompt, the skill assignment, the memory namespace, and the voice. The personas form a graph rather than a hierarchy: any persona can dispatch any other via MCP. A typical strategic-decision dispatch:

```
Aki → Naval ("should we partner with X?")
       ↓ (~30 seconds in)
       Naval → red-team ("strongest case against partnering with X")
       ↓ (~60 seconds later)
       Naval ← the red-team's three best objections
       ↓
       Aki ← Naval's synthesized recommendation, with the objections folded in
```

Round-trip: ~90 seconds. Cognitive load on Aki: read one synthesized message and push back on what doesn't land. The premortem move — "imagine this fails in six months, what does the autopsy say" — is one of the canonical red-team dispatches; we ship `premortem` as a standalone skill so the pattern is available even when Naval isn't in the loop.

The personas aren't architectural primitives — they're examples of a pattern. The pattern: take a shared agent substrate, vary the system prompt and the grounding corpus, give the result a name and a voice, route by intent. Other companies will build their own cast.

### The alerts you receive

> The chatbot framing misses the most valuable part: the passive alert interface is often more useful than the active conversational one.

About a third of the team's interaction with NanoClaw is *outbound* — the bot tells them something they didn't ask. This is the passive interface, and it's where the system pays for itself. Thirty-two active scheduled tasks, four categories.

**Push alerts (proactive) — fired when a check trips.**

- **Daily Health Dashboard** at 09:00 UTC. The most-read message of the day. Walks 35+ checks (data-source freshness, search latency, vector embedding coverage, Slack sync, container health, secret-file modes, pipeline state) and posts a structured table to `#ai-projects-nanoclaw-admin`. Degraded `:warning:`, broken `:x:`, healthy `:white_check_mark:`. The dashboard IS the dashboards — 35+ separate background workers in some other system, here 35+ alert subscriptions in one post.
- **Daily Anthropic Spend Monitor** at 08:00 UTC. Reads yesterday's CSV, computes total by model and cache-hit rate, compares to trailing 7-day average, projects month-end. Fires red alerts when cache hit drops below 80%, daily spend ≥ 2× trailing, or MTD pacing exceeds 90% by day 15. Cooldown-gated so a single bad day doesn't generate eight pings.
- **Security alarms**: R4-ac admin-compromise monitor, R2 audit-log anomaly detector, dead-man's-switch heartbeat to BetterStack (if NanoClaw stops checking in, BetterStack pages Aki out-of-band).
- **Push watchdog**: unpushed commits older than 6 hours fire an admin ping. If something's done, it should be in `origin`.
- **Scheduled-task failures**: three consecutive runs trip a circuit breaker and ping admin with the failure category.

**Digests (scheduled summaries) — fired on cadence regardless of state.** Daily BD digest, daily standup kickoff, weekly company brief at Friday 15:00 UTC, weekly sales leaderboard at Monday 13:00 UTC, per-user daily digests of new Notion pages / in-progress tasks / active projects for each leadership-team member, monthly investor update drafted by sub-agent and reviewed by human.

**In-thread reactions — micro-signals, no message body.** `:hourglass_flowing_sand:` lands on a triggering @-mention within seconds so the sender knows the bot saw it. Removed when the bot speaks. If the bot has nothing to say — informational @-mention, dedup with an existing message — the hourglass is replaced by a `:+1:` so the message doesn't look hung. This is a real bug we shipped on 2026-05-13 (`feedback_hourglass-cleanup-on-no-reply.md`); informational @-mentions kept stranded hourglasses for hours before the fix. Container completion status (success / partial / failure) is also reactioned onto the trigger for ambient awareness.

**Escalation alerts — small in count, high in priority.** ARQ circuit breakers when the research-queue dispatcher hits its daily ceiling. Container retry-budget exhausted when one thread fails three same-category times in 30 minutes. Autoflow silent-drop detector when a triggering @-mention never gets a cursor written — the class we hit and fixed on 2026-05-14 (`feedback_autoflow-cursor-bootstrap-gap.md`). Goals scan gaps when something in Notion Goals doesn't have a downstream ARQ item.

Three design principles cut across. **Severity tiers** map alerts to delivery surfaces: info to admin channel, warning to admin DM, critical paged out-of-band through BetterStack. **Cooldown + dedup** is enforced per source — `scripts/ping-aki.sh --source <name>` checks a state file before firing so a repeat condition doesn't spam. **Batching** is preferred over staccato: dashboards land in one post per day, not 35 pings.

Each alert is a *job-shaped feedback loop*. You don't monitor data-source freshness manually because NanoClaw tells you when it degrades. You don't remember to check MTD spend because the daily monitor will alarm if pacing breaks. The headspace previously spent on "did I check X today" is reclaimed.

### The memory that accumulates

> The AI doesn't get smarter. We get better at teaching it.

The third interface is the one nobody sees: the persistent file-based memory at `/root/.claude/projects/-root-nanoclaw/memory/`, indexed by a flat `MEMORY.md`. 240+ files at this writing. Four types:

- **`user_*`** — who someone is, how they work. `user_aki.md` carries Aki's role, communication preferences, the patterns he's enforced.
- **`feedback_*`** — corrections that became durable rules. A bug surfaces, a human corrects, a memory file is written, future sessions never make the same mistake. Today's session alone added four: `feedback_notion-url-workspace-prefix.md` (Notion API URLs need a workspace prefix before sharing with humans), `feedback_skill-built-but-not-scheduled.md` (shipping skill code isn't enough — the `scheduled_tasks` row is a separate insert), `feedback_gdrive-accumulator-pattern.md` (a Drive permissions sync loaded its corpus into memory and OOM-killed `nanoclaw-01` three times on 2026-05-13; the lesson is streaming generators, not accumulators), `feedback_autoflow-cursor-bootstrap-gap.md` (the silent-drop class where the first @-mention in a thread never gets a cursor because dispatch and process disagree on LIMIT).
- **`project_*`** — in-flight initiatives and their *why*. Each entry includes a one-line rationale so future readers can judge whether the file is still load-bearing.
- **`reference_*`** — durable pointers to external resources. Page IDs, dashboards, runbooks.

Mid-session writes are the discipline. When a sub-agent learns something non-obvious, the memory file is written *immediately*. Today's four memory files were written *during* the sessions that surfaced each bug — the batch reflection at the end of a long session never reliably happens.

This is worth naming because it's the **counter-narrative to RAG**. The fashionable answer to "how should an AI agent remember things" is vector retrieval. We don't do that for institutional memory. We use *propositional* memory: written rules, loaded into the prompt at session start, *heeded* rather than retrieved. The agent doesn't search its memory — it reads its memory the way a new employee reads the onboarding doc. The rules are in the context window, not in a similarity score.

Skills complete the picture as procedural memory. SKILL.md frontmatter plus composable code under `/root/nanoclaw-skills/<name>/`. A `feedback_*` file teaches the agent what *not* to do; a skill teaches it *how* to do something repeatable.

### Decision support

The most distinctive use of NanoClaw isn't task automation — it's decision support. The Naval + red-team pair is the canonical workflow. A strategic question goes to Naval; Naval synthesizes; if the synthesis feels too clean, Naval dispatches the red-team for the strongest counter-argument; the final output is the synthesis with the best objection folded in. Two specific techniques have earned their place.

**Premortem**, in the Gary Klein sense, lives as a standalone skill at `/root/nanoclaw-skills/premortem/`. Before a major commitment — a deal close, a hire, a deprecation — the red-team is asked to imagine the failure mode six months out in vivid detail (the specific customer that churned, the specific bug, the specific competitor move) and walk *backwards* to what we should have seen today. The vividness matters: an abstract premortem produces hedging; a vivid premortem produces actions.

**Reference-class forecasting** is in flight. The M4 reference-class library is an ARQ initiative to populate base rates for the decisions BitSafe makes repeatedly — validator partnerships close at this rate, infrastructure migrations take this long, marketing channels with these characteristics produce this CAC. When it ships, Naval will surface the base rate alongside the synthesis: "similar deals close at 30%, here are the three closest analogs."

The longer arc: the ARQ research item on the AI Board Member (`35a636dd-0ba5-8162`) carries the "Findings: AI Board Member — Competency Gaps & Decision Support Framework" page that scoped what AI decision support should mean for BitSafe. Naval and the red-team are the operationalization of that framework. The framework will outlive the personas; the personas will be replaced as we learn what works.

### The HITL teaching loop

The fourth interface is the most consequential and the least visible: how humans teach NanoClaw. Human-in-the-loop in our use isn't a UX detail — it's the mechanism by which the system gets less wrong over time.

**AI proposes, human disposes.** The bot drafts; humans QA; the publish action is a deliberate gesture. For Notion pages that codify *policy or rules awaiting human debate*, drafts are titled `PROPOSED — <Original Name>` so the owner reviews in place, then renames to ship. The convention is scoped, not blanket: evidence-based regenerations of existing pages (an updated commission report, a refreshed investor update) ship as new versions without the prefix — they're not proposals, they're updates.

**Memory files as institutional learning.** This is the loop that pays compound interest. The bot makes a mistake → a human corrects → the correction becomes a memory file → next session, the same class of mistake doesn't happen. Today's four new memory files all came from this loop in a single session — each one a permanent fix for a bug class that would otherwise have repeated.

**Tiered approval gates.** The dev pipeline carries a `[uat]` commit-tag opt-in: when a commit message contains `[uat]`, auto-promote holds the branch until a human green-lights it via a Slack reaction. The default is the opposite — a clean dev run plus a 30-minute smoke watch is enough for promotion. UAT exists for things only a human can evaluate (Slack post quality, Notion page voice, search relevance); auto-promote covers everything else. The hotfix lane shortens smoke to 5 minutes but doesn't skip the gate.

**Two-round independent review.** Legalbot's round-two consistency check is the externally-visible instance of an internal pattern we use whenever bot-authored output ships in a high-stakes context. Round one drafts; round two is a fresh agent with no context from round one. The independence is load-bearing — if round two reads round one's reasoning, it inherits round one's blind spots.

**Ask before X.** Certain actions require explicit human approval: restarting NanoClaw (active agents may be in flight), destructive ops (`git reset --hard`, `git push --force`), external-facing communications. The deliberate counter-balance is the autonomous-loop runtime, which sets `--dangerously-skip-permissions` so the scheduled-task loop doesn't silently stall on a prompt nobody will see. Different runtimes pick different defaults; the default is *trained*, not coded.

**Decide-and-note vs. ask-explicit.** Implementation choices go to AI judgment with a CHANGELOG note; policy, scope, and IAM stay with the human. The quick test: would a competent engineer with full codebase access still be unsure? If no, decide and ship. If yes, ask.

**Escalation paths.** When a sandboxed container hits ambiguity it can't resolve in its own scope, it reaches a human admin through `ask-admin-ferry.py` — posts a question to admin chat and blocks until a human reaction comes back, without breaking egress or scope. The clean separation lets us run containers with narrow tool grants and still keep them un-stuck.

The frame worth ending on: **the AI is like a junior employee.** It works, the human corrects, the correction becomes durable memory, the next time it doesn't make the mistake. The corrections compound. The institutional learning rate of the system is bounded only by the rate at which humans correct it. After six months, the population of memory files is the company's accumulated wisdom about how this particular AI fails — and how it should succeed.

### The two hard limits

Two things NanoClaw doesn't do, and won't, even as everything else expands.

**NanoClaw doesn't talk to customers.** Customer-facing communication stays human-to-human. The bot drafts the email, prepares the answer, surfaces the right context from prior threads — but a human signs and sends. Making a customer talk to a bot feels disrespectful in a way that's hard to walk back: it tells them their time is worth less than ours, and that nothing in the conversation requires creative judgment specific to them. Internal augmentation only. The leverage NanoClaw gives the team is felt on the customer's behalf, not aimed at the customer directly.

**NanoClaw doesn't send money.** No payments, no transfers, no wallet operations, no on-chain transactions, no off-chain disbursements. The reasoning is simple: if there's a bug, we don't want it losing money, sending it to the wrong place, or — worst case — getting hijacked by an attacker who finds a path the bot didn't realize was a path. Financial actions stay behind a human signature.

### Closing

Four interfaces. Personas for active conversation. Alerts for passive notification. Memory for persistence. HITL for collaboration. Most AI tools give you one — the chatbot. NanoClaw gives you four, and the leverage is in how they compose.

A scheduled alert finds a problem; a persona is dispatched to fix it; the fix updates memory; the next time the same class of problem appears, the bot recognizes it and the alert never fires. That loop is the product. Not the model, not the prompt, not the integrations — the loop.

> Most AI tools are smarter chatbots. NanoClaw is a working relationship.

The architecture is in Part 2. The engine is in Part 3. The substrate is in Part 4. This part is the one your team actually feels. A new hire's first week with NanoClaw isn't learning a tool. It's meeting a coworker who already knows everything the company has written down — and who's ready to be taught the next thing.

### Images

**Cover (brief prose).** A dark slate background with the BitSafe wordmark (red square logo + "BITSAFE") in the top-left corner. A small red accent divider sits above the centered title. The headline reads "Part 5:" on the first line and "Working With NanoClaw" on the second, in large white type. Below, in muted gray, the subtitle: "Four ways the team meets the machine: personas, alerts, memory, and a human in the loop." Faint footer text spans the bottom edge.

```
+----------------------------------------------------------+
|  [#] BITSAFE                                             |
|                                                          |
|                          ▪                               |
|                                                          |
|                      Part 5:                             |
|              Working With NanoClaw                       |
|                                                          |
|   Four ways the team meets the machine: personas,        |
|       alerts, memory, and a human in the loop.           |
|                                                          |
|  ....................................................    |
+----------------------------------------------------------+
```


---

## [11] Why Not Just Use the Claude App? Same Brain, Different Body

**Published: 2026-06-07 · Series: Standalone deep-dive · URL: https://blog.bitsafe.finance/p/why-not-just-use-the-claude-app-same-brain-different-body**

### Introduction

A founder asked us a fair question recently. We'd just finished walking through how BitSafe runs on a fleet of AI agents, and the reply was blunt: "What's the point of all this when you could just use Claude?"

It deserves a real answer instead of a defensive one. Here's the honest version.

### NanoClaw runs on Claude

Start with what NanoClaw actually is. It isn't a Claude competitor. It runs on Claude, the same models, with the Claude Agent SDK underneath. We didn't build a smarter brain. We rented the same one Anthropic sells and gave it a different body.

So the question isn't "Claude or NanoClaw." Both are Claude. The real comparison is narrower and more interesting: Anthropic's packaged consumer surface, the claude.ai app with Projects and memory on desktop and mobile, against your own system of state, scheduling, and shared surfaces running on those same models.

Put it in one line: the model is rented; the context is owned. Anyone can rent the model. What you build around it is the part that's yours.

### The Claude app is a great product

For a lot of people, the app is the right call, and we'll say so plainly. There's nothing to set up and nothing to maintain. Pricing is flat and per seat, so you always know the bill. Projects and memory work well for one person's work: drop in your files and the assistant carries your context across chats. And because it's Anthropic's own surface, new model features land there first.

If you're one person doing artifact work like drafting or analysis, the app alone is often all you need. We're not going to pretend otherwise.

### Sessions versus state

A chat functions as a conversation that occurs and then concludes. While Projects and memory provide some mitigation, they operate within individual user constraints, remain opaque to queries, and are confined to Anthropic's product ecosystem, designed for singular personal recall.

The piece uses an analogy: "Think of a chat as a brilliant contractor with amnesia. Great work, but you re-brief them every morning." In contrast, the underlying infrastructure functions "more like an employee with tenure and a filing system."

The durable asset comprises the CRM, tasks, documents, and meeting notes. This substrate operates as structured, relational data with genuine access controls. Agents both read from and contribute to this infrastructure, with each operation incrementally enhancing its state. Notably, "A chat history doesn't compound. A database does."

### Single-player versus multiplayer

The Claude app is personal by design. My chats, my memory. If one person works out a sharp workflow, it lives in their chat history and dies there.

In our system, work lands where the team already works. When one agent enriches a CRM record, all 22 of us see the better record straight away. A non-technical teammate doesn't write a prompt to get value out of it. They mention an agent on a page or press a button. The leverage isn't trapped with whoever figured it out.

### On-demand versus ambient

The app works while you're typing at it. Stop typing and the work stops.

NanoClaw runs about 80 scheduled jobs that fire whether anyone is at a keyboard or not: monitoring, enrichment, digests, alerts. One of them, a contact-role enricher, has run roughly 7,700 times. Nobody sits through 7,700 chat sessions. That work has a cron shape, and a chat window isn't shaped like that.

### Output versus operations

The app's strength lies in artifacts like drafts and analysis. However, most of NanoClaw's fleet performs different work: "It moves a deal to the next stage, files meeting notes against the right account, updates a status, flags an inconsistency between two records."

The distinction is fundamental. Rather than generating text, these agents deliver "updated state" as their value unit. This operational capability enabled BitSafe to "replaced our old CRM with a Notion-native one in eight weeks and switched the old system off in May 2026."

The broader implication challenges conventional thinking about AI: "Picture AI as a faster typewriter and you miss that it can also be a better back office."

### Governance is the difference that grows with you

There's a less glamorous difference that matters more as a team scales: who's accountable.

We run roughly 60 governed agents, 58 of them active. Each one has an owner, a registry entry, scoped permissions, and a change log. Instruction changes move through propose, then approve, then apply, and humans stay in the loop on anything that writes.

A team running individual Claude accounts is a room full of people freelancing with prompts. There's no audit trail, and no clean answer when someone asks what AI actually does here and who signed off on it. We build custody infrastructure for a living, and we don't accept single points of failure there. It would be strange to run our own operations as one person's chat history.

### "But I run an agency with multiple clients"

This is the strongest version of the objection, so let's concede the real points first. A Project per client gives you clean multi-tenancy at no cost. Agencies sell deliverables, and deliverables are artifact work, which is exactly the app's strength. Clients churn, which punishes any investment in long-lived substrate. Harness maintenance is time you can't bill. And some client contracts forbid centralizing their data at all, which turns a sessions-only setup into a compliance feature rather than a gap.

All fair. Here's the other side.

The agency is itself a company. Clients come and go, but your pipeline, proposals, staffing, and invoicing are constant. That's substrate worth owning even if no client data ever touches it.

Repeatability across clients is the agency business model. The same onboarding, the same monthly report, and the same monitoring routine run for 20 clients is a parameterized skill, not 20 fresh chats. In a chat-only world, quality drifts with whoever happens to be typing that day.

A client is a row. Per-client views, per-client permissions, per-client scheduled jobs: databases have done this for fifty years.

An agency's moat is its methodology, and sessions don't compound. Substrate turns "we did this once for client X" into "this is how we do it for everyone," which is the path from custom work to productized services.

Leverage is the margin story. An ambient fleet covers every client at once and breaks the billable-hour ceiling. A chat app only earns while someone types.

And governance matters more with client data, not less. Owned agents with scoped permissions and an audit trail are the defensible answer when a client asks how you use AI on their account.

So the sequencing for an agency is the reverse of ours. Start chat-everywhere. Graduate a workflow into the system the third time you repeat it. The system isn't day-one infrastructure. It's what you build once the repetition becomes visible.

### The part that surprises people

We run a weekly build-versus-buy audit where NanoClaw evaluates its own components against off-the-shelf alternatives, including Anthropic's own features. When the packaged product catches up to something we built, we retire our version.

So the honest answer to "why not just use Claude?" is that we ask ourselves that exact question every week, with data in front of us. The point was never loyalty to a harness. It's having a system that can even ask the question and act on the answer. NanoClaw is open source, so anyone can do the same.

### Where your company's memory lives

None of this is free. The system carries real costs. Someone maintains the harness, governance takes discipline, and you have to route work to the right model at the right price. It's an infrastructure investment with infrastructure-shaped costs, and it pays back only when coordination and shared state are your actual bottleneck.

For one person, use the app. It's a great product and the math is simple.

For a company, the question isn't which tool is smarter. They're the same brain. The question is where your company's memory lives: in scattered chat histories that walk out the door when people do, or in a shared system that gets better every time an agent touches it.

Same brain. Different body. That's the whole case.

### Images

**Cover image** (`art11-cover.png`)

Prose: A dark, near-black banner-style cover with subtle radial lighting from the top center. In the top-left corner is the BITSAFE wordmark (small white text with a small red/orange triangular logo mark to its left). Centered near the top is a small red/orange diamond or accent shape. The dominant element is a large bold white headline reading "Why Not Just Use the Claude App?" Below the headline, in smaller muted gray text, is the subtitle: "Anyone can rent the model. The compounding comes from the context you own." Faint small gray text runs along the very bottom edge (publication/footer metadata, not clearly legible).

```
+--------------------------------------------------------------+
|  [▲] BITSAFE                                                 |
|                            ◆ (small red accent)              |
|                                                              |
|          Why Not Just Use the Claude App?                    |
|                                                              |
|   Anyone can rent the model. The compounding comes           |
|            from the context you own.                         |
|                                                              |
|  (faint footer metadata)                                     |
+--------------------------------------------------------------+
```

**Diagram 8** (`art11-diagram8.jpg`)

Prose: A flowchart on a white background with two branches descending from a single top node. The top node is a light-gray rounded box reading "Claude models — the same rented brain". From this top node, two arrows branch downward: one curving to the left toward the NanoClaw branch, and one going straight down to the Native Claude app branch.

Left branch (highlighted in a solid orange container, titled in white text "NanoClaw + owned substrate"): contains three stacked light-gray boxes connected by arrows. The top box reads "Agent runs — ~80 on a schedule". A double-headed (bidirectional) vertical arrow connects it down to the middle box, which reads "Shared substrate / CRM · tasks · docs · meeting notes". A single downward arrow connects the middle box to the bottom box, which reads "Queryable, permissioned, compounds with every run".

Right branch (inside a light-bordered white container titled "Native Claude app"): contains two parallel columns. The left column has a top gray box "Chat session" with a downward arrow to a box reading "Ephemeral — gone when it ends". The right column has a top gray box "Projects & memory" with a downward arrow to a box reading "Per-user, opaque, unqueryable".

The visual contrast: the orange (NanoClaw) side shows a compounding, queryable, permissioned vertical chain that feeds back into itself (bidirectional arrow between agent runs and substrate), while the native Claude app side shows two dead-end, ephemeral/opaque flows.

```
                  +-----------------------------+
                  |  Claude models — the        |
                  |  same rented brain          |
                  +-----------------------------+
                     |                       |
          +----------+                       +-----------+
          v                                              v
 +===========================+      +-------------------------------------------+
 | NanoClaw + owned          |      |           Native Claude app               |
 | substrate   (ORANGE)      |      |                                           |
 |                           |      |  +---------------+   +------------------+  |
 |  +---------------------+  |      |  | Chat session  |   | Projects &       |  |
 |  | Agent runs —        |  |      |  +-------+-------+   | memory           |  |
 |  | ~80 on a schedule   |  |      |          |          +--------+---------+  |
 |  +----------+----------+  |      |          v                   |            |
 |             ^ (bidir.)    |      |  +---------------+   +--------v---------+  |
 |             v             |      |  | Ephemeral —   |   | Per-user,        |  |
 |  +---------------------+  |      |  | gone when it  |   | opaque,          |  |
 |  | Shared substrate    |  |      |  | ends          |   | unqueryable      |  |
 |  | CRM · tasks · docs  |  |      |  +---------------+   +------------------+  |
 |  | · meeting notes     |  |      +-------------------------------------------+
 |  +----------+----------+  |
 |             | (down)      |
 |             v             |
 |  +---------------------+  |
 |  | Queryable,          |  |
 |  | permissioned,       |  |
 |  | compounds with      |  |
 |  | every run           |  |
 |  +---------------------+  |
 +===========================+
```


---

## [12] The Invisible Seam: How Our Workspace AI and Our Autonomous Agent Hand Off Work

**Published: 2026-06-08 · Series: Standalone deep-dive · URL: https://blog.bitsafe.finance/p/the-invisible-seam-how-our-workspace-ai-and-our-autonomous-agent-hand-off-work**

### Introduction

Most AI stack write-ups tour the toolbox—naming the model, database, and automation layer—then stop. BitSafe's article argues the critical piece is what nobody usually shows: the handoff between systems. The author describes this transition point as "the seam," where context often leaks away. "Context that was rich inside one tool arrives thin on the other side, or it doesn't arrive at all."

BitSafe operates two distinct AI systems. The first is a workspace housing company knowledge: documents, projects, meeting notes, CRM records, and team playbooks. Approximately 60 governed agents with over 140 skills read and write to these records. The company implemented this foundation in November 2025 to establish one source of truth for both people and agents.

The second system is an autonomous agent that accesses external sources—Slack history, the open web, meeting transcripts, and on-chain data—to execute multi-step work independently. Around 80 jobs run on schedule, with a single enrichment agent completing roughly 7,700 runs.

BitSafe frames these as complementary: "The brain holds what we know. The reach finds what we don't." The workspace serves as the durable anchor; the autonomous agent provides external capability. Neither replaces the other; each strengthens where the other is weak.

### Two systems, two jobs

The first system is BitSafe's workspace, which serves as the central repository for all company knowledge. It consolidates "docs, projects, meeting notes, CRM records, and the playbooks our team writes." The foundation supports approximately 60 governed agents powered by more than 140 skills, all operating within these shared records. The company transitioned to this model in November 2025 with a specific objective: establishing "one source of truth that both people and agents work from." This workspace functions as what the authors describe as "the brain. It is where knowledge gets held, structured, and reused."

The second system is an autonomous agent designed for external information gathering. It accesses "Slack history, the open web, meeting transcripts, and on-chain data." This system executes multi-step workflows autonomously, with approximately 80 scheduled jobs running continuously. A single enrichment agent within this system has "logged roughly 7,700 runs by itself." This component represents "the reach. It goes and gets the things the workspace does not already hold."

The conceptual framework guiding both systems is: "The brain holds what we know. The reach finds what we don't. They stack, they don't compete." Each system occupies distinct strengths—the workspace provides durability for internal knowledge management, while the autonomous agent excels at discovering external information that the workspace hasn't yet captured.

### The routing rule that fits on a sticky note

The core principle is elegantly simple: "Try the brain first. Reach when the brain can't."

The section outlines specific heuristics for routing work:

**Send to the workspace when:**
- Work concerns internal knowledge found in docs, projects, or meetings
- It involves routine workflows on a cadence (weekly reports, drafts, CRM updates)
- A grounded question should be answered from the company's own content with citations

**Reach for the autonomous agent when:**
- Work needs live external data (chain state, recent messages, web pages)
- The problem is open-ended and spans multiple sources
- A one-off tool that doesn't yet exist is required

The authors emphasize a deliberate design choice: workspace-first routing as the default. This approach maintains "a clean audit trail, with the result landing back where the whole team can find it." External retrieval becomes the secondary option only when the workspace genuinely cannot fulfill the task.

### The handoff goes both ways

The interesting part is what happens when a job actually crosses the seam.

A workspace agent that hits the edge of what it knows does not give up and does not invent the rest. It can request external retrieval in the middle of a task, pass that narrow question to the reach, and fold the answer back into the work it was already doing. Done well, "the seam is invisible. The person who asked never has to know which system did which part."

The return trip is the one that compounds. When the reach goes and gets something, it writes the result back into our structured databases, not into a chat reply that vanishes when the window closes. Once the result lands there it stops being a one-time fetch and becomes workspace context. The next task, run by a different agent or a different person, inherits it for free.

That loop is the payoff, and it is the thing a pile of disconnected point tools cannot do. In the usual setup you ask a tool to retrieve something, it answers, and the moment you move on the retrieval evaporates. You pay for it again next time. Their seam is built so retrieval flows toward permanence. The reach fetches, the brain keeps, and "the value accrues instead of resetting to zero."

### What it looks like end to end

Our weekly content system is the clearest example.

It starts with the reach listening across our own Slack, the web, and recent call transcripts, surfacing what is worth writing about this week. Those candidates land in the workspace as structured records. A person reviews them and approves a topic. Nothing advances to drafting on a machine's recommendation alone. Once a topic is approved, the workspace takes over the durable part. It schedules the piece, drafts it against our brand rules, and opens a design request for the visuals. A person gives the final sign-off before anything publishes. The reach found the signal and the brain carried the workflow. A person held the gate at both ends.

We use the same split for longer internal deliverables that pull from many sources. The reach gathers the raw evidence from the places it lives. The workspace holds the draft, the source context, and the approval state. A person fills the judgment-heavy sections and signs off. The orchestration sits with the brain, because that is where the work needs to pause, wait for a human, and pick up again without losing its place.

### What we learned at the seam

A few things, mostly the hard way.

Routing mistakes are real, and they have a recognizable shape. Hand a long, many-step job to the side tuned for short, sharp tasks and you get truncated, half-finished output. The fix was not a better model. It was a clearer rule about which side owns long-running, human-gated work. "Orchestration that has to wait for approval belongs with the brain."

The two systems will grow overlapping capability, and that is fine until it isn't. When both sides can plausibly do something, we decide by asking where the work naturally lives. If the inputs and the approval already sit in the workspace, the workspace owns it. If the job is live retrieval or code, the reach owns it. We write that decision down so we are not relitigating it every sprint.

And the rule we guard above all the others is one source of truth. The reach can pull from many places, but everything resolves back into the workspace. "Two copies of the truth is how a stack starts lying to you."

### Why the seam holds

The honest answer is that the seam holds because people hold the gates. Every step that produces something outbound passes through a person who can say no. The machines route, retrieve, draft, and structure. People approve. That is the design, not a safety feature bolted on afterward, and it is why we let the system run as much of the work as it does.

### Images

**Cover image** (`art12-cover.png`)

Prose: A dark near-black banner cover. In the top-left corner is the BitSafe logo—a small reddish/orange square icon followed by the wordmark "BITSAFE" in white capitals. Centered on the banner in large white serif/display type is the title across two lines: "How Our Workspace AI and Our Autonomous Agent Hand Off Work." Below the title, in smaller, lighter gray text, runs the subtitle/standfirst across two lines: "Every AI stack has handoffs. Ours is built so context compounds instead of leaking." A subtle dark red/maroon glow sits behind the upper-center area near the logo.

```
+--------------------------------------------------------------+
| [■] BITSAFE                                                  |
|                                                              |
|         How Our Workspace AI and                             |
|         Our Autonomous Agent Hand Off Work                   |
|                                                              |
|     Every AI stack has handoffs. Ours is built so context    |
|              compounds instead of leaking.                   |
+--------------------------------------------------------------+
```

**Diagram** (`art12-diagram9.jpg`) — the handoff system

Prose: A horizontal flowchart on a white background with four labeled rectangular boxes connected by labeled arrows. The boxes (three light gray, one orange-filled) are arranged across the canvas:

- Far left, a light gray box labeled "The reach" with the subtext "Slack history, open web, transcripts, on-chain data."
- Upper center, a light gray box labeled "Workspace agent" with the subtext "mid-task, hits the edge of what it knows."
- Lower center, an orange-filled box (white text) labeled "Structured databases" with the subtext "one source of truth."
- Far right, a light gray box labeled "Next task," with the subtext "next agent, next person."

Arrows and their flow direction:
1. From "The reach" (top edge / upper-right) an arrow points right and up into the "Workspace agent" box, labeled "answer folded back into the task." (Direction: reach → workspace agent.)
2. From the "Workspace agent" box, an arrow points left and down back toward "The reach," labeled "narrow external question." (Direction: workspace agent → reach.) These two arrows form the bidirectional mid-task loop between the reach and the workspace agent.
3. From "The reach" (lower-right edge) an arrow points right into the orange "Structured databases" box, labeled "result written back." (Direction: reach → structured databases.)
4. From the orange "Structured databases" box, an arrow points right into the "Next task, next agent, next person" box, labeled "context inherited for free." (Direction: structured databases → next task.)

The overall flow encodes the article's two-way handoff: the workspace agent passes a "narrow external question" down to the reach, the reach returns the "answer folded back into the task," the reach also writes its "result written back" into the structured databases (the single source of truth), and that persisted context is then "inherited for free" by the next task / next agent / next person.

```
   +----------------------------+    answer folded back     +----------------------------+
   |        The reach           | ----  into the task  ----> |      Workspace agent       |
   | Slack history, open web,   |                            | mid-task, hits the edge    |
   | transcripts, on-chain data | <--- narrow external ----- |      of what it knows       |
   +----------------------------+      question              +----------------------------+
        |                                                              
        |  result written back                                        
        v                                                             
   +----------------------------+   context inherited      +----------------------------+
   |   Structured databases     |   for free               |        Next task,          |
   |   one source of truth      | -----------------------> |  next agent, next person   |
   |        [ORANGE BOX]        |                          +----------------------------+
   +----------------------------+
```


---

## [13] Measuring an AI OS, Honestly — What We Track, and What We Refuse to Claim

**Published: 2026-06-09 · Series: Standalone deep-dive · URL: https://blog.bitsafe.finance/p/measuring-an-ai-os-honestly-what-we-track-and-what-we-refuse-to-claim**

### Introduction

Every leadership team adopting AI asks the same question during reviews: "is the AI actually working?" BitSafe's team faced this query on their own scorecard call, and their honest initial answer was that they could not fully prove it. The system was functioning, but the metric everyone wants — return on AI investment — proved genuinely difficult to measure. Most people claiming such numbers cannot substantiate them.

BitSafe operates a large internal AI system with approximately 60 governed agents sharing 140+ skills, and roughly 80 scheduled jobs running automatically around the clock. One enrichment agent alone has logged about 7,700 runs. The company transitioned to Notion as its operating substrate in November 2025, with AI functioning in two components: a governed workspace brain (Notion AI) with built-in business knowledge, and an autonomous external-reach layer (NanoClaw) operating beyond it. For a system of this scale, determining whether "it's worth it" is not rhetorical — it is a budget line defended monthly.

Rather than providing a clean ROI figure, the team built a scorecard measuring what is actually quantifiable. This approach reflects what they could verify, what they rejected, and the single metric they trust completely.

### The honest answer is the common one

Research indicates this uncertainty reflects widespread industry patterns rather than isolated cases. A frequently referenced MIT study determined that approximately 95% of enterprise generative AI pilots generated no measurable returns. Multiple surveys reveal most organizations report minimal measurable productivity improvements despite substantial expenditures. Additionally, investigations comparing perceived time savings against actual measured time savings consistently demonstrate that perceived gains substantially exceed measured ones.

These findings do not indicate AI lacks functionality. Rather, they suggest that typical ROI assertions rest primarily on perception rather than rigorous evidence. The authors chose not to contribute to this pattern of unsubstantiated claims.

### Why AI ROI is genuinely hard to measure

Four things break the clean before-and-after story.

**Selection bias.** You apply AI to the work where you already expect it to help. So the with-AI task set and the without-AI task set are not comparable in the first place. The comparison is rigged before you start.

**No counterfactual.** You cannot run the same person on the same task twice, once with AI and once without, under identical conditions. The clean A/B everyone imagines does not exist in real operations.

**Attribution noise.** Output moves for a dozen reasons in any given week. Pulling the AI's contribution out of headcount changes, seasonality, and ordinary process tweaks is mostly guesswork.

**The best work was invisible to begin with.** The thing AI does best for us is the routine work that used to quietly slip: the follow-up that never got sent, the record that never got updated. That work never showed up in a metric before, so "we now do it consistently" does not register as a gain on any chart we used to keep.

### What we measure instead

The organization abandoned pursuit of a single ROI metric and instead tracks three measurable dimensions:

**1. Adoption inputs.** The system monitors AI sessions per person weekly, feeding automatically into company scorecards. This serves as a leading indicator since "usage comes before integration, and integration comes before any outcome."

**2. Maturity.** A self-reported five-stage ladder assesses where individuals sit: Aware, Trying, Using, Integrated, Transforming. The "Using" threshold means AI has become part of weekly workflows. These stages aggregate into a single 0-100 AI Adoption Index. The organization targets at least 60% at Stage 3 or above, and 40% at Stage 4 or above by end of 2026. This approach "captures what a usage count misses: whether someone has actually rebuilt a workflow around AI or is just pinging a chatbot a lot."

**3. Cost.** This receives rigorous measurement with token-level telemetry, month-to-date spending guardrails that transition to cheaper model tiers as budgets approach caps, and unified visibility across previously separate billing surfaces. The organization notes this is "the one tier that holds still."

### The scorecard journey

The journey to the current measurement framework was iterative rather than predetermined, developed through weekly discussions on the Ninety.io scorecard platform.

Initially, the team employed a simple binary metric: "AI tools adopted, yes or no." After a year of investment, this approach proved inadequate. As Clarke notes, "A binary cannot move week to week." This metric failed to distinguish between daily power users and those who accessed a chatbot once, and couldn't detect when teams reduced their AI usage.

The next iteration focused on counting function calls. However, this required consequential definitional choices about what constitutes a "call" — whether an entire agent execution or each underlying model request counts as one unit. Questions arose about handling cached reads, which could inflate figures, and how to handle timezone considerations for a continuously operating system. The team ultimately selected "the unit a human actually feels, the agent run" as their counting mechanism.

Counting behavior alone remained insufficient. The team therefore paired objective usage metrics with subjective assessment by introducing a maturity evaluation component. According to the article, this combination provides "two numbers, one honest picture: are people using it, and is it changing how they work?" Both metrics appear on the leadership scorecard, with usage data feeding automatically before weekly reviews begin.

### What we refuse to claim

The organization explicitly declines to publish hours saved, attribute revenue to the AI system, or claim headcount avoided. According to the article, "Every one of those needs a counterfactual we just explained does not exist, and putting a precise figure on a guess is how AI reporting loses credibility."

Instead of these metrics, the team embraces honest proxies: run counts, jobs that no longer slip through, output consistency, and cost per workflow. The article states these proxies individually cannot prove ROI, but collectively they demonstrate "whether the engine is running and roughly what it costs to run it."

### The one number we trust completely

Cost represents the single metric the organization fully trusts without reservation. While proving benefits to precise decimal points remains impossible, the company can establish firm boundaries around spending. The system's expenditures are understood "within tight margins," with daily monitoring and established caps. This bounded cost, positioned alongside observable operational achievements, creates "a rational bet, even without a clean ROI figure."

The fundamental reframe shifts questioning away from unverifiable ROI calculations toward a pragmatic framing: rather than asking "what is the ROI," teams should instead ask "what does this cost, and can we see it earning its keep."

### Where we landed

Measure the inputs honestly. Bound the costs tightly. Let the operational wins make their own case instead of inventing a return number to justify them. That is the scorecard we trust, and it is the one we would build again.

If you are deploying an AI system and wrestling with the same question, come find me. I am Kadeem Clarke, and I am around in the Canton ecosystem Slack.

### Images

**Cover image (`art13-cover.png`)**

Prose: A dark, near-black banner with subtle warm/orange gradient lighting bleeding in from the edges. Top-left corner shows the BitSafe wordmark/logo in white (a small icon next to "BITSAFE"). Centered is the large bold white title "Measuring an AI OS, Honestly". Below the title, in smaller, lighter gray text, is the subtitle/dek: "We could not prove our AI's ROI. Almost nobody can. Here is what we measure instead." A small orange dot/accent sits just above the title as a series marker. At the very bottom in faint small text is a "BitSafe" / newsletter attribution line.

```
+---------------------------------------------------------------+
| [≡ BITSAFE]                                                   |
|                                                               |
|                            • (orange dot)                     |
|                                                               |
|                Measuring an AI OS, Honestly                   |
|                                                               |
|      We could not prove our AI's ROI. Almost nobody can.      |
|              Here is what we measure instead.                 |
|                                                               |
|             (faint bottom attribution line)                   |
+---------------------------------------------------------------+
   (dark background, warm orange glow from edges)
```

**Diagram (`art13-diagram10.jpg`) — three measurement categories**

Prose (exhaustive): A horizontal flowchart on a white background, built from light-gray rectangular boxes with thin gray borders, connected by gray right-angle (elbow) connector lines with arrowheads. At the top center is a single root decision box reading "Is the AI actually working?". From this root, two branches descend. The left branch leads to a mid-level box labeled "What we track". The right branch leads to a mid-level box labeled "What we refuse to claim".

The "What we track" box fans out into three child boxes at the bottom row:
1. "Adoption inputs / AI sessions per person per week, / fed automatically" (light-gray box).
2. "Maturity / 5-stage ladder rolling into / a 0-100 AI Adoption Index" (light-gray box).
3. "Cost / token-level telemetry, / capped and watched daily" — this box is highlighted in solid ORANGE with white text, distinguishing it as the trusted/emphasized metric.

The "What we refuse to claim" box fans out into three child boxes at the bottom row (all light-gray):
1. "Hours saved"
2. "Revenue attributed to AI"
3. "Headcount avoided"

The orange "Cost" box is the only colored element, visually emphasizing it as "the one number we trust completely." The left cluster (track) and right cluster (refuse) are clearly separated across the width of the diagram.

```
                    +-----------------------------+
                    |  Is the AI actually working? |
                    +-----------------------------+
                       |                        |
            +----------+------+         +-------+------------------+
            | What we track   |         | What we refuse to claim  |
            +-----------------+         +--------------------------+
            /        |        \           /          |           \
+-----------+ +-------------+ +========+ +----------+ +-----------+ +-------------+
| Adoption  | | Maturity    | | COST   | | Hours    | | Revenue   | | Headcount   |
| inputs    | | 5-stage     | |(ORANGE)| | saved    | | attributed| | avoided     |
| AI        | | ladder      | | token- | |          | | to AI     | |             |
| sessions  | | rolling into| | level  | +----------+ +-----------+ +-------------+
| per person| | a 0-100 AI  | | tele-  |
| per week, | | Adoption    | | metry, |
| fed auto- | | Index       | | capped |
| matically | |             | | and    |
+-----------+ +-------------+ | watched|
                             | daily  |
                             +========+  <- highlighted orange box (white text)
```


---

## [14] The Infrastructure Mindset Turned Inward: How BitSafe Runs on AI

**Article #14 (OVERVIEW / index article) · Published 2026-06-10 · Author: Kadeem Clarke · Series: Overview / index · URL: https://blog.bitsafe.finance/p/the-infrastructure-mindset-turned-inward-how-bitsafe-runs-on-ai**

> Note: This is the series OVERVIEW / index article. It links to the entire series — the "How BitSafe runs on Notion" Notion series (Part 1–5), the NanoClaw series (Part 1–5), and three standalone deep-dives — plus two GitHub repos: github.com/Akibalogh/bitsafe-ai-docs (the case-study docs / article source) and github.com/qwibitai/nanoclaw (the upstream NanoClaw framework).

### Introduction (text before the first heading)

BitSafe is a 22-person team that operates using roughly 60 governed AI agents within a single unified system. BitSafe describes itself as an infrastructure organization: it brought Bitcoin onto Canton with CBTC, and it is open-sourcing the Decentralization Manager, making it easier to build decentralized technology on Canton.

The piece frames a common problem: marketing departments either re-explain their company context to chatbots every single day, or they juggle a set of disconnected AI tools that lack integration. BitSafe resolved this by turning its product infrastructure philosophy inward — "build the layer others build on."

The introduction sets up a "three levels" framework for AI deployment:
- Level 1 — standalone LLM browser tabs that require constant context re-entry.
- Level 2 — scattered point tools that lack end-to-end business knowledge.
- Level 3 — a unified system that maintains persistent organizational context.

BitSafe built its approach around context engineering, prioritizing what the AI already knows over perfecting individual prompts.

The system combines two components: Notion as the central brain holding all company knowledge, and NanoClaw as the external reach for retrieving data from Slack, the web, transcripts, and on-chain (blockchain) sources. The introduction emphasizes that operations come before output — most agents handle CRM hygiene, meeting preparation, and monitoring rather than content creation.

### The three levels of AI

The article presents AI deployment as a three-level progression:

**Level 1 — A browser-based LLM.** "ChatGPT, Claude, Gemini. Powerful, but it starts every task with amnesia." Users must repeatedly upload context and re-explain their company.

**Level 2 — Disconnected point tools (a stack of AI point tools).** "Faster, but your context is scattered across tools that don't talk to each other." The article characterizes this as "a good place to pass through; a bad place to stop."

**Level 3 — A unified context system.** "One system that already holds your context. The AI starts every task knowing who you are, what you do, and what you're selling." This approach emphasizes context engineering — managing what the AI already knows rather than perfecting prompts.

Level 3 represents the most mature approach, in which business context is permanently embedded in the system itself rather than requiring manual input for each interaction. (This section is illustrated by Diagram 1 — see Images.)

### The system: a brain and a reach

**Notion as the Brain.** "Notion is the brain, and where the work gets made." It holds "Brand guidelines, CRM, SOPs, meeting notes, rules: everything the company knows" in one structured workspace. Agents operate with preloaded context so output matches the organization's voice without extensive setup instructions.

**NanoClaw as the Reach.** Described as "the reach," this component retrieves external information: "When a task needs something from outside the workspace, NanoClaw goes and gets it from Slack, the web, transcripts, or on-chain data, then hands what it finds back to our Notion agents."

**Operating principle.** The systems "stack — they don't compete." The decision rule is: "try the brain first; reach for the hands when the brain can't." Internal knowledge tasks use the workspace (simpler, auditable, context-aware). External data gathering and open-ended problems use the reach.

**Integration mechanism.** "The seam is invisible." Both systems connect so workspace agents can request external data mid-task. The retrieval process creates permanent system improvement: "Each retrieval makes the system permanently smarter."

**Worked example.** A weekly content system listens to client calls, reads Slack, and pulls web data for topic recommendations. After approval, it schedules, drafts, and prepares design requests, with human sign-off before publication.

(This section is illustrated by Diagram 2 — see Images.)

### Operations first, output second

The section presents a counterintuitive organizational principle: "most of what our ~60 governed agents do isn't writing content. It's operations: CRM hygiene and enrichment, meeting prep and briefs, monitoring, reporting, document verification."

The key insight is that prioritizing AI deployment on operational tasks yields immediate workflow improvements: "Start with AI on operations and the way work gets done improves immediately. Build those workflows one by one, and the system accumulates enough context that good output becomes the bonus."

This accumulated context creates a compounding effect: "It sounds like you, because the context lives in the system rather than in anyone's prompt."

Individual agent tasks are modest in scope — classifying CRM entries, preparing meetings, flagging expired documents, nudging stalled drafts, scoring pipelines. Collectively, however, they generate three measurable outcomes:

1. Routine work no longer slips through due to human capacity constraints.
2. Quality becomes consistent regardless of team-member workload.
3. Human judgment remains preserved through approval gates.

One concrete metric: "One contact-classification agent alone has run about 7,700 times."

The operational-first approach positions content quality as a natural downstream benefit rather than the primary objective.

### What ~60 governed agents actually buy you

BitSafe's system delivers three practical outcomes from its agent infrastructure:

**Routine work becomes automatic.** "The enrichment, hygiene checks, briefs, and reminders everyone agrees matter, and that nobody was ever going to do by hand, just happen now." A single contact-classification agent has executed approximately 7,700 times, demonstrating sustained operational impact.

**Consistency replaces variability.** Rather than quality depending on workload or personnel: "Every company gets classified against the same brand-guide definitions. Every meeting gets prepped to the same standard. Every document gets re-verified on the same cycle." This standardization is what BitSafe calls "the quiet benefit nobody puts on a slide."

**Humans retain decision authority.** The governance model ensures that "Anything outbound stops at a human approval gate: agents propose, people approve. And no agent can edit its own instructions: every change is proposed, approved by a human owner, and applied through a controlled process with a full audit trail."

The cumulative effect: individually unremarkable tasks — classifying CRM entries, flagging expired verifications, nudging stalled drafts — compound into systemic operational improvement without requiring manual intervention or sacrificing oversight.

### The path to Level 3

Reaching Level 3 (a unified system holding organizational context) involves three sequential steps:

**Step 1: Centralize knowledge.** "Get the knowledge in one place." The company began migrating documents in November 2025, moving materials incrementally as needed rather than doing a mass transfer. "Data hygiene matters as much as volume," with periodic verification cycles and archival of obsolete content to prevent the AI from drawing on outdated information.

**Step 2: Target a specific pain point.** "Point the AI at one painful workflow." Rather than attempting comprehensive transformation simultaneously, focus on identifying and solving a single high-friction process that the entire team recognizes as problematic.

**Step 3: Deploy governed agents with human oversight.** "Build governed agents one by one, with a human in the loop." Each agent requires three elements: designated ownership, documented instructions subject to change control, and human approval gates where necessary for task execution.

The section concludes: "The unlock was never the model. It was the context."

### The reading map

The article provides a comprehensive series index organized into three categories: "How BitSafe runs on Notion" (the brain), "The NanoClaw series" (the reach), and "Standalone deep-dives." The series source code / case-study docs are open at github.com/Akibalogh/bitsafe-ai-docs, built on the upstream NanoClaw framework (github.com/qwibitai/nanoclaw). The article does not prescribe a single reading order; it organizes the pieces by system layer (brain/reach) and lets readers choose by interest.

### How BitSafe runs on Notion

The "How BitSafe runs on Notion" series — the brain — lists five interconnected parts:

- **Part 1: Notion as the Company OS** — "Rebuilding the company so AI could use it — from wiki to structured substrate." (Restructuring the company for AI compatibility.)
- **Part 2: The Architecture** — "The schema, relations, and database design that make the workspace agent-ready."
- **Part 3: Agents, Automations, and the AI Layer** — "How Notion AI, Claude, and NanoClaw divide the labor — custom agents, AI SOPs, autofill."
- **Part 4: Replacing Salesforce with Notion** — "Why we turned off Salesforce and how the Notion-native CRM replaced it."
- **Part 5: The Agent Governance Model** — "How ~60 agents stay governable — the registry, propose → approve → apply change control, and the agents that govern the agents."

Source repository: case materials are open at github.com/Akibalogh/bitsafe-ai-docs, which builds on the upstream NanoClaw framework repository.

### The NanoClaw series

The NanoClaw series — the reach. The article notes: "The article series — drafts, worked examples, and the case-study docs behind it — lives in the open at github.com/Akibalogh/bitsafe-ai-docs, built on the upstream NanoClaw framework (github.com/qwibitai/nanoclaw)."

Five-part series:

- **Part 1: Building a Company-Wide AI Assistant** — "Infrastructure, security, and self-improvement patterns behind the assistant."
- **Part 2: The Architecture** — "The fleet-style agent system: persistent memory, scheduled task queues, continuous context."
- **Part 3: The Autonomous Engine** — "Operating loops, CI/CD, swarms, and observability."
- **Part 4: The Substrate** — "Notion-as-OS, data, code, knowledge, and tools — what the model can read and act on."
- **Part 5: Working With NanoClaw** — "Personas, alerts, memory, and how humans teach the AI."

### Standalone deep-dives

Three standalone deep-dive articles:

- **"Why Not Just Use the Claude App?"** — "Same brain, different body," focusing on "rented model vs. owned context, sessions vs. state, operations vs. output."
- **"The Invisible Seam"** — "How the workspace AI and autonomous agent hand off work," covering "the routing rule and the two-way handoff."
- **"Measuring an AI OS, Honestly"** — what gets tracked versus what's excluded, including "adoption inputs, the maturity ladder, and cost as the honest number."

### Where to start

The article advises readers to fundamentally reframe their workspace approach: instead of viewing it as "a filing cabinet," treat it as "a teammate that knows the business, and give it the best context you can."

For those building on Canton specifically, the piece offers direct engagement: find Kadeem Clarke on the Canton ecosystem Slack to "compare notes on marketing operations" and get walkthroughs of any system component.

### Keep Reading

The closing section promotes the BitSafe Blog for Canton Builders, described as offering "Guides, updates, and resources for building with CBTC, Decentralization Manager, and more," with a subscription option presented.

### Images

#### Cover image (art14-cover.png)

**Prose.** A dark, reddish-brown gradient banner (BitSafe brand cover). Top-left corner shows the BitSafe logo wordmark with a small icon. Centered at top is a small orange/red diamond-shaped emblem. The large white headline reads "How BitSafe Runs on AI." Below it, a centered white subtitle reads: "How a 22-person team runs on roughly 60 governed AI agents, and the map to every article in this series." Small faint footer text runs along the bottom edge (boilerplate). The styling is the standard Beehiiv newsletter cover template.

```
+-------------------------------------------------------------+
| [BITSAFE logo]                                              |
|                                                             |
|                          [◆]                                |
|                                                             |
|              How BitSafe Runs on AI                         |
|                                                             |
|   How a 22-person team runs on roughly 60 governed AI       |
|   agents, and the map to every article in this series.      |
|                                                             |
| (faint footer text)                                         |
+-------------------------------------------------------------+
```

#### Diagram 1 — The three levels of AI (art14-diagram1.jpg)

**Prose.** A vertical, top-to-bottom flowchart with three stacked rectangular boxes connected by downward arrows, each arrow labeled with the transition between levels.

- Top box (light gray fill, black text): "Level 1 — An LLM in a browser tab / Powerful, but starts every task with amnesia"
- A downward arrow leads from the top box to the middle box, and the arrow is labeled "add tools".
- Middle box (light gray fill, black text): "Level 2 — A stack of AI point tools / Faster, but context is scattered across tools that don't talk"
- A downward arrow leads from the middle box to the bottom box, and the arrow is labeled "add context engineering".
- Bottom box (solid orange fill, white text): "Level 3 — One system that already holds your context / AI starts every task knowing the business"

The two upper boxes are de-emphasized (gray) and the final state (Level 3) is highlighted in BitSafe's orange brand color, visually signaling it as the goal/destination of the progression. Flow direction is strictly downward: Level 1 → (add tools) → Level 2 → (add context engineering) → Level 3.

```
        +-----------------------------------+
        |  Level 1 — An LLM in a browser tab|
        |  Powerful, but starts every task  |
        |  with amnesia                     |   (gray)
        +-----------------------------------+
                        |
                    add tools
                        v
        +-----------------------------------+
        |  Level 2 — A stack of AI          |
        |  point tools                      |
        |  Faster, but context is scattered |   (gray)
        |  across tools that don't talk     |
        +-----------------------------------+
                        |
              add context engineering
                        v
        +===================================+
        |  Level 3 — One system that        |
        |  already holds your context       |
        |  AI starts every task             |   (ORANGE)
        |  knowing the business             |
        +===================================+
```

#### Diagram 2 — The system: a brain and a reach (art14-diagram2.jpg)

**Prose.** A horizontal, left-to-right architecture diagram on a near-black background, showing how external sources flow through NanoClaw (the reach) into Notion (the brain) and out to shipped work, with a human approval gate at the end.

Left column — four stacked input source boxes (dark fill, white text), each with an arrow pointing right into the NanoClaw box:
- "Slack"
- "Web"
- "Call transcripts"
- "On-chain data"

These four arrows converge into the next box.

NanoClaw box (dark gray container titled "NanoClaw — the reach", with an inner black box): inner label reads "~80 scheduled jobs / retrieve and pre-process".

A rightward arrow from NanoClaw is labeled "hand off", pointing into the large orange container.

Notion container (large solid orange box titled "Notion — the brain") holds three inner dark boxes arranged left to right:
1. "each retrieval compounds the context"
2. "CRM · Docs · SOPs · Meeting notes" (a small play/triangle ▸ marker sits just left of this box, suggesting flow from box 1 into box 2)
3. "~60 governed agents"
Box 2 connects to box 3 inside the orange container.

From the right edge of the Notion container, an arrow labeled "human approves" points to the final box on the far right:
- "Work ships" (dark box, white text).

Overall left-to-right flow: External sources (Slack / Web / Call transcripts / On-chain data) → NanoClaw — the reach (~80 scheduled jobs retrieve and pre-process) → [hand off] → Notion — the brain (each retrieval compounds the context → CRM · Docs · SOPs · Meeting notes → ~60 governed agents) → [human approves] → Work ships.

Note the two distinct numbers in this diagram: NanoClaw runs "~80 scheduled jobs" (the reach side), while the brain side runs "~60 governed agents."

```
  [Slack]------\
  [Web]---------\        +---------------------------+
  [Call          >------>|  NanoClaw — the reach     |
   transcripts]-/        |  +---------------------+  |
  [On-chain ---/         |  | ~80 scheduled jobs  |  |
   data]                 |  | retrieve and        |  |
                         |  | pre-process         |  |
                         |  +---------------------+  |
                         +-----------+---------------+
                                     |
                                 [hand off]
                                     v
  +==============================================================+
  |  Notion — the brain                                          |
  |  +----------------+   +-------------------+   +------------+  |
  |  | each retrieval | ▸ | CRM · Docs · SOPs |   | ~60        |  |
  |  | compounds the  |-->| · Meeting notes   |-->| governed   |  |
  |  | context        |   |                   |   | agents     |  |
  |  +----------------+   +-------------------+   +------------+  |
  +============================================+=================+
                                               |
                                        [human approves]
                                               v
                                        +--------------+
                                        |  Work ships  |
                                        +--------------+
```


---

# Part II — `bitsafe-ai-docs` repo: repo-only material

> These pieces live in BitSafe's docs repo but are **not** separate posts in the captured blog series.
> The five *Lessons* articles are published as-ready to BitSafe's hub (`hub.bitsafe.finance`); the
> *Code Factory MVP* spec is a forward-looking architecture proposal (distinct from the retrospective
> case-study articles). All included verbatim (frontmatter stripped).


## Lessons articles (repo `docs/articles/06`–`10`)


---

### [Lesson] Cost Discipline — Why the Bill Grew, What We Caught, How to Catch It Sooner
**Published:** 2026-06-07 · **Source:** `bitsafe-ai-docs/docs/articles/06-cost-discipline.md`

This is Part 6 of BitSafe's NanoClaw case study series. Parts 1-5 covered architecture, autonomy, substrate, and the daily working pattern. Part 6 is a postmortem-as-playbook: how the Anthropic bill grew past plan in May 2026, what we found when we went looking, and the layer of cost vigilance we built to make sure the same blind spots don't return.

The headline numbers, before we start. BitSafe runs NanoClaw on an Anthropic Tier 4 org with a $15,000/month spend cap. On May 17 the month-to-date was $9,941 with two weeks left — projecting to ~$18,000 at the run rate, over cap. In a single Sunday afternoon we found and shipped seventeen separate cost levers — every one a real bug or a real over-routing decision. The arithmetic, conservatively: ~$4,500/month of savings now active in production, with a Haiku-triage layer in flight worth another ~$400/month. None of the fixes were dramatic; the model is the same Claude Opus 4.7 we've been using all year. The leverage was in observability — the moment we could see *where the money was going*, the fixes wrote themselves.

#### What we knew vs. what we couldn't see

The starting state was deceptively comfortable. We had a daily Anthropic-cost monitor (`scripts/daily-anthropic-cost-monitor.py`) that posted MTD totals + cache-hit rates to admin chat at 08:00 UTC. The cache hit rate was a healthy 99.42%. Daily totals looked stable. The model split looked reasonable: Sonnet for most work, Opus for hard reasoning. Nothing was screaming.

But three classes of cost were invisible:

**(1) Per-spawn cost attribution.** The cost-telemetry log at `data/anthropic-cost-telemetry.jsonl` recorded every API call's input/output/cache tokens — but the `container_src_ip` field for every spawn was `127.0.0.1` (the credential-proxy's local IP). When `cost-by-skill-report.py` tried to attribute spend to a skill or group, it got 0% matches. Every dollar was tagged "unknown:unknown." We had a sum, but not a breakdown.

**(2) Tier-aware pricing.** Claude Opus 4.7 has two pricing tiers: standard up to 200K context ($15 input / $75 output per 1M tokens), and "extended" 200K-1M context ($30 / $112.50 — 2× input, 1.5× output). Our MTD tracker applied the standard pricing to *every* row in the Anthropic CSV export, regardless of which tier billed. For each 200K-1M row, we were undercounting by 2×. Over a month, the gap was ~$2,950 of silent under-reporting.

**(3) Per-channel spawn volume.** Each container spawn cost $0.05-$0.30 on average, well below any alarm threshold. But if a scheduled task fired in an archived Slack channel every 5 minutes for four days, the individual cost was invisible while the aggregate was real money. We had no "spawns per `chat_jid`" tracker.

These three gaps shared a property: they didn't cause loud failures. They caused *silent over-spending*. The system kept working; the bill kept growing.

#### The seventeen levers

The investigation started with one question — *where did the last $5,000 go?* — and unrolled into seventeen distinct findings. We grouped them by where the cost was hiding.

##### Lever 1: A long-running Claude Code session on the 1M-context tier

The biggest single discovery was personal. Aki — BitSafe's CEO and the heaviest individual user — kept a Claude Code session running in tmux on the host for hours at a time, asking architecture and strategy questions. The CC binary defaulted to the model identifier `claude-opus-4-7[1m]`, which engages the 200K-1M extended-context tier *whether or not the conversation actually exceeded 200K tokens*. The session paid the 2× input premium on every turn.

The fix was a one-line edit to `/root/.claude/settings.json`:

```json
{
  "model": "claude-opus-4-7",
  ...
}
```

Dropping the `[1m]` suffix returns to standard pricing. Cache-read tokens (the dominant cost category for long-running sessions) move from $3.00/M to $1.50/M — a clean 50% reduction. Three days of telemetry showed Aki's session burned $3,744 on extended-context Opus; the same usage pattern at standard tier projects to ~$4,200/week saved.

The wider lesson: *the most expensive part of the bill was a single config-file default*. We had no observability into which model variant was being used at the per-session level until the postmortem.

##### Levers 2-3: Tier pricing fix + 200K-1M throttle calibration

Once we knew the 1M tier was the silent multiplier, we fixed our MTD tracker so the auto-throttle works. `scripts/sync-anthropic-mtd-from-csvs.py` now reads each CSV row's `context_window` column and dispatches to a per-tier pricing table:

```python
PRICING_PER_1M = {
    "opus":   {"standard": {"input": 15.0, "output": 75.0},
               "extended": {"input": 30.0, "output": 112.5}},
    "sonnet": {"standard": {"input":  3.0, "output": 15.0},
               "extended": {"input":  6.0, "output": 22.5}},
    "haiku":  {"standard": {"input":  0.8, "output":  4.0},
               "extended": {"input":  0.8, "output":  4.0}},
}
```

Recomputing May 2026 against the corrected table moved MTD from $11,137 → $14,092 — a 26.5% revision. The auto-throttle's threshold checks (`MTD > 90% of target`) now fire on a closer-to-real number, not the under-counted version. (Honest caveat: our corrected tracker still over-counts against Anthropic's console — $14,092 vs $9,941 — because we apply the 2× tier multiplier uniformly to cache-read tokens, and Anthropic appears to bill cache-reads closer to the standard rate even on extended-context rows. Calibrating against the console number is a follow-up; the auto-throttle still errs on the safe side in the interim.)

##### Lever 4: The skill-detected → Opus shortcut

The model router (`src/model-router.ts`) classifies each inbound Slack message by complexity score (Gemini 2.5 Flash Lite, scoring 0.0-1.0) and routes to Haiku, Sonnet, or Opus based on boundary constants. But the router also had a *shortcut*: if the inbound message matched a known skill keyword (`commission`, `notion`, `daily-standup`, etc.), it bypassed the score and went straight to Opus. The rationale was reasonable when introduced ("skills imply complex reasoning"); the reality was that 458 of every 500 routing decisions hit this shortcut.

The shortcut sent everything to Opus. *Including* one-line requests like "post today's standup" or "search for X in Notion" — work Sonnet handles capably for one-fifth the cost.

The fix had two parts:

1. **Default the `skill_detected` shortcut to Sonnet instead of Opus.** Skills that genuinely need Opus (high-stakes monetary analysis, contract redlining, board-memo drafting, architecture diagramming) opt in via an explicit allowlist:

   ```ts
   const SKILL_OPUS_ALLOWLIST = new Set([
     'commission-arbitration',
     'commission-analysis',
     'architecture-diagram',
     'legal-redline',
     'investor-update',
     'design-agent',
     'cross-source-compare',
     'premortem',
     'six-sigma',
   ]);
   ```

   The allowlist is runtime-overridable via `NANOCLAW_SKILL_OPUS_ALLOWLIST` so we can tune without a rebuild.

2. **Layer in admin-deep-analysis tilt.** Skill-default-Sonnet would drop too aggressively if a human admin (Aki, Jesse, Kadeem) is asking a genuinely deep question. We added four additive score bonuses:

   | Signal | Bonus |
   |---|---|
   | Admin sender (Aki / Jesse / Kadeem) | +0.05 |
   | Deep-reasoning verb match (`evaluate`, `decide`, `tradeoff`, `strategy`, `should we`) | +0.03 |
   | Counterfactual phrasing (`what if`, `had we`, `implications of`) | +0.02 |
   | Long open-ended question (>30 words, no enumeration, has `?`) | +0.02 |

   So an admin asking *"what's the implications of moving to a token-launch model — should we tradeoff X for Y?"* clears the bonus chain to ~0.12 and reaches Opus. The same admin asking *"show me dashboard"* sits at -0.05 and lands on Haiku. Non-admin partners are hard-capped at Sonnet regardless of bonuses unless they explicitly write `use opus`.

The conservative projection on these two changes alone: $1,000-2,000/month, with the upper bound likely as Phase 2 (below) shifts more spawns to Haiku.

##### Levers 5-7: Lower-and-narrower boundary defaults, A/B logging

The boundary constants themselves were too tight. With `HAIKU_BOUNDARY=0.05` and `OPUS_BOUNDARY=0.07`, only the lowest-complexity messages reached Haiku. In production we observed: 67% of scoring-bypass spawns to Haiku, 19% to Sonnet, 14% to Opus.

Widening the bands to `HAIKU_BOUNDARY=0.08` and `OPUS_BOUNDARY=0.12` re-routes the borderline messages: ~90% to Haiku, ~10% to Sonnet, 0% straight-to-Opus from the boundary path. We also wired an A/B log (`data/model-router-ab.jsonl`) that records both the new tier and the tier that would have been chosen with the old boundaries — so after a week we can measure the real cost shift, not just the projection.

Boundary tightening alone projects $700-1,000/month. Combined with the skill-allowlist change, the model split should move from "59% Opus / 39% Sonnet / 2% Haiku" toward "20% Opus / 60% Sonnet / 20% Haiku" — closer to the price-weighted distribution the work actually deserves.

##### Lever 8: The cache-creation TTL gap

Anthropic's prompt cache has a 5-minute ephemeral TTL by default in the Claude Agent SDK's `preset: 'claude_code'` configuration. If a scheduled task fires every 15 minutes (e.g., the pre-meeting-brief reminder), the cache expires *between every fire* — and every fire pays full cache-creation cost (1.25× input rate) instead of cache-read cost (0.10× input rate).

This was almost the entire 0.58% cache miss. The math: ~$240/week of cache-creation cost concentrated in `slack_main` task threads, projecting to ~$1,040/month. A switch from 5-minute to 1-hour TTL would cut roughly 54% of that — ~$560/month. The Agent SDK doesn't expose `cacheTtl` today; the fix is either (a) an upstream SDK PR or (b) a manual `/v1/messages` bypass for scheduled-task spawns. Either is a real engineering project, so we shipped the *watchdog* first (`scripts/cache-creation-audit.py`) and parked the underlying fix as a follow-up. The watchdog runs daily at 06:00 UTC and pings admin when wasteful spawns exceed 5 in the trailing 24h.

The wider lesson: knowing where waste lives is more valuable than fixing it immediately, *as long as the measurement comes first*.

##### Lever 9: The runaway in an archived channel

One Slack channel — `C0AMQGEJX45`, formerly `#marketing-ai-design`, now archived with 0 members — kept firing scheduled tasks at `*/5 * * * *`. Over four days the channel accrued 1,099 container spawns. Each spawn short-circuited at the pre-flight check (`wakeAgent: false` because the channel's Notion DB had no "Ready for agent" rows), so the per-spawn cost was small. But the cumulative warm-pool churn was real, and the spawn count was hidden because no individual spawn breached the $3 alert threshold.

The fix had two parts. First, we paused the scheduled tasks targeting the dead channel — a one-time database update against `store/messages.db`. Second, we built `scripts/runaway-spawn-detector.py` to catch the next one before anyone notices. It runs daily at 07:00 UTC and flags any `chat_jid` with more than 50 spawns in 24 hours, then cross-references each flagged `chat_jid` against the live Slack API: archived channel? zero members? dead chat? The script's first dry run caught the same `C0AMQGEJX45` pattern *and* a healthy 102-spawn pattern in Aki's DM (not flagged as runaway, just noted).

##### Levers 10-13: Real-time + scheduled cost alarms

Once we knew what *had* gone wrong, we built the alarm layer for the next time.

- **Per-spawn cost alert** (`src/per-spawn-cost-alert.ts`): the credential proxy now logs each spawn's total cost on container close, using the Agent SDK's authoritative `lastMetrics.total_cost_usd` field. Spawns ≥$3 fire `ping-admin.sh --severity warning`; ≥$10 fire `critical`. Per-group cooldown 30 min. Critical bypasses cooldown.

- **Hourly cost-tick** (`scripts/hourly-cost-tick.py`): every hour at `:15`, compares the last hour's spend to the trailing 24h average. Spike >2.5× with last-hour spend >$5 fires warning; >5× with last-hour >$20 fires critical. Cooldowns 90 min per severity. Replayed against the May 11/12/13 spike days, the tick would have fired `critical` at 12:00 UTC each day — same-hour visibility instead of next-morning at 08:00.

- **Top-N spawn digest** (`scripts/top-cost-spawns-digest.py`): daily at 07:30 UTC, posts a 4-6 line summary of the top-cost spawns of the previous 24h to admin chat, with a link to the full markdown log. Catches the long tail of $1-2 spawns that the per-spawn alert misses but that aggregate to real money.

- **Cost vigilance score** (extension to `daily-anthropic-cost-monitor.py`): a 0-100 composite emitted in the existing 08:00 dashboard. Components: cache hit %, MTD pacing vs target, spawns >$3 in 24h, runaway `chat_jid` count, Opus share of total spend. The score is intentionally simple — five buckets of 30/25/20/15/10 — so deterioration in any one shows up as a noticeable drop in the headline number. A "controls working, spend overshot" snapshot reads 40/100, not 0; perfect reads 100.

##### Levers 14-17: Per-spawn context shrinkage

The other half of the cost equation is *what each spawn pays for*. Auditing per-spawn input token distribution surfaced numbers that made the team uncomfortable.

| Metric | Tokens |
|---|---|
| Median per spawn | 424K |
| P95 | 5.5M |
| P99 | 7.5M |
| Max | 8.8M |

74% of spawns were >200K total billable context (input + cache_read + cache_creation), and those spawns ate 93% of the weekly cost. Zero spawns under 50K — there was a hard floor of ~100K from the global system prompt + skill files + tool definitions before *any* user content was added. The bloat was a Sonnet-volume problem, not an Opus problem (Sonnet median 426K × 10× the spawn count overwhelmed Opus's larger-per-spawn footprint).

The two shrinkages we wired in:

- **Tiered `globalClaudeMd` loader** (`container/agent-runner/src/global-claudemd-loader.ts`): splits `CLAUDE.md` into an *always-loaded core* (philosophy, top working patterns, must-know rules — ~6,188 tokens) versus a *heavy section* (troubleshooting, full key-files table, runbooks — adds ~4,717 tokens for `debug`/`setup`/`incident-class` skills only). Light-weight skills (`search-all`, `daily-standup`, `notion-writer`) get the core only.

- **Tiered skills cheatsheet**: the canonical `SKILLS_CHEATSHEET.md` is 4,889 tokens (every container loads it at boot). The top-15 most-used skills (measured: `team-digest`, `cbtc-financials`, `marketing-abm`, `knowledge-compiler`, etc.) account for 40.2% of all skill reads. A tiered top section captures those at 1,846 tokens; the full file is preserved as `SKILLS_CHEATSHEET_FULL.md` for fallback when an agent doesn't find what it needs in the top.

Combined per-spawn savings, after wire-in and host-side mount: ~7,700 fewer input tokens per non-heavy spawn. At ~3,000 spawns/week, ~23M fewer billable tokens/week.

#### The Haiku triage layer — a small, smart model as the router

The most architecturally interesting lever shipped today isn't a cron or a watchdog — it's the Haiku triage layer. Worth a section of its own because the pattern generalizes beyond cost.

The orthodoxy in agent systems is that the strongest model serves every request: Opus or its peers at the top of the stack, gated only by the user typing the explicit "use opus" / "use haiku" override. The result is that *every* inbound message — from `"hi"` to *"evaluate the tradeoff between a token-launch model and a subscription model given our current cash position"* — pays for the same expensive container spawn. Most messages do not deserve that.

The first attempt at fixing this was deterministic shortcuts (Phase 1): seven regex patterns intercepting the absolute-cheapest cases (`/help`, single-word greetings, plain `thanks`) before any LLM is involved. That works at $0 marginal cost, but Aki was right to push back: regex is brittle. *"hey @NanoClaw thanks but actually can you also check X"* matches the `thanks` regex, reacts 👍, and silently drops the actual request. Typos, phrasing variants, and mixed intent all leak through.

The Phase 2 answer was to put Haiku itself in the routing seat. Haiku 4.5 is roughly 1/100th the cost of a Sonnet spawn and 1/500th of an Opus spawn. At those rates, it's cheap enough to be the *router and the answerer*, not just a classifier.

The runtime flow:

```
inbound msg
  → bot-mute / access-control / per-thread rate-limit         (existing)
  → deterministic shortcuts (Phase 1, 0-cost — keep for the unambiguous cases)
  → Haiku triage (Phase 2)                              [~$0.0006/call, measured]
      ├── direct_answer:  Haiku writes the reply itself, no container spawn
      ├── cache_lookup:   host-side script reads a local cache (calendar, Tasks DB,
      │                    slack-cache, etc.), formats the reply, no container spawn
      └── full_agent:     fall through to container — model-router picks Sonnet/Opus
```

The classifier prompt is intentionally narrow. Haiku gets a 600-token system prompt enumerating the three intents, the recognized cache-lookup targets (`next_meeting`, `today_tasks`, `slack_thread_summary`, etc.), and a few hard rules:

- *"If the message asks you to DO something (send, post, write, file, schedule, delete, modify), intent = full_agent."*
- *"If the message contains the phrase 'use opus', intent = full_agent."*
- *"If unsure, intent = full_agent (better to over-spawn than under-answer)."*

Response shape is forced JSON: `{intent, response?, target?, confidence: 0.0-1.0}`. Below a 0.85 confidence threshold the message falls through to a full container spawn. Five hard guards short-circuit *before* the Haiku call even fires: admin sender (Aki — his messages are complex by default and bypass triage entirely), bot senders (no cross-talk), messages over 200 characters, messages matching tool-requiring verbs (`send|post|write|file|schedule|delete|modify`), and MPIM channels.

Three properties make this work as a cost lever specifically:

**Haiku is cheap enough to be wrong.** A misclassification costs us $0.0006 plus a follow-up container spawn (~$0.10). At those numbers, the "if unsure, full_agent" rule has near-zero downside — over-spawning is much cheaper than under-answering. Compare to a classifier that costs the same as the spawn it's replacing: there's no asymmetry, the lever evaporates.

**The cache-lookup intent unlocks a *new* response class.** "What's my next meeting?", "what's on my Tasks DB for today?", "summarize this thread" — these are all questions whose answer already exists in a local cache. A full container spawn pays an Opus or Sonnet bill to do what amounts to a SQLite read + a `printf`. The triage layer routes those to a Python script that does exactly the SQLite read and the printf, with Haiku composing the natural-language wrapper. The container is bypassed entirely.

**Shadow mode makes the rollout debuggable.** Phase 2a ships the triage layer with the bypass switch OFF — every classification decision logged to `data/haiku-triage-decisions.jsonl`, every message still flowing through to a container. After a week of logs, we'll see exactly which classifications would have short-circuited correctly and which would have produced a wrong answer. The flip from shadow to live is gated on the measured false-positive rate being under 5%. If the data says it's higher than that, we tune the prompt or the threshold before flipping — no production user sees a bad answer.

Conservative projection from the design doc, after measured per-call cost ($0.000577 for the live test): ~$220-360/month. Higher-volume estimate, once Phase 2b is well-tuned: ~$375/month. Combined with Phase 1's deterministic shortcuts (which catches the absolute-cheapest at $0): ~$400-500/month from the routing layer alone.

The wider pattern is *small models as workflow primitives*. Treat the cheap model not as a worse version of the strong model, but as a different kind of component — a router, a triage gate, a formatter, an oracle for "is this even worth spawning the strong model for?" The cost structure makes them effectively free for that role, and the asymmetry between miss cost (a follow-up spawn) and hit value (a full spawn avoided) does the rest.

#### What's left, and what we learned

Three meta-lessons worth keeping:

**Observability is the entire game.** Every fix in this list came after a measurement told us where the cost was hiding. We had MTD totals and cache-hit rates from day one, but no per-spawn attribution, no per-channel volume, no per-tier breakout, no spawn-level cost alerts. The first day of the investigation produced almost no fixes — it produced the *audits* that produced the fixes the next day.

**Tier-aware pricing should be tracked from day one.** Anthropic's pricing has multiple axes: model, context tier, cache state. Our tracker collapsed all of them into a single per-model rate. Fixing it took 90 minutes of careful work + 58 tests, but the cost of *not* fixing it was a 26% silent under-reporting on the bill we use to make capacity decisions. If you build a tracker on day one, build it tier-aware.

**Conservative defaults beat optimistic defaults.** The `skill_detected → Opus` shortcut was an optimistic default — "skills imply complex reasoning, so route them to the best model." In practice, most skill invocations are routine. Conservative defaults — Sonnet for skills, with an explicit Opus opt-in for the few that genuinely need it — saved more than the boundary tuning ever would. The same logic applies to the 1M-context tier: it's a flag you opt into for the rare conversation that needs it, not a default.

The system itself reviewed this draft in Notion before publication. The next part covers what happens after cost is under control — the question that's harder than "how much does it cost" is "what do we want it to do."

#### June 2026 — second act: the router invert and the long tail

Three weeks after the May postmortem shipped, the bill started creeping again. On 2026-06-05 the daily total was $454 — over the $400 ceiling — and the trailing 7-day mean was $407 vs the $333 sustainable target. The lever set from May was still active and still working; the May fixes hadn't regressed. What had grown underneath them was a different shape of cost, hidden in a different blind spot.

A Friday-evening sub-agent (`data/state/cost-optimization-deep-think-2026-06-05.md`, read-only) walked the per-spawn telemetry and found one structural issue dominating everything else: **67.9% of all spawn cost was flowing to scheduled tasks, and every single scheduled-task spawn was running on Sonnet**. The code comment in `src/model-router.ts` said *"Scheduled tasks default to haiku"*; the actual scoring path escalated to Sonnet whenever `score > HAIKU_BOUNDARY`, which it usually did. The comment was aspirational. The behavior was the opposite.

##### The single Monday action

Commit `52a037640` — *invert scheduled-task default Sonnet→Haiku (cost-opt P1)* — flipped the default and added three explicit escape hatches. Scheduled tasks now run Haiku unless one of these matches:

- A `MODEL: SONNET` directive in the task body (explicit opt-in for routine tasks that genuinely need it)
- A skill match against `SKILL_OPUS_ALLOWLIST` (commission, redline, premortem, etc. — caps at Sonnet, not Opus)
- A content match against `OPUS_BOOST_RE` (cross-reference, deep-dive, tradeoff language — also Sonnet, capped)

Rollback is a one-line env var: `NANOCLAW_SCHEDULED_HAIKU_DEFAULT=0`.

The live evidence in `logs/model-routing.jsonl` is unusually clean:

```
2026-06-07T08:45:27.117Z reason=skill_detected tier=default
2026-06-07T08:50:13.435Z reason=skill_detected tier=haiku
```

Every 15-minute scheduled-task fire before the merge logged `tier=default`. Every fire after logged `tier=haiku`. No gradual shift, no edge cases — a hard line right at the merge point.

##### The compounding layers

The same day, `feat/cost-levers-b1-i1-i2` (commit `faaf77621`) landed three more levers on top of the inverted default:

- **B1 — `SKILL_HAIKU_LIST`**: an explicit Haiku-class skills allowlist, counterpart to the existing `SKILL_OPUS_ALLOWLIST`. 29 skills enumerated — cache, sync, cleanup, monitor, distill. `skill_detected → default` was the second-biggest leak at 4,258 spawns over 14 days; this routes the deterministic-ETL portion of that bucket to Haiku.
- **I1 — admin-channel hard-cap**: any spawn with `chatJid` matching the admin channel forces Haiku unless a skill match wins. The admin channel exists for terse alerts (Pattern #30: 1-2 sentences max); Sonnet-level reasoning is wasted there.
- **I2 — notion-webhook hard-cap**: same shape as I1, for the Notion webhook surface. "Summarize this page" queries get Haiku.

And the cron tune (F1, host-side, not part of the commit) deduplicated three identical `short-window-crash-rate.sh` lines and bumped four `*/5 * * * *` monitors to `*/15` or hourly. Zero direct Anthropic cost — but it cuts host CPU and reduces the cron-driven scheduled-task fire rate.

##### The dispatch-order fix

A second branch the same week — `feat/dispatch-p-code-first` — was unrelated to the router but adjacent in shape. The Tasks DB executor was sorting candidates by `min(tier_score, label_score)`, which meant Tier dominated. With 30 P1s in the backlog, a P1 Tier-5 (research) item would lose dispatch order to a P2 Tier-1 (ops) item. Aki's exact question: *"does it automatically go from p0 to p1 etc?"* The answer, until that commit, was no — it went tier-first.

The new ordering: P-code dominates, T0 incident hard-overrides everything, tier is a tiebreaker, last-edited is FIFO. Rollback via `NANOCLAW_DISPATCH_LEGACY_TIER_SORT=1`.

##### Two meta-lessons

**Code comments lie when they're aspirational.** The scheduled-task code's comment said *"default to haiku"* but the actual flow escalated to Sonnet on >50% of cases. The comment described the *intent*; the audit had to find the *behavior*. Read the spawn logs, not the source.

**A one-day deep-think shipped $1,400-1,600/wk savings; the marginal next-lever would have shipped ~$50-100/wk.** Same arc as the May 17 work — the first 30% of effort captures 80% of the value, and then yield collapses. Pattern #35's stopping rule applied: stop iterating when the next retro produces only "things to monitor" rather than ship-able fixes.

##### Projected impact

Pre-fix 7-day mean was $407/day. Post-fix projects $200-250/day after a 24-48h settle. Yesterday (2026-06-06) was already $74 — an 84% drop from the $454 peak — *before* the router invert engaged at 08:49 UTC this morning. The fixes will compound through the week.

##### What's queued, not shipped

The 2026-06-07 additional-levers analysis surfaced four more candidates, scoped for next week:

- **C1 — CLAUDE.md eager-load trim** (~$60-100/wk). The file is 76,938 chars × 3,529 spawns/14d = 67M cache-create tokens. Most of the patterns can move to `docs/CLAUDE-DETAILS.md` with one-line summaries left in place.
- **E1 — Wall-clock auto-resume max-N cap** (~$25-40/wk). 78 spawns ran >1700s in 14 days; a cap-at-2 on auto-resume saves roughly 30% of the wall-clock-halt tail.
- **G1 — Tool-loop early-abort** (~$80-120/wk). Same-tool >15× in 10 minutes → abort with a scope-reduction request. Targets the top-decile spawns that account for 73% of cost.
- **I3 — Force-Haiku per-task DB UPDATE** (~$150-200/wk). Prepend `MODEL: HAIKU` to every `scheduled_tasks` row whose prompt doesn't already specify a model.

A Gemini Flash adapter spike is deferred to 2026-06-21 evaluation. The quality-parity bar for routine ETL is ≥95% — worth running, but only if B1+C1 haven't already closed the gap.

##### What we still can't see

Per-rep / per-skill / per-Tasks-DB-row spawn attribution is partial. The cost-opt sub-agent had to back-of-envelope a lot of the per-skill numbers from regex matches against task prompts. Building cleaner attribution — a `skill_id` and `task_id` column on every cost-telemetry row, plumbed through the credential proxy — remains the next observability follow-up. *Observability is still the entire game.* The May postmortem fixed one layer of it; this round needed another.


---

### [Lesson] Monitors & Alerts — Catching What You Can't Prevent
**Published:** 2026-05-18 · **Source:** `bitsafe-ai-docs/docs/articles/07-monitors-and-alerts.md`

This is Part 7 of BitSafe's NanoClaw case study series. Parts 1-5 covered architecture, autonomy, and the daily working pattern. Part 6 was a cost-discipline postmortem: the observability gap that let the bill grow past plan and the layers we built so it can't again. Part 7 generalizes that lesson. Every line of automation that doesn't tell you when it's broken *is* broken — eventually, silently, in a way that's expensive to discover. This part walks through the four signal channels NanoClaw uses to surface what crons and monitors find, the real incidents that taught us the gaps, and the prevention layers we've now wired in.

The framing point first. A "monitor" in a humanly-operated system is a graph someone looks at. In an autonomously-operated system, where most of the actors are not humans, a monitor has to be a *message that arrives in front of a person who can act on it*. If the graph exists and no one's watching it, it might as well not exist. The work of the last few months has been less about adding checks (we already had dozens) and more about making sure the checks **surface** to a place where the right person sees them, in a form that's distinguishable from noise.

#### The four signal channels

Every cron, monitor, or recurring analysis in NanoClaw produces an output. We classify each by where that output goes, because the failure mode is different at each layer:

**Channel 1 — Alarms.** Time-sensitive, actionable findings that need a human (or another agent) to react now. Implementation: `scripts/ping-aki.sh --to admin --source <name> --severity warning|critical`, which posts to `#ai-projects-nanoclaw-admin` with an `@` mention. Cooldown-gated (typically 6h) so a stuck condition doesn't carpet-bomb the channel. Examples: `warm-pool-alarm` when no warm container is available for incoming work, `stale-tasks-alarm` when a scheduled task hasn't fired in its expected window, `env-perms-alarm` when `.env` ownership drifts and the service can't read its own secrets, `restart-churn-alarm` when the systemd unit has bounced more than 20 times in a day. The audience is the on-call human, which is almost always Aki (and now sometimes Kadeem). When this channel fires, *someone is supposed to drop what they're doing*.

**Channel 2 — Reports.** Analyses that produce a structured document for periodic review. Implementation: the script writes a Notion page in the NanoClaw pillar of the workspace, with a dated title (`Blocked Tasks Triage — 2026-05-18`, `Admin Text Backfill — 6 weeks — 2026-05-18`, `Origin Branch Cleanup — 2026-05-18`). The page contains classification counts, sample rows, and one-click links to the underlying items. Cron-driven (weekly or monthly), so the rhythm matches the audience's attention. When this channel fires, *the human looks during a planned review window*, not immediately.

**Channel 3 — Status digest.** The catch-all daily dashboard. A scheduled task named `monitor-daily-dashboard` fires at 09:00 UTC, calls `buildDashboardPrompt()` in `src/monitor.ts`, and renders sixty-plus health checks (cost vigilance, sync staleness, CI/CD pipeline status, container error rate, scheduled-task drift, audit-log anomalies) into one Slack message in the admin channel. This is the "running gauge" view: nothing's screaming, but here's where every monitored signal currently sits. When this channel fires, *the human scans for red and yellow chips*, looking for the latent drift the alarm thresholds were tuned not to catch.

**Channel 4 — Forensic logs.** Everything else. `/root/nanoclaw/logs/<x>.log`. These are write-only most of the time; nobody reads them unless investigating a specific symptom. They exist for the case "something feels wrong, let me check what the last 24h of cron output looks like." Useful when needed; mostly invisible otherwise.

The pattern is hierarchy: most actionable to least actionable, most time-sensitive to least. Every recurring analysis picks exactly one channel as its primary surfacing path, and ideally a second as backup.

#### The gap class: silent failures *of the monitors themselves*

Here's where it gets recursive. A monitor that has been silently broken for a week is worse than no monitor at all — it gives you the false confidence of "I'd know if something were wrong." Through May 2026 we found multiple instances of this exact shape:

- `worktree-auto-reaper` was running on a daily cron, but its commit had flipped only the *doc mirror* of the cron line, not the live `/etc/cron.d/nanoclaw`. The live cron continued running in `--dry-run` mode for two weeks. The reaper produced clean log output saying it "would" delete merged worktrees. Sixty-six orphan worktrees accumulated.

- The Anthropic MTD tracker's `last_updated` field hadn't moved in 18 hours when we last checked. The daily sync cron had silently failed (likely a Google Drive auth refresh issue). The dashboard correctly showed the MTD number — but the number was 18h stale, and the over-reporting from a separate tier-pricing bug compounded the staleness invisibly.

- Five EACCES test failures in `container-mounts-cheatsheet.test.ts` had been failing every dev-deploy CI run for more than 24 hours. The CI fired correctly. The tests ran correctly. The result was correctly reported as "failure." But no monitor watched the *aggregate dev-deploy success rate*, so nobody noticed the pipeline had stopped advancing.

The class is: each individual layer is technically working. The integration — *did anyone notice that the layer was working but the work wasn't getting done?* — was the gap.

#### The silent-failure layer

This is where we landed after the May postmortems. Two new monitors, both rendering into the daily dashboard, both backed by a script + cron entry, both intended to surface the *meta-question*: "are the things that are supposed to run, actually running?"

**Cron-success check.** Reads `/etc/cron.d/nanoclaw`, parses each line for its expected interval and its `>> <log>` redirect target, and confirms each log file's mtime is fresher than `interval × 1.5`. If `warm-pool-alarm.sh` is supposed to run every 5 minutes and its log hasn't been touched in 401 minutes, that's flagged. If `arq-sleep-detector` is supposed to run every 90 minutes and its log is 18,518 minutes (~13 days) old, that's flagged. On a single ship-time run, this check found **eleven stale cron log redirects** — every one a script that was supposed to be running and wasn't. Eleven. The framing point above is not theoretical.

**State-file freshness check.** Reads a config at `data/state-file-cadences.json` mapping each `data/*-state.json` file to its expected refresh cadence, then checks each file's mtime against that cadence. State files are where most NanoClaw scripts persist their "last successful run" timestamp; a stale state file means the script either failed to complete or didn't run at all. The same ship-time run found **seventeen stale state files**, with the worst at 651 hours (twenty-seven days) old.

Both checks render into the daily dashboard with red/yellow/green chips per flagged item. Both are about to get a second surfacing path: a threshold-based admin ping at the moment new flags appear (cooldown-gated, same pattern as `warm-pool-alarm`), so a fresh silent failure doesn't have to wait up to 24h for the daily digest to surface it.

#### The handled-check layer

Even with surfacing fixed, there's a downstream question: when an alarm lands in the admin channel, did anyone *act* on it? Or did it scroll off the top of the channel while everyone was busy?

The pattern we're adding is a weekly "handled-check" sweep. A script reads the last 7-14 days of `#ai-projects-nanoclaw-admin` messages, filters to alarms/reports posted by bots (admin-bot, the various `nanoclaw-*` alarm sources), and classifies each as HANDLED or UNHANDLED. The classifier is heuristic but concrete:

- A human reply in the thread within 24 hours → HANDLED
- A Tasks DB row references the alarm (search by alarm source / id) → HANDLED
- A commit or branch on origin mentions the alarm topic within 48 hours → HANDLED
- The underlying condition has cleared (e.g., the stale cron is now running again) → HANDLED
- None of the above → UNHANDLED

UNHANDLED items get a weekly Notion report listing the permalinks. If the count crosses a threshold (default: 3), it pings admin with a one-line digest. This is the closing-the-loop layer: alarms get into the channel, the channel gets monitored, and unhandled alarms get surfaced as *their own* second-order signal.

#### The action-items extraction layer

There's an inverse problem that lives in the same neighborhood. When admin-bot produces a substantive technical reply — a research finding, a recommendation table, a postmortem with action items — those items frequently lived in the Slack thread and never made it into the Tasks DB. The recommendations were structurally there ("Layer | What to do | Why" tables) but no parser was extracting them.

The fix is two-sided. First, admin-bot's response template now requires an `## Action items filed` section at the end of every substantive reply, enumerating the Tasks DB rows it created (with permalinks) — or stating "Informational only, no action items" explicitly. Second, a belt-and-braces post-hook scans admin-bot's outbound messages for recommendation patterns (tables, "should X" verbs, imperative lists) and creates Tasks DB rows for anything the response-template change missed.

Together with the handled-check above, the loop closes on both sides:
- Tasks get *filed* when they're created (user → admin-bot direction caught by audit-mentions; admin-bot → recommendations caught by the response template + extractor).
- Tasks get *followed up on* when they sit unhandled (handled-check sweep).

Neither layer is glamorous. Both layers are the work of making sure the system doesn't quietly drop things.

#### The threshold-ping pattern, generalized

A meta-rule from all of the above: any recurring analysis whose primary output is a Notion page or a dashboard chip needs a *second* surfacing path keyed off a threshold. The Notion page is where the human goes to *read*; the threshold ping is what *causes* the human to go read.

The pattern is:

1. Compute the finding count (new flags, new unhandled items, new pending substitutions, new whatever)
2. Compare against the last-success state file: how many of these are NEW since the last alarm fire?
3. If `new_count > threshold` AND `last_alarm_fire > cooldown` → fire ping-aki with a one-line digest
4. Update the state file

Across NanoClaw today this pattern is wired into: warm-pool-alarm, stale-tasks-alarm, env-perms-alarm, restart-churn-alarm, the cross-post leak monitor, the bulk-send guard monitor. It's about to be wired into the silent-failure monitors and the deterministic-flows monthly audit. The shape is repeatable enough that it should probably be a shared helper function rather than re-implemented per script.

#### What's left

This part of the case study describes a system that's still becoming what it's meant to be. The pieces we have shipped today:

- The four-channel signal taxonomy (alarms, reports, status digest, forensic logs) is in production and documented
- The CI/CD pipeline monitor (ten sub-checks) catches what every other layer didn't catch about deploy pipeline health
- The silent-failure monitors (cron-success, state-file-freshness) catch what every other layer didn't catch about *the rest of the layers*
- The handled-check sweep is filed and spec'd; ships this week

The pieces we're carrying forward:

- Threshold-ping on the silent-failure monitors (closes the up-to-24h surfacing gap)
- A shared `surfacing.fire_threshold_ping(name, count, threshold, cooldown_h)` helper so we stop re-implementing the same five-line pattern
- The action-items extraction layer (response template change + post-hook scanner)
- The admin-channel handled-check loop

The bigger lesson — the one Part 6 named and Part 7 generalizes — is the same: the system gets better not by adding checks, but by making sure the checks are *surfacing in a way the right human can't miss*. Visibility isn't a feature you build once. It's a property you have to keep proving the system still has.

---

**Related reading inside this case study:**
- [Part 2: Architecture](02-architecture.md) — how the host + container split shapes which layers can monitor which surfaces
- [Part 4: Substrate](04-substrate.md) — why Notion + SQLite is the right backbone for the daily digest + report-page pattern
- [Part 5: Working with NanoClaw](05-working-with-nanoclaw.md) — the human side: what changes when alarms become reliable
- [Part 6: Cost Discipline](06-cost-discipline.md) — the cost-vigilance dashboard that became the template for the rest of the surfacing layers


---

### [Lesson] Capability Coverage & Harness Guards — Why the Model Shouldn't Have to Remember What It Can Do
**Published:** 2026-06-10 · **Source:** `bitsafe-ai-docs/docs/articles/08-capability-coverage-and-harness-guards.md`

This is Part 8 of BitSafe's NanoClaw case study series. Part 7 was about catching what you can't prevent — surfacing the failures of an autonomous system to a human who can act. Part 8 is about a quieter failure that doesn't trip any alarm: the system *has* a capability, and doesn't use it. The skill exists. The data source is indexed. The tool is wired. And the agent answers "I can't do that," or worse, answers from a number it half-remembers from three weeks ago.

We call this **capability-blindness**, and it turned out to be the dominant failure mode once the system grew past a few dozen skills. Everything below is the set of patterns we landed to fight it — plus two adjacent lessons (guards over memos, and the ephemeral console) that come from the same root principle.

> The less the model has to hold in its head, the less brittle the system is. Decentralize, and force tool-use at the point of need.

#### The capability-blindness problem

An agent system that does one thing can rely on the model knowing how to do that one thing. An agent system with hundreds of skills, dozens of indexed data sources, and a growing MCP surface cannot. The naive design — list every capability in the system prompt and trust the model to recall the right one — fails in three compounding ways:

1. **The list is too long to fit.** Past a certain size, "here is everything you can do" doesn't fit in the budget you're willing to spend on every single turn. So you trim it. The moment you trim it, the model is blind to whatever you trimmed.
2. **Recall is probabilistic.** Even when a capability *is* in context, the model doesn't reliably reach for it. It pattern-matches to "I'll write a quick script" instead of "there's a skill for this," because writing a script is the more common shape in its training. The capability exists and the model rolls its own anyway — slower, buggier, and inconsistent with how the rest of the system does that job.
3. **Memorized facts go stale.** This is the subtlest one. If the system prompt says "concurrency is 10" and the real config is 15, the model will confidently quote 10. The number was true when someone wrote it down. It is a lie now. A system that hard-codes its own facts into the prompt is a system that lies with increasing confidence as it ages.

The robust answer to all three is the same: **don't make the model remember. Make it discover.**

#### Discovery, not memorization

The fix has four moving parts, and the design intent of each is to move a fact *out* of the model's head and into a place that's queried fresh.

**An intent-indexed catalog.** Instead of a flat dump of every skill, the catalog is keyed by *intent* — "writing to the wiki," "searching across sources," "posting a status update" — and the agent is instructed to consult it at the point of need, not to memorize it. The entry for each intent points at the one right way to do that job. This collapses problem (2): when the agent is about to write to the wiki, the catalog says "use the wiki-writer, here's how," and the model reaches for the tool instead of reinventing it. The catalog is small enough to consult cheaply and complete enough to be authoritative.

**Auto-discovered data sources.** The list of "what can I query" is not hand-maintained in a prompt. It's derived at runtime from what actually exists — the indexes that are present, the caches that are populated, the MCP servers that are reachable. A data source added last week shows up because it's *there*, not because someone remembered to add a sentence about it to the prompt. The corollary: a data source that quietly broke shows up as broken, instead of being silently claimed as available because the prompt still mentions it.

**An MCP surface, forced at the point of need.** Tools live behind a uniform protocol surface rather than as prose instructions. The agent is pushed to enumerate and call them rather than to recall whether they exist. "Forced at point of need" is the operative phrase: the catalog and the tool surface are consulted *when the agent is about to act*, not loaded once at the top and hoped-to-be-remembered fifty turns later.

The principle underneath: a capability the model has to remember is a capability the system can lose. A capability the model discovers is one the system keeps as long as it's actually wired up.

#### The session-start self-test

Discovery handles "what can I do." A second mechanism handles "can I actually do it right now." At the start of a working session, the system probes each *category* of capability for reachability — can it read the knowledge base, reach the search index, hit the calendar, call the deploy surface — and reports the result.

This matters because the gap between "the capability is configured" and "the capability works right now" is where a lot of wasted effort lives. An agent that spends ten turns trying to use a data source whose auth token expired this morning is worse than an agent that knew, at turn zero, that the source was down and routed around it. The self-test turns a slow, mid-task discovery of brokenness into a fast, up-front one. It's the same instinct as a preflight checklist: you don't find out the instruments are dead after you've taken off.

The self-test is per *category*, not per individual capability — probing all of them on every session start would be too expensive, and category-level reachability ("can I reach the search layer at all") catches the failures that matter. When a category comes back unreachable, that's a signal worth surfacing, exactly the way Part 7's monitors surface a broken cron.

#### The drift-detector: query facts, don't memorize them

The third mechanism closes the loop on problem (3) — stale memorized facts. The rule is blunt: **anything that changes — a rate, a count, a config value, a balance, a status — is queried live at the moment it's needed, never recited from memory.**

A memorized number is a landmine with a delay fuse. It was accurate when written. Every day after, the probability that it's still accurate decays, and the system has no way of knowing it's decayed because the number sits there looking just as authoritative as the day it was true. The drift-detector pattern is the refusal to trust that look: when an agent is about to quote a live fact, it goes and gets the current value, and if it can't, it says so rather than falling back to a remembered one.

This is the inverse of the institutional-memory pattern from Part 5. *Settled* knowledge — how we work, what a rule means, why a decision was made — belongs in propositional memory, written down and heeded. *Live* facts — numbers that move — belong nowhere near memory; they belong at the end of a query. The skill is telling the two apart. "We don't talk to customers" is a durable rule; keep it in memory. "Concurrency is set to N" is a live config; query it. Writing the second kind into memory is how a system starts confidently misinforming the people who rely on it.

> Settled knowledge goes in memory. Live facts go at the end of a query. Confusing the two is how a system learns to lie politely.

#### Harness guards over memos

The capability work has a sibling lesson, and it comes from watching which corrections actually stuck.

When the system did the wrong thing — reached for the wrong tool, took an action it shouldn't have — the first instinct was always to write it down. A memory file, a line in the operating doc, a note in the relevant skill: *don't do X.* And for a class of mistakes, that works: a written rule, loaded at session start and heeded, is exactly the propositional-memory loop that makes the system get less wrong over time.

But some rules kept getting violated *despite* the memo. We'd write "don't do X," and weeks later something did X anyway — a different agent, a different code path, the same mistake. The memo taught; it didn't enforce. And the thing about a probabilistic actor is that "taught, but not enforced" eventually means "did it anyway."

The pattern we landed on isn't a one-off decision — it's a **recurring pipeline that converts memos into guards.** Rules don't get born as guards; they get born as memos, and the ones that earn it get *promoted*.

**Every rule starts as a memo.** Writing a rule down is cheap — a sentence in a doc, a line in the operating manual, a note in a skill. That's the right first move, because most rules are obeyed once written, and you don't yet know which ones won't be. The memo layer is fast, low-cost, and infinitely flexible. Its weakness is the one above: it *teaches* but relies on a probabilistic actor remembering to heed it.

**A recurring review asks which memos have earned a guard.** On a regular cadence, the system looks back over what actually went wrong and asks two questions of each recurring violation: *(a) is this rule being broken often enough to matter,* and *(b) can it be guarded* — does the wrong move map to a detectable action shape that a guard could intercept? A rule that's frequently violated *and* mechanically detectable is a promotion candidate. A rule that's violated but inherently a judgment call (it depends on context a guard can't see) stays a memo and gets a clearer one instead.

**Promotion moves the rule from teaching to enforcement.** When a rule clears both bars, it's converted into a harness-enforced guard — a pre-action block that intercepts the wrong move at the moment it's attempted, a pre-commit check that refuses the bad change, a session-start injection that puts the constraint in front of the agent before it can act. The guard does what no memo can: it makes the wrong action *impossible*, not merely *discouraged* — every time, regardless of which actor is at the keyboard or how the model is feeling that turn.

So the two layers have distinct jobs. **The memo layer is the staging ground** — where every rule lives first, cheaply, while the system learns whether it holds on its own. **The guard layer is the enforcement floor** — where the rules that proved they couldn't hold on memory alone get made mechanical. The memo teaches; the guard enforces; and the pipeline between them is the thing that keeps running. The test of a mature rule becomes a single question: *is this still just a memo, or has it earned a guard?* A rule that's been violated once after being written down is a teaching problem — maybe the memo was unclear. A rule that's been violated *repeatedly* is an enforcement problem, and that's exactly the signal the review watches for. The cost of a guard is real — you have to build it, and an over-eager guard blocks legitimate work — so you spend it only on the rules that have earned it by recurring.

The deeper reason to keep grinding rules through this pipeline is the same principle that runs under the whole article: **the less the system keeps in memory and the more it holds in guards, the less brittle it is** — because a guard doesn't depend on anyone, model or human, *remembering* it. A memorized rule is only as reliable as recall under load. A guard holds whether anyone remembers it or not. Every promotion is one more constraint that no longer rides on the fragile hope that the right thing will be recalled at the right moment.

> Memos teach; guards enforce; the pipeline between them is what matters. The less a system keeps in memory and the more it holds in guards, the less brittle it is — because a guard doesn't depend on remembering.

#### The console is ephemeral

The third lesson is about *where work lives* while it's being done, and it's the most operationally important of the three.

The interactive console an operator drives — the session where a human is steering the agent — is disposable. It can be killed, it can crash, the machine can reboot. Treat it as if it could disappear at any moment, because it can. The test for whether something is safe to leave in the console is one question:

> If this session were killed right now, would anything be lost?

If the answer is yes, that thing is in the wrong place. The fix is to *decentralize* it — to push it out of the ephemeral session and into a durable store before the session ends:

- **Code → version control.** A commit (or a pushed branch) survives the session; an uncommitted edit does not.
- **Documents, reports, findings → a durable store.** A written page in the workspace survives; a paragraph that only exists in the conversation does not.
- **Tasks → a queue.** A filed task survives; a "remind me to do this later" said to the agent does not.
- **Scheduled or long-running work → cron / a supervised service.** A scheduled job survives a console death; a background process started *inside* the console dies with it.

That last one is the trap that taught us the rule. A recurring data pull had been set up as a background process living inside an interactive session. It worked — right up until that session was killed, at which point the recurring job simply stopped, silently, and a downstream alert quietly lost data with no error anywhere. Nothing was broken in a way a monitor could see; the work just stopped happening because the place it lived had vanished. Recurring or durable work belongs in cron or a managed service, never as a child of a session that's allowed to die.

What's *allowed* to live in the console is the work of the current turn: read the input, decide, act, report, and — critically — make sure the durable artifacts (the commit, the page, the filed task, the cron entry) exist before the turn ends. Swarms of sub-agents are fine *because they commit their work to version control* — the commit is the durable artifact, not the agent. The session is a workspace, not a vault. Anything you'd be sad to lose has to be written somewhere that outlives the workspace.

#### The common root

These three patterns — discovery over memorization, guards over memos, the ephemeral console — are the same principle wearing three coats.

A capability you have to *remember* is one the system can lose. A fact you *memorize* goes stale and misleads. A rule you only *document* gets violated anyway. Work that lives *only in the session* dies with it. In every case, the brittleness comes from trusting a single, fragile, in-the-moment place — the model's recall, the prompt's stale text, the operator's discipline, the live session — to hold something the system depends on.

The robust move is always to push that something *out* into a place that's queried fresh, enforced mechanically, or persisted durably: a catalog the agent consults at point of need, a live query instead of a memorized number, a harness guard instead of a memo, a durable store instead of a session. The less the system keeps in any single brittle place, the more of it survives the inevitable moment that place fails.

It's the same lesson Part 7 ended on, generalized one more level. There, the point was that a check is only as good as its surfacing. Here, the point is that a capability is only as good as the system's ability to *find and trust* it under real conditions — not under the conditions that held the day someone wrote the prompt.

---

**Related reading inside this case study:**
- [Part 2: Architecture](02-architecture.md) — the schema-as-perimeter idea is the structural cousin of harness guards
- [Part 3: The Autonomous Engine](03-autonomous-engine.md) — the loops and CI/CD that the ephemeral-console rule keeps honest
- [Part 5: Working with NanoClaw](05-working-with-nanoclaw.md) — propositional memory for settled knowledge, the counterpart to querying live facts
- [Part 7: Monitors & Alerts](07-monitors-and-alerts.md) — surfacing what you can't prevent, the sibling discipline to discovering what you can do


---

### [Lesson] Guard Parity — A Guard Only Protects Where It's Wired
**Published:** 2026-06-16 · **Source:** `bitsafe-ai-docs/docs/articles/09-guard-parity.md`

This is Part 9 of BitSafe's NanoClaw case study series. Part 8 made the case for *harness guards over memos*: when a rule keeps getting broken, you stop writing it down and start enforcing it in the mechanism, because a memo is policed by the same fallible process that produces the violation, and a guard is not. This part is about the failure mode that lives one level up from that lesson. You did the right thing — you moved the rule into a guard. The guard works. And the violation happens anyway, because the guard was wired into one actor's path and the actor that broke the rule runs somewhere else.

The framing point: in a system with more than one kind of actor, "we have a guard for that" is only true per-actor. A guard is not a property of the system. It is a property of the code path it sits in. If you have two code paths and the guard is in one, you have half a guard — and the half you're missing is invisible, because the guard genuinely fires everywhere you look for it.

#### Two surfaces, two runtimes

NanoClaw runs two classes of actor. The **host loop** is the operator-facing session — the one a human drives, the one that dispatches work. The **container agents** are the sandboxed workers: one per task, running the model with a tool surface, doing the actual reading and writing and posting. Most of the work — almost all of it — happens in the containers. The host mostly decides and delegates.

Each surface has its own guard mechanism, and they are not the same technology. Host guards are declarative hooks wired in a settings file, implemented as small scripts. Container guards are callbacks compiled into the agent image, implemented in the image's own language. Different runtime, different config format, no shared code path. You cannot copy a guard from one to the other; you re-implement it. And the moment a guard requires re-implementation to cross the boundary, the default outcome is that it *doesn't* cross — someone adds it where they're working and moves on.

> A guard is not a property of the system. It's a property of the code path it sits in. Two paths, one guard, means half a guard — and the missing half is invisible.

So drift is not an occasional accident. Drift is the *default*. Every new guard starts life on exactly one surface. Staying single-surface is the path of least resistance, and nothing pushes back.

#### The incident that named it

We had built a guard whose whole job was to stop a specific bad reasoning habit: asserting a *cause* for a failure before running the cheap check that would confirm it. ("This credential is broken" — without probing the credential. "This is IAM-blocked" — without checking the token's scopes.) The guard fires on access/auth-failure tool results and injects a "verify first" interrupt before the model can rationalize. It worked well. It was wired into the host loop.

Then a container agent hit a failing push, declared the credential broken, and asked for a new one — the exact move the guard exists to stop. The credential was fine. The operator's reaction was reasonable: *the guard isn't working.* But it was working. It just wasn't running where the work happened. The guard lived in the host session's config; the agent that broke the rule was a container, which never reads that config. We had built the guard, verified the guard, and watched the guard do nothing — because "we have a guard for that" had quietly meant "the host has a guard for that" the whole time.

It recurred in a different shape within the same stretch. A fix to one content-writing helper — make sure the page body actually gets written, not just a truncated property — was correct and shipped. Its sibling helper, doing the same job through a different tool, had the same bug and didn't get the fix. A container agent used the sibling, reported "filed, with the full spec," and produced an empty page. Same root: a fix that protects one path is not a fix for the class. The mechanism-level lesson from Part 8 is necessary but not sufficient — you also have to make the mechanism *cover every actor*, and prove that it does.

#### Not blind parity

The naive correction is "put every guard on every surface." That's wrong, and the registry below is explicitly built to *not* do it. Some guards are correctly single-surface. The host has a guard that repairs environment-file permissions; containers are read-only and have no such file, so porting it would be meaningless. Containers have an egress firewall and a bash-sanitizer; the host's shell is operator-trusted, so those don't belong there. The point is not symmetry. The point is that every guard's surface coverage should be a *decision someone made on purpose and wrote down* — not an accident of where the author happened to be working.

That reframes the problem from "achieve parity" to "make the coverage decision explicit and enforce that it was made." Which is a thing software can check.

#### The registry and the drift-detector

The fix is a single catalog — one manifest that lists every guard with the surfaces it's supposed to run on, the implementation on each surface, and, for any guard that runs on only one surface, the reason. It's the same shape as the canonical roster pattern from earlier in the series: the fact lives in exactly one place, and everything else refers to it instead of re-deriving it.

The teeth are a continuous-integration check that reads the manifest and refuses the build unless three things hold. Every guard's *declared* surfaces have a *real* implementation present on each of them. Every guard *actually wired* on a surface is *present in the manifest* — so you cannot add a guard to either surface without registering it, which is the moment you're forced to answer "does this need the other surface too?" And every single-surface guard carries a written rationale. Add a guard to the container and forget the host, or forget to record why it's container-only, and the build goes red with the offending guard named.

This converts the invisible default (drift) into a loud, blocking, named event at the exact moment it's introduced. It is the same move as Part 7's silent-failure layer, applied to guards instead of crons: the absence of a decision becomes a signal. A refinement extends it to the rules themselves — the shared pattern lists a guard matches against (failure markers, sensitive-term lists) are pulled into one data file both runtimes load, so even the *contents* of a guard can't drift between surfaces while the code stays per-runtime.

#### The meta-lesson

Part 8 said: when a rule keeps breaking, move it from a memo into the mechanism. Part 9 is the necessary follow-on: a mechanism only governs the actors whose path it's in, so the mechanism that *keeps the mechanisms honest* has to be one a human can't forget to run. A memo that says "remember to add new guards to both surfaces" is exactly the kind of memo Part 8 told you not to trust — it's policed by the same person who's about to forget. The registry can't be forgotten, because the build won't go green until the coverage decision exists. The guard on the guards is itself a guard, not a note.

The general principle, for anyone building multi-actor agent systems: count your actors, and for every safety property you care about, ask not "do we have a guard for this" but "is this guard wired into every path that can violate it, and what enforces that it stays that way." The first question has a comforting answer that is usually a little bit false. The second one is the one that's actually load-bearing.


---

### [Lesson] The Completeness Trap — You Can't Audit Your Own Blind Spots
**Published:** 2026-06-18 · **Source:** `bitsafe-ai-docs/docs/articles/10-completeness-trap.md`

This is Part 10 of BitSafe's NanoClaw case study series. Part 8 said: when a rule keeps breaking, move it from a memo into the mechanism. Part 9 said: a mechanism only governs the actors whose path it's in, so make coverage explicit and enforce it. This part is about a failure that survives both of those disciplines. You built the mechanism. You wired it into every actor. The mechanism is a *filter* — it decides "safe" vs "needs review" by matching against a list of known-bad patterns. And it ships a bad thing anyway, because the list was missing a case, and the author who wrote the list was the same person who certified it complete.

The framing point: a denylist gate is a claim of completeness in disguise. "Block everything destructive" silently means "block everything destructive *that I thought of*." The gap between those two is exactly the set of things you didn't think of — which is, by construction, invisible to the person who wrote the list. You cannot audit your own enumeration, because the misses live in the same blind spot that produced them.

#### The gate that replaced a worse gate

The setup is a deploy pipeline. Most changes auto-promote to production after tests pass; a few "risky" files force a human review instead. The database-schema file was on that risky list — *any* change to it forced manual review. That coarse rule had a cost we'd felt repeatedly: a provably-safe migration (add a nullable column, idempotent) would sit blocked for hours, get re-created as duplicate branches, and burn cycles, all because the gate couldn't tell an additive column from a dropped table.

So we replaced the coarse gate with a content-aware one: classify the schema change. Additive and idempotent (add a column, create-if-not-exists, a new index) auto-promotes. Destructive (drop, rename, retype, row-rewriting updates and deletes) still gates to a human. The classifier reads the change and matches against a list of destructive SQL tokens. Better gate, real win — additive migrations now flow, dangerous ones still stop.

And in the code, in my own hand, was a comment asserting the token list "covers the full destructive surface — the denylist is complete, not a leaky band-aid."

> A denylist gate is a claim of completeness in disguise. "Block everything destructive" means "block everything destructive *that I thought of*" — and the gap is invisible to the person who wrote the list.

#### What "complete" was hiding

We did the responsible thing and handed the shipped classifier to an independent reviewer — a fresh agent, no memory of writing it, told to do one job: find a destructive change that the classifier calls safe. It found four in under a minute.

The token matcher ran line by line, but real SQL in our code is formatted across multiple lines — so a row-rewriting `UPDATE … SET` split over two lines matched neither line and sailed through as "safe." A comment-stripper meant to ignore SQL comments cut the line at the first `//`, which also appears in every URL (`http://`) — so any destructive statement after a URL on the same line vanished before matching. A whole class of direct schema-table manipulation wasn't enumerated at all. Each was a change an ordinary developer could write by accident, and each would have auto-shipped to production unreviewed. The "complete" comment was not a small overstatement; it was false in four independent ways, and I had written it with conviction.

None of these were exotic. They were obvious *once named*. That's the whole point: they were obvious to a second set of eyes and invisible to the first, and no amount of the first set of eyes looking harder would have changed that. Effort doesn't cure a blind spot. Only a different vantage does.

#### Two independent looks, not one harder look

The reviewer that found the four holes was still the same *kind* of model as the author. So even a clean adversarial pass isn't the end — a single model family shares correlated blind spots, the same way agreement between two data sources from one upstream pipeline isn't real corroboration. After fixing the four, we handed the converged result to two models from *different* vendors and asked the same question: what did we miss? They surfaced no new false-safe — which, with the holes already closed, is the signal to stop hunting. But one of them flagged something the bug-hunt had skipped entirely: the gate logged every decision it made and nothing ever read that log. A live gate making auto-versus-review calls on production deploys, with zero visibility into what it was deciding. That became its own fix.

The progression matters. One independent reviewer catches the errors a confident author certified away. A *different-vendor* reviewer catches the errors the first reviewer's whole lineage shares. The first look fixes the bugs; the second look tells you whether to trust that the bugs are gone. Convergence first, then triangulate.

#### The meta-lesson

The trap isn't the missing case. The trap is the confidence. A denylist, a "we handle that," a "the enumeration is complete" — each is a self-certification, and self-certification of completeness is the one claim a system cannot make about itself, because the evidence against it is precisely the evidence it can't see. The fix is not to think harder before writing "complete." It's to never let "complete" be self-graded: prefer the safe-by-default direction (gate on anything not provably benign, so a miss fails toward review, not toward shipping), and route every completeness claim through an adversary who didn't write it — then through a second adversary who doesn't share the first one's mind.

For anyone building agent systems that gate their own actions: write down which of your safety checks are *allowlists* (safe unless proven otherwise) and which are *denylists* (allowed unless matched), because every denylist is a standing bet that your imagination of "bad" is complete. It isn't. Budget for the adversarial review the way you budget for tests — and make at least one of the adversaries a stranger.


---

## Code Factory MVP Spec — 24x7 Autonomous SDLC Pipeline
**Published:** 2026-05-25 · **Type:** forward-looking spec · **Source:** `bitsafe-ai-docs/docs/specs/code-factory-mvp-spec.md`

> 🏭 Code Factory: a 24x7 autonomous SDLC pipeline that turns ideas → research → specs → shipped code with minimal human babysitting. Patterned on NanoClaw's three-queue model (Research Queue → Task Queue → Ship Queue) and the safety rails we've battle-tested in production.

#### 1. Vision


A self-sustaining software factory where humans set direction and the agent swarm executes. Three queues run continuously; ideas flow in one side, shipped commits come out the other. Humans approve at high-stakes gates (spec sign-off, prod promote), the system handles everything else.


Core thesis from NanoClaw: the bottleneck isn't agent capability — it's queue discipline, state visibility, and reversibility. Get those right and throughput compounds.


#### 2. The Three-Queue Pipeline


##### 2.1 Research Queue (RQ)


Inbox for ideas, capability gaps, vendor evaluations, and *unknown skills*. Backed by a Notion database with: Topic, Why Relevant (verbatim source), Source URL, Priority (P0–P3), Status, Owner.


- Entry points: agents auto-file via suggest_research; humans drop links/notes; weekly review promotes high-signal items.
- Triage agent runs every N hours: dedups, scores, drafts a 1-page brief, flags decision-required items for admin.
- Promotion gate: approved items become specs (move to Task Queue); rejected items archive with reason.
##### 2.2 Task Queue (TQ) — the SDLC spine


Each task is a Notion row with SDLC-step checkboxes:


1. Spec drafted (acceptance criteria + test plan)
1. Spec approved (human or auto-approve for Tier-4)
1. Build started (worktree claimed, branch created)
1. Tests written + passing locally
1. PR opened + CI green
1. Code review (peer agent or human)
1. Merged to dev → 30-min smoke watch
1. Auto-promoted to prod (with exception-file gate)
1. Shipped (CHANGELOG trailer consolidated, ship-log entry posted)
Schema: Title, Spec (relation), Tier (1–4), Status, Owner agent, Blocker, Worktree branch, PR URL, Acceptance criteria.


##### 2.3 Ship Queue / CI/CD


- Dev VM auto-deploys every branch push. CI runs lint + typecheck + unit tests.
- 30-min smoke window watching journalctl on dev. Clean → auto-merge to main.
- Exception-file gate refuses auto-promote when high-risk files change (Dockerfile, DB schema, firewall, major dep bumps) — human-only path.
- Litestream replicates state DB to GCS continuously (~1s RPO). Weekly DR drill restores from replica.
#### 3. State Machine


```
idea → researching → spec_drafted → spec_approved → building → in_review → ci_green → on_dev → promoting → shipped
                                              ↓ rejected at any gate → archived (with reason)
                                              ↓ blocked → flagged-to-admin (ask-admin RPC)
```

#### 4. Agent Roles


- Triage — dedups RQ, scores priority, drafts briefs, escalates decision-required items.
- Spec — turns approved RQ items into Task rows with acceptance criteria + test plan.
- Build — claims a worktree, implements, writes tests, opens PR. Bounded turn budget; on overrun emits a rescope-handoff.
- Review — independent peer agent: checks acceptance criteria, runs tests, comments on PR.
- Ship — handles dev → smoke → auto-promote, consolidates CHANGELOG trailers, posts ship-log entry.
- Watchdog — heartbeat alarms, stuck-agent detection (max-turns / wall-clock / livelock), budget tripwires.
#### 5. Safety Rails (proven in NanoClaw)


- Worktree isolation — every Build agent works in its own git worktree; no in-place edits to shared repos.
- File-claim locks — claim_file / release_file prevent two agents racing on the same path; auto-expire after 25 min.
- Exception-file gate — Dockerfile, DB migrations, firewall rules, major dep bumps refuse auto-merge.
- 30-min dev smoke window — every promote watches dev journalctl for errors before merging to main.
- CHANGELOG trailers — agents write structured commit trailers; orchestrator consolidates on main (no merge conflicts on shared doc files).
- Bounded turn budgets — agents that hit cap emit a rescope-handoff JSON for auto-redispatch (depth ≤ 2, spend cap $5/chain).
- Severity-tagged alerts — critical/warning/info/debug routing keeps signal high in the admin channel.
- Bulk-send + cross-post leak guards — prevents fan-out hallucinations into wrong channels.
#### 6. Observability


- Heartbeat tasks for each queue (RQ depth, TQ in-flight, Ship velocity) — alert on drift.
- Daily ship log auto-posted to admin channel (commits shipped, items closed, blockers raised).
- Budget tripwires — Anthropic spend ≥80% (warning), ≥95% (critical).
- Stuck-agent detection — max-turns, wall-clock, livelock, heartbeat-stale fires page admin.
- Litestream + Sunday DR drill — RPO ~1s, RTO under 1 hour.
#### 7. Knowledge Layer


- Local SQLite caches for every read-heavy source (Notion, docs, repo code, chat history) — agents query in <100ms, never pay round-trip latency on hot path.
- Hourly cache refresh from canonical sources (Notion = source of truth for specs, GitHub = source of truth for code).
- Unified FTS5 search across all caches — agents discover prior art before reinventing.
- Skills DB (Notion → on-disk cache) — agent capabilities live as versioned skill docs; edit in Notion, sync hourly.
#### 8. MVP Scope (4 weeks)


### Week 1 — Foundations


- Notion DBs: Research Queue, Task Queue, Ship Log, Specs (all linked via relations).
- Pick one pilot codebase (small repo, <50 files, has tests).
- Set up dev VM + GH Actions CI for the pilot.
### Week 2 — Agent roles + state machine


- Triage + Spec agents writing to Notion.
- Build agent with worktree isolation + file-claim locks.
- Review agent gating PR merges.
### Week 3 — Ship pipeline + safety rails


- 30-min dev smoke watcher + auto-promote-to-prod.
- Exception-file gate.
- CHANGELOG trailer consolidation.
- Watchdog + heartbeat alarms.
### Week 4 — Throughput tuning


- Run end-to-end: 10 RQ items → 10 shipped commits with zero human intervention on Tier-4 tasks.
- Budget tripwires + ship log.
- Litestream + Sunday DR drill on factory state DB.
#### 9. Out of Scope (Phase 1)


- Multi-repo orchestration (start with one repo).
- Customer-facing features (factory builds internal tools first).
- Self-modifying factory (factory editing its own agent code) — defer to Phase 2.
- Cross-org PRs / external contributors.
#### 10. Open Questions


1. Which pilot codebase? (Suggest: a small internal tool we already maintain.)
1. Spec approval policy: auto-approve Tier-4 (doc / refactor / housekeeping)? Human-only for Tier 1–3?
1. Review agent: peer Claude, or different model for adversarial review?
1. Budget: target $/shipped-commit? (NanoClaw runs ~$X/day; factory's per-output cost should be lower as throughput rises.)
1. Failure escalation: ask-admin RPC for blockers, or queue for daily human review?
#### 11. Success Metrics


- Throughput: shipped commits / week (target: 10+ by end of Week 4).
- Human-touch ratio: % of Tier-4 commits shipped with zero human intervention (target: >90%).
- Cycle time: RQ entry → shipped (target: <48 hours for Tier-4, <1 week for Tier 2–3).
- Rollback rate: % of auto-promoted PRs that needed revert (target: <5%).
- Budget: $/shipped commit (track trend; should decline as throughput rises).
#### 12. Core Integrations


##### 12.1 Slack


- Inbound: humans drop ideas, paste links, give direction in a designated #factory channel. Trigger word wakes the Triage agent.
- Outbound: all agent comms (spec drafts, PR links, ship-log entries, heartbeat alarms) post to #factory or thread-reply to the originating message.
- Admin escalations: ask-admin RPC (blocks until human replies) vs ping-admin fire-and-forget — same two-surface model as NanoClaw.
- Guard rails: bulk-send guard (>3 external channels needs 3-of-3 approval gate), cross-post leak check.
##### 12.2 Notion


- Source of truth for: Research Queue, Task Queue, Ship Log, Spec docs, Skills DB.
- Agents write via Notion API (MCP). Reads prefer the local SQLite cache (hourly refresh); API only for writes and cache misses.
- Notion AI Q&A responder for ad-hoc queries against company knowledge (skills, specs, decisions).
- Skills DB: factory agent capabilities live as versioned Notion rows; on-disk cache refreshed hourly. Edit in Notion, not on disk.
##### 12.3 GitHub


- Build agent creates a branch + worktree, commits, opens PR. Authenticated via per-user PAT stored in Secret Manager (auto-configures gh CLI).
- GH Actions CI: lint, typecheck, unit tests on every branch push. Dev-deploy job fires on green.
- Review agent uses gh CLI to comment + request changes on open PRs.
- Ship agent merges via gh pr merge after smoke watch passes. Exception-file gate blocks auto-merge on high-risk files.
- Source cache: repo code indexed to local SQLite for fast symbol/pattern search without cloning every run.
#### 13. Swarm Architecture


The factory runs a lightweight swarm: a team lead orchestrates role-specialized agents, each in its own bounded-turn container. File-claim locks prevent race conditions; inbox/outbox message passing is the only inter-agent interface.


- Team lead — pulls next task from TQ, dispatches role agents, monitors heartbeats, handles escalations.
- Role agents (Triage, Spec, Build, Review, Ship, Watchdog) — single-purpose, one task at a time, report back to team lead.
- Parallel builds — multiple Build agents work on independent tasks simultaneously; file-claim locks prevent collision on shared files.
- Rescope-handoff protocol — agents that hit turn-budget emit a structured JSON handoff; host auto-dispatches sub-tasks (depth ≤ 2, $5/chain spend cap, loop detection).
- Sub-agents never call send_message — only the team lead surfaces output to humans.
- Team lifecycle: TeamCreate on task start, TaskUpdate to claim/complete, SendMessage for peer DMs, TeamDelete on cleanup.
#### 14. Model Router


Route each agent invocation to the cheapest model that can do the job reliably. Saves 80–95% on token cost vs defaulting everything to Opus.


### Routing table (default policy)


- Haiku 4.5 — Triage (dedup/score/classify), heartbeat checks, pre-flight scripts, simple lookups, summarization.
- Sonnet 4.6 — Spec drafting, Build (standard tasks), Review, Ship orchestration, most Research briefs.
- Opus 4.7 — Complex multi-file refactors, security reviews, architecture decisions, any task flagged Tier-1 by the team lead.
### Escalation rules


- Auto-escalate to Sonnet if Haiku produces a malformed output (JSON parse fail, missing required fields) after 1 retry.
- Auto-escalate to Opus if Sonnet hits a rescope-handoff for the same task twice (signal: task is harder than classified).
- Team lead always runs Sonnet minimum — it's the coordination layer; cost here is amortized across all sub-agent work.
### Implementation


- Router is a small config layer (JSON or Notion row per agent role) — model is a property of the task tier + agent type, not hardcoded.
- Overrideable per-task: TQ row can specify model=opus to force Opus on a specific build.
- Budget tripwire: if Opus spend > threshold this hour, hold Opus queue and alert admin before accepting new Opus dispatches.
#### 15. Agent-to-Agent Communication via MCP


Each agent exposes and consumes a small set of MCP tools. Inter-agent calls look identical to human-tool calls — same auth, same transport, same structured I/O. This means any agent can be a client, a server, or both simultaneously.


### Topology


- Team lead exposes a dispatch MCP server — role agents call it to claim tasks, report completion, and escalate blockers. This is the single coordination bus; no peer-to-peer spaghetti.
- Shared-resource agents (Knowledge Cache, Notion writer, GitHub actor) expose MCP servers — other agents consume them without knowing the underlying implementation.
- Watchdog exposes a health-check MCP server — any agent can call report_heartbeat(agent_id, status) or query_stuck_agents().
- Agents discover each other via a registry MCP tool (list_agents) — same pattern as NanoClaw's nanoclaw MCP list_agents today.
### Message passing vs MCP — when to use which


- MCP tool call — structured request/response with typed schema. Use for: task dispatch, cache reads, health checks, GitHub/Notion writes. Fast, synchronous, composable.
- SendMessage (inbox/outbox) — async, threaded, free-text. Use for: escalations that need human-readable context, peer DMs between agents working a shared spec, long-running status updates.
- Rule of thumb: if the receiver is an agent and the payload is structured → MCP. If the receiver might be a human or the payload is narrative → SendMessage.
### Safety contracts


- Every MCP server exposed by an agent is read-only by default; write tools require an explicit capability declaration in the agent's skill definition.
- No agent can call another agent's MCP server unless it appears in the registry with status=active. Dead/stuck agents are de-registered by the Watchdog.
- MCP tool calls between agents are logged to the factory's observability store — same as human-originated tool calls. Full audit trail.
- Circular call detection: if agent A calls agent B which calls agent A, the registry returns a loop-detected error and pages the Watchdog.
### MVP implementation


- Phase 1: team lead ↔ role agents only (star topology). No peer-to-peer until Phase 2.
- MCP servers run as lightweight HTTP endpoints inside each agent container (stdio or SSE transport, same as Claude Code MCP today).
- Registry is a simple Notion DB row per agent (agent_id, mcp_endpoint, capabilities[], status, last_heartbeat). Watchdog polls + de-registers stale entries.
#### 16. Additional MVP Requirements (NanoClaw Lessons Learned)


> ⚠️ These 17 requirements emerged from reviewing bitsafe-ai-docs (architecture, autonomous engine, cost discipline, monitors) after building NanoClaw. All are considered MVP — skipping any one of them is how you repeat our past incidents.

##### 16.1 Cost Discipline & Model Routing


- **Haiku triage layer** — before spawning a full agent container, run a Haiku classifier ($0.0006/call) that routes to one of three paths: direct_answer (respond inline, no container), cache_lookup (search SQLite caches, respond), full_agent (spawn container). Asymmetric miss cost: routing a hard question to direct_answer costs more than routing an easy one to full_agent — so the threshold should be conservative (HAIKU_BOUNDARY ≈ 0.08). Deploy in shadow mode for 2 weeks before going live to calibrate without impact.
- **Per-spawn cost attribution** — every container spawn writes two JSONL records: cost-telemetry.jsonl (API call cost, model, token counts) and container-context.jsonl (chat_jid, skill name, thread_ts). Join on container ID so every dollar resolves to a specific skill/thread. Without this you cannot debug cost spikes and you fly blind.
- **Tier-aware pricing** — track context window tier from day 1. Opus standard (≤200K tokens) vs extended (200K–1M tokens) costs 2× input price. One misconfigured default context window caused $3,744 in silent overcharges before we noticed. Log tier alongside every API call; alert if a task unexpectedly hits extended tier.
- **MTD auto-throttle** — three states keyed on month-to-date spend vs budget: Normal (<70%): route normally. Warning (70–90%): downroute Opus→Sonnet, Sonnet→Haiku where possible, alert admin. Hard (>90%): force all routing to Haiku except tasks with an explicit model override in their Notion row. This is the last line of defense against runaway spend.
- **Per-spawn cost alerts** — after each container exits, check its total cost against thresholds: ≥$3 = warning ping to admin, ≥$10 = critical ping. 30-minute cooldown per group to avoid alert storms. This catches runaway single invocations before they compound.
- **Hourly cost-tick** — each hour, compare last-hour spend to trailing 24h average per-hour. Spike >2.5× AND last-hour >$5 = warning. Spike >5× AND last-hour >$20 = critical. This catches sustained runaway patterns that individual spawn alerts miss.
- **Runaway channel detector** — track spawns-per-chat_jid; cross-reference Slack API to detect archived or zero-member channels. An archived channel triggered 1,099 spurious spawns in NanoClaw before we added this check. Kill the trigger and alert admin when a channel is inactive but still generating agent invocations.
##### 16.2 Observability & Monitoring


- **Cron-success check** — for every scheduled cron, maintain a log file updated on each run. A health monitor checks: is log mtime fresher than interval × 1.5? If not, fire a warning ping. Silent cron failures are the most common class of undetected breakage — a monitor that runs but doesn't log is invisible without this check.
- **State-file freshness check** — any stateful agent writes a data/*-state.json on each run. A central monitor compares each file's mtime to its expected cadence (defined in a config map). Stale state file = agent is silently broken. Pair with cron-success check; together they catch both the cron not running and the cron running but failing to update state.
- **Handled-check sweep** — weekly scan of the admin channel: for each alarm, classify as HANDLED (human reply in thread, Tasks DB row created, commit reference present, or triggering condition cleared) or UNHANDLED. If UNHANDLED count > threshold → ping admin. This catches the silent-failure class where monitors run and post but humans don't act.
- **Action-items extraction** — admin-bot responses must include a structured '## Action items filed' section listing any Tasks DB rows created. A post-hook scanner reads this section and verifies the rows exist. Implicit recommendations that don't get filed are invisible to the pipeline. Enforce the template; scan for compliance.
##### 16.3 Operational Safety Rails


- **OOM guards** — run agent containers under systemd-run with a hard memory cap (8GB recommended). Track exit codes: rc=137 = OOM kill. Implement OOM-backoff sentinel: if a container OOM-killed within the last 1800 seconds, skip the Claude API call and return a graceful error. Without this, OOM loops saturate the host and cascade into unrelated failures.
- **Mass-deletion pre-commit guard** — pre-commit hook refuses commits with >20 deleted files OR >2000 net lines removed. Requires ALLOW_MASS_DELETE=1 env var to override. This catches runaway refactors and accidental rm -rf before they hit the repo. Code review doesn't catch what never appears in a diff.
- **Schema-as-perimeter** — agents operate strictly within a frozen database schema they cannot modify. Only an Architect-tier agent (human-approved, explicit permission) can alter schema. This prevents agents from silently adding columns, dropping indexes, or reshaping data to fit their current task. Schema stability is what makes the system auditable.
- **Hotfix lane** — commits with '[hotfix]' in the message get a 5-minute smoke window instead of the standard 30-minute dev smoke before auto-promote. Skips the 30-minute rate-limit gate as well. This allows critical production fixes to ship in ~10 minutes end-to-end while preserving all other safety checks.
##### 16.4 Skills Architecture


- **Skills as versioned Notion rows** — each skill is a row in the Skills DB with SKILL.md content, scheduled_tasks frontmatter, and is_persona flag. A reconciler runs hourly, syncing from Notion to three disk paths on each agent host. Agents edit Notion; disk is read-only cache. New skills require zero code releases — they're live within one reconciler cycle. NanoClaw manages 74+ skills this way.
- **Self-modification monitoring** — an R2 anomaly detector watches for signs that agents are modifying their own runtime: commit-author drift (non-human committer on CLAUDE.md / safety-critical files), file-mode flips on root-owned files, semgrep rules silently disabled. Run in shadow mode for 30 days (log anomalies but don't block) before activating hard blocks. This is the safety net for agents that try to subvert their own constraints.
---

> 📚 Source: `github.com/Akibalogh/bitsafe-ai-docs` — articles 02-architecture, 03-autonomous-engine, 06-cost-discipline, 07-monitors-and-alerts. Compiled 2026-05-25.

#### 17. Phased Roadmap


> 🗺️ This section supersedes §8 MVP Scope. All features from §1–16 are classified here by phase. Phase 1 = can't operate safely without it. Phase 2 = meaningfully better. Phase 3 = self-improving system.

##### Phase 1 — MVP (Weeks 1–4): Working Factory


Goal: a pipeline that takes tasks from Notion RQ → shipped PR with human gates. Every item here is "can't operate safely without it."


### Core Pipeline & Agents


- Three-queue pipeline: Research Queue → Task Queue (SDLC checkboxes) → Ship Queue, all in Notion DBs
- Agent roles: Triage, Spec, Build, Review, Ship, Watchdog, Team Lead (orchestrator)
- Slack trigger → container spawn → thread reply
- GitHub: branch-per-task, PR on complete, GH Actions CI (lint / typecheck / unit tests on every push)
- Dev→prod topology: 30-min dev smoke, auto-promote listener, exception-file gate (Dockerfile / DB migrations / firewall rules → human-only)
### Swarm Infrastructure


- Star topology: Team Lead + role-specific sub-agents
- Worktree isolation per sub-agent (no cross-agent file collisions)
- File-claim locks (claim_file / release_file) to prevent race conditions on shared resources
- Bounded turn budgets + rescope-handoff JSON (depth ≤ 2, $5/chain spend cap, loop detection)
- Agent-to-agent MCP: dispatch bus, shared resource agents (Knowledge Cache, Notion writer, GitHub actor), Watchdog health-check MCP, agent registry
### Model Routing


- Config-driven defaults by task type: Haiku for triage/heartbeats, Sonnet for build/review/ship, Opus for Tier-1/complex only
- Per-task model override in Notion TQ row
- Manual override keyword ("use opus") passes through the config gate
### Cost Discipline (must-have from day 1)


- Per-spawn cost attribution — two JSONL records per container (cost-telemetry + container-context), joinable on container ID
- Tier-aware pricing — log context window tier (standard vs extended) with every API call; alert if task unexpectedly hits extended tier
- MTD auto-throttle — 3 states: normal (<70%), warning (70–90% → downroute), hard (>90% → force Haiku)
- Per-spawn cost alerts — ≥$3 warning, ≥$10 critical, 30-min cooldown per group
### Safety Rails


- CHANGELOG trailers in commit body (not file); consolidator script runs post-merge
- Mass-deletion pre-commit guard (>20 deleted files / >2000 net lines → refuse; ALLOW_MASS_DELETE=1 to override)
- OOM guards — systemd-run 8GB memory cap, rc=137 detection, 1800s OOM-backoff sentinel
- Schema-as-perimeter — agents operate within frozen schema; only Architect-tier (human-approved) can alter
### Observability


- Severity-tagged admin channel alerts (critical / warning / info / debug)
- Cron-success check — log mtime must be fresher than interval × 1.5; warning ping if not
- State-file freshness check — data/*-state.json vs expected cadence config; stale = agent silently broken
- Dead-man's switch — 1-minute heartbeat → BetterStack external monitoring
### Knowledge & Skills


- Notion as source of truth: RQ DB, TQ DB, Ship Log DB, Specs, Skills DB, Agent Registry
- Skills as versioned Notion rows — edit Notion, reconciler syncs hourly to disk; new skills live in one cycle, no code release
- Local SQLite caches (Notion, Slack) with FTS5 unified search — <100ms lookups before any API call
- Litestream GCS replication (~1s RPO) for the messages DB
---

##### Phase 2 — Optimization (Weeks 5–8): Cost Control & Visibility


Goal: cut per-task cost 40%+; ensure no alert goes unnoticed; get full financial visibility across the factory.


- **Haiku triage layer** — shadow mode weeks 5–6 (log decisions, don't act), live weeks 7–8. HAIKU_BOUNDARY ≈ 0.08. Routes to direct_answer / cache_lookup / full_agent before spawning a container.
- **Anthropic account cost tracking** — pull spend data from the BitSafe Eng Claude account API (Anthropic usage dashboard API). Reconcile with per-spawn attribution JSONL to get a full picture: API-reported spend vs internal attribution. Discrepancies surface unattributed calls. Not blocking for MVP but essential before the factory handles serious volume.
- **Hourly cost-tick monitor** — spike >2.5× trailing 24h avg AND last-hour >$5 = warning; >5× AND >$20 = critical
- **Runaway channel detector** — track spawns-per-chat_jid; cross-ref Slack API for archived/zero-member channels; kill trigger and alert
- **Hotfix lane** — [hotfix] in commit → 5-min smoke vs 30-min; ships in ~10 min end-to-end
- **Handled-check sweep** — weekly: classify every admin channel alarm HANDLED or UNHANDLED; ping admin if UNHANDLED > threshold
- **ARQ swarm governors** — per-session cap (8 concurrent containers), daily cap (10 ARQ dispatches), cross-source burst detector
- **Daily health dashboard** — 09:00 UTC, 15-section report: queue depths, cost, agent health, cron success, open alarms
- **Tiered context loader** — load CLAUDE.md and skills cheatsheet at varying detail levels by task type (context shrinkage to stay under standard tier)
---

##### Phase 3 — Hardening (Weeks 9–12): Self-Improving System


Goal: the factory monitors and polices itself; humans review outputs, not operations.


- **Action-items extraction** — enforce ## Action items filed section in admin-bot responses; post-hook scanner verifies Tasks DB rows exist
- **Self-modification monitoring** — R2 anomaly detector: commit-author drift, file-mode flips on root-owned files, semgrep rules silently disabled. Shadow mode 30 days → hard blocks active.
- **Skill persona support** — is_persona flag on Skills DB rows, keyword/slash routing, preamble per thread; enables domain-scoped identities
- **Full DR drills** — weekly Litestream restore test (Sunday 08:00 UTC); automated pass/fail ping to admin
- **Per-skill cost breakdown** — weekly report: cost per skill derived from attribution JSONL + Anthropic account API reconciliation; surface the expensive ones
- **ARQ feedback loop** — completed task patterns → new skill proposals filed automatically in Research Queue; factory learns its own workflows


---

## Repo meta (`bitsafe-ai-docs`)


### README.md

#### BitSafe AI Docs

> **BitSafe's company-wide AI: built to run the company and advise the company.**
>
> A case study + the docs to learn from BitSafe's implementation of [NanoClaw](https://github.com/qwibitai/nanoclaw).

##### What this repo is

The docs (with worked examples) for how BitSafe — a crypto-finance startup building on the Canton Network — uses NanoClaw to run day-to-day operations and to advise on strategy.

This is **case study content**, not a framework manual. The upstream NanoClaw project at `qwibitai/nanoclaw` is the framework; this repo is BitSafe's implementation, customizations, and lessons.

##### The article series

| # | Layer | Title | Source | Status |
|---|---|---|---|---|
| 1 | Infra + Security | [Building a Company-Wide AI Assistant](https://hub.bitsafe.finance/company-wide-ai-assistant) | [`01-company-wide-ai-assistant.md`](docs/articles/01-company-wide-ai-assistant.md) | published |
| 2 | Foundation | [NanoClaw Architecture](https://hub.bitsafe.finance/nanoclaw-architecture) | [`02-architecture.md`](docs/articles/02-architecture.md) | published |
| 3 | Operations | The Autonomous Engine — Loops, CI/CD, ARQ + Swarms, Observability | [`03-autonomous-engine.md`](docs/articles/03-autonomous-engine.md) | drafting |
| 4 | Substrate | The Substrate — Notion-as-OS, Data, Code, Knowledge, and Tools | [`04-substrate.md`](docs/articles/04-substrate.md) | drafting |
| 5 | App / Top | Working With NanoClaw — Personas, Alerts, Memory, Decision Support, and How Humans Teach the AI | [`05-working-with-nanoclaw.md`](docs/articles/05-working-with-nanoclaw.md) | drafting |
| 6 | Lessons | [Cost Discipline — Why the Bill Grew, What We Caught, How to Catch It Sooner](https://hub.bitsafe.finance/cost-discipline) | [`06-cost-discipline.md`](docs/articles/06-cost-discipline.md) | published |
| 7 | Lessons | Monitors & Alerts — Catching What You Can't Prevent | [`07-monitors-and-alerts.md`](docs/articles/07-monitors-and-alerts.md) | drafting |
| 8 | Lessons | Capability Coverage & Harness Guards — Why the Model Shouldn't Have to Remember What It Can Do | [`08-capability-coverage-and-harness-guards.md`](docs/articles/08-capability-coverage-and-harness-guards.md) | drafting |

Articles are published as-ready to BitSafe's hub (`hub.bitsafe.finance`); drafts and source live here.

##### Specs

Forward-looking architecture proposals (separate from the retrospective case-study articles).

| Spec | Source |
|---|---|
| Code Factory MVP — 24x7 Autonomous SDLC Pipeline | [`code-factory-mvp-spec.md`](docs/specs/code-factory-mvp-spec.md) |

##### Contributing

Issues + PRs welcome. The system itself reviews proposed changes — there's an adversarial reviewer bot that argues against any PR by default (it's a feature). Address it head-on in your PR description and you'll have an easier review.

See `CONTRIBUTING.md` for specifics.

##### License

- Prose (articles, docs): [CC-BY-SA-4.0](LICENSE-DOCS)
- Code snippets and any tooling: [Apache 2.0](LICENSE)

##### Links

- Upstream framework: [qwibitai/nanoclaw](https://github.com/qwibitai/nanoclaw)
- BitSafe public hub: [hub.bitsafe.finance](https://hub.bitsafe.finance)
- BitSafe: [bitsafe.finance](https://bitsafe.finance)


### CONTRIBUTING.md

#### Contributing to bitsafe-ai-docs

Thanks for your interest. Here's how to submit changes.

##### Issues

- Typos, broken links, factual errors: open an issue with the section + the fix.
- Discussion / feedback on framing: open an issue tagged `discussion`.

##### Pull requests

1. Fork + branch from `main`.
2. Make the change — prose, code snippet, or new article.
3. Open a PR. Describe what changes + why.
4. Expect the adversarial reviewer to argue against your change. That's the system working as intended; respond to the substance.
5. Merge happens after one BitSafe maintainer approves.

##### Article style

Follow the BitSafe Content Strategy + Brand Guide (internal — abridged here):
- Specific examples beat abstractions.
- "We did X because Y" beats "you should X."
- Numbers + dates + commit SHAs make claims credible.
- ≤2 pull-quote lines per article, max.
- No marketing fluff.

##### Code snippets

- Apache 2.0 licensed (matches the framework upstream).
- Working examples, not pseudo-code.
- Test before committing.

##### Security

If you find a vulnerability, do NOT open a public issue. See `SECURITY.md`.


### SECURITY.md

#### Security Policy

##### Reporting a vulnerability

Email security@bitsafe.finance with:

- A clear description of the issue
- Steps to reproduce
- Impact assessment (what an attacker could do)
- Your contact info for follow-up

We will:

- Acknowledge within 48 hours
- Triage and respond with timeline within 5 business days
- Credit you in the fix announcement (unless you prefer anonymity)

##### Scope

This repo contains docs + non-runtime code snippets. Most security work for NanoClaw itself happens at the [upstream framework repo](https://github.com/qwibitai/nanoclaw).

If your finding is about BitSafe's *production* infrastructure (not just the docs), please reach out via `security@bitsafe.finance` directly.

##### Out of scope

- Issues only present on forks
- Theoretical issues without a working proof-of-concept
- Social engineering


---

# Part III — `qwibitai/nanoclaw` Framework: Structural Assessment


## [REPO] qwibitai/nanoclaw — Framework Structural Assessment
**Source:** https://github.com/qwibitai/nanoclaw (cloned locally at `/tmp/bitsafe/repos/nanoclaw`)
**Cloned commit:** `625264b` (Merge PR #2811 — setup-agent-provider-flag). Package version `2.1.19`. (Repo was renamed `qwibitai/nanoclaw` → `nanocoai/nanoclaw` mid-history; code/docs reference the latter.)
**License:** MIT.

> Note: the local clone is a shallow/single-commit checkout, so `git log` shows only one merge commit. The CHANGELOG is the authoritative history source and is mined below.

---

### 0. Executive Overview

NanoClaw is a **lightweight, self-hostable, single-process autonomous AI-assistant framework** built as a deliberate "small enough to understand" rewrite of OpenClaw. The pitch (README): OpenClaw is ~500k LOC, 53 config files, 70+ deps, all in one Node process with app-level (allowlist/pairing) security; NanoClaw delivers the same core in a handful of files with **OS-level container isolation** instead.

The defining architectural idea: **everything is a message, and the sole IO surface between the orchestrator host and each agent is a pair of mounted SQLite files.** There is no IPC, no stdin piping, no file watcher, no shared memory between host and agent. A single Node host process orchestrates per-session Docker containers; each container runs a Bun "agent-runner" that polls its session DB, calls Claude (via the official Claude Agent SDK), and writes responses back to a second DB the host polls.

Three more pillars:
- **Skills over features.** Trunk ships only the registry + infrastructure. Channel adapters (Discord, Slack, Telegram, WhatsApp, …) live on a long-lived `channels` branch; alternative agent providers (OpenCode, Codex, Ollama) live on a `providers` branch. Users run `/add-<x>` skills that copy exactly the module(s) they want into their fork. Trunk stays lean; every fork is bespoke.
- **Customization = code changes, no config sprawl.** "No configuration files. To make changes, tell Claude Code what you want." The codebase is small enough that the AI safely edits its own fork.
- **AI-native hybrid operation.** Install/onboarding is a deterministic scripted path; when a step needs judgment (failed install, customization, debugging) control hands off to Claude Code. There is no dashboard — you debug by asking Claude Code.

**Tech stack:** TypeScript throughout. **Host** = Node ≥20 + pnpm 10.33 (`better-sqlite3`, `@onecli-sh/sdk`, `chat` (Chat SDK), `cron-parser`, `@clack/prompts`, `kleur`). **Container agent-runner** = Bun 1.3.12 (`@anthropic-ai/claude-agent-sdk` ^0.3.170, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `cron-parser`, `zod`) — a *separate package tree*, not a pnpm workspace member. Container base image `node:22-slim` + chromium + tini. Vitest (host) / `bun:test` (container). ESLint 9 + Prettier (120-col). Deploy via launchd (macOS) / systemd (Linux) / nohup fallback (WSL).

**Rough size:** ~56,900 lines of TS+SH (excluding node_modules). `src/` (host) ≈ **24,176 lines** across ~140 `.ts` files; `container/` (agent-runner + skills) ≈ **6,565 lines** of TS. 331 `.ts` files, 152 `.md` files, 40 shell scripts total. 46 install/operational skills under `.claude/skills/`, 8 container-mounted runtime skills under `container/skills/`, ~29 docs under `docs/`.

---

### 1. Directory & Component Map

| Path | What it is |
|------|-----------|
| `src/index.ts` | Thin host entry point — init DB, migrations, adapters, delivery polls, sweep, CLI socket, shutdown |
| `src/router.ts` | Inbound routing: channel event → messaging group → fan-out across wired agents → session → `inbound.db` → wake |
| `src/delivery.ts` | Polls `outbound.db` (1s active / 60s sweep), delivers via adapter, handles `kind:'system'` actions |
| `src/host-sweep.ts` | 60s maintenance: processing-ack sync, stuck/stale kill, due-message wake, recurrence fan-out |
| `src/session-manager.ts` | Resolve sessions; open `inbound.db`/`outbound.db`; heartbeat path; outbox file IO |
| `src/container-runner.ts` | Spawn/kill per-session Docker containers; mount assembly; OneCLI gateway wiring; per-group image build |
| `src/container-runtime.ts` | Runtime abstraction (Docker), orphan cleanup by install label |
| `src/egress-lockdown.ts` | Optional internal-network egress lockdown forcing all traffic through the OneCLI gateway |
| `src/command-gate.ts` | Host-side slash-command classifier (pass/filter/deny) querying `user_roles` |
| `src/claude-md-compose.ts` | Compose per-group `CLAUDE.md` from shared base ⊕ skill/module/MCP fragments at every spawn |
| `src/circuit-breaker.ts` | Crash-loop startup backoff |
| `src/upgrade-state.ts` | Boot tripwire refusing unsanctioned upgrades (raw `git pull`) |
| `src/db/` | Central DB: agent_groups, messaging_groups, sessions, container_configs, user_roles, migrations, session-db helpers |
| `src/modules/` | Pluggable modules: permissions, approvals, scheduling, agent-to-agent, self-mod, mount-security, typing, interactive |
| `src/channels/` | Channel adapter registry + Chat SDK bridge (specific adapters skill-installed) |
| `src/providers/` | Host-side provider container-config (`claude` baked, others via skills) |
| `src/cli/` | `ncl` admin CLI — socket server (host) + dispatcher + generic CRUD + per-resource defs |
| `container/agent-runner/src/` | Bun agent-runner: poll-loop, formatter, providers, MCP tools, memory scaffold, session DBs |
| `container/skills/` | Runtime skills mounted into every agent (onecli-gateway, welcome, self-customize, agent-browser, slack-formatting, …) |
| `container/Dockerfile` + `build.sh` + `entrypoint.sh` | Agent image (Bun + chromium + tini + global Node CLIs) |
| `.claude/skills/` | 46 install/operational skills (`/add-discord`, `/setup`, `/debug`, `/customize`, `/update-nanoclaw`, …) |
| `setup/` | The deterministic install flow (per-step CLI + auto sequencer) |
| `nanoclaw.sh` | Top-level install orchestrator (bash bootstrap → `setup:auto` hand-off) |
| `migrate-v2.sh`, `setup/migrate-v2/` | v1→v2 migration |
| `docs/` | ~29 architecture/spec/security/db/migration docs |

---

### 2. Core Architecture: "Everything Is a Message"

```
messaging apps → host (router) → inbound.db → container (Bun, Claude Agent SDK) → outbound.db → host (delivery) → messaging apps
```

When a message arrives, the host routes it via the **entity model** (user → messaging group → agent group → session), writes it into the session's `inbound.db`, and wakes a container. The agent-runner polls `inbound.db`, runs Claude, writes responses to `outbound.db`. The host polls `outbound.db` and delivers back through the channel adapter.

**Two SQLite files per session, exactly one writer each** — no cross-mount lock contention, no IPC. This is the load-bearing design choice that makes the whole system mount-driven and free of host↔container coupling.

#### 2.1 The Three-DB Model

- **Central DB** (`data/v2.db`) — host-owned admin plane. WAL mode, `foreign_keys = ON`. Holds everything not per-session: users, roles, agent_groups, messaging_groups, wirings, sessions metadata, container_configs, pending_* approvals, user_dms, chat_sdk_* state, schema_version.
- **Per-session pair** under `data/v2-sessions/<agent_group_id>/<session_id>/`:
  - `inbound.db` — **host writes, container reads RO.** Tables: `messages_in`, `delivered`, `destinations`, `session_routing`.
  - `outbound.db` — **container writes (sole writer), host reads RO.** Tables: `messages_out`, `processing_ack`, `session_state`, `container_state`.
- **Heartbeat** is a file `mtime` touch at `/workspace/.heartbeat` — never a DB write.

**`journal_mode=DELETE` is load-bearing for `inbound.db`** (`container/agent-runner/src/db/connection.ts`): WAL's `-shm` is mmap-backed, and VirtioFS (Docker Desktop macOS) does not propagate mmap coherency host→guest — a WAL `inbound.db` would freeze the container reader on an early snapshot and it would *silently never see new host messages*. The container also opens `inbound.db` with `PRAGMA mmap_size = 0` and reopens the handle fresh on each poll so host writes aren't masked by SQLite page cache on virtiofs/NFS. The central DB uses WAL safely (not cross-mounted).

**Seq parity (even = host / odd = container).** Every message gets a monotonic `seq INTEGER UNIQUE`, unique *within a session across both tables*. Host `nextEvenSeq()` → even; container `messages-out.ts` reads `MAX(seq)` across both tables, picks the next odd. This is **not** just collision avoidance: `seq` is the agent-facing message id returned by `send_message` and accepted by `edit_message`/`add_reaction`, and `getMessageIdBySeq()` routes the lookup by parity (odd→`messages_out`, even→`messages_in`) so "edit message #5" disambiguates without a join. The invariant is enforced only by the two helper functions, not by a constraint.

#### 2.2 messages_in / messages_out schema

`messages_in` columns: `id` PK, `kind` (`chat`|`chat-sdk`|`task`|`webhook`|`system`), `timestamp`, `status` (`pending`|`processing`|`completed`|`failed`), `status_changed`, `process_after` (ISO; NULL = now), `recurrence` (cron; NULL = one-shot), `tries`, routing fields (`platform_id`, `channel_type`, `thread_id` — agent never sees these), `content` (JSON blob), plus `on_wake` (only picked up by a fresh container's first poll) and `series_id` (recurrence grouping).

`messages_out` mirrors it plus `in_reply_to`, `delivered`, `deliver_after`. Content format varies by `kind` and an optional `operation` field (`edit`, `reaction`, `ask_question`, `card`).

**Message lifecycle:** `pending → processing → completed` (or `failed` after max retries). Retries use `process_after` + exponential backoff (5s × 2^tries), MAX_TRIES = 5, computed host-side.

---

### 3. The Host Orchestrator

#### 3.1 Entry point (`src/index.ts`)
Boot order: (0) circuit-breaker startup backoff → (0.5) upgrade tripwire → (1) init central DB + migrations → (1b) backfill `container_configs` from legacy `container.json` → (1c) `migrateGroupsToClaudeLocal()` one-time cutover → (2) ensure container runtime + cleanup orphans → (3) init channel adapters (each self-registers on import via `./channels/index.js`; modules via `./modules/index.js`) → (4) wire delivery adapter bridge → (5) start active + sweep delivery polls → (6) start host sweep → (7) start `ncl` CLI socket server (`data/ncl.sock`). A `dispatchResponse` registry routes button-click answers back to whichever module handler claims them.

#### 3.2 Inbound routing (`src/router.ts`)
Pipeline: pre-route interceptor (modules can consume free-text replies mid-approval-flow) → adapter thread policy (non-threaded platforms collapse `thread_id` to null) → **combined messaging-group lookup + wired-agent count in one query** (cheap short-circuit for unwired channels) → auto-create messaging group only if the bot was addressed (@mention/DM) → sender resolution (permissions module upserts the `users` row) → **fan-out across every wired agent independently.**

Each agent is evaluated against `engage_mode`, `sender_scope`, and the access gate:
- `engage_mode`: `pattern` (regex on text; `.` = always; bad regex fails open), `mention` (platform-confirmed `isMention`), `mention-sticky` (mention OR an existing per-thread session — session existence IS the subscription state).
- An engaging agent gets its own session + container wake. A declining agent with `ignored_message_policy='accumulate'` still gets the message stored `trigger=0` (silent context) — *unless* the access/scope gate refused, in which case the message is dropped (storing an untrusted sender's attachments would defeat the gate).
- Fan-out collision: the same inbound id lands in multiple session DBs, so `messageIdForAgent()` namespaces it as `<id>:<agent_group_id>`.

Routing is extensible via four hooks the permissions module registers (`setSenderResolver`, `setAccessGate`, `setSenderScopeGate`, `setChannelRequestGate`, `setMessageInterceptor`) — without the module, core defaults to allow-all + null userId. Structural drops (no agent wired / no engage) and policy refusals both write `dropped_messages` audit rows.

#### 3.3 Host sweep (`src/host-sweep.ts`) — the liveness engine
60s tick over all active sessions. Per session: (1) sync `processing_ack` → `messages_in.status`; (2) wake a container if `countDueMessages > 0` and none running; (3) running-container SLA; (4) crashed-container cleanup; (5) recurrence fan-out.

The **stuck/stale detection** (`decideStuckAction`, a pure testable function) replaces a wall-clock idle timer:
- **Absolute ceiling:** heartbeat age > `max(30 min, current_bash_declared_timeout)` → kill. The ceiling extends only while a Bash tool is declared running longer (honoring the agent's own timeout). A *missing* heartbeat file = fresh spawn → grace (so newly-spawned containers aren't killed in seconds).
- **Claim-stuck:** per `processing` row, tolerance = `max(60s, declared_bash_timeout)`; if `claim_age > tolerance` AND `heartbeat_mtime <= status_changed`, kill + reset that message + tries++.
Crashed-container processing rows are reset to pending with backoff; orphan `processing_ack` rows are dropped so the freshly-respawned container isn't immediately re-killed before it can clear them itself. A subtle UTC fix: `parseSqliteUtc()` appends `Z` to timezone-less SQLite timestamps so non-UTC hosts don't see every claim as hours-stale.

#### 3.4 Outbound delivery (`src/delivery.ts`)
Two tiers: active poll (1s, running sessions) + sweep poll (60s, all active sessions); an `inflightDeliveries` Set prevents the two timer chains racing on the same row. Reads due `messages_out` from `outbound.db` (RO), filters against `inbound.db`'s `delivered` table, delivers via adapter, marks delivered host-side. Per-message retry up to `MAX_DELIVERY_ATTEMPTS = 3`. `kind:'system'` rows are dispatched to a `registerDeliveryAction` registry (scheduling/approvals/agent-to-agent register handlers; unknown actions log + drop). `channel_type:'agent'` rows route to the a2a module. Channel sends are permission-checked: the origin chat is always allowed; otherwise an `agent_destinations` row must authorize the target (auto-inserted at wiring time, so operators rarely need a separate ACL step).

---

### 4. The Container Runner & Agent Sandbox

#### 4.1 Spawn (`src/container-runner.ts`)
`wakeContainer()` is idempotent and never throws (returns `false` on transient failure; host-sweep retries). It dedups concurrent wakes via an in-flight `wakePromises` map. Spawn: materialize `container.json` from the `container_configs` DB row → init group filesystem (idempotent) → resolve provider + host contribution → assemble mounts → `onecli.ensureAgent()` + `onecli.applyContainerConfig()` (refuses to spawn if the gateway can't be wired — *fail-closed, no open egress*) → `docker run --rm` with `--entrypoint bash -c 'exec bun run /app/src/index.ts'`.

**Mount layout** (Docker bind mounts; works on Apple Container's directory-only model too):
- session dir → `/workspace` (RW; `inbound.db`, `outbound.db`, `outbox/`, `.claude/`)
- group dir → `/workspace/agent` (RW; working files + `CLAUDE.local.md`)
- `container.json` → nested RO mount on top of the RW group dir (agent reads config, can't modify it)
- composed `CLAUDE.md` + `.claude-fragments/` → nested RO (regenerated each spawn; agent writes would be clobbered)
- `groups/global/` → `/workspace/global` RO
- shared `container/CLAUDE.md` → `/app/CLAUDE.md` RO
- per-group `.claude-shared` → `/home/node/.claude` RW (Claude state, settings, skill symlinks)
- shared agent-runner source → `/app/src` RO (**source is never baked into the image** — source-only changes need no rebuild)
- shared `container/skills` → `/app/skills` RO
- validated additional mounts → under `/workspace/extra/...`

User mapping maps host uid:gid into the container (non-root `node`, uid 1000). Skill symlinks in `.claude-shared/skills/` point at `/app/skills/<name>` (dangling on host, valid in container) and are synced to the `container.json` skill selection (`'all'` recomputes from `container/skills/` so new upstream skills appear automatically).

#### 4.2 The Dockerfile
`FROM node:22-slim`; apt-installs chromium + Playwright deps + `tini` (PID 1 for clean SIGTERM so `outbound.db` writes finalize). Bun pinned `1.3.12` (installed to `/usr/local/bin/bun`); pnpm `10.33.0` via corepack. Global Node CLIs the agent invokes live in `cli-tools.json` (`vercel@52.2.1`, `agent-browser@0.27.1`, `@anthropic-ai/claude-code@2.1.170`) installed by `install-cli-tools.sh` with per-tool `only-built-dependencies[]` opt-ins (pnpm 11 stopped honoring this for global installs, hence the pin). CJK fonts are an opt-in `INSTALL_CJK_FONTS` build-arg (~200MB saved by default → Chromium renders CJK as tofu without it). `entrypoint.sh` captures stdin to `/tmp/input.json` then `exec bun run /app/src/index.ts`. **Container logs are lost on exit** (`--rm`) — a silent in-container failure leaves no persistent log.

#### 4.3 Container restart & self-mod race-safety
`ncl groups restart [--rebuild] [--message]` kills running containers; with `--message` it writes an `on_wake` row and respawns via a `killContainer(..., onExit)` callback that fires *after* the process exits (guaranteeing the old container is gone first). The `on_wake` column ensures only the *fresh* container's first poll picks up the message — a dying container in its SIGTERM grace period can never steal it. Self-mod approvals reuse this exact mechanism.

---

### 5. The Agent-Runner (Container Side, Bun)

#### 5.1 Boot (`container/agent-runner/src/index.ts`)
`loadConfig()` reads `/workspace/agent/container.json` → `buildSystemPromptAddendum()` (agent identity + live destinations) → discover `/workspace/extra/*` dirs → register the built-in `nanoclaw` MCP server (`bun run .../mcp-tools/index.ts`) + any from `container.json` → `createProvider(name, opts)` (providers self-register via barrel import) → optional `ensureMemoryScaffold()` (only if `provider.usesMemoryScaffold`; Claude skips it) → `runPollLoop(...)`. All IO via the two DBs; logs to stderr.

#### 5.2 Poll loop (`poll-loop.ts`) — the heart of the agent side
Resume prior session from a persisted **continuation** (opaque to the loop; provider decides meaning) → optionally rotate it if the transcript is too big/old (`maybeRotateContinuation`) → `clearStaleProcessingAcks()` → loop:
1. Poll `messages_in` for pending non-system rows. **Accumulate gate:** if the batch is all `trigger=0` context-only rows, don't wake the agent (leave pending; they ride the next real trigger). The host's `countDueMessages` gates the same way for cold-wake.
2. `markProcessing(ids)`, extract routing, handle `/clear` (resets continuation) and `/upload-trace` directly.
3. Run pre-task scripts on `task` rows (a script returning `wakeAgent=false` gates only its own row).
4. Format the batch into a prompt and call `provider.query()`.
5. **While the query is active, keep polling** and `query.push()` follow-ups into the live stream — the stream is *not* force-ended on silence (avoids re-spawning the SDK subprocess + reloading the `.jsonl` each turn; the Anthropic prompt cache is server-side 5-min TTL keyed on prefix hash, so stream lifecycle doesn't affect cache hits). A pending runner-command (`/clear`, `/compact`, …) `abort()`s the stream so the outer loop can dispatch it.
6. On `result`, mark the initial batch completed, parse `<message to="name">…</message>` blocks and dispatch each to its destination; persist continuation immediately on `init` (so a mid-turn crash still resumes).

**Cross-mount corruption recovery:** if `getPendingMessages()` throws `database disk image is malformed` (a Docker Desktop macOS virtiofs/gRPC-FUSE page-cache coherency bug, not real damage — host `integrity_check` passes) ≥ 10 consecutive times, the container `process.exit(75)` so host-sweep respawns it with a fresh mount (reopening the handle in-process does not recover).

**The wrapping contract:** the agent MUST wrap all user-facing output in `<message to="name">…</message>`; bare text and `<internal>…</internal>` are scratchpad (logged, not sent). If a result has no `<message>` block, the loop nudges the agent once with the destination list to re-send. Non-retryable provider errors (e.g. a 403 `billing_error`) with no envelope are delivered to the user instead of dropped (a recent fix — previously produced silence + a turn-after-turn retry loop).

#### 5.3 Provider abstraction
`AgentProvider` interface (`providers/types.ts`): `query(input): AgentQuery`, `isSessionInvalid(err)`, optional `maybeRotateContinuation(continuation, cwd)`, optional `onExchangeComplete(exchange)`, `supportsNativeSlashCommands: boolean`, `usesMemoryScaffold?: boolean`. `AgentQuery = { push, end, abort, events: AsyncIterable<ProviderEvent> }`. Events: `init{continuation}`, `result{text, isError?}`, `error{message, retryable, classification?}`, `progress`, `activity` (liveness on every SDK event). Providers register in a `Map` via `registerProvider(name, factory)`; the barrel `providers/index.js` imports `claude.js` + `mock.js`; provider skills append one import line.

**Claude provider** (`providers/claude.ts`) wraps `@anthropic-ai/claude-agent-sdk`'s `query`, feeding the prompt as a **push-based `MessageStream` (AsyncIterable)** rather than a string so `isSingleUserTurn` stays false and the CLI stdin stays open (otherwise agent-team subagents get killed — documented in `docs/SDK_DEEP_DIVE.md`). Key options: `resume: continuation`, `pathToClaudeCodeExecutable: '/pnpm/claude'`, `systemPrompt: { type:'preset', preset:'claude_code', append: instructions }`, a `TOOL_ALLOWLIST` (Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Task, Team*, Skill, ToolSearch, …) plus `mcp__<server>__*` patterns, `disallowedTools` (CronCreate/Delete/List, AskUserQuestion, Enter/ExitPlanMode, Enter/ExitWorktree — nanoclaw has durable equivalents or they hang headless), `permissionMode: 'bypassPermissions'`. Hooks: `PreToolUse` (records in-flight tool + Bash declared timeout → fuels the host SLA), `PreCompact` (archives transcript).

**Session continuation = the SDK `session_id`**; the `.jsonl` transcript lives at `~/.claude/projects/<mangled-cwd>/<sessionId>.jsonl`. **Rotation guard:** `CLAUDE_TRANSCRIPT_ROTATE_BYTES` (default 12 MB) and `CLAUDE_TRANSCRIPT_ROTATE_AGE_DAYS` (default 14) — over threshold, archive to markdown and `rename` the heavy `.jsonl` out of the resume path, returning a reason so the host starts fresh (a long-lived hub otherwise reloads an ever-growing transcript and gets killed before it can reply). `CLAUDE_CODE_AUTO_COMPACT_WINDOW` default 165000 tokens.

#### 5.4 Message formatting (`formatter.ts`)
Prepends `<context timezone="<IANA>" />` so every timestamp the agent sees/produces is user-local. Strips routing fields. Per kind: `<message id="seq" from="dest" sender time reply_to>…</message>`, `<task>`, `<webhook>`, `<system_response>`. `stripInternalTags` removes `<internal>` scratchpad before replies leave.

---

### 6. The MCP Tool Surface

All tools write to `outbound.db` via `writeMessageOut`; the **host** validates and applies side-effects (the container is untrusted; it cannot gate itself). MCP server is `@modelcontextprotocol/sdk` over stdio, `registerTools([...])` into a barrel.

**Core (`core.ts`, kind `chat`):**
- `send_message(to?, text)` — resolves destination by name (default = reply in place).
- `send_file(to?, path, text?, filename?)` — copies file to `/workspace/outbox/<id>/`, writes `{text, files:[…]}`.
- `edit_message(messageId:int, text)` — `{operation:'edit', messageId:<platformId>, text}`.
- `add_reaction(messageId:int, emoji)` — `{operation:'reaction', …}`.

**Scheduling (`scheduling.ts`, kind `system`):** `schedule_task(prompt, processAfter, recurrence?, script?)`, `list_tasks` (reads `inbound.db` directly), `update_task`, `cancel_task`, `pause_task`, `resume_task`. Timestamps parsed via `parseZonedToUtc(value, TIMEZONE)`.

**Interactive (`interactive.ts`):** `ask_user_question(title, question, options[], timeout?=300s)` — **blocking**: writes a `chat-sdk` `{type:'ask_question', questionId, …}` row then polls `inbound.db` for the response until deadline; `send_card(card, fallbackText?)`.

**Agents (`agents.ts`):** `create_agent(name, instructions?)` — `kind:'system' {action:'create_agent', …}`; host gates by CLI scope (global = direct, confined = admin approval). (`send_to_agent` was removed — agents now use `send_message(to=…)` since they share the destinations namespace.)

**Self-mod (`self-mod.ts`):** `install_packages(apt?[], npm?[], reason?)` and `add_mcp_server(name, command, args?, env?)` — validated (apt/npm name regexes, ≤20 packages) and fire-and-forget; each requires a single admin approval. On approve, `install_packages` rebuilds the per-group image, writes an on-wake verify message, kills + respawns; `add_mcp_server` only updates `container.json` + restarts (bun runs TS, no build).

---

### 7. Memory & Context Management

- **Claude's native memory:** `/workspace/agent/CLAUDE.local.md` (auto-loaded per-group memory, RW, survives the ephemeral container) plus archived `conversations/*.md`.
- **Non-Claude providers:** an opt-in `memory/` scaffold (`memory-scaffold.ts`, gated on `usesMemoryScaffold`): `memory/system/definition.md`, `memory/memories/` (durable facts), `memory/data/` (structured data), `memory/index.md`. Templates ship as real markdown. The doctrine (`definition.md`): start at the narrowest `index.md`, split folders past ~20 entries, prefer updating over duplicating, date-stamp, read before answering.
- **CLAUDE.md composition (`claude-md-compose.ts`)** runs on *every* spawn. It produces an imports-only `groups/<folder>/CLAUDE.md`: `@./.claude-shared.md` (symlink → `/app/CLAUDE.md` shared base) + sorted `@./.claude-fragments/<name>` imports reconciled from three sources — skill `instructions.md` files (`skill-<name>.md`), built-in module `*.instructions.md` (`module-<name>.md`, the `cli.instructions.md` skipped when `cli_scope='disabled'`), and inline MCP-server `instructions` from `container.json` (`mcp-<name>.md`). Stale fragments are pruned. So the effective system prompt = SDK `claude_code` preset + runtime append (identity + destinations) + composed `CLAUDE.md` + `CLAUDE.local.md`.
- **Compaction:** a `PreCompact` shell hook (`compact-instructions.ts`) outputs custom instructions telling the compactor to keep recent XML structure and re-append the wrapping reminder; a separate in-process `PreCompact` hook archives the transcript to markdown.
- **`/upload-trace`** (`upload-trace.ts`): uploads the newest `.jsonl` to a private Hugging Face dataset `<user>/nanoclaw-traces` via the OneCLI proxy (the HF token is injected on the wire; the runner never sees it), returning a blob URL viewable in HF's Agent Trace Viewer.

---

### 8. Entity & Permission Model

**Privilege is user-level, never group-level.** Namespaced identities `users(id = "<channel>:<handle>")`; `user_roles(role ∈ {owner, admin}, agent_group_id NULL|scoped)` — owner is always global (enforced in code, not schema); admin is global (NULL) or scoped to one group. `agent_group_members` is the unprivileged "known" gate (admins are implicit members).

`canAccessAgentGroup()` (`modules/permissions/access.ts`) is an ordered short-circuit cascade:
```ts
if (!getUser(userId)) return {allowed:false, reason:'unknown_user'};
if (isOwner(userId)) return {allowed:true, reason:'owner'};
if (isGlobalAdmin(userId)) return {allowed:true, reason:'global_admin'};
if (isAdminOfAgentGroup(userId, agentGroupId)) return {allowed:true, reason:'admin_of_group'};
if (isMember(userId, agentGroupId)) return {allowed:true, reason:'member'};
return {allowed:false, reason:'not_member'};
```
Each predicate is one indexed `user_roles` lookup distinguished by `agent_group_id IS NULL` vs `= ?`.

**Command gate (`command-gate.ts`)** classifies inbound slash commands host-side *before* they reach the container: `FILTERED_COMMANDS` (`/help`, `/login`, `/logout`, `/doctor`, `/config`, `/remote-control`) → silently dropped; `ADMIN_COMMANDS` (`/clear`, `/compact`, `/context`, `/cost`, `/files`, `/upload-trace`) → pass if admin else deny (writes a "Permission denied" `messages_out` row); unknown slash → pass (SDK handles). Its `isAdmin()` **fails open** if `user_roles` doesn't exist (permissions module not installed → allow all) — the general `hasTable()` degrade-silently pattern by which uninstalled modules don't raise SQLite errors.

**Approvals (`modules/approvals/primitive.ts`):** `pickApprover(agentGroupId)` returns ordered+deduped candidates (scoped admins of that group → global admins → owners); `pickApprovalDelivery` picks the first reachable via `ensureUserDm` (same-channel-kind tie-break) and DMs them a 2-button Approve/Reject card. `pending_approvals` rows are persisted; `mig 018` added `approver_user_id` to pin resolution to one named user. **There is no `NANOCLAW_ADMIN_USER_IDS` env var** — roles live only in the central DB.

**Isolation model** (`docs/isolation-model.md`) offers three channel-isolation levels: each channel to its own agent (full privacy), one agent across many channels (unified memory, separate conversations), or multiple channels folded into one shared session. Chosen per channel via `/manage-channels`.

---

### 9. Central DB & Migration System

Tables (selected): `agent_groups`, `messaging_groups` (one row per chat *per adapter instance*; `unknown_sender_policy ∈ {strict, request_approval, public}`; `denied_at`), `messaging_group_agents` (M:N wiring with the four engage axes: `engage_mode`, `engage_pattern`, `sender_scope`, `ignored_message_policy`, `session_mode`, `priority`), `users`, `user_roles`, `agent_group_members`, `user_dms` (cold-DM cache), `sessions`, `pending_questions`, `agent_destinations` (**both routing map and ACL** — a row exists iff source may send to target), `pending_approvals`, `unregistered_senders`, `pending_sender_approvals`, `pending_channel_approvals`, `agent_message_policies` (per-a2a-edge approval gate), `container_configs`, `chat_sdk_*` (Chat SDK state), `schema_version`.

**Migration mechanism (`db/migrations/index.ts`):** migrations are a barrel array of `{version, name, up(db), disableForeignKeys?}`. Crucially **uniqueness is keyed on `name`, not `version`** (a `UNIQUE INDEX idx_schema_version_name`), so install-skill modules pick arbitrary version numbers without coordinating — the `version` column is auto-assigned at insert as an applied-order counter (`MAX(version)+1`). Already-applied migrations are skipped by name (which is why `module-*` files keep their original recorded names). `disableForeignKeys` migrations (e.g. mig 016, the messaging-group instance recreate) snapshot pre-existing FK violations and only fail on *introduced* ones, so legacy orphans don't crash-loop the host on boot.

---

### 10. Channels & Providers (skill-installed)

Trunk ships only the **registry + Chat SDK bridge**, not adapters. `ChannelAdapter` interface: `channelType`, optional `instance`, `supportsThreads`, methods `setup/teardown/isConnected`, `deliver(platformId, threadId, message)`, optional `setTyping/syncConversations/resolveChannelName/subscribe/openDM`. Adapters self-register via `registerChannelAdapter`; keyed by `instance ?? channelType`. Exact-key resolution for instance-addressed sends avoids cross-identity bleed.

**Chat SDK bridge (`chat-sdk-bridge.ts`)** wraps an `@chat-adapter` SDK Adapter+Chat into a `ChannelAdapter`. Forwards four exclusive dispatch paths (`onSubscribedMessage`, `onNewMention`, `onDirectMessage`, `onNewMessage`); only resolves ids + sets `isMention` (all engage/drop decisions live in the router). It downloads attachments to base64, encodes button ids as `ncq:<questionId>:<idx>` (fits Telegram's 64-byte callback cap), and chunks long text via `splitForLimit`. Discord uses a Gateway listener (exponential backoff capped at 1h) + a local webhook server; non-gateway adapters share the webhook server.

**`channels` branch** ships Discord, Slack, Telegram, WhatsApp (Baileys + Cloud), Teams, Linear, GitHub, iMessage, Webex, Resend (email), Matrix, Google Chat, WeChat. **`providers` branch** ships OpenCode + Codex. Each `/add-<x>` skill: `git fetch origin <branch>` → copy module(s) → append self-registration import → `pnpm install <pkg>@<pinned>` → build. Idempotent.

---

### 11. Scheduling & Recurrence

No scheduler table — tasks are `messages_in` rows `kind='task'`; recurring occurrences share a `series_id`. `handleRecurrence` (called each sweep tick) selects `status='completed' AND recurrence IS NOT NULL`, computes the next occurrence with **`cron-parser` in the configured timezone** (`CronExpressionParser.parse(recurrence, { tz: TIMEZONE })` — a `0 9 * * *` fires 09:00 user-local), inserts a fresh `pending` row copying `series_id`/routing/content forward, then **clears the recurrence on the just-completed original** so it isn't re-cloned. **Drift-free** because next-run is computed from the cron schedule, not actual fire time.

---

### 12. Security & Isolation Model

The security philosophy: **limit attack surface by what's mounted**, not by app-level permission checks. Non-root `node` (uid 1000), ephemeral `--rm` containers, filesystem visible only via explicit mounts. Incoming messages are treated as potential prompt injection; the main self-chat group is trusted, non-main groups untrusted.

- **OneCLI Agent Vault (credential proxy):** real API credentials *never enter containers*. OneCLI runs as a transparent HTTPS proxy; the agent calls real API URLs directly (`curl https://api.github.com/...`) with **no auth headers**, and the proxy injects the stored credential by host+path match. MCP servers needing local credential files get `0600` stubs containing the literal placeholder `"onecli-managed"`, swapped on the wire. Each NanoClaw group gets its own OneCLI agent identity → per-group policies/rate-limits. The container skill `onecli-gateway/SKILL.md` teaches the agent how the proxy works, how to surface `connect_url` on 401/403, and to never ask for raw credentials. Spawn is **fail-closed**: if the gateway can't be wired, no container spawns.
- **Egress lockdown (`egress-lockdown.ts`, opt-in via `NANOCLAW_EGRESS_LOCKDOWN=true`):** places agents on a Docker `--internal` network (`nanoclaw-egress`) with *no internet route*; the OneCLI gateway is attached with alias `host.docker.internal` so the proxy is the *only reachable hop*. No iptables/host firewall — pure network-membership. The agent (non-root, no NET_ADMIN) cannot undo it. Throws `EgressLockdownError` rather than spawning with open egress; the host-sweep re-heals the network each tick (best-effort).
- **Mount security (`modules/mount-security/index.ts`):** validates user "additional mounts" against an allowlist *outside the project root* (`~/.config/nanoclaw/mount-allowlist.json`) so agents can't edit their own mount policy. Default-deny (missing/unparseable allowlist blocks all). Default-blocked patterns include `.ssh, .gnupg, .aws, .kube, .docker, .env, .netrc, .npmrc, id_rsa, id_ed25519, private_key, .secret` (merged with user additions, can't be removed). Symlinks are `realpathSync`-resolved before checks; container paths reject `..`/absolute/colons (the colon check blocks `-v` option injection); RW granted only when both the mount requests it and the matched root sets `allowReadWrite`; validated mounts land under `/workspace/extra/`.
- **Attachment safety (`attachment-safety.ts`):** `isSafeAttachmentName()` rejects `.`/`..`, separators, NUL bytes, and anything where `path.basename(name) !== name` before names reach a `path.join` sink.
- **Circuit breaker (`circuit-breaker.ts`):** crash-loop startup backoff persisted at `data/circuit-breaker.json`; schedule (seconds) `[0,0,10,30,120,300,900]` indexed by consecutive crashes within a 1h window, capped at 15 min; cleared on clean shutdown.
- **Upgrade tripwire (`upgrade-state.ts`):** refuses to boot unless `data/upgrade-state.json` (gitignored, so a `git pull` can't touch it) records the current `package.json` version reached via a sanctioned path. Fails closed (corrupt marker = trip), prints a recovery banner, exits 1. Clear with `pnpm exec tsx scripts/upgrade-state.ts set`.
- **Install-slug scoping (`install-slug.ts`):** `sha1(projectRoot)[:8]` → per-checkout launchd label (`com.nanoclaw-v2-<slug>`), systemd unit (`nanoclaw-v2-<slug>`), image base (`nanoclaw-agent-v2-<slug>`), and container label (`nanoclaw-install=<slug>`). So two installs on one host never clobber each other's service/images and orphan-reaping is install-scoped.
- **Supply chain:** `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (3 days — fresh packages can't install) and `onlyBuiltDependencies: [better-sqlite3, esbuild, protobufjs, sharp]` (the only packages allowed postinstall scripts). `.npmrc` mirrors `minReleaseAge=3d`. CLAUDE.md forbids bypassing without human sign-off.

`docs/docker-sandboxes.md` documents a *separate* opt-in MITM proxy (`:3128`, injects the Anthropic key, needs `NODE_EXTRA_CA_CERTS`) for micro-VM isolation — distinct from the OneCLI gateway (`:10255`).

---

### 13. Admin CLI (`ncl`)

`ncl <resource> <verb> [<id>] [--flags]`. On the host it connects via Unix socket (`src/cli/socket-server.ts`); inside containers it rides the session-DB transport (`container/agent-runner/src/cli/ncl.ts`). Resources: `groups` (incl. `config get/update`, `add-mcp-server`, `add-package`, `restart`), `messaging-groups`, `wirings`, `users`, `roles` (grant/revoke), `members`, `destinations`, `sessions` (RO), `user-dms` (RO), `dropped-messages` (RO), `approvals` (RO). Container-side write ops go through the approval flow. `cli_scope` (`disabled`|`group`|`global`, default `group`) controls what the agent can do via `ncl` — `group` auto-fills `--id`/group args and rejects cross-group access; `global` is unrestricted (auto-set for owner agent groups).

---

### 14. Setup, Deployment & Operations

- **`nanoclaw.sh`** (411 lines, `set -euo pipefail`): RAM/GCE/root pre-flights → runs `setup.sh` (Node + pnpm + native modules) under a spinner → `exec pnpm run setup:auto`. Hands off to Claude Code on any failure. `--uninstall` execs the slug-scoped uninstaller (removes only this copy's service/containers/image/data/groups/OneCLI agents; `--dry-run`/`--yes` flags; backs up `.env`).
- **`setup/auto.ts`** sequences: environment → container build → onecli → auth (provider picker; Claude OAuth/API-key/custom-endpoint) → mounts → service → cli-agent first-chat ping → timezone → channel pairing → verify. Env knobs: `NANOCLAW_DISPLAY_NAME`, `NANOCLAW_AGENT_NAME`, `NANOCLAW_AGENT_PROVIDER`, `NANOCLAW_SKIP`.
- **Service** (`setup/service.ts`, generated at runtime): macOS launchd plist (`RunAtLoad`+`KeepAlive`); Linux systemd unit (`Type=simple, Restart=always, RestartSec=5`; `loginctl enable-linger`; docker-socket ACL handling); nohup fallback for WSL.
- **Key env/config defaults** (`src/config.ts`): `ASSISTANT_NAME='Andy'` (→ trigger `@Andy`), `CONTAINER_TIMEOUT=1800000` (30 min), `IDLE_TIMEOUT=1800000`, `MAX_CONCURRENT_CONTAINERS=5`, `MAX_MESSAGES_PER_PROMPT=10`, `CONTAINER_MAX_OUTPUT_SIZE=10485760`, `TIMEZONE` from `TZ` (validated IANA, else UTC), `MOUNT_ALLOWLIST_PATH=~/.config/nanoclaw/mount-allowlist.json`. `env.ts` reads `.env` only for requested keys and deliberately does **not** load secrets into `process.env`.
- **CI (`.github/workflows/`):** `ci.yml` (format:check, host+container `tsc --noEmit`, vitest, bun test); `bump-version.yml` (auto patch-bump on `main`, repo-gated, GitHub App token); `label-pr.yml` (security-hardened `pull_request_target`, metadata-only, forbids checkout/exec of PR content); `update-tokens.yml` (regenerates the "repo tokens" README badge).
- **Debugging is AI-native:** no dashboard. Logs at `logs/nanoclaw.error.log` / `logs/nanoclaw.log`; per-session DBs under `data/v2-sessions/<group>/<session>/`. `/debug` skill drives troubleshooting.

---

### 15. Notable / Clever / Surprising Design Decisions

1. **Two single-writer SQLite files as the entire host↔container IPC.** No stdin, no sockets, no shared memory. The DB *is* the API. Eliminates a whole class of coupling bugs and makes the system mount-driven.
2. **Seq parity carries semantic meaning** (even=host/odd=container disambiguates message-id lookups without a join), not merely collision avoidance.
3. **`journal_mode=DELETE` + `mmap_size=0` + per-poll handle reopen** — a hard-won workaround for VirtioFS mmap-coherency on Docker Desktop macOS; documented as load-bearing with a "do not change without reading the comment block" warning.
4. **Corruption-streak self-exit (`process.exit(75)`)** — the container deliberately suicides on poisoned page-cache reads so the host respawns it with a fresh mount, because reopening in-process can't recover.
5. **Stuck detection from heartbeat-file mtime + Bash-declared-timeout**, not a wall-clock timer — long legitimate Bash runs extend the kill ceiling honoring the agent's own declared timeout.
6. **`on_wake` column race fix** — wake messages are only visible to a fresh container's first poll, so a dying container in its SIGTERM grace can't steal them; restart uses an `onExit` callback to guarantee ordering.
7. **Migration uniqueness keyed on `name`, not `version`** — lets independently-developed skill modules add migrations without coordinating version numbers.
8. **Credentials never enter the container** — transparent HTTPS proxy injection with `"onecli-managed"` placeholder stubs; agent sets no auth headers and literally cannot read secrets from env/files/`/proc`.
9. **Egress lockdown via Docker `--internal` network membership** rather than iptables — the gateway is the only reachable hop, unbypassable by a non-NET_ADMIN agent.
10. **Upgrade tripwire that exploits gitignore** — the marker lives in `data/` so a raw `git pull` bumps the code version but leaves the marker stale, tripping the boot gate.
11. **Skills-not-features governance** — trunk is *pure registry/infra*; channels and providers live on long-lived sibling branches and are copied in per-fork. "Only security fixes, bug fixes, and clear improvements" accepted to trunk; everything else is a skill.
12. **CLAUDE.md recomposed from fragments every spawn** — agent self-edits to the composed file are intentionally clobbered; only `CLAUDE.local.md` persists. Self-modification is the *intended* customization path (the AI edits its own fork).
13. **Push-based `MessageStream` prompt to keep the SDK's `isSingleUserTurn` false** — a reverse-engineered fix (documented in `SDK_DEEP_DIVE.md`) so agent-team subagents don't get killed by stdin close.
14. **`hasTable()` degrade-silently pattern** — uninstalled modules don't raise SQLite errors; the codebase tolerates missing tables everywhere, enabling the skill/module pluggability model.

---

### 16. Problems / Caveats Encountered

- **Local clone is single-commit** (shallow) — full git history unavailable; CHANGELOG used as the history source instead.
- **Doc drift:** `docs/architecture.md` and `docs/agent-runner-details.md` describe an *older* interface shape (separate `sessionId`/`resumeAt`, `systemPrompt` string, multimodal `ContentBlock[]`, built-in Codex/OpenCode providers, a `send_to_agent` tool). The shipped trunk code uses a leaner `continuation`-based provider interface and ships only `claude` + `mock`; `send_to_agent` was removed. Treat source as ground truth over those two docs.
- **`container-runtime.ts` is Docker-only in code** — there is no Apple Container branch despite README/FAQ references to Apple Container support (the only platform branch is a Linux `host-gateway` add-host). The "swap runtimes by changing one file" claim is aspirational.
- **`stopContainer` comment claims `execFileSync` but uses `execSync` with string interpolation** — safety rests entirely on the name regex guard `/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/`.
- **`nonMainReadOnly` config key** in the mount-allowlist example is documented but not read by the mount-security module (enforced elsewhere in the group-mount path).
- **Two distinct proxy mechanisms** coexist in the docs (OneCLI gateway `:10255` vs Docker-Sandbox MITM `:3128`) — easy to conflate.

---

*Assessment complete. All file paths above are relative to `/tmp/bitsafe/repos/nanoclaw/`.*


---

# Appendix

## A. Image inventory (25 files)

All downloaded from the beehiiv CDN (`media.beehiiv.com`). Cover = title card; diagram = in-body figure.

| Local file | Article | Kind |
|---|---|---|
| art01-cover.png / art01-diagram2.jpg | 01 Notion P1 | cover / diagram |
| art02-cover.png / art02-diagram3.jpg | 02 Notion P2 | cover / diagram |
| art03-cover.png / art03-diagram4.jpg | 03 Notion P3 | cover / diagram |
| art04-cover.png / art04-diagram5.jpg | 04 Notion P4 | cover / diagram |
| art05-cover.png | 05 Notion P5 | cover |
| art06-cover.png / art06-diagram6.jpg | 06 NanoClaw P1 | cover / diagram |
| art07-cover.png / art07-diagram7.jpg | 07 NanoClaw P2 | cover / diagram |
| art08-cover.png | 08 NanoClaw P3 | cover |
| art09-cover.png | 09 NanoClaw P4 | cover |
| art10-cover.png | 10 NanoClaw P5 | cover |
| art11-cover.png / art11-diagram8.jpg | 11 Why Not Claude App | cover / diagram |
| art12-cover.png / art12-diagram9.jpg | 12 Invisible Seam | cover / diagram |
| art13-cover.png / art13-diagram10.jpg | 13 Measuring an AI OS | cover / diagram |
| art14-cover.png / art14-diagram1.jpg / art14-diagram2.jpg | 14 Overview | cover / 2 diagrams |

## B. Source URLs

Blog series (blog.bitsafe.finance/p/...):
- `how-bitsafe-runs-on-notion-part-1-notion-as-the-company-os`
- `how-bitsafe-runs-on-notion-part-2-the-architecture`
- `how-bitsafe-runs-on-notion-part-3-agents-automations-and-the-ai-layer`
- `how-bitsafe-runs-on-notion-part-4-replacing-salesforce-with-notion`
- `how-bitsafe-runs-on-notion-part-5-the-agent-governance-model`
- `nanoclaw-part-1-building-a-company-wide-ai-assistant`
- `nanoclaw-part-2-the-architecture`
- `nanoclaw-part-3-the-autonomous-engine`
- `nanoclaw-part-4-the-substrate`
- `nanoclaw-part-5-working-with-nanoclaw`
- `why-not-just-use-the-claude-app-same-brain-different-body`
- `the-invisible-seam-how-our-workspace-ai-and-our-autonomous-agent-hand-off-work`
- `measuring-an-ai-os-honestly-what-we-track-and-what-we-refuse-to-claim`
- `the-infrastructure-mindset-turned-inward-how-bitsafe-runs-on-ai`

GitHub:
- `https://github.com/Akibalogh/bitsafe-ai-docs`
- `https://github.com/qwibitai/nanoclaw`

Also referenced: `hub.bitsafe.finance` (BitSafe's article hub).
