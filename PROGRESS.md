# Avanzamento — 23 novembre 2026

## Fase 1 — analisi e riuso: completata per MVP

- Consultati tutti i quattro repository indicati: struttura, README e dipendenze, file licenze dove presenti. Dettagli e limiti dell'analisi in docs/REPOSITORY_REVIEW.md.
- Riuso del motore plc-st-review MIT 1.0.3, con licenza, sorgenti TypeScript, metadati e hash di provenienza. Non riscritto parser/linter IEC.
- Esclusi adattatori Git non necessari e vulnerabili dal pacchetto completo. Nessun codice senza licenza di PLCForge copiato. Nessun runtime GPL incorporato.
- Dipendenze aggiornate, lockfile npm e closure Python del runtime testato conservati. Per piattaforme diverse pip può risolvere dipendenze condizionali aggiuntive.

## Fase 2 — MVP locale: implementata

- FastAPI/Python, React/TypeScript, Monaco con worker locale, Electron e SQLite.
- Interfaccia italiana scura con progetti, albero, editor, diagnostica navigabile, assistente laterale, documenti, blocchi e revisioni.
- Progetti e revisioni con famiglia PLC; salvataggi atomici e ripristino in bozza.
- Importazione ST e testo; libreria blocchi. Output **Main.st UTF-8 diretto**, come chiarito dall'utente: nessun tool dedicato d'importazione da realizzare. Pacchetto con report disponibile come endpoint opzionale, senza formati proprietari inventati.
- Ollama/Qwen Coder con modello configurabile, cloud OpenAI-compatible opzionale solo su selezione, messaggi in italiano, gestione modello offline.
- RAG locale con PDF testuali e TXT/MD/ST: frammenti per pagina, vettori sparsi, coseno, filtro famiglia, citazioni controllate sugli ID effettivamente recuperati, deduplicazione ed eliminazione.
- Agente bounded con piano, generazione, lint, feedback e correzione (max 3 cicli UI/5 API). Scenari BOOL/INT eventualmente prodotti dal modello vengono eseguiti e i fallimenti tornano nel ciclo. Tracce consultabili; applicazione codice solo su scelta manuale.
- Analisi ST con parser WASM e controlli upstream; marker Monaco. Nessuna promozione automatica a stato compilato.
- Simulatore didattico Lark su sottoinsieme BOOL/INT, IF/ELSE, assegnazioni, inizializzazioni, confronti e logica. Rifiuta FB, timer, cicli e aritmetica. Nessun eval, codice nativo, protocollo I/O o upload PLC.
- Shell con renderer sandboxed, context isolation, token per sessione, loopback, CSP, blocco navigazione, gestione del processo backend e log.
- Script setup/packaging Windows e workflow CI Windows predisposti; PyInstaller include uvicorn/lark/pypdf e electron-builder produce NSIS.

## Fase 3 — verifiche eseguite

| Verifica | Esito reale |
|---|---|
| pytest backend | **13 passed**, 0 fallimenti; circa 1 s |
| Parser/linter Node | PASS: ST valido, ST malformato, divisione per zero |
| TypeScript + build produzione Vite | PASS; bundle Monaco locale ~3 MB JS non compresso + worker |
| Smoke UI Chromium | PASS: Monaco, salvataggio, analisi, tre scansioni PASS, documenti e impostazioni; 0 errori JS |
| Smoke shell Electron 45.4.1 Linux headless | PASS: avvio automatico backend, token preload, API senza token rifiutata (401), Node non esposto al renderer, Monaco, salvataggio, linter e download Main.st; 0 errori JS |
| Audit npm | **0 advisory**, report docs/npm-audit.json |
| pip-audit runtime lock | **Nessuna vulnerabilità nota**, report docs/python-audit.json |
| Controllo sintassi desktop/Python | PASS |

I test backend coprono persistenza/revisioni, export ST e manifest, RAG con filtri/deduplica/eliminazione, PDF invalido, diagnostica, arresto prioritario e memoria scan, tipi/overflow/costrutti non supportati, host/origini/token, limiti agente, citazioni, correzioni iterative e feedback di test falliti, rifiuto risposte AI malformate e cloud senza configurazione.

È presente un warning di deprecazione Starlette sull'uso di HTTPX nel TestClient: non ha causato errori. Nessun aggiornamento automatico a un client diverso senza necessità per il runtime.

Lo smoke UI è in scripts/smoke-ui.py; quello Electron in scripts/smoke-desktop.py. Richiedono Playwright Python, Chromium di sistema per il primo test e remote debugging locale sulla porta 9229 per il secondo. Le opzioni `--no-sandbox`/headless sono state usate **solo per il test nel container**, non sono applicate dal codice desktop distribuito. Screenshot verificato in docs/workbench.png.

Problemi dell'ambiente risolti: socket locali bloccati nel sandbox base (test eseguiti con permessi per loopback); download Electron inizialmente fallito, risolto con lo script ufficiale e proxy configurato; export di base reso diretto ST dopo chiarimento utente. Nessun requisito di autorizzazione aggiuntivo lasciato pendente.

## Non verificato o volutamente limitato

- Nessun Ollama/Qwen realmente installato nel computer di test: protocollo di risposta e logica agente verificati con client controllato, non qualità generativa reale. Per provarla: installare Ollama, scaricare il modello, caricare documenti autorizzati e inviare specifiche di prova.
- Non eseguito packaging/installer su Windows né firma. Workflow e script pronti, da eseguire su Windows 10/11 x64 e su macchina pulita prima della distribuzione.
- Nessuna compilazione vendor, nessun collaudo Schneider o verifica hardware. Target/firmware/librerie non forniti dall'utente: AI deve chiedere dettagli o indicare assunzioni; lint IEC non verifica EFB/DFB proprietari.
- Il RAG è lessicale, non un encoder semantico: sostituibile con indice embeddings in una fase successiva. Non è installato Chroma e non si dichiara di usarlo.
- I PDF scansiti richiedono OCR esterno. Nessun manuale, modello o dataset con diritti incerti viene redistribuito.
- L'agente non applica automaticamente sorgenti e non aggiunge file al progetto; elabora una POU/sorgente alla volta. Test proposti non compatibili con il simulatore restano non eseguiti. Tracce e chat in memoria, non archivio audit permanente.
- L'autocompletamento è un dizionario IEC, non un language server Schneider. Diagnostica su richiesta, non compilazione live.
- La libreria archivia blocchi ma non attribuisce automaticamente stato validato. Review delle differenze e analisi di interi progetti vendor sono successive.
- Beremiz/OpenPLC non installati; la suite upstream completa non è stata eseguita. Non si sostiene di supportare un runtime IEC completo.

## Prossime fasi concrete

1. Eseguire pipeline Windows e provare installazione, worker, modello locale, riavvio e disinstallazione su macchina pulita.
2. Test di accettazione con specifica reale, I/O, modello PLC, firmware e versione IDE; compilazione manuale nel tool Schneider e collaudo tecnico.
3. Rafforzare le regole di programmazione per famiglia su fonti Schneider autorizzate, con casi validi/invalidi verificati nel tool vendor.
4. Corpus RAG versionato, valutazione citazioni/risposte, embeddings semantici e isolamento processo PDF per contesti con documenti ostili.
5. Valutare simulatori/compiler IEC esistenti per estendere il sottoinsieme, preservando licenze e isolamento offline.

## Aggiornamento — archivio consultabile dei progetti precedenti

Obiettivo: conservare e rendere consultabili tutti i progetti salvati, incluse le revisioni precedenti, all’interno dell’app locale.

Implementato:

- Vista **Archivio progetti** nella barra laterale, senza dipendenze aggiuntive; riusa i dati SQLite già presenti. Nessuna pubblicazione o sincronizzazione remota.
- Ricerca parametrizzata su nome attuale, codice corrente/storico e note delle revisioni; caratteri SQL wildcard trattati come testo. Filtro sulla famiglia PLC attuale, ordinamento per ultimo salvataggio, pagine da 25 voci.
- Anteprima Monaco in sola lettura delle versioni con data/famiglia/nota; esportazione ST della versione selezionata. La consultazione non modifica il progetto né certifica il codice.
- Apertura del progetto attuale oppure creazione di una nuova bozza da una revisione. La copia viene salvata come progetto distinto e l’originale rimane invariato.
- Router dedicato `backend/studio/archive.py`, componente `frontend/src/ArchiveBrowser.tsx`, indice SQLite non distruttivo sulle revisioni. Richieste UI cancellabili, workspace sullo sfondo non interattivo, gestione focus/Escape.
- Documentati uso e limiti in README.md e docs/ARCHITECTURE.md.

Verifiche: **16 test backend superati**, inclusi tre nuovi test per ricerca storica, caratteri letterali/iniezione, filtri/paginazione, persistenza dopo riavvio ed esportazione/copia senza alterare la storia. Test linter e build TypeScript/Vite superati. Smoke Chromium `scripts/smoke-archive.py` passato: ricerca nel codice storico, lettura revisione, export ST esatto, copia/salvataggio/ricaricamento, filtro famiglia e originali immutati; nessun errore JavaScript. Screenshot in docs/archive.png.

Lo smoke test ha usato un database temporaneo separato: i due progetti e le due revisioni già presenti nel database di sviluppo non sono stati modificati. L’archivio include i dati salvati nel profilo corrente; non recupera bozze mai salvate o progetti di altri computer. Nessuna nuova verifica Windows/vendor; rimangono valide le limitazioni sopra indicate.

## Aggiornamento — Sinottico impianto funzionale 2D

Implementazione MVP integrata nella scheda progetto, con React Flow **13.0.3 (MIT)** e otto tipi di simboli SVG locali: motore, pompa, valvola, serbatoio, sensore, pulsante, spia e indicatore numerico. Temi condivisi tramite token --studio-*; palette, canvas, ispettore e controlli accessibili anche tramite selettori, X/Y e tastiera. Nessuna immagine o SVG fornita dall’AI viene eseguita o inserita come markup.

Backend: contratto Pydantic `synoptic_models.py` con campi ammessi, limiti, coordinate finite, ID univoci, estremi esistenti e sole relazioni functional. JSON non valido rifiutato. `synoptic.py` riusa il trasporto Ollama/cloud del chat, il parser/symbol table MIT già presenti e l’interprete offline esistente. Il modello riceve ST, variabili, commenti, descrizione e I/O come dati non fidati. Non dispone di tool. Cloud solo con scelta esplicita nelle Impostazioni.

Provenienza: fonte citata, ipotesi AI e manuale, con conferme separate per elementi e associazioni. Citazioni non riscontrate degradate a ipotesi; conferme prodotte dall’AI sempre azzerate. Citare testo esistente non prova il significato della relazione: la UI richiede revisione. Variabili mancanti, rinominate, ambigue, tipi non simulati e citazioni obsolete segnalati, senza remapping automatico.

Rigenerazione: merge conservativo con protezione integrale degli elementi manuali/confermati, conservazione delle posizioni e tombstone degli elementi rimossi. Elementi precedenti assenti dalla nuova proposta conservati per revisione manuale. Errori, annullamento o risposte relative a un progetto cambiato non sostituiscono il layout. Eliminazioni reversibili con Annulla modifica. Nessun collegamento fisico attestato o modello fisico implicito.

Persistenza: migrazione idempotente e non distruttiva di `projects.synoptic` e `revisions.synoptic`. Salvataggio atomico con codice e famiglia. Client precedenti che omettono il campo mantengono il layout. Riapertura, cronologia e copia da archivio includono il sinottico della versione selezionata; vecchie revisioni senza grafico restano leggibili.

Simulazione: una scansione per clic, replay massimo 100 scansioni, memoria di sessione conservata fra le schede. Stati, numeri e allarmi leggono solo variabili confermate e supportate. Comandi virtuali verificati anche dal backend: BOOL/INT, nome univoco, variabile non scritta dal programma, conferma ed evidenza non obsoleta. Nessun comando verso PLC. Modifiche a sorgente/layout/associazioni o Azzera iniziano una nuova sessione; stati runtime non salvati nelle revisioni. Nessuna dinamica inventata di livelli, flussi, pressioni o tempi. Timer, FB, REAL e altri costrutti fuori dal sottoinsieme sono esplicitamente non simulati.

### Verifiche realmente eseguite

- **32 test backend PASS**, inclusi 16 nuovi casi parametrizzati e di integrazione: migrazione DB, revisioni e compatibilità client, comandi e allarmi, replay, tipi/overflow/conferme, variabili obsolete, rigenerazione con protezione manuale/tombstone, schema Ollama, script/campi extra/relazioni fisiche/ID invalidi rifiutati, inferenza non disponibile senza fallback cloud, citazioni obsolete bloccanti.
- `npm run test:linter`: PASS. Il wrapper ora espone anche i simboli ricavati dal motore upstream, senza riscrivere il parser.
- `npm run build`: TypeScript e Vite PASS. Resta un warning della dipendenza react-compiler-runtime sulla direttiva "use no memo" nel bundle; nessun errore JavaScript osservato nei test UI. Warning di deprecazione HTTPX/Starlette nel TestClient già presente.
- `scripts/smoke-synoptic.py`: PASS su Chromium con backend reale e fixture locale del protocollo Ollama. Verificati generazione/schema backend, tutti gli otto tipi di simbolo, modifica, relazione funzionale, conferme, comandi, stato/allarme, sessione fra schede, protezione manuale ed eliminazioni alla rigenerazione, salvataggio/riapertura, errore JSON, annullamento, avvisi rinomina, tastiera e viewport desktop ristretto; **nessun errore JS**. Screenshot di prova in docs/synoptic.png.
- Audit npm: **0 advisory**, report e inventario aggiornati. Nessuna nuova dipendenza Python runtime.
- `DESIGN.md` lint: **0 errori / 0 warning**. Audit premium strict sul nuovo sottoalbero: **0 violazioni**, docs/synoptic-ui-audit.json. Il perimetro non include la completa conformità delle viste legacy. Non è una certificazione di accessibilità o industriale.

### Limiti e punti non verificati

Non è stata provata la qualità generativa con un vero modello Qwen in questa sessione: la fixture produce risposte controllate per verificare trasporto e comportamento. L’app reale usa l’Ollama configurato e segnala l’indisponibilità. Nessun modello o manuale redistribuito. Non eseguiti packaging/prova Windows, compilazione vendor o collaudo hardware per questa modifica.

Il layout è una proposta funzionale a sorgente singolo, non uno schema elettrico o una simulazione fisica. Una sola variabile per canale, nessuna formula/espressione AI, massimo 80 simboli/160 relazioni. Il merge non riconosce semanticamente nuovi ID equivalenti: possibili duplicati vanno revisionati. Spostamenti, etichette, associazioni e conferme manuali proteggono l’intero elemento, quindi l’AI non ne aggiorna automaticamente neppure altri campi. Nessuno stato "compilato" o "collaudato" viene attribuito dal sinottico.

Documentazione aggiornata: README.md, docs/ARCHITECTURE.md, docs/THIRD_PARTY.md, DESIGN.md, UX-CONTRACT.md. I test usano database temporanei separati dai progetti dell’utente.

Regressione aggiuntiva: smoke Chromium della vista ST originaria passato dopo l’introduzione delle schede (Monaco, salvataggio, diagnostica, tre scansioni, documenti e impostazioni; nessun errore JS). Database di sviluppo originale ricontrollato: 2 progetti e 2 revisioni conservati.


## Guida di installazione Windows — 24 novembre 2026

Aggiunta docs/INSTALLAZIONE_WINDOWS.md e collegata dal README: prerequisiti ufficiali, verifica versioni, estrazione e selezione cartella, setup, alternativa manuale senza modifica della policy PowerShell, uso di npm.cmd quando npm.ps1 è bloccato, download/verifica Ollama, primo utilizzo e backup. I passaggi sono confrontati con scripts/setup.ps1, package.json e desktop/main.cjs. Modifica solo documentale; nessun test applicativo rieseguito. Installazione e packaging Windows non eseguiti in questa sessione Linux.


## Packaging installer Windows — 24 novembre 2026

Dopo la richiesta dell’utente, corretto scripts/package-windows.ps1 per includere nel bundle PyInstaller il package backend/studio e run.py, oltre ai binari, così l’import `from studio.main import app` è disponibile nel backend congelato. Aggiornate README e guida Windows per spiegare distribuzione NSIS/artefatto Actions, prerequisiti sul PC destinazione e dipendenza separata da Ollama/Qwen.

Verifica in questa sessione: revisione statica di package.json, desktop/main.cjs, backend/run.py, analysis.py, script e workflow. L’ambiente attuale è Linux senza PowerShell/Wine; non può produrre o provare l’installer Windows. Non è stato pubblicato né firmato alcun `.exe`. La build su runner Windows resta necessaria per confermare il pacchetto e il suo avvio pulito.

## Installazione e collaudo Windows reale — 24 novembre 2026

Ambiente verificato: Windows 11 Pro build 22631, Python 3.12.10, Node v26.13.1, npm 11.20.0 (`npm.cmd`), Ollama 0.40.18, Git 2.56.1.windows.1, CPU i7-7700HQ 4 core/8 thread e 7,9 GB RAM. Sorgente: `C:\Users\karim\Downloads\PLC-K-Studio.zip`, SHA256 `6EAEA93E00621DEC95F84343680AE1CB9CE73EFC1737D38595DEEBFA40A00846`, 577 voci e 556 file estratti. `package.json` e `scripts\setup.ps1` confermati.

`scripts\setup.ps1` ha creato `.venv` e installato le dipendenze Python, poi è fallito in `npm ci`: lo script `install` di `tree-sitter-iec61131-3-st@0.1.2` esegue `node-gyp-build`, non trova `prebuilds/` nel tarball e richiede Visual Studio C++, assente. Errore npm completo: `Could not find any Visual Studio installation to use`, con `node -v v26.13.1`, `node-gyp -v v12.4.0` e comando `node-gyp rebuild`. Il pacchetto non è specifico di Node 24: senza prebuild servono comunque gli strumenti C++. Il progetto usa però il WASM `tree-sitter-iec61131_3_st.wasm` tramite `web-tree-sitter`, non il binding nativo; il file `.node` non esiste e il linter passa. workaround applicato senza modificare lockfile: `npm.cmd ci --ignore-scripts`, download esplicito di Electron con `node node_modules\electron\install.js`, poi `npm.cmd run build`.

Verifiche rieseguite dopo il fix: **33 test backend PASS** (incluso il nuovo `test_ai_timeouts.py`), `npm run test:linter` PASS, `npm run build` PASS, `npm audit` **0 vulnerabilità**. Restano il warning noto `use no memo` di `react-compiler-runtime` e il deprecation warning Starlette/httpx nel TestClient. Modello `qwen2.5-coder:7b` scaricato e presente in `ollama list`; `/api/models` lo segnala disponibile. Nessuna variabile `CLOUD_*`, `OLLAMA_*` o `STUDIO_*` sovrascritta: backend con URL Ollama e modello predefiniti, cloud disattivato.

App desktop avviata da Electron. Per debugging è stato usato temporaneamente `--remote-debugging-port=9229`; token preload di 64 caratteri, `/api/health` `200` con token e `401` senza token, root `200`, `typeof window.require === 'undefined'`. Nessuna eccezione JavaScript, nessun errore HTTP inatteso e nessuna richiesta di rete fallita; l’unico `401` nei log CDP è quello provocato deliberatamente dalla prova senza token.

Verifiche funzionali reali: creato il progetto `Verifica PLC-K Studio` (`2db5733f-38db-431d-b2b9-284f9be298dc`, M241) con revisione in SQLite; **Analizza** ha mostrato `Nessun errore rilevato dai controlli eseguiti`. Assistente con provider `ollama` e modello `qwen2.5-coder:7b`: alla domanda sulle variabili ha risposto correttamente `Start`, `Stop`, `Permissive`, `MotorRun` con tipi BOOL. Generazione sinottico AI: 4 simboli, spostamento di `Start` da `(100,100)` a `(220,100)` salvato con `manual=true`; dopo ricaricamento dell’UI e riapertura dell’archivio, posizione UI e database coincidono e il progetto ha 2 revisioni.

Bug reale trovato e corretto: la prima generazione del sinottico è fallita con `Inferenza non disponibile; sinottico precedente conservato.` Il log mostrava `POST /api/synoptic/generate 503`; la causa è `httpx.ReadTimeout` a 180 s in `backend/studio/ai.py:34`, non uno schema non valido: la stessa richiesta Ollama ha restituito `200` in **536,1 s** su questo PC. Aggiunti `OLLAMA_TIMEOUT` (predefinito 900 s) e `CLOUD_TIMEOUT` (180 s), con selezione per provider, test di regressione e voce nella guida Windows. Dopo il riavvio del backend la generazione AI è riuscita.

Limiti reali: Node 26 non è la versione 24 LTS indicata dalla guida, benché build e app funzionino; la compilazione nativa di tree-sitter resta saltata per scelta (percorso WASM verificato). Non eseguiti packaging/installer NSIS, compilazione vendor Schneider, collaudo hardware, invio a PLC reali o configurazione cloud. L’app è stata riavviata con CDP solo per il collaudo; per l’uso normale basta `npm.cmd run desktop`. `error.log` e `premium-ui.json` nella cartella sorgente sono artefatti di debugging/audit e non vanno inclusi in una pubblicazione senza revisione. Le modifiche locali non sono ancora state commesse né pusate su `NeWPLC`.

## Suite E2E Windows in Edge — report Codex, 24 novembre 2026

Registrato il report Codex come verifica complementare, distinta dal collaudo Electron con Qwen reale descritto sopra. Codex ha eseguito le tre suite funzionali dell’interfaccia su Windows con Edge, backend locale reale e database temporaneo, **senza eccezioni JavaScript**. La prima esecuzione era fallita per una configurazione della copia di prova che puntava a una porta esclusa dalla relativa regola di sicurezza; la configurazione è stata corretta solo nella copia temporanea e tutte le suite sono state rieseguite. È rimasta una richiesta `404` per `favicon.ico`, senza effetti osservati sui flussi provati.

Verifiche riportate come superate:

- **Editor Structured Text**: importazione `.st`, salvataggio, analisi, simulazione su tre scansioni; export byte per byte uguale al file importato.
- **Libreria blocchi e revisioni**: salvataggio del sorgente come blocco, caricamento in bozza e ripristino di una revisione.
- **Archivio progetti**: ricerca nel codice storico, filtro per famiglia PLC, lettura ed export di una revisione; copia disponibile dopo riapertura e originale con cronologia intatta.
- **Documentazione RAG**: caricamento documento di testo, indicizzazione, ricerca del contenuto e rimozione dalla libreria.
- **Sinottico**: otto tipi di simbolo, modifiche manuali, collegamenti, rigenerazione, comandi simulati, stati e allarmi; verificati anche salvataggio, riapertura, annullamento, risposta AI malformata e avvisi dopo rinomina variabili.

Limiti del report Codex: le interazioni sono state eseguite in Edge, non nella finestra Electron (il cui avvio era già verificato separatamente); per il sinottico sono state usate risposte Ollama controllate per riprodurre errori e annullamenti. La prova con Qwen reale resta quella del collaudo locale, completata con esito positivo dopo la correzione del timeout. Restano aperti installazione pulita con `setup.ps1` senza workaround, pacchetto NSIS, provider cloud e verifica nel tool Schneider.
Debug Windows: avvio desktop verificato con editor ST, backend locale e progetto M241 visibili. Setup aggiornato per installare le dipendenze WASM e poi Electron esplicitamente. Installazione pulita del nuovo script ancora da verificare.
Debug Windows: client API aggiornato per mostrare il corpo testuale degli errori middleware e conservare detail JSON. Esclusi da Git error.log e premium-ui.json nella root.
