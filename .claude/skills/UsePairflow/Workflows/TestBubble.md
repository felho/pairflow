---
description: Generate an operator-ready manual test execution report with fixture matrix, browser/session isolation, click-by-click actions, and console-first commands
argument-hint: [--mode quick|default] [--task-file <path>] [--task <text>] [--app-url <url>] [--firm-id <id>]
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

# Test Bubble

## Purpose

Produce a fully executable manual test runbook for a bubble/task so a tired operator can run it end-to-end without interpretation.

The report must be explicit about:
- which user accounts are required,
- how many browser sessions are needed,
- where to click in each step,
- which console commands to run,
- what PASS/FAIL means,
- and final GO/NO-GO decision rules.

## Variables

MODE: extracted from `--mode`, default `default`  
TASK_FILE: extracted from `--task-file` (optional)  
TASK_TEXT: extracted from `--task` (optional)  
APP_URL: extracted from `--app-url`, default `http://localhost:3000`  
FIRM_ID: extracted from `--firm-id` (optional)

## Instructions

- This workflow is docs/report generation only. Do not implement product code.
- Use `MODE=quick` for critical smoke coverage only.
- Use `MODE=default` for the full recommended manual coverage.
- Always generate a browser/session plan that prevents account overlap.
- Prefer console-first checks over deep click-only verification.
- If a fixture is unknown or missing, mark it clearly as `MISSING FIXTURE` with skip rule.
- Use deterministic test IDs (`SMK-*` in quick mode, `TC-*` in default mode).
- Keep action steps imperative and short (`Open`, `Login`, `Run`, `Verify`).
- Treat browser reload/navigation as volatile state: helper objects on `window` can disappear, so recovery steps must be explicit in the report.

## Workflow

### 1. Resolve scope and source material

1. If `TASK_FILE` is provided, read it and extract acceptance gates, test matrix, role policy, and fallback rules.
2. Else if `TASK_TEXT` is provided, derive the same from text.
3. Else use conversation context.
4. If the task contains a known policy matrix (for example billing lockout lifecycle), preserve its terminology in fixtures and expected results.

### 2. Build fixture matrix

1. Split fixtures into:
   - `Required` (minimum GO/NO-GO set)
   - `Extended` (edge cases)
2. For each fixture, output:
   - fixture ID
   - account type
   - expected business state
   - where it is used (test IDs)

### 3. Build no-overlap browser/session topology

Always emit a dedicated section with exact session assignment.

Minimum standard topology:
1. `B1` normal profile (primary sequential user switching)
2. `B2` private/incognito profile (secondary concurrent role)
3. `B3` second browser private profile (third concurrent role)

Rules:
1. One logged-in user per session.
2. Never test two roles in one active session without logout.
3. If three concurrent roles are required (for example owner/admin/member), use all three sessions in parallel.

### 4. Include one-time setup block

Must include:
1. app start command (if relevant),
2. pages to open in each browser session,
3. console helper script block to paste once per browser session and re-paste after every full page reload/navigation in that session.
4. an explicit "refresh recovery" note: if helper is missing (`window.<helper>` undefined), re-run helper block before continuing tests.
5. an explicit firm-context note: after reload, re-apply firm selector/context (`setFirm(...)` or equivalent) before API calls.

For billing UI/search lockout style tasks, use this helper:

```js
window.billingTest = {
  bootstrap: async (preferredFirmId = null) => {
    const res = await fetch('/api/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredFirmId }),
      cache: 'no-store'
    });
    const json = await res.json();
    console.log('payment:', json.payment);
    return json;
  },

  ctaLinks: () =>
    [...document.querySelectorAll('a')]
      .filter(a => /Szamlazas|Elofizetes|Fizetes/i.test((a.textContent || '').trim()))
      .map(a => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') })),

  bannerText: () => {
    const p = [...document.querySelectorAll('p')].find(x =>
      /turelmi ido lejart|Fizetese lejart|elofizetes jelenleg nem aktiv|havi keresesi keret/i
        .test((x.textContent || '').trim())
    );
    return p ? p.textContent.trim() : null;
  },

  hasUsageCard: () =>
    [...document.querySelectorAll('*')].some(x =>
      /Havi keresesi keret/i.test((x.textContent || '').trim())
    ),

  hasSearchInput: () => !!document.getElementById('search-view-input'),

  switchFirmContext: (firmId = null) => {
    if (firmId) localStorage.setItem('currentFirmId', firmId);
    else localStorage.removeItem('currentFirmId');
    location.reload();
  },

  snapshot: async (preferredFirmId = null) => {
    const boot = await window.billingTest.bootstrap(preferredFirmId);
    return {
      payment: boot.payment,
      bannerText: window.billingTest.bannerText(),
      ctaLinks: window.billingTest.ctaLinks(),
      hasUsageCard: window.billingTest.hasUsageCard(),
      hasSearchInput: window.billingTest.hasSearchInput(),
      path: location.pathname
    };
  }
};
```

When reports use a task-specific helper (for example `window.s10bTest`), require this preflight at the top of each test `Console` block:

```js
const FIRM_ID = '<firm-id>';
if (!window.s10bTest) {
  throw new Error('Helper missing after reload. Re-run the One-Time Setup helper block first.');
}
window.s10bTest.setFirm(FIRM_ID);
```

### 5. Generate mode-specific test plan

#### Quick mode (`--mode quick`)

Generate a compact smoke plan with only critical business risk checks.

Recommended structure:
1. `SMK-01` Active baseline (service allowed, no false lock)
2. `SMK-02` None/free blocked (hard lock + correct billing CTA)
3. `SMK-03` Canceled but usable (semantic separation from hard lock)
4. `SMK-04` Past-due hard lock (fail-closed lock behavior)
5. `SMK-05` Role policy (owner actionable vs admin/member info-only)
6. `SMK-06` Search vs banner parity (same policy decision across surfaces)

Optional in quick mode:
1. `SMK-07` Invalid CTA path fallback

#### Default mode (`--mode default`)

Generate full recommended manual plan, including edge cases.

For billing alignment tasks, include:
1. Baseline lifecycle cases (active, none blocked, canceled usable, past_due grace, past_due hard_lock)
2. Role-policy matrix (owner/admin/member)
3. Parity checks across search and banner
4. Trial date sanity and canonical field behavior
5. Invalid/malformed CTA path fallback behavior
6. Inconsistent state fail-closed checks (if fixture exists)

### 6. Enforce per-test execution format

Every test must include these fields in this order:
1. `User`
2. `Browser session`
3. `Start URL`
4. `Clicks`
5. `Console` (must start with preflight: helper-presence check + firm-context set/reset)
6. `Expected PASS`
7. `Mark FAIL if`

### 7. Build GO/NO-GO rule block

Output explicit decision criteria:
1. `GO` conditions (all required tests pass + no policy leaks)
2. `NO-GO` blockers (parity mismatch, wrong CTA route, role authority leak, lifecycle copy contradiction)

### 8. Build operator result sheet

Add a fillable checklist table:
- test ID
- pass/fail
- evidence note (short)

## Report (mandatory output shape)

Use this exact section order:

1. `Execution Goal`
2. `Required Fixtures`
3. `Browser Plan (No Overlap)`
4. `One-Time Setup`
5. `Test Steps`
6. `GO / NO-GO`
7. `Result Sheet`

## Invocation examples

```bash
# Quick smoke for critical coverage only
TestBubble --mode quick --task-file @progress/active/stripe-v2/tasks/stripe-v2-s13-billing-ui-alignment.md

# Full recommended manual plan
TestBubble --mode default --task-file @progress/active/stripe-v2/tasks/stripe-v2-s13-billing-ui-alignment.md

# Inline scope without task file
TestBubble --mode quick --task "Manual test plan for billing lockout CTA and role-policy parity"
```

## STOP

Do not execute lifecycle state mutations in this workflow.
This workflow only produces an execution report.
