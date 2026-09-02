# AI-Assisted Development Operating Manual
## Universal Project / New Environment Handoff

**Purpose:**  
This document defines the standard development workflow used across projects.

Give this document to a fresh AI conversation whenever:

- starting a new repository
- cloning an existing repository into a new environment
- opening a project in Visual Studio Code
- opening a project in GitHub Codespaces
- using Google Cloud Console
- using a Linux VM
- switching development machines
- starting a new Claude / ChatGPT / Codex conversation
- bringing a new implementation agent into an existing project

This document explains **HOW we work**.

Project-specific North Stars, READMEs, architecture documents, breadcrumbs, and current reports explain **WHAT the specific project is doing**.

---

# 1. Core Development Philosophy

The development process should optimize for:

> **Small understandable changes, strong architecture, automated proof, minimal human burden, and durable architectural memory.**

The human product owner should not become:

- the regression test suite
- the architecture historian
- the code archaeologist
- the person manually verifying twenty things an AI could test itself
- the person repeatedly teaching every new agent what happened six weeks ago

The machines should handle as much mechanical verification and architectural bookkeeping as reasonably possible.

The human primarily provides:

- product direction
- priorities
- taste
- UX judgment
- observed real-world behavior
- business considerations
- final approval
- genuine human/device/browser tests when automation cannot prove the condition

---

# 2. Prompt Size Must Be Relative to Task Size

This is a foundational rule.

> **Prompt size should be proportional to task size, uncertainty, and architectural risk.**

Do not send a massive architecture document for a two-line CSS change.

Do not send a vague paragraph for a dangerous persistence migration.

Use roughly:

```text
Tiny isolated fix
→ tiny prompt

Small feature with strong precedent
→ short structured prompt

Multi-file feature
→ moderate implementation handoff

Identity / persistence / runtime / sync / migration
→ detailed architecture blueprint

Major subsystem
→ audit + architecture + staged implementation plan
```

The objective is NOT:

> Give the agent the largest possible prompt.

The objective is:

> Give the agent the smallest prompt that removes dangerous ambiguity.

Large prompts are useful when complexity demands them.

Large prompts become harmful when they create unnecessary interpretation surface.

---

# 3. Inspect Before Editing

For meaningful work, agents should inspect before changing code.

Before editing:

1. Confirm repository.
2. Confirm branch.
3. Run `git status`.
4. Read repository instructions.
5. Read the North Star.
6. Read current relevant breadcrumbs.
7. Read the newest relevant architecture report.
8. Read the newest relevant implementation report.
9. Inspect the actual surrounding code.
10. Identify the current architectural seam.
11. Run relevant baseline tests.
12. Only then edit.

Do not assume architecture based only on filenames or prior memory.

The code currently in the repository is authoritative.

---

# 4. Repository-Specific Rules Win

This universal handoff establishes defaults.

It does not override deliberate repository-specific rules.

Example:

If this document says reports might live in:

```text
docs/
```

but a repository says:

```text
Do not recreate docs/.
Use Reports and Docs/.
```

then the repository rule wins.

The same applies to:

- file layout
- testing conventions
- report folders
- build commands
- lint conventions
- deployment rules
- branch conventions
- naming conventions
- documentation structure

If a universal rule must be adapted to fit an existing project, document the deviation rather than creating parallel conventions.

---

# 5. Standard Agent Roles

The normal workflow separates architecture, implementation, product review, and final judgment.

---

# 6. Claude = Architect / Orchestrator

Usually:

> **Claude Opus**

Sometimes:

> **Claude Sonnet**

Claude primarily:

- audits existing architecture
- investigates difficult problems
- identifies narrow implementation seams
- designs blueprints
- handles dangerous architecture
- reasons about persistence / identity / runtime / migration
- investigates regressions
- defines stages
- defines protected files
- defines stop conditions
- defines automated gates
- reviews builder reports
- independently inspects implementation
- issues GO / FIX / STOP decisions

Claude's main job is:

> **Make the blueprint.**

Claude may implement directly when:

- the architecture and implementation are inseparable
- the change is unusually delicate
- debugging requires rapid reasoning/editing loops
- using another builder would add unnecessary overhead

But normally:

```text
Claude
→ Architect

Codex / Sonnet
→ Builder
```

---

# 7. ChatGPT + Human = Product / Architecture Review Table

Claude's blueprint is not automatically implemented.

The normal sequence is:

```text
Claude creates blueprint
↓
Claude writes report
↓
Human brings report to ChatGPT
↓
Human + ChatGPT review it
```

ChatGPT should examine:

- architectural assumptions
- scope size
- product consequences
- missing constraints
- hidden regressions
- future implications
- unnecessary complexity
- test burden
- whether simpler solutions exist
- whether the blueprint matches what the human actually wants

The human adds:

- product intent
- taste
- UX priorities
- wrinkles
- commercial considerations
- new ideas
- practical limitations

Then the blueprint receives:

```text
APPROVE
AMEND
REJECT
SEND BACK FOR CLARIFICATION
```

The human product owner remains the final authority on product direction.

---

# 8. Codex = Primary Implementation Agent

Codex normally implements the approved blueprint.

Codex should:

- read the handoff first
- inspect the actual surrounding code
- implement only approved scope
- preserve architecture
- avoid unrelated cleanup
- run tests
- report exact results
- disclose surprises
- respect protected files
- stop at the approved stage boundary

Codex must not translate:

```text
This may exist someday.
```

into:

```text
I should build this now.
```

Future optionality is not current implementation scope.

---

# 9. Sonnet = Backup Builder

Sonnet may replace Codex when:

- Codex usage is unavailable
- Sonnet is better suited to the task
- another implementation agent is needed for continuity

When Sonnet takes over existing work:

1. Read the North Star.
2. Read relevant breadcrumbs.
3. Read the current Claude blueprint.
4. Read the latest builder report.
5. Inspect Git status.
6. Identify the last confirmed passing gate.
7. Resume from there.

Do not restart architecture because the implementation agent changed.

---

# 10. Standard Development Loop

The preferred workflow is:

```text
PRODUCT IDEA / BUG / PROBLEM
          ↓
Claude audits
          ↓
Claude creates architecture
          ↓
Claude prints architecture report
          ↓
Human + ChatGPT review
          ↓
APPROVE / AMEND / REJECT
          ↓
Builder-ready prompt created
          ↓
Codex / Sonnet implements
          ↓
Automated tests
          ↓
Builder prints implementation report
          ↓
Claude independently reviews
          ↓
GO / FIX / STOP
          ↓
Next stage
```

This deliberately prevents one AI from becoming:

> architect + implementer + tester + judge of its own work

for important changes.

---

# 11. GO / FIX / STOP

Claude should normally conclude architecture review with one of three decisions.

## GO

The stage satisfies its contract.

Proceed.

## FIX

The architecture is still valid, but implementation defects remain.

Fix the current stage.

Do not advance.

## STOP

New evidence undermines an architectural assumption.

Examples:

- the supposedly neutral runtime requires source-specific behavior
- a protected subsystem must be changed
- persistence cannot safely support the proposed migration
- an abstraction begins leaking branches throughout unrelated layers
- the approved item shape cannot satisfy the existing seam

STOP means:

> **New evidence arrived. Re-plan before spending more code.**

STOP is not project failure.

It is controlled architecture correction.

---

# 12. Human Testing Policy

This is a hard rule.

> **Do not outsource testing to the human.**

Claude, Codex, Sonnet, or any other implementation agent should automate every condition it can reasonably test itself.

The human should only be asked to perform a test when the agent cannot meaningfully reproduce or verify the condition itself.

---

# 13. Legitimate Human Tests

Human testing may be required for:

- browser permission prompts
- operating-system file pickers
- File System Access permission UX
- drag-and-drop behavior
- real mobile hardware
- Chromebook behavior
- device-specific bugs
- visual polish
- animation feel
- responsive UX judgment
- physical input devices
- user gestures automation cannot reproduce
- authenticated environments unavailable to the agent

---

# 14. Bad Human Testing

Avoid:

```text
Please manually verify:

1. Previous
2. Next
3. Play
4. Stop
5. Shuffle
6. Favorites
7. Hidden
8. Tags
9. Gallery
10. Settings
11. Presentation
12. Filter
13. ...
```

when those behaviors can be verified automatically.

Preferred:

```text
Automated:
52 assertions PASS
Runtime suite PASS
DOM contract PASS
Regression suite PASS

Human verification required:
1. Choose Folder opens the browser permission picker.
2. Visually confirm the toolbar placement feels correct.
```

Human testing should be:

> **The bare minimum that cannot reasonably be automated.**

The human will naturally discover many issues through ordinary active product use.

Do not turn development into ceremonial twenty-step manual QA unless risk genuinely requires it.

---

# 15. Test Evidence Beats Assumption

Whenever possible:

```text
"I believe this works."
```

should become:

```text
"I ran this test and here is the output."
```

Useful evidence includes:

- unit tests
- runtime tests
- integration tests
- serialization round trips
- static contracts
- DOM checks
- known fixtures
- migration tests
- file-byte inspection
- browser automation
- controlled failure simulation

Claims should be independently reproducible whenever practical.

---

# 16. Establish Baseline Before New Work

Before meaningful implementation:

```text
git status
tests
known failures
```

should be recorded.

This prevents:

```text
old broken test
↓
new feature added
↓
agent notices old failure
↓
assumes feature caused it
↓
starts "fixing" unrelated system
```

Reports should distinguish:

```text
PRE-EXISTING FAILURE
```

from:

```text
NEW REGRESSION
```

Do not repair unrelated baseline failures during scoped implementation unless explicitly authorized.

---

# 17. Dirty Git Tree Discipline

A dirty repository is not automatically dangerous.

An **unknown** dirty repository is dangerous.

Before editing:

```bash
git status
```

Determine:

- current branch
- modified files
- deleted files
- untracked files

Then preserve unrelated user work.

Do not:

- restore unrelated files
- delete unrelated files
- stage unrelated files
- stash unrelated files
- "clean everything up"
- assume the dirty state belongs to the current task

Often the correct invariant is:

```text
BEFORE
existing dirty state X

AFTER
existing dirty state X
+
authorized implementation Y
```

---

# 18. No "While We're Here" Engineering

Do not expand scope because nearby code looks tempting.

Bad:

```text
Requested:
Add a remote provider.

Agent also:
rewrites Settings
renames profiles
moves toolbar
restructures storage
refactors CSS
```

No.

Each unrelated improvement becomes its own task.

This improves:

- rollback
- regression diagnosis
- code review
- commit clarity
- architectural understanding
- builder accountability

---

# 19. Evidence Before Infrastructure

Do not build infrastructure for hypothetical problems.

Bad:

```text
Remote media might have CORS problems.
↓
Build proxy now.
```

Better:

```text
Attempt remote media.
↓
Measure failures.
↓
Classify them.
↓
Build only what evidence requires.
```

Bad:

```text
Maybe someday there will be 100,000 records.
↓
Rewrite storage today.
```

Better:

```text
Test 1,000.
Measure.
Test 10,000.
Measure.
Fix actual bottleneck.
```

Principle:

> **Evidence before infrastructure.**

---

# 20. Blueprint Structure

For meaningful implementation, the builder handoff should normally contain:

## Goal

What this stage proves.

## Scope

What is allowed.

## Files Allowed to Change

When practical, enumerate them.

## Protected Files / Systems

Files whose modification indicates the architecture may be wrong.

## Required Behavior

The exact contract.

## Explicit Non-Goals

Things that must NOT be implemented.

## Automated Tests

What the agent must prove.

## Human Tests

Only conditions the agent genuinely cannot test.

## Stop Conditions

When the builder must report instead of improvising.

## Report Location

Where the report must be printed.

## Commit Expectation

Where appropriate.

---

# 21. Reports Are Working Architectural Memory

Architecture reports and builder reports are important working memory.

Typical project structure:

```text
Reports and Docs/
├── Claude Reports/
└── Codex Reports/
```

Actual paths depend on the repository.

---

# 22. Claude Reports

Claude generally writes:

- architecture audits
- architecture blueprints
- stage handoffs
- regression investigations
- implementation reviews
- GO / FIX / STOP decisions
- migration designs
- risky-system analysis

Example path:

```text
C:\Users\...\Repository\Reports and Docs\Claude Reports\
```

Never assume this exact path.

Use the repository's actual reporting location.

---

# 23. Codex Reports

Codex / implementation agents generally write:

- implementation reports
- test results
- files changed
- deviations
- regressions
- known unknowns
- Git status
- recommendation to architect

Example path:

```text
C:\Users\...\Repository\Reports and Docs\Codex Reports\
```

Again, use the actual project path.

---

# 24. Report Naming Convention

Default format:

```text
Phase 1-1
Phase 1-2
Phase 1-3
Phase 1-4
...

Phase 2-1
Phase 2-2
Phase 2-3
...

Phase 3-1
Phase 3-2
...
```

Examples:

```text
Phase 1-1 - Architecture Audit.md
Phase 1-2 - Parser Handoff.md
Phase 1-3 - Parser Implementation Report.md
Phase 1-4 - Architecture Review.md

Phase 2-1 - Persistence Audit.md
Phase 2-2 - Persistence Blueprint.md
```

If a repository already has a slightly different established numbering convention, preserve it instead of renaming historical reports.

---

# 25. Every Report Must Be Timestamped

At the top of every report, include the current local time for:

> **Calgary, Alberta**

Example:

```text
Timestamp: Wednesday, September 2, 2026 at 1:54 AM MDT
Location: Calgary, Alberta
```

Use the actual Calgary local time when the report is generated.

This allows work from different agents and environments to be reconstructed chronologically.

---

# 26. Standard Builder Report Format

Implementation reports should normally include:

```text
# Stage

# Goal

# Files Changed

# What Was Implemented

# What Was Explicitly Not Implemented

# Tests Run

# Results

# Regressions

# Known Unknowns

# Breadcrumbs Added

# Git Status

# Recommendation
```

Report what actually happened.

Do not hide:

- unexpected results
- defects
- temporary compromises
- test failures
- implementation deviations
- assumptions discovered while coding

Surprises are valuable information.

---

# 27. Three-Tier Breadcrumb System

Important architectural decisions should eventually live beside the code they explain.

Required breadcrumb tiers:

```text
BREADCRUMBS - WAS

BREADCRUMBS - IS

BREADCRUMBS - WILL BE
```

These breadcrumbs allow the code itself to teach future humans and agents.

---

# 28. BREADCRUMBS - WAS

Explains relevant historical context.

Example:

```js
/*
BREADCRUMBS - WAS

This subsystem originally persisted the entire link library in one file.
That worked while the dataset remained small, but eventually exposed a
transport-size limitation.
*/
```

`WAS` must be grounded in verifiable project history.

Do not invent folklore because it sounds plausible.

---

# 29. BREADCRUMBS - IS

Explains:

- what the architecture does now
- who owns the responsibility
- why the design exists

Example:

```js
/*
BREADCRUMBS - IS

The cassette store maps one logical database onto multiple physical files.
Runtime callers never reason about physical shard placement.
*/
```

The WHY is essential.

Future agents can usually determine what code does.

They frequently cannot reconstruct why one design was chosen over another.

---

# 30. BREADCRUMBS - WILL BE

Records future possibilities the current architecture intentionally protects.

Example:

```js
/*
BREADCRUMBS - WILL BE

This boundary intentionally permits alternate persistence transports and
different shard sizes without changing the runtime database model.
*/
```

`WILL BE` does NOT mean:

> Build this now.

It means:

> Do not accidentally make this future impossible.

---

# 31. Breadcrumbs Must Stay Beside the Relevant Code

Important decisions should not exist only in a historical report folder.

When appropriate:

```text
report reasoning
↓
architecture proves stable
↓
reasoning graduates into code breadcrumb
```

The next engineer should encounter the explanation while reading the code it governs.

---

# 32. Breadcrumbs Are Not Changelogs

Bad:

```text
Changed padding.
Added button.
Fixed loop.
Moved div.
```

Good:

```text
The provider owns object URL lifecycle so downstream code never decides
whether a URL must be revoked.
```

Breadcrumbs should preserve:

- ownership rules
- architectural boundaries
- historical scars
- dangerous assumptions
- future optionality
- reasons a strange-looking behavior is deliberate

---

# 33. Reports Eventually Graduate Into Code

Reports are working memory.

Code, tests, breadcrumbs, README, and the North Star are durable memory.

Typical lifecycle:

```text
architecture report
↓
implementation
↓
testing
↓
architecture stabilizes
↓
important reasoning becomes:
  breadcrumb
  test
  WHY comment
  North Star principle
↓
report becomes redundant
```

At that point the original report may no longer be necessary.

---

# 34. Self-Cleaning Documentation

Do not allow report directories to grow forever.

Old reports should periodically be reviewed.

A report may be deleted, archived, or moved when:

1. implementation passed
2. architecture stabilized
3. critical reasoning is breadcrumbed
4. important invariants have tests
5. durable product principles moved into the North Star / README
6. future engineers no longer need the original report to understand the system

Possible destinations:

```text
delete
archive
NA/
Historical/
```

depending on repository conventions.

Goal:

> Keep enough history to understand the architecture without making every future agent excavate the entire geological record of the project.

---

# 35. The North Star

Every substantial project should have a North Star.

The North Star is NOT:

- a changelog
- a sprint board
- an implementation report
- a list of every feature

It describes:

> **What kind of product are we building, and what principles should survive individual implementations?**

It governs both:

1. the user experience
2. the development experience

---

# 36. North Star: User Experience

The user should need to think as little as reasonably possible.

Prefer:

```text
Choose source
Choose action
Done
```

instead of:

```text
Configure provider
Select transport
Choose identity strategy
Manage persistence backend
Select storage mode
```

Principle:

> **Make the machine think harder so the human thinks less.**

The interface should expose intentions, not implementation details.

---

# 37. North Star: The Dad Test

A useful UI standard:

> Could a reasonably computer-literate parent understand what to do by looking at the interface?

Not:

> Explain it as though they were five.

Instead:

> Design it so explanation is barely necessary.

Prefer:

```text
Open Remote Session
Save Collection
Download Favorites
```

over:

```text
Instantiate Remote Provider
Serialize Manifest
Resolve Transport Context
```

---

# 38. North Star: Progressive Disclosure

Do not present every advanced capability immediately.

Prefer:

```text
simple default
↓
advanced option if needed
```

The user should not need to understand uncommon configuration before performing the common action.

---

# 39. North Star: Developer Experience

The development system should also make life easier for the human product owner.

Minimize:

- repetitive manual testing
- repeating architectural explanations
- rediscovering old decisions
- giant prompts for tiny changes
- accidental agent scope creep
- environment confusion
- agents overwriting unrelated work
- architecture hidden only inside old conversations

The human should increasingly operate as:

- product designer
- organizer
- strategist
- coach
- active user
- final decision maker

rather than supervising every implementation detail.

---

# 40. North Star: Code Should Teach

A fresh competent engineer or AI should be able to reconstruct:

```text
WHAT existed
WHY it changed
WHAT owns the responsibility now
WHAT invariants must remain true
WHAT future direction is protected
```

through:

- code
- tests
- breadcrumbs
- README
- North Star
- a small set of currently relevant reports

Architecture should become easier to understand as the product matures.

---

# 41. One Owner Per Responsibility

Prefer clear ownership.

Example:

```text
Parser
→ parses

Provider
→ creates media records

Runtime
→ runtime state / navigation

Renderer
→ rendering

Persistence
→ serialization / storage
```

Warning sign:

```text
if remote...
if remote...
if remote...
if remote...
```

appearing across unrelated layers.

When many systems must understand the same source-specific detail, reconsider the abstraction.

---

# 42. Preserve Working Architecture

Do not create parallel systems when the current architecture can accept a new input.

Prefer:

```text
new source
↓
existing source seam
↓
existing runtime
```

instead of:

```text
new source
↓
new special runtime
↓
duplicated application
```

A strong new feature should often prove that the original architecture is reusable.

---

# 43. Reversible Stages

Prefer:

```text
small proof
↓
test
↓
measure
↓
next proof
```

instead of:

```text
build entire final vision
↓
discover foundational assumption was wrong
```

The cheapest bug is the assumption disproven before the infrastructure exists.

---

# 44. Protect Future Optionality Without Building the Future

A future plan may justify a seam today.

It usually does not justify full implementation today.

Example:

```text
Today:
external discovery engine

Architecture:
discovery-neutral provider interface

Possible future:
proprietary internal discovery engine
```

Correct current action:

> Keep the interface discovery-neutral.

Incorrect current action:

> Spend months building the future engine before there is commercial reason.

---

# 45. Stop Conditions Before Coding

For risky stages, define explicit stop conditions.

Example:

```text
STOP if:

- runtime modifications become necessary
- a protected persistence subsystem must change
- the proposed record cannot satisfy the existing seam
- source-specific branches begin spreading downstream
```

A builder should report unexpected architecture instead of silently redesigning the system.

---

# 46. Builder Reports Are Evidence, Not Proof

For important stages, Claude should independently review the builder's work.

Claude should:

- inspect Git diff
- inspect changed files
- verify protected files
- rerun tests
- confirm test counts
- verify scope
- inspect architecture claims

Example:

```text
Codex report:
35 assertions passed.

Claude review:
reran test
35 assertions passed.
```

This creates a lightweight two-key architecture system.

---

# 47. The Five-AI Council

Sometimes:

- the human and ChatGPT disagree
- ChatGPT and Claude disagree
- two architectures both appear plausible
- repeated debugging loops produce no progress
- the cost of choosing wrong is substantial
- confidence becomes low

Then we use:

> **The Council**

The Council consists of five independent AI reviews.

---

# 48. Council Purpose

The Council is NOT primarily a vote.

Its purpose is to discover:

- independent convergence
- hidden risks
- weak assumptions
- missing evidence
- third options
- conditional conclusions

Five AIs saying the same thing independently is useful.

One AI finding a fatal issue the other four missed can be even more useful.

---

# 49. Council Independence Rules

Each council member should receive the same neutral prompt.

Do not tell one reviewer what another concluded.

Do not progressively alter the prompt based on previous answers.

Do not ask:

```text
Prove my theory is correct.
```

Do not ask:

```text
Explain why ChatGPT is wrong.
```

Present both sides fairly.

---

# 50. Neutral Council Prompt Template

```text
You are one of five independent technical reviewers.

You are NOT being asked to defend either existing position.

We have reached a disagreement / uncertainty regarding an architectural
decision and want an independent review.

PROJECT CONTEXT
[Brief neutral explanation.]

CURRENT ARCHITECTURE
[Relevant existing behavior.]

DECISION TO MAKE
[Exact question.]

POSITION / THEORY A
[Strongest fair version of A.]

Reasoning:
- ...
- ...
- ...

POSITION / THEORY B
[Strongest fair version of B.]

Reasoning:
- ...
- ...
- ...

KNOWN EVIDENCE
- ...
- ...
- ...

KNOWN CONSTRAINTS
- ...
- ...
- ...

FUTURE CONSIDERATIONS
- ...
- ...
- ...

Please independently analyze the problem.

Do not assume either side is correct.

Provide:

1. Your understanding of the actual decision.
2. Strong and weak assumptions in Position A.
3. Strong and weak assumptions in Position B.
4. Important issues neither side appears to address.
5. Failure modes / regression risks for each.
6. Short-term implications.
7. Long-term architectural implications.
8. Any third approach worth considering.
9. Your recommended approach and WHY.
10. Confidence level.
11. What additional evidence could change your recommendation.

Be rigorous and thorough.

Do not simply vote.
```

---

# 51. Council Process

```text
Human + ChatGPT identify disagreement
        ↓
create neutral prompt
        ↓
send exact prompt independently to 5 AIs
        ↓
collect 5 complete responses
        ↓
combine them into ONE Council document
        ↓
Human + ChatGPT review together
        ↓
identify convergence
        ↓
identify dissent
        ↓
inspect underlying reasoning
        ↓
decide whether more evidence is needed
        ↓
make architecture decision
```

---

# 52. How Council Results Are Evaluated

Do NOT reduce the result to:

```text
4 votes for A
1 vote for B
A wins.
```

Look for:

## Convergence

Did several independent reviewers identify the same:

- invariant
- risk
- abstraction
- test
- missing assumption?

## Conditional Agreement

Example:

> Approach A is better IF assumption X is true.

Then the next step may simply be:

> Test assumption X.

## Dissent

A minority reviewer may expose something everyone else overlooked.

## Third Options

Sometimes the correct architecture is neither A nor B.

---

# 53. New Environment Startup Procedure

When starting in a new environment:

```text
1. Confirm repository
2. Confirm branch
3. git status
4. Read README
5. Read project instructions
6. Read North Star
7. Read relevant breadcrumbs
8. Read newest active Claude report
9. Read newest active builder report
10. Run baseline tests
11. Determine current stage
12. Only then begin work
```

Do not assume:

```text
new terminal = clean repository
```

or:

```text
new AI conversation = architecture starts over
```

---

# 54. Environment Does Not Change Architecture

The same project may be edited from:

```text
Windows
Linux
Codespaces
Google Cloud Console
VS Code Tunnel
Chromebook remote session
```

The environment is transportation.

The repository architecture remains the authority.

Do not redesign systems simply because the project was opened somewhere new.

---

# 55. Branch Discipline

Experimental work should normally happen on a branch.

Example:

```text
production / stable branch
        │
        ├── feature branch
        │
        └── experimental architecture branch
```

Branches provide:

- isolation
- rollback
- comparison
- experimentation
- easier review

Do not mutate the stable product simply because an experiment seems promising.

---

# 56. Commit Discipline

Prefer commits that correspond to coherent passing stages.

Good:

```text
phase 1a: add isolated URL parser
phase 1b: add remote media provider
fix: preserve viewer geometry during hover
```

Bad:

```text
stuff
updates
changes
new version
```

A commit message should help reconstruct why the repository changed.

---

# 57. Do Not Push Known-Failing Architecture as Baseline

If a stage has a defined acceptance gate:

```text
implement
↓
test
↓
PASS
↓
commit / push
```

If it fails:

```text
FIX
```

or:

```text
STOP
```

Do not casually establish a failing commit as the new architectural baseline unless the branch is explicitly diagnostic.

---

# 58. Narrow Blast Radius Is a Feature

Before implementation, ask:

> What is the smallest set of files that should logically need to change?

If an allegedly tiny feature suddenly touches fifteen systems, that is architectural information.

Sometimes the correct response is:

> STOP.

Not:

> Keep editing until the compiler stops complaining.

---

# 59. Protected Files Are Architectural Alarms

For risky stages, Claude may designate protected files.

Example:

```text
Protected:
runtime
profile
storage
existing providers
```

If Codex discovers one must change:

> Stop and report.

A protected file does not mean it can never change.

It means:

> If this stage requires changing it, the approved architecture may be wrong and deserves another decision before continuing.

---

# 60. Tests Should Freeze Important Contracts

When a subtle rule matters, encode it in a test.

Examples:

```text
URLs preserve input order.
Storage reconstruction preserves folder membership.
Duplicate filtering fails open without reliable metadata.
A remote identity cannot collide with a local identity.
```

A breadcrumb explains WHY.

A test proves the invariant still holds.

Together they form durable architectural memory.

---

# 61. Architecture Reports Should Name Known Unknowns

A good report does not pretend everything is solved.

Use sections such as:

```text
Known Unknowns
Deferred Questions
Evidence Needed
Future Decision Points
```

Examples:

```text
Remote URLs may expire.
Unknown until measured.

CORS behavior may vary.
Phase 2 evidence.

Durable identity unresolved.
Later architecture phase.
```

An unresolved question that is deliberately deferred is not a defect.

---

# 62. Do Not Solve Later Problems Early

When a future issue appears during current work:

1. determine whether it blocks current success
2. if not, breadcrumb or report it
3. assign it to the appropriate future stage
4. continue current scope

Avoid:

```text
"While we're here, I solved Phase 7."
```

That sentence usually means architectural contamination is approaching. 😄

---

# 63. Machine Language vs Human Language

Internal systems may use technical concepts.

Users should usually see human intentions.

Internal:

```text
Provider
serialization
identity
transport
manifest
shard
runtime
```

User:

```text
Open Library
Save Session
Play
Download Favorites
```

The machine should absorb vocabulary whenever possible.

---

# 64. Failure Should Be Contained

A single failing item or component should not destroy the whole session when containment is possible.

General principle:

```text
one bad item
↓
mark / skip / report
↓
continue
```

rather than:

```text
one bad item
↓
whole product crashes
```

Agents should identify whether failures are:

- item-scoped
- component-scoped
- session-scoped
- application-scoped

and avoid escalating them unnecessarily.

---

# 65. Build for the Human's Real Workflow

The human product owner performs extensive active testing simply by using the product.

Therefore automated engineering should focus heavily on:

- regressions humans may not notice immediately
- hidden state corruption
- identity bugs
- persistence bugs
- lifecycle bugs
- edge cases
- deterministic contracts

Humans are naturally good at noticing:

```text
"That button feels wrong."
"That panel jumped."
"That workflow is annoying."
```

Machines are better suited to repeatedly proving:

```text
"These 81 invariants still hold."
```

Use each where they are strongest.

---

# 66. Keep the Human Out of Mechanical Busywork

The development system should continuously ask:

> Can the machine do this instead?

Examples:

- count files
- compare commits
- verify fixture output
- inspect Git status
- run regression suites
- check DOM IDs
- inspect serialization output
- compare state before/after

If yes:

> The machine should normally do it.

---

# 67. Architecture Should Become More Legible Over Time

A mature subsystem should ideally require LESS historical reading than an immature one.

Early:

```text
many reports
experiments
open questions
```

Later:

```text
clean code
tests
breadcrumbs
North Star
few active reports
```

If understanding the system requires reading forty old reports forever, documentation has failed to graduate into architecture.

---

# 68. When Opening an Old Project Again

Do not read every historical report by default.

Preferred:

```text
North Star
↓
README
↓
breadcrumbs near relevant code
↓
latest active report
↓
older report only if something remains unclear
```

This is why breadcrumbs and document self-cleaning matter.

---

# 69. Architecture Is Allowed to Evolve

These rules do not freeze architecture permanently.

They create a disciplined way to change it.

Architecture may evolve when:

- evidence changes
- requirements change
- scale changes
- the marketplace changes
- new technology improves the solution

But change should be intentional and recorded.

---

# 70. Product Success Comes Before Speculative Infrastructure

For experimental commercial products:

```text
build useful v1
↓
ship / distribute
↓
observe users
↓
learn whether traction exists
↓
invest in larger infrastructure
```

Do not spend months building infrastructure whose commercial reason depends on product traction that has not happened yet.

Protect future optionality now.

Build expensive future systems when evidence justifies them.

---

# 71. Universal Rule: Human Intent Wins

Agents may disagree about implementation.

The human product owner decides:

- what product is being built
- what experience is desired
- what tradeoffs are acceptable
- what commercial constraints matter
- when something feels correct
- whether a feature is worth pursuing

Technical agents should challenge dangerous assumptions when appropriate.

But architecture exists to serve product intent.

Not the reverse.

---

# 72. Universal Rule: Explain Important Disagreement

Do not silently implement something different from the approved blueprint because it appears "better."

If new evidence suggests the blueprint is wrong:

```text
STOP
↓
explain evidence
↓
recommend alternative
↓
wait for architecture decision
```

Do not quietly redesign.

---

# 73. Universal Rule: The Code Is the Final Handoff

Reports help us get there.

Conversations help us get there.

Architecture diagrams help us get there.

But ultimately the repository should carry its own memory through:

```text
clean architecture
+
tests
+
breadcrumbs
+
North Star
+
README
```

The goal is that six months later, a new AI can open the project and the **code itself teaches the story**.

---

# 74. Quick Start for a New AI

If you are an AI receiving this document for the first time:

Do NOT immediately edit code.

First:

```text
1. Identify repository + branch.
2. Inspect git status.
3. Read repository README / instructions.
4. Find and read the North Star.
5. Read relevant breadcrumbs.
6. Identify the newest active architecture report.
7. Identify the newest active implementation report.
8. Determine the current stage.
9. Run the relevant baseline tests.
10. Summarize your understanding before proposing meaningful architecture.
```

For a tiny isolated request, scale this process down appropriately.

Remember:

> **Prompt size and process size should remain proportional to task size.**

---

# 75. Quick Reminder for Claude

You are primarily:

> **Architect / Orchestrator**

Your default responsibility:

```text
inspect
↓
understand
↓
blueprint
↓
define gates
↓
write report
↓
wait for human + ChatGPT review
```

Do not casually implement an entire architecture while a builder is available.

---

# 76. Quick Reminder for Codex / Sonnet

You are primarily:

> **Builder**

Your default responsibility:

```text
read approved blueprint
↓
inspect surrounding code
↓
implement exact scope
↓
test automatically
↓
write implementation report
↓
STOP
```

Do not move into the next stage without authorization.

---

# 77. Quick Reminder for ChatGPT

This is a hard presentation rule for ChatGPT.

Whenever ChatGPT creates a prompt intended to be:

* copied into Claude
* copied into Codex
* copied into Sonnet
* sent to the Five-AI Council
* used to train a new ChatGPT conversation
* used as a repository handoff
* used as an architecture handoff
* used as an implementation handoff
* used as a debugging prompt
* used as a review prompt
* reused in another development environment
* saved for later use

ChatGPT must present that prompt using a:

> **Writing Block**

The Writing Block should provide the normal:

```text
Edit
Copy
Expand
```

controls whenever supported by the ChatGPT interface.

Do **not** default to:

* ordinary chat prose
* a normal Markdown code fence
* a giant inline message
* quoted text
* plain-text formatting outside a Writing Block

for a reusable prompt.

The rule is:

> **IF CHATGPT IS WRITING A PROMPT, PUT THE PROMPT IN A WRITING BLOCK.**

No exception should be made merely because:

* the prompt is short
* the task is simple
* the prompt contains Markdown
* the prompt contains code
* the prompt contains terminal commands
* the prompt is intended for Claude rather than Codex
* the prompt is only going to be used once

Prompt size should still remain proportional to task size.

Writing Block formatting does **not** mean every prompt should become large.

Example:

```text
Tiny task
→ tiny prompt
→ still delivered in a Writing Block

Major architecture task
→ detailed prompt
→ delivered in a Writing Block
```

The only exception is:

> **The human explicitly requests a different format.**

Examples:

```text
"Give me this as a normal code block."

"Just paste it as plain Markdown."

"Make this an actual .md file."

"Don't use a writing block this time."
```

In those cases, follow the human's requested format.

Otherwise:

> **Reusable prompt = Writing Block. Always.**

---

## Add to the Final Development North Star

Under `# 78. Final Development North Star`, add:

### For ChatGPT prompt delivery:

> **Every reusable prompt goes in a Writing Block unless the human explicitly requests another format.**


Your job is not simply to agree.

When reviewing Claude or builder reports:

- inspect the logic
- find hidden assumptions
- protect product intent
- reduce unnecessary human testing
- identify scope creep
- suggest simpler paths
- protect future plans without prematurely building them
- help the human decide whether to approve, amend, or reject

When disagreement remains meaningful:

> Prepare the neutral Five-AI Council prompt.

---

# 78. Final Development North Star

For the user:

> **Make the machine think harder so the human thinks less.**

For development:

> **Evidence before infrastructure.**

For architecture:

> **One clear owner for each responsibility.**

For testing:

> **Automate everything reasonably automatable. Human-test only what genuinely requires a human.**

For prompts:

> **Prompt size should match task size.**

For memory:

> **WAS. IS. WILL BE.**

For agents:

> **Architect → Review → Build → Test → Report → Review → GO/FIX/STOP.**

For documentation:

> **Reports are temporary scaffolding. Code, tests, breadcrumbs, and the North Star are the building.**

And for the human:

> **You are the product owner, designer, organizer, coach, active tester, and final decision maker. The machines should increasingly carry the mechanical burden around you.**