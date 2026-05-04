import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import "../styles/global.css";
import "../styles/HomePage.css";
import OutputSection from './OutputSection';

type InputMode = 'text' | 'file';
type Phase = 'input' | 'loading' | 'output';
export type DiagramType = 'class' | 'sequence' | 'flowchart' | 'component';

const MAX_FILES = 5;

const DIAGRAM_TYPES: { id: DiagramType; label: string; icon: string; description: string }[] = [
    {
        id: 'class',
        label: 'Class',
        icon: '◫',
        description: 'Mostra la struttura statica del codice — classi, attributi, metodi e relazioni tra di essi. Il più comune per codice orientato agli oggetti.',
    },
    {
        id: 'sequence',
        label: 'Sequence',
        icon: '⇄',
        description: 'Rappresenta il flusso dinamico delle chiamate tra oggetti nel tempo. Utile per capire come i componenti interagiscono durante l\'esecuzione.',
    },
    {
        id: 'flowchart',
        label: 'Flowchart',
        icon: '⬡',
        description: 'Visualizza la logica del codice attraverso condizioni, cicli e diramazioni. Più leggibile per chi non conosce UML.',
    },
    {
        id: 'component',
        label: 'Component',
        icon: '⬢',
        description: 'Visione ad alto livello dell\'architettura con moduli e dipendenze. Ideale per progetti strutturati in layer o microservizi.',
    },
];

// Mock per sviluppo — da rimuovere quando il backend è pronto
const MOCK_MERMAID = `classDiagram
  class UserService {
    -UserRepository repo
    -EmailService emailService
    +register(dto: RegisterDTO) User
    +login(email: string, password: string) Token
    +updateProfile(id: string, dto: UpdateDTO) User
    +deleteAccount(id: string) void
  }

  class UserRepository {
    -Database db
    +findById(id: string) User
    +findByEmail(email: string) User
    +save(user: User) User
    +delete(id: string) void
  }

  class EmailService {
    -SmtpClient client
    +sendWelcome(email: string) void
    +sendPasswordReset(email: string, token: string) void
  }

  class User {
    +id: string
    +email: string
    +passwordHash: string
    +createdAt: Date
    +isActive: boolean
  }

  class AuthController {
    -UserService userService
    +POST /register(req, res) void
    +POST /login(req, res) void
    +DELETE /account(req, res) void
  }

  AuthController --> UserService
  UserService --> UserRepository
  UserService --> EmailService
  UserRepository --> User`;

const MOCK_DOC = `## Panoramica del progetto

Questo modulo implementa un sistema di autenticazione e gestione utenti strutturato in più livelli, seguendo il pattern MVC con separazione delle responsabilità.

## Classi principali

**UserService** — Nucleo della logica applicativa. Gestisce la registrazione, il login e le operazioni sul profilo utente. Dipende da UserRepository per la persistenza e da EmailService per le notifiche.

**UserRepository** — Strato di accesso ai dati. Espone metodi CRUD per l'entità User, astraendo la comunicazione con il database.

**EmailService** — Servizio dedicato all'invio di email transazionali, come il benvenuto post-registrazione e il reset della password.

**AuthController** — Entry point HTTP. Riceve le richieste dall'esterno e le delega a UserService, gestendo il mapping tra route e logica.

## Relazioni e dipendenze

Il controller dipende dal service, il service dipende sia dal repository che dall'email service. Il repository gestisce l'entità User. La dipendenza è unidirezionale e non presenta cicli.

## Pattern rilevati

Dependency Injection implicita tramite costruttore, separazione netta tra controller, service e repository, uso di DTO per isolare il dominio dall'interfaccia HTTP.`;

export default function HomePage() {
    const [phase, setPhase] = useState<Phase>('input');
    const [activeTab, setActiveTab] = useState<InputMode>('text');
    const [codeText, setCodeText] = useState('');
    const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [mermaidCode, setMermaidCode] = useState<string | null>(null);
    const [docText, setDocText] = useState<string | null>(null);
    const [selectedDiagram, setSelectedDiagram] = useState<DiagramType>('class');
    const [descKey, setDescKey] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = (incoming: FileList | File[]) => {
        const arr = Array.from(incoming);
        setDroppedFiles(prev => {
            const combined = [...prev, ...arr];
            // rimuove duplicati per nome
            const unique = combined.filter(
                (f, i, self) => self.findIndex(x => x.name === f.name) === i
            );
            return unique.slice(0, MAX_FILES);
        });
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(e.target.files);
    };

    const removeFile = (name: string) => {
        setDroppedFiles(prev => prev.filter(f => f.name !== name));
    };

    const handleSelectDiagram = (type: DiagramType) => {
        setSelectedDiagram(type);
        setDescKey(k => k + 1); // incrementa la key per riattivare il fade
    };

    const handleGenerate = () => {
        setPhase('loading');
        // TODO: sostituire con chiamata al backend
        setTimeout(() => {
            setMermaidCode(MOCK_MERMAID);
            setDocText(MOCK_DOC);
            setPhase('output');
        }, 4000);
    };

    const handleReset = () => {
        setPhase('input');
        setMermaidCode(null);
        setDocText(null);
        setCodeText('');
        setDroppedFiles([]);
    };

    const isGenerateDisabled = activeTab === 'text' ? !codeText.trim() : droppedFiles.length === 0;
    const selectedType = DIAGRAM_TYPES.find(d => d.id === selectedDiagram)!;

    return (
        <main>
            <header className="hero">
                <span className="hero-badge">
                    ✦ Powered by <span className="badge-brand">OpenAI</span> & <span className="badge-brand">Mermaid</span>
                </span>
                <h1 className="hero-title">
                    Code to <em>UML Diagram</em>
                </h1>
                <p className="hero-sub">
                    Inserisci il tuo codice o carica fino a 5 file. Verrà generato il codice <strong>Mermaid</strong> e una documentazione automatica della struttura.
                </p>
            </header>

            {phase === 'input' && (
                <section className="input-section phase-enter">
                    <div className="tab-bar">
                        <button
                            className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                            onClick={() => setActiveTab('text')}
                        >
                            <span className="tab-icon">{'<>'}</span> Inserisci codice
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
                            onClick={() => setActiveTab('file')}
                        >
                            <span className="tab-icon">↑</span> Carica file
                        </button>
                    </div>

                    <div className="panel">
                        {activeTab === 'text' && (
                            <>
                                <label className="panel-label">
                                    Il tuo codice
                                    <span className="panel-hint">Supporta qualsiasi linguaggio</span>
                                </label>
                                <textarea
                                    className="code-input"
                                    placeholder={`// Incolla qui il tuo codice\nfunction example() {\n  return 42;\n}`}
                                    value={codeText}
                                    onChange={(e) => setCodeText(e.target.value)}
                                    rows={10}
                                    spellCheck={false}
                                />
                            </>
                        )}

                        {activeTab === 'file' && (
                            <>
                                <label className="panel-label">
                                    Carica i file sorgente
                                    <span className="panel-hint">max {MAX_FILES} file · .ts .py .java .js .go…</span>
                                </label>

                                {droppedFiles.length < MAX_FILES && (
                                    <div
                                        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.cs,.cpp,.c,.rb,.php,.swift,.kt"
                                            style={{ display: 'none' }}
                                            onChange={handleFileInput}
                                        />
                                        <div className="drop-prompt">
                                            <span className="drop-icon">⤓</span>
                                            <p className="drop-text">
                                                Trascina qui i file<br />
                                                <span>oppure clicca per selezionarli</span>
                                            </p>
                                            {droppedFiles.length > 0 && (
                                                <span className="drop-counter">
                                                    {droppedFiles.length}/{MAX_FILES} file caricati
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {droppedFiles.length > 0 && (
                                    <ul className="file-list">
                                        {droppedFiles.map(file => (
                                            <li key={file.name} className="file-list-item">
                                                <span className="file-icon">◈</span>
                                                <span className="file-name">{file.name}</span>
                                                <span className="file-size">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </span>
                                                <button
                                                    className="file-remove"
                                                    onClick={() => removeFile(file.name)}
                                                >
                                                    ✕
                                                </button>
                                            </li>
                                        ))}
                                        {droppedFiles.length >= MAX_FILES && (
                                            <li className="file-list-limit">
                                                Limite di {MAX_FILES} file raggiunto
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </>
                        )}

                        <div className="diagram-type-selector">
                            <label className="panel-label">
                                Tipo di diagramma
                            </label>
                            <div className="diagram-type-buttons">
                                {DIAGRAM_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        className={`diagram-type-btn ${selectedDiagram === type.id ? 'active' : ''}`}
                                        onClick={() => handleSelectDiagram(type.id)}
                                    >
                                        <span className="diagram-type-icon">{type.icon}</span>
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                            <p key={descKey} className="diagram-type-description">
                                {selectedType.description}
                            </p>
                        </div>
                    </div>

                    <button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={isGenerateDisabled}
                    >
                        Genera {selectedType.label} Diagram →
                    </button>
                </section>
            )}

            {phase === 'loading' && (
                <div className="loading-container phase-enter">
                    <div className="loading-squares">
                        <span /><span /><span />
                    </div>
                    <LoadingText />
                </div>
            )}

            {phase === 'output' && mermaidCode && (
                <OutputSection
                    mermaidCode={mermaidCode}
                    docText={docText ?? ''}
                    diagramType={selectedDiagram}
                    onReset={handleReset}
                />
            )}
        </main>
    );
}

const LOADING_PHASES = [
    { symbol: '⬡', text: 'Analizzando il codice' },
    { symbol: '⬢', text: 'Identificando le strutture' },
    { symbol: '◈', text: 'Costruendo il diagramma' },
    { symbol: '✦', text: "Finalizzando l'output" },
];

function LoadingText() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(i => (i + 1) % LOADING_PHASES.length);
        }, 1400);
        return () => clearInterval(interval);
    }, []);

    const { symbol, text } = LOADING_PHASES[index];

    return (
        <p className="loading-phase-text">
            <span className="loading-symbol">{symbol}</span>
            {text}
        </p>
    );
}