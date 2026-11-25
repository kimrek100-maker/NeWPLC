# Componenti e attribuzioni

Il codice originale di questo MVP è MIT (LICENSE). Il nome Schneider Electric e i nomi Modicon/EcoStruxure appartengono ai rispettivi titolari; non si implica affiliazione o certificazione. Nessun logo, manuale Schneider, peso Qwen o dataset esterno è incluso.

| Componente | Uso | Licenza dichiarata |
|---|---|---|
| plc-st-review 1.0.3 | Motore ST vendorizzato | MIT, © 2026 Jorge Centeno; testo integrale in vendor/plc-st-review/LICENSE |
| tree-sitter-iec61131-3-st | Grammatica ST/WASM | MIT secondo package metadata |
| web-tree-sitter | Parser WASM | MIT |
| @xyflow/react 13.0.3 (React Flow) | Editor grafico 2D | MIT, attribuzione React Flow mantenuta nella canvas |
| React, React DOM | Interfaccia | MIT |
| Monaco Editor, wrapper React | Editor | MIT |
| Lucide React | Icone | ISC |
| YAML | Config del motore ST | ISC |
| FastAPI | API locale | MIT |
| Uvicorn | Server ASGI | BSD-3-Clause |
| HTTPX | Client inferenza | BSD-3-Clause |
| python-multipart | Upload | Apache-2.0 |
| pypdf | Estrazione PDF | BSD-3-Clause |
| Lark | Parser sottoinsieme simulatore | MIT |
| SQLite/Python sqlite3 | Persistenza | SQLite public domain; Python PSF |
| Electron | Shell desktop | MIT + licenze Chromium/Node incluse dalla distribuzione |
| PyInstaller | Packaging Python | GPL con eccezione per bundling; vedere licenza upstream |
| Vite, TypeScript, electron-builder | Tooling | MIT / Apache-2.0 secondo package |

Consultare le licenze originali dei pacchetti installati e i metadati bloccati. Le dipendenze transitive mantengono i propri termini. I notice Electron/Chromium devono essere conservati dall'installer. `docs/npm-inventory.json` fotografa pacchetti, versioni, integrità e licenze riportate nel lockfile alla data della build; non sostituisce la raccolta completa dei testi legali per una distribuzione commerciale.

Per aggiornare plc-st-review, acquisire la release verificata, copiare engine/config e relativi sorgenti, mantenere LICENSE e aggiornare gli hash in provenance.json. Rivedere le nuove importazioni per evitare connettori remoti o tool di deployment. Non installare il package.json upstream nel vendor.
