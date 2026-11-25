# Installazione e primo utilizzo su Windows

Questa guida descrive come generare o installare Schneider PLC AI Studio su Windows 10/11 x64. Il repository contiene una pipeline per creare l’installer NSIS, ma non distribuisce ancora un `.exe` precompilato. Il packaging Windows va eseguito su Windows (locale o GitHub Actions).

## Installare l’app da un installer `.exe`

Quando disponibile, scaricare `Schneider PLC AI Studio Setup <versione>.exe` dalla sezione **Artifacts** della relativa esecuzione GitHub Actions, oppure dalla sezione **Releases** se è stata pubblicata una release. Avviare il file e seguire l’installazione. L’installer attuale è NSIS per utente e non firmato: Windows potrebbe mostrare un avviso di publisher sconosciuto. Installarlo solo se la provenienza del file è verificata.

Il pacchetto include il frontend e il backend, quindi sul PC di destinazione non servono Python o Node.js. Per le funzioni AI locali occorre comunque installare Ollama, scaricare il modello nella sezione seguente, quindi selezionare Ollama nelle Impostazioni dell’app. Senza Ollama sono disponibili editor, progetti, archivio e funzioni locali che non richiedono il modello. L’installer non include i pesi Qwen, che occupano diversi GB.

## Generare l’installer dai sorgenti

Per generare il file su un PC Windows di sviluppo, completare i prerequisiti Python 3.12 e Node.js indicati sotto, estrarre il repository e dalla cartella contenente `package.json` eseguire:

```powershell
.\scripts\setup.ps1
.\scripts\package-windows.ps1
```

Il file `.exe` viene creato in `release`. In alternativa la pipeline Windows di GitHub Actions carica un artefatto denominato `plc-ai-studio-windows`. La build deve terminare correttamente; prima di distribuirla, installare e avviare il file su un PC Windows pulito. Il progetto non ha ancora una build Windows validata o firmata.

## 1. Installare i prerequisiti

Installare dai siti ufficiali:

- **Python 3.12 x64**: https://www.python.org/downloads/windows/ — scegliere la versione 3.12, includere il launcher `py` e selezionare “Add python.exe to PATH”.
- **Node.js 24 LTS x64**: https://nodejs.org/ — l'installer include npm. Il progetto accetta anche Node 22.12 o superiore della serie 22.
- **Ollama per Windows**: https://ollama.com/download/windows — necessario per l'assistente AI e la generazione AI del sinottico.

Il setup iniziale scarica dipendenze e modello: serve una connessione internet. Il modello 7B richiede diversi GB di spazio e memoria; la velocità dipende dal PC. Senza GPU dedicata l'inferenza può essere lenta. L'editor e l'archivio funzionano anche senza Ollama.

Chiudere tutte le finestre PowerShell e riaprirne una normale dopo l'installazione. Non occorre avviare l'app come amministratore.

## 2. Controllare i prerequisiti

Eseguire una riga alla volta:

```powershell
py -3.12 --version
node --version
npm --version
ollama --version
```

Ogni comando deve mostrare una versione. Python deve essere 3.12 e Node deve rispettare le versioni sopra indicate. Se un comando non è riconosciuto, reinstallare il relativo prerequisito con il PATH abilitato e riaprire PowerShell prima di proseguire.

## 3. Estrarre il progetto e aprire la cartella giusta

In Esplora file, fare clic destro sullo ZIP scaricato e scegliere **Estrai tutto**. Non eseguire il programma direttamente dentro lo ZIP.

Aprire la cartella estratta, entrando nelle eventuali sottocartelle fino a vedere **package.json** e la cartella **scripts**. Copiare il percorso dalla barra degli indirizzi di Esplora file.

In PowerShell usare quel percorso, tra virgolette. Esempio da sostituire con il percorso reale:

```powershell
cd "C:\Users\Mario\Downloads\Schneider-PLC-AI-Studio"
Test-Path .\package.json
Test-Path .\scripts\setup.ps1
```

Entrambi i controlli devono restituire `True`. Se restituiscono `False`, si è nella cartella sbagliata oppure il download non contiene tutti i sorgenti. **Non lanciare i comandi del progetto da `C:\Windows\System32`.**

## 4. Installare e costruire l'applicazione

Dalla stessa cartella:

```powershell
.\scripts\setup.ps1
```

Lo script crea `.venv`, installa le dipendenze Python e npm e costruisce l'interfaccia. Attendere il messaggio `Pronto: npm run desktop`. Il primo avvio può richiedere diversi minuti. Se compare un errore, fermarsi e correggere quello prima di proseguire.

Se PowerShell blocca gli script per la policy di esecuzione, rispettare la policy IT aziendale. È possibile eseguire manualmente le stesse operazioni, una riga alla volta, senza cambiare la policy:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm ci
npm run build
```

Proseguire solo se ogni comando termina correttamente. Non serve attivare manualmente l'ambiente virtuale. Se il blocco riguarda `npm.ps1`, usare `npm.cmd` al posto di `npm` nei comandi manuali e nell'avvio.

## 5. Preparare l'AI locale

Aprire Ollama dal menu Start. Poi eseguire:

```powershell
ollama pull qwen2.5-coder:7b
ollama list
```

Attendere la fine del download. Nell'elenco deve comparire `qwen2.5-coder:7b`. Il modello si scarica una volta; non occorre ripetere il pull a ogni avvio.

Verificare che Ollama risponda:

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Se la connessione fallisce, aprire Ollama. Se non è già in esecuzione, avviarlo con `ollama serve` in un'altra finestra PowerShell e lasciare quella finestra aperta. Un messaggio di porta già occupata può indicare che Ollama è già attivo: controllare nuovamente l'endpoint, senza avviare altre istanze.

## 6. Avviare Schneider PLC AI Studio

Nella finestra PowerShell posizionata nella cartella del progetto:

```powershell
npm run desktop
```

Lasciare il terminale aperto durante l'uso. Electron apre l'app e avvia automaticamente il backend locale. Non serve avviare separatamente FastAPI o Vite.

Nelle **Impostazioni** selezionare il provider locale Ollama. Il modello predefinito è `qwen2.5-coder:7b`. Il cloud è opzionale e richiede una scelta esplicita e la relativa configurazione.

## 7. Verificare che sia operativo

1. Creare un progetto didattico, scegliere la famiglia PLC e salvare una revisione.
2. Premere **Analizza** sul codice di esempio: deve apparire la diagnostica del linter. Il lint generico non equivale alla compilazione Schneider.
3. Chiedere all'assistente: “Descrivi le variabili del programma corrente e indica le informazioni mancanti”. La prima risposta può essere lenta mentre Ollama carica il modello. Le proposte di codice restano da revisionare.
4. In **Sinottico impianto**, inserire descrizione e lista I/O, quindi premere **Genera / rigenera AI**. Controllare simboli, citazioni e ipotesi. Spostare un simbolo e salvare la revisione.
5. Riaprire il progetto dall'archivio e verificare che posizione e associazioni siano conservate.
6. Per una scansione offline, usare un programma nel sottoinsieme supportato e confermare le associazioni dei comandi virtuali. Gli ingressi devono essere BOOL/INT ammissibili e non scritti dal programma. Elementi e costrutti non supportati devono essere segnalati.

Il sinottico è funzionale: non costituisce schema elettrico o simulazione fisica. Il programma non include connessioni o comandi verso PLC reali. Compilazione vendor e collaudo sono attività successive distinte.

## 8. Avvii successivi e backup

Aprire Ollama, aprire PowerShell nella cartella del progetto ed eseguire `npm run desktop`. Non ripetere setup o download del modello a ogni avvio.

I progetti sono nel database della cartella dati utente Electron, non nella cartella dei sorgenti. In Windows si trova normalmente sotto `%APPDATA%`, nella cartella dell'app; il backend scrive lì anche `backend.log`, mentre il database è nella sottocartella `data`. Per individuare la cartella esatta in caso di necessità:

```powershell
Get-ChildItem $env:APPDATA -Filter backend.log -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

Chiudere l'app prima di copiare l'intera cartella `data` per il backup. Non cancellarla per risolvere problemi di avvio.

## Problemi frequenti

| Messaggio / comportamento | Cosa controllare |
|---|---|
| `npm` non riconosciuto | Installare Node.js e riaprire PowerShell; verificare `node --version` e `npm --version`. |
| `ollama` non riconosciuto | Installare Ollama e riaprire PowerShell. |
| `setup.ps1` non trovato | Estrarre lo ZIP, entrare nella cartella con `package.json`; verificare i due `Test-Path`. |
| `npm.ps1` bloccato | Usare `npm.cmd` nei comandi manuali, nel rispetto delle policy IT. |
| Backend assente | Completare il setup; verificare che esista `.venv\Scripts\python.exe`. |
| Modello non trovato | Eseguire `ollama pull qwen2.5-coder:7b` e controllare `ollama list`. |
| AI non disponibile | Controllare Ollama e l'endpoint locale; l'app non ripiega automaticamente sul cloud. |
| `Inferenza non disponibile` durante la generazione del sinottico | Su PC CPU lenti il modello 7B può superare il timeout locale. Aumentare `OLLAMA_TIMEOUT` (secondi, predefinito 900) prima di avviare l'app; il layout precedente resta conservato. |
| Backend non pronto / porta 8765 | Chiudere le precedenti istanze dell'app e gli eventuali backend di sviluppo; leggere `backend.log`. Non terminare processi sconosciuti. |
| Installazione dipendenze fallita | Verificare accesso internet/proxy aziendale e leggere il primo errore; non disabilitare antivirus o controlli TLS. |

Questa guida è stata confrontata con gli script del progetto. L'installazione completa su un PC Windows e il relativo installer restano da verificare su Windows.
