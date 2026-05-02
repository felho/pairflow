# Capability Closure Gate

Use this gate when a PRD, Plan, Task, or ReviewSpec makes a claim that a
capability will be usable by a user, operator, system, agent, scheduler,
webhook, CLI, UI, CI/CD step, notification path, import/export path, background
job, or config-driven runtime behavior.

The purpose is to verify claim truthfulness: the artifact must not say a
capability is complete unless the activation path, ownership boundary, output
contract, and last-mile proof are explicit.

## Trigger

Run this gate when any of the following is true:

1. The objective, Done Definition, acceptance criteria, validation strategy, or
   task scope claims that behavior is usable, automated, activated, integrated,
   wired, supported, configured, available, or end-to-end.
2. A CLI/UI/operator/system workflow is introduced or changed.
3. A webhook, scheduler, daemon, agent runner, CI/CD/deploy path, notification,
   background job, import/export pipeline, or external integration is introduced
   or changed.
4. Runtime behavior depends on config, env, feature flag, local executable,
   external service, installed tool, or operator-provided component.
5. A task closes a parent-plan gap whose completion depends on a real user,
   operator, or system path being invokable.
6. A pilot or validation claim relies on a placeholder command, local wrapper,
   mock, manual setup, undocumented prerequisite, or dry-run substitute.

## Closure Classification

Classify each capability claim as exactly one of:

1. `end_to_end`
   - The repository or product ships the usable path needed to exercise the
     capability from a documented trigger, with only explicit prerequisites.
2. `externally_activated`
   - The capability is usable only when a named external operator/system/tool
     supplies a required component, trigger, config, credential, or deployment.
3. `hook_only`
   - The artifact ships an interface, extension point, or adapter boundary, but
     not a complete usable path.
4. `foundation_only`
   - The artifact ships data model, contract, schema, refactor, or shared
     foundation without activating user/operator/system behavior.
5. `deferred_activation`
   - The artifact intentionally keeps activation off or postponed to a named
     later task, flag, rollout, or milestone.

## Required Fields

When the gate triggers, capture these fields at the artifact's proper level of
detail:

1. `capability_claim`
   - The exact behavior the artifact says will be usable or complete.
2. `activation_trigger`
   - What starts the behavior: command, click path, event, webhook, schedule,
     agent invocation, CI step, deploy hook, config change, or `N/A`.
3. `entrypoint`
   - The concrete executable, route, command, function, job, workflow, UI path,
     or integration endpoint.
4. `configuration_owner`
   - Who owns the config needed for runtime behavior: repo default, product
     config, operator, deployment system, external service, or `N/A`.
5. `repo_provided_parts`
   - The files, commands, defaults, docs, schemas, adapters, or workflows that
     this repo/product actually ships.
6. `external_prerequisites`
   - Required external tools, credentials, services, deployment setup, manual
     operator steps, or `N/A`.
7. `success_output_contract`
   - What observable state, result, record, message, event, UI/API response, log,
     or artifact proves success.
8. `failure_output_contract`
   - What happens on missing config, missing dependency, invalid input,
     unavailable external system, timeout, partial output, duplicate trigger, or
     other expected failure.
9. `operator_or_user_path`
   - The documented path a real user, operator, system, or agent would use.
10. `last_mile_proof`
   - The exact test, pilot, command, e2e flow, fixture, payload replay,
     screenshot, recorded output, or validation evidence that proves the real
     path, not merely an internal adapter.
11. `closure_classification`
   - One of the classifications above.

## Plan-Level Policy

Plans should stay slim. For plans, record only:

1. the capability claim,
2. closure classification,
3. activation path,
4. repo-provided vs external boundary,
5. whether last-mile proof is already proven, planned in an open task, or
   explicitly out of scope.

The Done Definition must not claim a stronger capability than the closure
classification supports.

## Task-Level Policy

Tasks must include the detailed fields when the task owns capability activation
or closes a parent-plan capability gap.

If a task is `hook_only`, `foundation_only`, or `deferred_activation`, its tests
must not assert end-to-end user/operator/system behavior as current-task
success.

If a task is `end_to_end`, its test matrix or validation section must include a
last-mile proof that uses the same documented path a real user, operator,
system, or agent would use.

## Review Policy

Reviewers must compare capability claims against proof and classification:

1. `end_to_end` claims require a concrete last-mile proof.
2. `externally_activated` claims require explicit external prerequisites and
   ownership.
3. `hook_only`, `foundation_only`, and `deferred_activation` artifacts must not
   use completion wording that implies usable automation or full capability.
4. Words such as `configured`, `wired`, `integrated`, `available`, `supported`,
   `ready`, and `automation` are not sufficient unless the activation owner and
   shipped/external boundary are named.
5. A pilot that uses a placeholder, local-only wrapper, mock, dry-run, or
   undocumented prerequisite cannot prove an end-to-end claim unless the artifact
   explicitly classifies the work as non-end-to-end.
6. If the parent plan's Done Definition depends on a usable capability and no
   open task owns the missing activation path, require plan refinement or a new
   task split before approval.

## Blocking Outcomes

Block or require refinement when:

1. The artifact claims `end_to_end` completion but only specifies a hook,
   foundation, adapter, config slot, or placeholder.
2. Configuration is required but `configuration_owner` is ambiguous.
3. The repo/product does not ship the executable/default/workflow needed for the
   claim, and the artifact does not mark the capability as
   `externally_activated`, `hook_only`, `foundation_only`, or
   `deferred_activation`.
4. The validation strategy proves an internal seam but not the documented
   user/operator/system path while the Done Definition claims full usability.
5. The failure output contract is missing for missing config, dependency,
   external prerequisite, timeout, malformed output, duplicate trigger, or other
   expected activation failure.
