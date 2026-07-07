# Changelog

All notable changes to `@pairflow/cli` are recorded here.

This file is maintained by Release Please from accepted conventional commits.
Manual edits are limited to the initial baseline or release-tool recovery.

## [0.3.0](https://github.com/felho/pairflow/compare/v0.2.0...v0.3.0) (2026-07-07)


### Features

* **v3:** coverage-accounting script + CI wiring; chapter 3 DoD closed (plan ch3 §3.4, §3.6) ([b586cb2](https://github.com/felho/pairflow/commit/b586cb28b43a8a028e72ce7120f28fddd7383faa))
* **v3:** emit-lib — op_id derivation per operation family (plan ch3 §3.5, ADR-004) ([ba09d7d](https://github.com/felho/pairflow/commit/ba09d7d97b9bd9755ac17bbbfce59a91c27390a1))
* **v3:** lint layer — CHK-D-NOCLOCK, import boundaries, CHK-D-TESTCLOCK, no-randomness (plan ch3 §3.3) ([4b819b8](https://github.com/felho/pairflow/commit/4b819b81e4143f0d10c2e3728aac93a55f34ed78))
* **v3:** packet ch4-P1 — domain first slice + StorePort/DefinitionStore port types ([d7d51db](https://github.com/felho/pairflow/commit/d7d51db55cc89c54f4f9bad589b14c2a72039d2a))
* **v3:** packet ch4-P2 — SQLite store: schema, marker, fail-closed, txn shape ([edf096e](https://github.com/felho/pairflow/commit/edf096e532e69c8100453ac23c3aa9ab79975218))
* **v3:** packet ch4-P3 — L0b kernel HANDLE + dispatch_intent + ingress (CT-A1-DUP) ([fd49ef9](https://github.com/felho/pairflow/commit/fd49ef91867cb08036e1070ede33b3832a63780e))
* **v3:** packet ch4-P4 — bootstrap, MD-1 fixture, floor read, l0b golden trace ([3308256](https://github.com/felho/pairflow/commit/33082562b42e8bcf03660a3f4c519c01cca8946e))
* **v3:** packet ch5-P1 — the PI-3 drift suite: three unconditional locks ([a82fbba](https://github.com/felho/pairflow/commit/a82fbba7dceeda5c14d91c111fdb8199d061343a))
* **v3:** packet ch5-P2 — invariant disposition map + post-condition checker kit ([e175b5c](https://github.com/felho/pairflow/commit/e175b5ccf4d75c802fae477bc60d5e97926e8600))
* **v3:** packet ch5-P3 — chapter-trace golden harness, level-lifting, the l0a trace ([6bd3933](https://github.com/felho/pairflow/commit/6bd393322c8fe98a5564fce9de41953adf161a54))
* **v3:** packet ch5-P4 — the digest slice: op_id_collision, schema v2, ADR-008 ([1a66107](https://github.com/felho/pairflow/commit/1a661078cd4df7381dd517253e4032343f3a53c8))
* **v3:** packet ch5-P5 — CT-A3-RETRANS/REFRESH + CT-B-TWOWORKER (test-only flow) ([944ab1c](https://github.com/felho/pairflow/commit/944ab1c59e9c1b73c670006869350d64c570d0ef))
* **v3:** ports content + test kit + vitest wiring (plan ch3 §3.1–3.2) ([23ca404](https://github.com/felho/pairflow/commit/23ca404b5bf88bed8345e6ea7b334a5736ce60ca))


### Bug Fixes

* **ci:** serialize ui dependency install ([9371135](https://github.com/felho/pairflow/commit/93711354d8dbd41201f645c192f3e21f8ae7ce03))
* **ci:** teach the ci-local command-order test the v3 install step ([3835dc4](https://github.com/felho/pairflow/commit/3835dc4913a3c50f110ae7f36a4ee2a5b5b36e9f))
* **docs:** compact paired diff replacements in core model ([8c55126](https://github.com/felho/pairflow/commit/8c5512619e658182829e71533e75daf6ca575723))
* **docs:** improve core model code diff alignment ([1ef1850](https://github.com/felho/pairflow/commit/1ef18501c2b843ef7f04f15de65e964da6b0ff79))
* **docs:** neutralize blank-only code diff rows ([1dfb174](https://github.com/felho/pairflow/commit/1dfb17469257279e867c4f5f64d7b47efc10bb86))
* **v3:** a shared_ownership co_owner must itself declare the item ([e62034f](https://github.com/felho/pairflow/commit/e62034ff2c3ef874868f0e717f99f5a8e120e536))
* **v3:** array canonicalization rejects sparse arrays and non-index properties ([305e2f4](https://github.com/felho/pairflow/commit/305e2f457960f11e2782937a1c80814de89a5347))
* **v3:** canonicalizable means enumerable data properties — hidden toJSON can no longer rewrite the persisted value ([4eaa09f](https://github.com/felho/pairflow/commit/4eaa09f11e72471fac4f3072eb6cc22212e2e4d5))
* **v3:** emit canonicalization rejects what it cannot pin down ([36485e7](https://github.com/felho/pairflow/commit/36485e79eb2b39e53447b0f34ee8d5f3cb9d0c36))
* **v3:** ingress admits only round-trip-safe payloads; strict claim covers symbols ([09ea638](https://github.com/felho/pairflow/commit/09ea6388e40b7436457c1f7249ba070f491a3017))
* **v3:** kernel import boundary becomes an allowlist — the lint now proves its claim ([eba60a3](https://github.com/felho/pairflow/commit/eba60a34f882ede603e5173354411288f9af65af))
* **v3:** pin the array prototype — a custom array proto smuggled the same toJSON rewrite ([d62bc02](https://github.com/felho/pairflow/commit/d62bc028d38c28cb8b8c6b31daea48fb49de7289))
* **v3:** reject negative zero — and run the round-trip dimension sweep the log demanded ([22ef1a5](https://github.com/felho/pairflow/commit/22ef1a512883576d7b491da1a71bc69797a5a947))
* **v3:** restore ci-github-local parity with the release validate job ([870f4c4](https://github.com/felho/pairflow/commit/870f4c42fc6fc022b6b1a981dc74ea3760426b55))
* **v3:** validate shared_ownership references; adopt the claim-derived negative-test rule ([b0127b0](https://github.com/felho/pairflow/commit/b0127b04ce1fe34bfe73da8a1785aff28f9c4743))


### Performance Improvements

* **build:** enable incremental typecheck and build ([c434f37](https://github.com/felho/pairflow/commit/c434f37d0cd3789c2dc88471f3ba850324e22b25))
* **ci:** cache eslint lint results ([19084ed](https://github.com/felho/pairflow/commit/19084edb677026519e176b851e756e540edc2947))
* **ci:** cap vitest workers in parallel ci branches ([ac138b5](https://github.com/felho/pairflow/commit/ac138b5c580f89b190ff303aa1e04d428711a98b))
* **ci:** drop unsound eslint cache from lint gates ([9a0e9d4](https://github.com/felho/pairflow/commit/9a0e9d46206a1f0eec7dedbd4c3eccad713ae374))
* **ci:** parallelize ci-local quality checks ([7f48639](https://github.com/felho/pairflow/commit/7f48639ec8b74fb5c74bc4e90c77236589707d52))
* **ci:** parallelize eslint with bounded concurrency ([b815823](https://github.com/felho/pairflow/commit/b815823e9d372a4ab7d198a6c9c2cdf808ab0e1d))
* **ci:** parallelize final ci-local gates ([a7ecddd](https://github.com/felho/pairflow/commit/a7ecdddea55bd68aacf93c0ffeb822764087429a))
* **ci:** parallelize local validation suites ([68563a5](https://github.com/felho/pairflow/commit/68563a5b9a1e998a29913c74a2758c463e12b52a))
* **test:** avoid converged candidate worktree setup ([d49c5f4](https://github.com/felho/pairflow/commit/d49c5f44f29d0c9ade3c839c849ffa2388112881))
* **test:** avoid duplicate commit message CLI subprocess ([5a2b710](https://github.com/felho/pairflow/commit/5a2b71028d36716fe370a9d3d18fd285d2dea5f0))
* **test:** avoid range validator tsx subprocesses ([1da0895](https://github.com/felho/pairflow/commit/1da0895d3492bd6ac1a41e36b7d6e34846662907))
* **test:** avoid worktree setup in evidence tests ([7b885a7](https://github.com/felho/pairflow/commit/7b885a7a7689c43d18817c722b024a42d5d80d29))
* **test:** bypass shell for fitness report cases ([a2190e6](https://github.com/felho/pairflow/commit/a2190e69aa77ed23a4c36ae2756598e6b18861f3))
* **test:** lighten start resume fixtures ([7c60fa2](https://github.com/felho/pairflow/commit/7c60fa2fcce189d9aa2ed7961275d2d4b5312ea6))
* **test:** move pass reviewer focus delivery coverage ([fcf3578](https://github.com/felho/pairflow/commit/fcf3578387291b29932b2954d00bc34fb3e8f431))
* **test:** move pass summary variants to domain tests ([c816145](https://github.com/felho/pairflow/commit/c816145605f27dc69fb6ace2b173adbc5056418b))
* **test:** narrow ci-local codex path fixture ([28b0068](https://github.com/felho/pairflow/commit/28b00680ee8b5244a3b66b16968857a3f42a0a4d))
* **test:** narrow pass activation coverage ([ad47ee1](https://github.com/felho/pairflow/commit/ad47ee1092ee7ce923c98f0942dd525a35aca537))
* **test:** narrow pass auto-converge coverage ([9656b2a](https://github.com/felho/pairflow/commit/9656b2a9e8f5879d659c1a5ad0f7ae0b39f42260))
* **test:** narrow pass blocker findings coverage ([6c96046](https://github.com/felho/pairflow/commit/6c96046cc206baef2dc4e1cbaa2c61f2e311efc4))
* **test:** narrow pass delivery coverage ([5fc6943](https://github.com/felho/pairflow/commit/5fc694381168394c29f21319bbf9a148ad381599))
* **test:** narrow pass doc-gate coverage ([1764e82](https://github.com/felho/pairflow/commit/1764e82f6d6f151071e0dd41e8726b66add62627))
* **test:** narrow pass findings coverage ([976f1bf](https://github.com/felho/pairflow/commit/976f1bf57437b79b5dbaa97e26c9a7efb979a384))
* **test:** narrow pass intent override coverage ([b7ac051](https://github.com/felho/pairflow/commit/b7ac051421b5440c0c3ff48ef4511998f4a9649d))
* **test:** narrow pass post-gate coverage ([ad87243](https://github.com/felho/pairflow/commit/ad8724318ef848c50a1acb39d18f0f08dd6dc768))
* **test:** narrow restart reviewer recovery case ([9e5d5c7](https://github.com/felho/pairflow/commit/9e5d5c745c273bcfa42b81ac7db0422731111c05))
* **test:** preserve smoke tmux marker state ([b973017](https://github.com/felho/pairflow/commit/b97301703c7a3e5114d77d386c9dd8ed587ee777))
* **test:** reduce ci fixture and smoke timing ([f3eb147](https://github.com/felho/pairflow/commit/f3eb14791b5b0d7f8d5ee232aafbc18088bb9ed8))
* **test:** remove real waits from tmux delivery tests ([5deaace](https://github.com/felho/pairflow/commit/5deaacec43d35957e835ec45ef95ba52a55331f6))
* **test:** reuse git repo fixtures ([ef6fa86](https://github.com/felho/pairflow/commit/ef6fa86a6c5ab11e9cfcdbaea108dfaa09f3dede))
* **test:** run root and UI test suites in parallel ([5cc3888](https://github.com/felho/pairflow/commit/5cc3888ee71a61c9676554486eef8d7e7a0b2adc))
* **test:** seed approved commit fixture ([c014054](https://github.com/felho/pairflow/commit/c014054c750c22fef410c267316ce143948152fe))
* **test:** seed converged candidate fixture directly ([bac977c](https://github.com/felho/pairflow/commit/bac977c28f0d1f391ccb3197369633a40e114952))
* **test:** seed pass non-clean history ([c691061](https://github.com/felho/pairflow/commit/c6910611067cbbeb7e3e5d5b1edb5e84df2a2338))
* **test:** seed repeat-clean pass history ([54c3575](https://github.com/felho/pairflow/commit/54c35752e2df310aedd5fe9af8dabae1e1afda4b))
* **test:** seed watchdog running fixtures ([fa114a9](https://github.com/felho/pairflow/commit/fa114a97e4c78c5efe9996a8a590b8392775abe8))
* **test:** share worker module registry outside mock quarantine ([c18b0e5](https://github.com/felho/pairflow/commit/c18b0e51422fec4501af9009d8ecbaec6a93fc9c))
* **test:** skip codex path filtering in range tests ([f7909d2](https://github.com/felho/pairflow/commit/f7909d2b91cf4a4a426740222bc1f840bc913e31))
* **test:** split pass validation cases ([7db54bd](https://github.com/felho/pairflow/commit/7db54bd625c7a9f1e73aa3a46b067502ad78ea02))
* **test:** split slow integration suites ([62bcd09](https://github.com/felho/pairflow/commit/62bcd09eac545f3a1483701fd69fe628d4413bbe))
* **test:** trim pass summary matrix integration cases ([307071e](https://github.com/felho/pairflow/commit/307071ee37f2df042f52988536fb49c098cf1665))

## [0.2.0](https://github.com/felho/pairflow/compare/v0.1.0...v0.2.0) (2026-06-08)

### Features

- **skills:** add skills install command ([e112082](https://github.com/felho/pairflow/commit/e11208243155a4fd08bbd6421ec64ca4eaaadbde))
- **ui:** add service lifecycle commands ([7fd1a30](https://github.com/felho/pairflow/commit/7fd1a300fa1ed150aa6c47f72cdd71051d891b1b))

### Bug Fixes

- **release:** align release validator with skill packaging ([3d6b58b](https://github.com/felho/pairflow/commit/3d6b58b70790cce994829c5bfc7e8044d4aa9ced))
- **start:** inject codex mcp resolver ([a460eb3](https://github.com/felho/pairflow/commit/a460eb31e9b827003d13338f96ee5e6565ae7851))

### Release Process

- Stabilized the release validation path by isolating CI-sensitive UI retry
  tests and aligning local checks with GitHub Actions behavior.

## 0.1.0

Initial local package baseline for Pairflow release automation.
