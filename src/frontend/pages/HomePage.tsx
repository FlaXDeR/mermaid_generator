import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import "../styles/global.css";
import "../styles/HomePage.css";

// ── Tipi ─────────────────────────────────────────
type InputMode = 'text' | 'file';

// ── Componente principale ─────────────────────────
export default function HomePage() {
    const [activeTab, setActiveTab] = useState<InputMode>('text');
    const [codeText, setCodeText] = useState('');
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Drag & Drop handlers ──────────────────────
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
        // TODO: integrare LLM
        console.log('Generating...', activeTab === 'text' ? codeText : droppedFile?.name);
    };

    return (
        <main>
            {/* ── Hero ── */}
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

            {/* ── Input section ── */}
            <section className="input-section">

                {/* Tab switcher */}
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

                {/* Panel: testo */}
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

                {/* Panel: file */}
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

                {/* CTA */}
                <button
                    className="generate-btn"
                    onClick={handleGenerate}
                    disabled={activeTab === 'text' ? !codeText.trim() : !droppedFile}
                >
                    Genera diagramma Mermaid →
                </button>
            </section>

            {/* ── Output placeholder (da riempire con risposta LLM) ── */}
            <section className="output-section" id="output">
                {/* verrà mostrato solo dopo la generazione */}
            </section>
        </main>
    );
}