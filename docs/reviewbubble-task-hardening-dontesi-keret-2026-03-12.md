# ReviewBubble jegyzet: task-fokusz vs hardening dontesi keret

Datum: 2026-03-12
Forras: belso egyeztetes a `stripe-v2-s06-individual-lockout-checkout-paid` bubble review loop alapjan.

## Mi a problema

A deep review korokben keveredik:
- a konkret task acceptance criteria validacioja,
- az altalanos hardening es jovobeni edge case kockazat.

Ettol a bubble konnyen rework loop-ba kerul, akkor is, ha a task-funkcio mar valojaban kesz.

## Cel

Kulon kezelni:
1. mi blokkolja a task lezarasat most,
2. mi fontos, de nem task-blocker (hardening backlog),
3. mi spekulativ es alacsony prioritas.

## 1) Ket tengelyes finding-osztalyozas

### A. Task-kotottseg
- `TaskCritical`: kozvetlenul serti a task szerzodest / acceptance criteriont.
- `TaskAdjacent`: erinti a valtoztatott teruletet, de nem sert szerzodest.
- `Hardening`: jovoallosag, stabilitas, defenziv javitas; nem konkret task-szerzodes.

### B. Bizonyitottsag
- `Strong`: reprodukalhato most, vagy van failing test.
- `Medium`: konkret code path + realis trigger van, de nincs repro.
- `Weak`: spekulativ, jelen konfiguracioban nem igazolt.

## 2) Review dontesi szabaly (rework vs approve)

Rework blocker csak akkor:
- `TaskCritical + (Strong vagy Medium)`.

Nem-blocker (default):
- `TaskAdjacent` es `Hardening` findingok, ha nincs azonnali release-risk.

Kivetel:
- Ha hardening release-risk kategoriaba esik (lasd lent), akkor szinten blocker lehet.

## 3) Hardening atkeretezese: ne "optional", hanem release-risk

A "nem most javitjuk" csak akkor elfogadhato, ha mind a 4 feltetel teljesul:
1. Alacsony valoszinuseg.
2. Korlatozott impact (nincs security/pénzügyi/data loss/lockout kritikus hatas).
3. Jo detektalhatosag (log/alert megfogja).
4. Van mitigacio (rollback/flag/manual runbook).

Ha barmelyik hianyzik: `fix now`.

## 4) Hardening osztalyok (H0-H3)

- `H0 – Release blocker`: security, jogosultsag, penzugyi hiba, adatkorruptcio, kritikus lockout.
  - Szabaly: release elott kotelezo javitas.
- `H1 – Stabilitasi adossag`: nem azonnali blocker, de rovid SLA-val kotelezo (pl. 7 nap).
- `H2 – Operacios/observability`: tervezetten javitando (pl. 30 nap).
- `H3 – DX/cleanliness`: backlog, nincs release gate.

## 5) Kotelezo mezok minden halasztott hardening itemhez

Ha valamit nem fix-now-ra teszunk, kotelezo:
1. hiba-mod leiras,
2. trigger feltetel,
3. impact,
4. mitigacio,
5. owner,
6. due date,
7. kovetkezmeny, ha a due date-ig nem keszul el.

Owner + due date nelkul az item nem backlog, hanem lezaratlan kockazat.

## 6) Javasolt ReviewBubble workflow valtoztatas

A review output minden findinghoz kotelezoen adja meg:
- `TaskCategory`: TaskCritical | TaskAdjacent | Hardening
- `EvidenceStrength`: Strong | Medium | Weak
- `ReleaseRiskClass`: H0 | H1 | H2 | H3
- `Decision`: Blocker-now | Backlog-with-SLA

## 7) Operativ guardrail a rework loop ellen

- Round cap ugyanarra a scope-ra (pl. max 2 egymast koveto rework).
- Round cap utan:
  - TaskCritical blocker issue-k maradnak reworkban,
  - tobbi kotelezoen backlog ticket + SLA.

## 8) Prompt/policy pontositas deep reviewhoz

A deep review alapertelmezett celja:
- "task-related validation first".

Ha altalanos hardening finding is van:
- ne keveredjen blocker listaba automatikusan,
- menjen kulon "Hardening backlog" szekcioba H-osztallyal es SLA-javaslattal.

---

Ez egy elokeszito jegyzet. Kovetkezo lepesben ebbol lehet formalis ReviewBubble workflow/spec valtozas (prompt schema + gate szabaly + artifact format) dokumentumot irni.
