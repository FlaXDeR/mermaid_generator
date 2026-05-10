import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface GenerateResult {
    mermaid: string;
    doc: string;
}

// messaggi di errore fissi per ogni codice di errore
const ERROR_MESSAGES: Record<string, { mermaid: string; doc: string }> = {
    ERR_NOT_CODE: {
        mermaid: `// ERR_NOT_CODE\n// Il contenuto inserito non è codice sorgente.\n// Inserisci codice scritto in un linguaggio di programmazione supportato.`,
        doc: '## Panoramica\n\nNessun contenuto valido da analizzare.\n\n## Classi/Funzioni principali\n- Nessuna rilevata.\n\n## Relazioni e dipendenze\n- Nessuna rilevata.\n\n## Pattern rilevati\n- Nessun pattern rilevato.',
    },
    ERR_WRONG_DIAGRAM: {
        mermaid: `// ERR_WRONG_DIAGRAM\n// Il tipo di diagramma selezionato non è adatto al codice fornito.\n// Prova a selezionare un tipo diverso o carica codice più adatto.`,
        doc: '## Panoramica\n\nTipo di diagramma non compatibile con il codice fornito.\n\n## Classi/Funzioni principali\n- Analisi non disponibile.\n\n## Relazioni e dipendenze\n- Analisi non disponibile.\n\n## Pattern rilevati\n- Analisi non disponibile.',
    },
    ERR_TOO_SIMPLE: {
        mermaid: `// ERR_TOO_SIMPLE\n// Il codice è troppo semplice per generare un diagramma significativo.\n// Carica un file più strutturato con più classi o funzioni.`,
        doc: '## Panoramica\n\nStruttura insufficiente per l\'analisi.\n\n## Classi/Funzioni principali\n- Struttura insufficiente.\n\n## Relazioni e dipendenze\n- Nessuna relazione significativa.\n\n## Pattern rilevati\n- Nessun pattern rilevato.',
    },
    ERR_INCOHERENT_FILES: {
        mermaid: `// ERR_INCOHERENT_FILES\n// I file caricati appartengono a domini o progetti diversi.\n// Carica file che fanno parte dello stesso progetto.`,
        doc: '## Panoramica\n\nFile non correlati tra loro.\n\n## Classi/Funzioni principali\n- Analisi non disponibile.\n\n## Relazioni e dipendenze\n- Impossibile stabilire relazioni tra file di domini diversi.\n\n## Pattern rilevati\n- Analisi non disponibile.',
    },
    ERR_INCOMPLETE_CODE: {
        mermaid: `// ERR_INCOMPLETE_CODE\n// Il codice sembra incompleto o frammentato.\n// Carica un file sorgente completo con classi e funzioni chiuse.`,
        doc: '## Panoramica\n\nCodice incompleto o frammentato.\n\n## Classi/Funzioni principali\n- Struttura incompleta.\n\n## Relazioni e dipendenze\n- Non determinabili.\n\n## Pattern rilevati\n- Analisi non disponibile.',
    },
};

const DIAGRAM_TYPE_LABELS: Record<string, string> = {
    class:     'Class Diagram',
    sequence:  'Sequence Diagram',
    flowchart: 'Flowchart',
    component: 'Component Diagram',
};

const DIAGRAM_SYNTAX_GUIDE: Record<string, string> = {
    class: `Usa la sintassi classDiagram. Esempio:
classDiagram
  class NomeClasse {
    -Tipo attributo
    +TipoRitorno metodo(Tipo param)
  }
  ClasseA --> ClasseB
REGOLE OBBLIGATORIE:
- Attributi: visibilità Tipo nome (es: -String name, -int age)
- Metodi: visibilità TipoRitorno nome(Tipo param) (es: +String getName())
- NON usare i due punti negli attributi o metodi
- NON aggiungere etichette alle frecce: solo "ClasseA --> ClasseB"
- NON usare tipi generici complessi: scrivi solo Map o List`,

    sequence: `Usa la sintassi sequenceDiagram. Esempio:
sequenceDiagram
  participant A
  participant B
  participant C
  A->>B: chiamata(parametro)
  B->>C: operazione()
  C-->>B: risultato
  B-->>A: risposta
REGOLE OBBLIGATORIE:
- Massimo 6 partecipanti
- Usa ->> per chiamate e -->> per risposte/return
- Mostra solo le interazioni principali
- I messaggi devono riflettere i nomi reali dei metodi`,

    flowchart: `Usa la sintassi flowchart TD. Esempio:
flowchart TD
  A([Inizio]) --> B{Condizione valida?}
  B -->|Sì| C[Esegui operazione]
  B -->|No| D[Gestisci errore]
  C --> E([Fine])
  D --> E
REGOLE OBBLIGATORIE:
- Usa ([...]) per inizio/fine, [...] per operazioni, {...} per decisioni
- Etichette brevi in italiano, senza virgolette doppie nei label dei nodi
- Le frecce condizionali devono avere etichette |Sì| e |No|
- NON usare virgolette doppie dentro i nodi`,

    component: `Usa la sintassi graph TD con nodi componente. Esempio:
graph TD
  App([App])
  Database([Database])
  AuthService([AuthService])
  App --> Database
  App --> AuthService
REGOLE OBBLIGATORIE:
- Usa ([NomeComponente]) per ogni nodo
- Frecce semplici senza etichette`,
};

// post-processing: corregge sintassi Mermaid non valida
function fixMermaidCode(mermaid: string): string {
    let fixed = mermaid;

    if (fixed.trim().startsWith('classDiagram')) {
        // rimuove etichette dalle frecce
        fixed = fixed.replace(/-->\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^\n]+/g, '--> $1');
        fixed = fixed.replace(/<\|--\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^\n]+/g, '<|-- $1');
        // rimuove generici
        fixed = fixed.replace(/~[^~]+~/g, '');
        // converte attributi "nome: Tipo" → "Tipo nome"
        fixed = fixed.replace(/([+\-#~])(\w+)\s*:\s*([A-Za-z]\w*)\s*$/gm, '$1$3 $2');
        // rimuove colon prima del tipo di ritorno nei metodi
        fixed = fixed.replace(/([+\-#~]\w+)\s*\(([^)]*)\)\s*:\s*(\w+)/g, '$1($2) $3');
    }

    // fix flowchart: virgolette doppie nei label rompono il parser Mermaid
    if (fixed.trim().startsWith('flowchart') || fixed.trim().startsWith('graph')) {
        fixed = fixed.replace(/"/g, "'");
    }

    return fixed;
}

export async function generateDiagram(
    code: string,
    diagramType: string
): Promise<GenerateResult> {

    const diagramLabel = DIAGRAM_TYPE_LABELS[diagramType] ?? 'Class Diagram';
    const syntaxGuide = DIAGRAM_SYNTAX_GUIDE[diagramType] ?? DIAGRAM_SYNTAX_GUIDE['class'];

    const systemPrompt = `Sei un analizzatore di codice sorgente esperto in architettura software e UML.
Ricevi del codice sorgente e devi restituire SOLO un oggetto JSON valido, senza testo aggiuntivo, senza backtick, senza markdown esterno al JSON.

Il JSON deve avere esattamente questi due campi: "mermaid" e "doc".

━━━ ANALISI PRELIMINARE ━━━
Prima di generare il diagramma, valuta il contenuto ricevuto e restituisci uno di questi codici di errore se necessario:

- ERR_NOT_CODE: il contenuto non è codice sorgente (testo libero, dati, configurazione non rilevante)
- ERR_WRONG_DIAGRAM: il tipo di diagramma richiesto (${diagramLabel}) non è adatto al codice fornito (es. codice senza classi per un Class Diagram, codice senza interazioni per un Sequence Diagram)
- ERR_TOO_SIMPLE: il codice ha meno di 2 classi/funzioni significative e non è sufficiente per un diagramma utile
- ERR_INCOHERENT_FILES: i file multipli ricevuti appartengono a domini completamente diversi e non correlati
- ERR_INCOMPLETE_CODE: il codice è chiaramente frammentato o incompleto (blocchi aperti non chiusi, imports senza corpo, ecc.)

Se rilevi uno di questi errori, restituisci ESATTAMENTE:
{ "mermaid": "// CODICE_ERRORE", "doc": "// CODICE_ERRORE" }

Sostituendo CODICE_ERRORE con uno dei valori sopra (es. ERR_NOT_CODE).

━━━ CAMPO "mermaid" ━━━
Se il codice è valido, genera il codice Mermaid per un ${diagramLabel}:
- Nessun backtick, commento o delimitatore
- Il diagramma deve riflettere fedelmente la struttura del codice
- Privilegia la chiarezza: ometti dettagli minori se il diagramma diventa troppo denso

Sintassi e regole obbligatorie:
${syntaxGuide}

━━━ CAMPO "doc" ━━━
Genera documentazione tecnica e precisa in italiano. Evita descrizioni vaghe.
Struttura ESATTA:

## Panoramica
2-4 frasi tecniche su cosa fa il codice, scopo architetturale e contesto. Cita le classi principali con **grassetto**.

## Classi/Funzioni principali
Elenco con trattino. Formato: **NomeElemento**: ruolo e responsabilità tecnica precisa.

## Relazioni e dipendenze
Elenco con trattino. Dipendenze precise con tipo di relazione (dipende da, estende, implementa, utilizza, gestisce).

## Pattern rilevati
Elenco con trattino. Cerca tra: Repository, Factory, Singleton, Observer, Strategy, Decorator, Facade, Dependency Injection, MVC, Service Layer, DTO, Template Method, Command, Proxy, Builder, Adapter.
Formato: **NomePattern**: come viene applicato concretamente.
Scrivi "- Nessun pattern architetturale rilevato." solo se non ne trovi nessuno.

Regole:
- Tutto in italiano inclusi i nomi dei pattern
- Usa ** attorno a classi, metodi e pattern
- Le quattro sezioni sempre presenti nello stesso ordine
- Sii specifico, evita frasi generiche`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: code },
        ],
        temperature: 0.2,
        max_tokens: 5000,
    });

    const raw = response.choices[0]?.message?.content ?? '';

    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    const parsed = JSON.parse(cleaned) as GenerateResult;

    // controlla se l'LLM ha restituito un codice di errore
    const errorMatch = parsed.mermaid.match(/^\/\/\s*(ERR_[A-Z_]+)/);
    if (errorMatch) {
        const errorCode = errorMatch[1];
        const errorContent = ERROR_MESSAGES[errorCode];
        if (errorContent) {
            return errorContent;
        }
    }

    // output normale: applica fix Mermaid
    parsed.mermaid = fixMermaidCode(parsed.mermaid);
    return parsed;
}