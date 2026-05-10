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
- Gli attributi vanno scritti come: visibilità Tipo nome (es: -String name, -int age)
- I metodi vanno scritti come: visibilità TipoRitorno nome(Tipo param) (es: +String getName())
- NON usare i due punti negli attributi o metodi (NO -name: string, NO +getName(): String)
- NON aggiungere etichette alle frecce: scrivi solo "ClasseA --> ClasseB"
- NON usare tipi generici complessi: scrivi solo Map o List senza parametri di tipo`,

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
- Usa al massimo 6 partecipanti
- Usa ->> per chiamate dirette e -->> per risposte/return
- Mostra solo le interazioni principali e significative
- I messaggi devono riflettere i nomi reali dei metodi del codice`,

    flowchart: `Usa la sintassi flowchart TD. Esempio:
flowchart TD
  A([Inizio]) --> B{Condizione valida?}
  B -->|Sì| C[Esegui operazione]
  B -->|No| D[Gestisci errore]
  C --> E([Fine])
  D --> E
REGOLE OBBLIGATORIE:
- Usa ([...]) per inizio/fine, [...] per operazioni, {...} per decisioni
- Le etichette dei nodi devono essere brevi e in italiano
- Le frecce condizionali devono avere etichette |Sì| e |No|
- Il flowchart deve rispecchiare la logica reale del codice`,

    component: `Usa la sintassi graph TD con nodi che rappresentano i componenti. Esempio:
graph TD
  App([App])
  Database([Database])
  AuthService([AuthService])
  App --> Database
  App --> AuthService
REGOLE OBBLIGATORIE:
- Usa parentesi tonde ([NomeComponente]) per ogni nodo
- Frecce semplici senza etichette`,
};

// post-processing: corregge sintassi Mermaid non valida generata dall'LLM
function fixMermaidCode(mermaid: string): string {
    let fixed = mermaid;

    if (fixed.trim().startsWith('classDiagram')) {
        // 1. rimuove etichette dalle frecce — causano crash
        fixed = fixed.replace(/-->\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^\n]+/g, '--> $1');
        fixed = fixed.replace(/<\|--\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^\n]+/g, '<|-- $1');

        // 2. rimuove tutti i generici — causano SVG minuscolo
        fixed = fixed.replace(/~[^~]+~/g, '');

        // 3. converte attributi "nome: Tipo" → "Tipo nome" (sintassi standard Mermaid)
        // es: -id: string → -string id
        fixed = fixed.replace(/([+\-#~])(\w+)\s*:\s*([A-Za-z]\w*)\s*$/gm, '$1$3 $2');

        // 4. rimuove colon prima del tipo di ritorno nei metodi
        // es: +getName(): String → +String getName()
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

━━━ CAMPO "mermaid" ━━━
Genera il codice Mermaid per un ${diagramLabel} seguendo queste regole:
- Non aggiungere backtick, commenti o delimitatori di codice
- Il diagramma deve riflettere fedelmente la struttura del codice ricevuto
- Privilegia la chiarezza: ometti dettagli minori se il diagramma diventerebbe troppo denso
- Il diagramma deve essere tecnicamente corretto e coerente con il codice analizzato

Sintassi e regole obbligatorie:
${syntaxGuide}

━━━ CAMPO "doc" ━━━
Genera documentazione tecnica e precisa in italiano. Evita descrizioni vaghe o generiche.
Segui ESATTAMENTE questa struttura con questi titoli nell'ordine indicato:

## Panoramica
Testo di 2-4 frasi che descrive in modo tecnico cosa fa il codice, il suo scopo architetturale e il contesto di utilizzo. Nessun elenco. Cita i nomi reali delle classi principali con **grassetto**.

## Classi/Funzioni principali
Elenco con trattino. Formato: **NomeElemento**: descrizione tecnica precisa del ruolo e delle responsabilità in italiano.

## Relazioni e dipendenze
Elenco con trattino. Descrivi con precisione le dipendenze tra classi/funzioni, specificando il tipo di relazione (dipende da, estende, implementa, utilizza, gestisce).

## Pattern rilevati
Elenco con trattino. Analizza attentamente il codice e identifica i design pattern presenti tra: Repository, Factory, Singleton, Observer, Strategy, Decorator, Facade, Dependency Injection, MVC, Service Layer, DTO, Template Method, Command, Proxy, Builder, Adapter.
Formato: **NomePattern**: spiegazione concreta di come il pattern viene applicato nel codice analizzato.
Scrivi "- Nessun pattern architetturale rilevato." SOLO se dopo analisi accurata non ne trovi nessuno.

Regole generali per "doc":
- Tutto in italiano, inclusi i nomi dei pattern
- Usa ** attorno ai nomi di classi, metodi e pattern ogni volta che compaiono nel testo
- Le quattro sezioni devono essere sempre presenti e nello stesso ordine
- Nessuna sezione aggiuntiva
- Sii specifico: evita frasi come "gestisce le operazioni" senza specificare quali

━━━ GESTIONE ERRORI ━━━
Se il contenuto non è codice sorgente riconoscibile restituisci:
{
  "mermaid": "// Codice sorgente non valido o non riconoscibile",
  "doc": "## Panoramica\nIl contenuto inviato non sembra essere codice sorgente valido.\n\n## Classi/Funzioni principali\n- Nessuna classe o funzione rilevata.\n\n## Relazioni e dipendenze\n- Nessuna relazione rilevata.\n\n## Pattern rilevati\n- Nessun pattern architetturale rilevato."
}`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: code },
        ],
        temperature: 0.2,
        max_tokens: 4000,
    });

    const raw = response.choices[0]?.message?.content ?? '';

    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    const parsed = JSON.parse(cleaned) as GenerateResult;
    parsed.mermaid = fixMermaidCode(parsed.mermaid);

    return parsed;
}