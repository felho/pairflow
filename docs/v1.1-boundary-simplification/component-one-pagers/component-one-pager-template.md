# [Component Name]

Status: draft
Owner: TBD
Scope: M0|M1|Later

## 1) Purpose

- Miert letezik a komponens.
- Milyen rendszerszintu problemat old meg.

## 2) Responsibilities

- Mit csinal a komponens.
- Mi a kotelezo minimalis funkcionalitas.

## 3) Non-Responsibilities (Anti-goals)

- Mit NEM csinalhat.
- Mit kell masik komponensnek csinalnia.

## 4) Boundary and Dependencies

- Ki hivhatja.
- Mit hivhat o.
- Tiltott fuggosegek.

## 4.1 Ownership Split (ha tobb komponenssel oszt felelosseget)

- Pontosan mi az o kizarolagos felelossege.
- Mi a szomszedos komponens kizarolagos felelossege.
- Milyen atadasi contract validalja az ownership hatart.

## 5) Input Contract

- Bemeneti adatszerkezetek.
- Validacios szabalyok.

## 6) Output Contract

- Kimeneti adatszerkezetek.
- Stabil mezok, amikre mas komponens epitheti a logikat.

## 7) Invariants

- Milyen allapotok/szabalyok nem serulhetnek.
- Milyen ordering/consistency szabaly kotelezo.

## 8) Error Model

- Milyen `PairflowError.code` ertekek jelenhetnek meg.
- Milyen `context` mezok kotelezoek.

## 9) Observability

- Milyen event/log/metric jelek kotelezoek.
- Mi a minimum diagnosztikai adat incidenthez.

## 10) Tests

- Unit: mit kell lefedni.
- Integration: melyik kritikus flow-ban kell bizonyitani.
- Regression: milyen korabbi bug osztalyra ved.

## 11) Migration Notes

- Hogyan vezetjuk be fokozatosan.
- Fallback/rollback szabaly.

## 12) Done Criteria

- Mikor tekintheto kesznek a komponens.

## 12.1 Green Criteria (architecture fitness)

- Mitol lesz ez a komponens boundary/ownership szempontbol "zold".
- Melyik 2-3 konkret teszt vagy CI check bizonyitja ezt.
