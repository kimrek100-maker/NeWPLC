# Analisi repository di riferimento

Valutazione tecnica iniziale del 23 novembre 2026, basata sui file effettivamente consultati via GitHub e, per plc-st-review, checkout locale. Non costituisce audit completo del codice o parere legale. Le versioni remote possono cambiare: per release future ripetere la valutazione su commit fissati.

| Repository | Evidenza esaminata | Decisione MVP |
|---|---|---|
| [PLCForge-AI](https://github.com/sahilxai/PLCForge-AI) | Albero root e backend, README, requirements root e `backend/app.py` | Ispirazione architetturale, nessun codice/peso/dataset copiato |
| [Beremiz](https://github.com/beremiz/beremiz) | README, requirements, COPYING IDE e runtime C, struttura PLCGenerator/plcopen/tests | Non incorporato. Candidato per toolchain IEC esterna dopo analisi delle licenze e prova Windows |
| [plc-st-review](https://github.com/HeytalePazguato/plc-st-review) | Checkout `1f7730d01656c53b4619a93dee95f83b31bc9981`, LICENSE, package.json, API parse/review/config, tipi, grammatica e test | Motore MIT 1.0.3 riutilizzato in `vendor/plc-st-review`, con parser WASM; esclusi CLI e connettori Git |
| [OpenPLC Runtime](https://github.com/autonomy-logic/openplc-runtime) | README v4, LICENSING.md, LICENSE indicata, pyproject, struttura core/webserver/tests | Non incorporato né avviato. Candidato per ambiente offline separato con I/O disabilitati |

## PLCForge-AI

Backend FastAPI, Qwen2.5-7B-Instruct/LoRA e provider remoto; dipendenze root includono torch, transformers, peft e accelerate con limiti minimi ampi. È focalizzato sulla generazione e valutazione LLM e non dimostra compatibilità con le singole famiglie Schneider. L'app esaminata abilita CORS wildcard e bind 0.0.0.0: configurazione non riutilizzata per il desktop locale. Nessuna licenza rilevata nella root o metadati GitHub: la visibilità pubblica non concede automaticamente il diritto di redistribuire codice o dataset. Nessun componente copiato. Si evita inoltre il costo di una toolchain training/inferenza torch, delegando l'inferenza locale a Ollama.

## Beremiz

IDE e CLI sotto GPLv2 o successiva secondo README; runtime Python LGPLv2 o successiva secondo README (verificare il file specifico prima dell'integrazione), runtime C++ GPLv3 o successiva. Dipendenze desktop wxPython 4.2.4, lxml e varie dipendenze da Git fissate a commit. Ecosistema IEC con PLCopen, generatori e MatIEC: molto più ampio di un parser ST minimale. La sua toolchain non è un compilatore Schneider e un esito positivo non dimostra compatibilità Machine Expert/Control Expert. L'integrazione in-process richiede valutazione copyleft; eseguire un componente separato non elimina automaticamente tutti gli obblighi di distribuzione. Non è stato avviato il progetto né eseguito il suo test suite in questa sessione.

## plc-st-review

MIT, copyright Jorge Centeno 2026, attribuzione conservata. API asincrona `parseSource`, `runReview`, `resolveConfig`; parser Web Tree-sitter con grammatica IEC ST WASM. Il pacchetto dichiara 80 controlli, inclusi controlli semantici, integrità FB e review per differenza. I controlli differenziali richiedono uno snapshot precedente; nell'MVP il lint considera il sorgente corrente come nuovo file, non fornisce una review semantica tra revisioni. La cronologia è separata.

Il pacchetto npm completo importa anche adattatori GitHub/GitLab e simple-git, che introducevano advisory critici nel primo audit. Si è riutilizzato il motore senza riscriverlo: `engine/` e `config.js` dalla distribuzione npm 1.0.3, più sorgenti TypeScript corrispondenti dal checkout per manutenzione. `upstream-package.json` è una registrazione di provenienza, **non deve essere installato**: reintrodurrebbe i connettori esclusi. Non sono inclusi deploy né chiamate remote di review. Le sole dipendenze del motore sono web-tree-sitter, la grammatica e yaml.

La qualità è stata verificata con test di integrazione nostri: sorgente valido, sintassi errata, divisione per zero e conversione della diagnostica in marker Monaco. Non è stata eseguita l'intera suite upstream. Non si assume copertura completa IEC o Schneider; il parser può avere falsi positivi e i check possono avere falsi negativi. Una singola POU non sostituisce l'analisi di un progetto vendor completo.

## OpenPLC Runtime

La versione esaminata è **v4**, non la storica web UI v3. Runtime C/C++ e server Flask HTTPS; riceve un pacchetto compilato/preparato dall'Editor v4 (pipeline STruC++) e usa toolchain Make/CMake. Il README non documenta un comando standalone capace di compilare un generico file ST Schneider: non ne è stato inventato uno. Le modalità runtime possono richiedere privilegi real-time e driver I/O: non adatte all'avvio automatico dentro questo MVP.

LICENSING.md descrive dual licensing GPLv3/commerciale e obblighi per PLC program e driver combinati. Prima di integrare va definito come distribuire runtime e programmi dell'utente. Nessun collegamento ai protocolli upload/start/stop del runtime è stato implementato. Una simulazione OpenPLC sarebbe comunque una verifica di quel runtime, non una certificazione dei target Modicon.

## Dipendenze e aggiornamenti

Pacchetti npm fissati in package.json/package-lock.json. Monaco locale, Electron aggiornato, frontend Vite e Python separati. Il motore MIT vendorizzato evita dipendenze di integrazione inutilizzate. Override minimatch >=11.0.1 applicato al packager dopo audit per rimuovere advisory DoS; il packaging Windows con questo override rimane da eseguire. Audit npm finale: zero advisory alla data della sessione (non garanzia futura). Anche pip-audit sull’esatto lockfile runtime Python testato non rileva vulnerabilità note. Report salvati in docs/npm-audit.json e docs/python-audit.json. Vedi PROGRESS.md per le verifiche realmente eseguite.
