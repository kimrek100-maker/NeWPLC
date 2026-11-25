# Observable interaction contract

Locale: Italian, local desktop tool, no Japan-market behavior. Existing README/AGENTS/backend API define domain constraints. The synoptic is functional, not electrical/physical/vendor verification.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native HTML select | DESIGN.md + labelled fields | OS popup geometry accepted | smoke-synoptic.py keyboard + inspector |
| Form | Pydantic schemas + labelled React fields | synoptic_models.py | Data JSON only, inline errors | test_synoptic.py invalid JSON/types |
| Scrollbar | frontend/src/style.css and synoptic.css theme adapter | DESIGN.md | Internal canvas/inspector scrolling | Chromium desktop + narrow layout |
| Toast | Existing statusbar and synoptic inline status | main.tsx / SynopticView.tsx | Save feedback and persistent inline error | smoke-synoptic.py save + failure |
| CRUD | Existing project/revision service | main.py and storage.py | Save stays; reopen/restore includes layout | test_synoptic.py + smoke-synoptic.py |
| Graph edit | React Flow + inspector | synoptic_models.py | Keyboard X/Y, link selectors, Undo | smoke-synoptic.py |
| Async generation | Request controller | SynopticView.tsx | One request, cancel, preserve on failure | smoke-synoptic.py |
| Simulation | Existing BOOL/INT interpreter | simulator.py | One scan per click, replay max100 | test_synoptic.py command rejection |


Graph, I/O list and description are draft project data. Every edit marks the parent project dirty; generation/save never silently discard a changed source/layout. Manual edits lock the whole element for conservative regeneration, deleted IDs remain excluded. AI proposals cite input quotations but are not semantically certified by the citation. Removed/renamed variable candidates are warnings, never automatic remaps.

Existing browser confirm dialogs in legacy project switching/archive are documented debt, outside the new graph workflow. New synoptic UI uses reversible deletion with Undo and inline errors instead of native dialogs. Search/filter state in the local archive is transient because it has no shareable URL routing; project/synoptic data is persisted only on Save.

Static premium audit scope is the new synoptic subtree (premium-ui.json); it does not assert full conformance of pre-existing editor/archive workflows.
