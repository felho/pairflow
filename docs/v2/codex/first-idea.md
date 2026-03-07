Kiinduló metafórának ezt javaslom a v2-höz: **„workflow kernel + csatorna adapterek”**.  
A kernel dönti el az állapotot és a szabályokat, a csatornák (CLI, GitHub, Slack, stb.) csak be-/kimeneti felületek.

**Fő entitások (v2, high-level)**
1. `WorkflowTemplate`: deklaratív leírás (állapotok, átmenetek, gate-ek, role-ok).
2. `WorkflowInstance` (mai bubble): futó példány, saját state + context + artifactok.
3. `Role`: implementer/reviewer/operator/human.
4. `Actor`: konkrét végrehajtó (Codex, Claude, user, automation bot).
5. `CapabilityProfile`: role+state alapú jogosultság (ki milyen parancsot adhat ki).
6. `EventEnvelope`: minden input normalizált esemény (channel-agnosztikus).
7. `PolicyModule`: különálló szabálymodulok (convergence, doc-quality, approval, security).
8. `GateDecision`: policy-k összesített döntése (allow/block/defer + indok).
9. `HelpRequest` subworkflow: explicit „I need help” ág, visszatérés RUNNING-be.
10. `RuntimeTarget`: local vagy remote sandbox végrehajtás, reconnect-képesen.

**Kapcsolati logika**
1. Channel input -> `EventEnvelope` -> kernel.
2. Kernel state + `CapabilityProfile` ellenőrzés.
3. Elfogadott esemény -> `PolicyModule` értékelés -> `GateDecision`.
4. Döntés alapján transition, artifact írás, routing következő actorhoz.
5. `HelpRequest` külön alfolyamat, nem ad-hoc megszakítás.

**Amit ez rögtön megold**
1. Docs-only és globális logika szétválasztása: külön policy modulok.
2. Multi-channel működés: ugyanaz a kernel, cserélhető adapterek.
3. Agent jogkorlátozás: subject agent nem tud lifecycle-admin műveletet futtatni.
4. Remote sandbox irány: runtime target absztrakcióval beépíthető.

**V2 minimál kezdés (nem mély, de konkrét)**
1. `workflow template` formátum bevezetése.
2. `capability profile` modell bevezetése state/role alapon.
3. Policy engine szétvágása modulokra (monolit konvergencia helyett).
4. `help` subworkflow első verziója.
