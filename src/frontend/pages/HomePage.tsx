import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import "../styles/global.css";
import "../styles/HomePage.css";
import OutputSection from './OutputSection';

type InputMode = 'text' | 'file';
type Phase = 'input' | 'loading' | 'output';

// Mock più lungo per testare il typewriter adattivo
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

export default function HomePage() {
    const [phase, setPhase] = useState<Phase>('input');
    const [activeTab, setActiveTab] = useState<InputMode>('text');
    const [codeText, setCodeText] = useState('');
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [mermaidCode, setMermaidCode] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) setDroppedFile(file);
    };

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setDroppedFile(file);
    };

    const handleGenerate = () => {
        setPhase('loading');
        // TODO: sostituire con chiamata reale al backend
        setTimeout(() => {
            setMermaidCode(MOCK_MERMAID);
            setPhase('output');
        }, 4000);
    };

    const handleReset = () => {
        setPhase('input');
        setMermaidCode(null);
        setCodeText('');
        setDroppedFile(null);
    };

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
                    Incolla del codice o carica un file, verrà generato l'equivalente
                    in diagrammi <strong>Mermaid UML</strong> pronti all'uso.
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

                    {activeTab === 'text' && (
                        <div className="panel">
                            <label className="panel-label">
                                Il tuo codice
                                <span className="panel-hint">Supporta qualsiasi linguaggio</span>
                            </label>
                            <textarea
                                className="code-input"
                                placeholder={`// Incolla qui il tuo codice\nfunction example() {\n  return 42;\n}`}
                                value={codeText}
                                onChange={(e) => setCodeText(e.target.value)}
                                rows={14}
                                spellCheck={false}
                            />
                        </div>
                    )}

                    {activeTab === 'file' && (
                        <div className="panel">
                            <label className="panel-label">
                                Carica un file sorgente
                                <span className="panel-hint">.ts, .py, .java, .js, .go…</span>
                            </label>
                            <div
                                className={`drop-zone ${isDragging ? 'dragging' : ''} ${droppedFile ? 'has-file' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.cs,.cpp,.c,.rb,.php,.swift,.kt"
                                    style={{ display: 'none' }}
                                    onChange={handleFileInput}
                                />
                                {droppedFile ? (
                                    <div className="file-info">
                                        <span className="file-icon">◈</span>
                                        <span className="file-name">{droppedFile.name}</span>
                                        <span className="file-size">
                                            {(droppedFile.size / 1024).toFixed(1)} KB
                                        </span>
                                        <button
                                            className="file-remove"
                                            onClick={(e) => { e.stopPropagation(); setDroppedFile(null); }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="drop-prompt">
                                        <span className="drop-icon">⤓</span>
                                        <p className="drop-text">
                                            Trascina qui il file<br />
                                            <span>oppure clicca per selezionarlo</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={activeTab === 'text' ? !codeText.trim() : !droppedFile}
                    >
                        Genera diagramma Mermaid →
                    </button>
                </section>
            )}

            {phase === 'loading' && (
                <div className="loading-container phase-enter">
                    <div className="loading-spinner" />
                    <LoadingText />
                </div>
            )}

            {phase === 'output' && mermaidCode && (
                <OutputSection
                    mermaidCode={mermaidCode}
                    onReset={handleReset}
                />
            )}
        </main>
    );
}

const LOADING_PHASES = [
    "Analizzando il codice...",
    "Identificando le strutture...",
    "Costruendo il diagramma...",
    "Finalizzando l'output...",
];

function LoadingText() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(i => (i + 1) % LOADING_PHASES.length);
        }, 1400);
        return () => clearInterval(interval);
    }, []);

    return <p className="loading-phase-text">{LOADING_PHASES[index]}</p>;
}
