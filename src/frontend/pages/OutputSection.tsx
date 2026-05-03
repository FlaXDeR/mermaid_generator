import { useEffect, useState, useRef } from 'react';
import "../styles/OutputSection.css";

function getTypewriterSpeed(length: number): number {
    if (length < 200) return 30;
    if (length < 800) return 12;
    return 4;
}

const DIAGRAM_TYPES = [
    {
        id: 'class',
        label: 'Class',
        description: 'Struttura delle classi, attributi e relazioni — ideale per codice orientato agli oggetti.',
    },
    {
        id: 'sequence',
        label: 'Sequence',
        description: 'Flusso di chiamate tra oggetti nel tempo — utile per capire il comportamento a runtime.',
    },
    {
        id: 'flowchart',
        label: 'Flowchart',
        description: 'Logica del codice con condizioni e cicli — più leggibile per chi non conosce UML.',
    },
    {
        id: 'component',
        label: 'Component',
        description: 'Architettura ad alto livello con moduli e dipendenze — panoramica del sistema.',
    },
];

interface OutputSectionProps {
    mermaidCode: string;
    docText: string;
    onReset: () => void;
}

export default function OutputSection({ mermaidCode, docText, onReset }: OutputSectionProps) {
    const [displayedCode, setDisplayedCode] = useState<string>('');
    const [typewriterDone, setTypewriterDone] = useState(false);
    const [copied, setCopied] = useState(false);
    const [docCopied, setDocCopied] = useState(false);
    const [selectedDiagram, setSelectedDiagram] = useState('class');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelledRef = useRef(false);

    useEffect(() => {
        let i = 0;
        cancelledRef.current = false;
        const speed = getTypewriterSpeed(mermaidCode.length);

        const tick = () => {
            if (cancelledRef.current) return;
            i++;
            setDisplayedCode(mermaidCode.slice(0, i));
            if (i < mermaidCode.length) {
                timerRef.current = setTimeout(tick, speed);
            } else {
                setTypewriterDone(true);
            }
        };

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayedCode('');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTypewriterDone(false);
        timerRef.current = setTimeout(tick, speed);

        return () => {
            cancelledRef.current = true;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [mermaidCode]);

    const handleSkip = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typewriterDone) return;
        cancelledRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        setDisplayedCode(mermaidCode);
        setTypewriterDone(true);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(mermaidCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDocCopy = () => {
        navigator.clipboard.writeText(docText).then(() => {
            setDocCopied(true);
            setTimeout(() => setDocCopied(false), 2000);
        });
    };

    const handleDownloadPDF = () => {
        console.log('Download PDF diagramma');
    };

    const handleDownloadDoc = () => {
        console.log('Download PDF documento');
    };

    const selectedType = DIAGRAM_TYPES.find(d => d.id === selectedDiagram)!;

    return (
        <section className="output-section phase-enter">

            {/* ── Griglia tre colonne affiancate ── */}
            <div className="output-grid">

                {/* Sinistra — codice Mermaid */}
                <div className="output-card code-card">
                    <div className="card-header">
                        <span className="card-title">Codice Mermaid</span>
                        <div className="card-actions">
                            {!typewriterDone && (
                                <button className="card-btn skip-btn" onClick={handleSkip}>
                                    ▶▶ Salta
                                </button>
                            )}
                            <button
                                className={`card-btn ${copied ? 'success' : ''}`}
                                onClick={handleCopy}
                            >
                                {copied ? '✓ Copiato' : '⎘ Copia'}
                            </button>
                        </div>
                    </div>
                    <pre className="code-block">
                        <code>{displayedCode}</code>
                        {!typewriterDone && <span className="cursor">▋</span>}
                    </pre>
                </div>

                {/* Centro — diagramma UML */}
                <div className={`output-card diagram-card ${typewriterDone ? 'visible' : ''}`}>
                    <div className="card-header">
                        <span className="card-title">Diagramma UML</span>
                        <button className="card-btn download" onClick={handleDownloadPDF}>
                            ↓ Scarica PDF
                        </button>
                    </div>

                    <div className="diagram-selector">
                        <p className="selector-label">Seleziona il tipo di diagramma</p>
                        <div className="selector-buttons">
                            {DIAGRAM_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    className={`selector-btn ${selectedDiagram === type.id ? 'active' : ''}`}
                                    onClick={() => setSelectedDiagram(type.id)}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        <p className="selector-description">{selectedType.description}</p>
                    </div>

                    <div className="diagram-area">
                        <p className="diagram-placeholder">Il diagramma apparirà qui</p>
                    </div>
                </div>

                {/* Destra — documentazione */}
                <div className={`output-card doc-card ${typewriterDone ? 'visible' : ''}`}>
                    <div className="card-header">
                        <span className="card-title doc-title">Documentazione</span>
                        <div className="card-actions">
                            <button
                                className={`card-btn doc-copy-btn ${docCopied ? 'doc-success' : ''}`}
                                onClick={handleDocCopy}
                            >
                                {docCopied ? '✓ Copiato' : '⎘ Copia'}
                            </button>
                            <button className="card-btn download-doc" onClick={handleDownloadDoc}>
                                ↓ Scarica PDF
                            </button>
                        </div>
                    </div>
                    <div className="doc-body">
                        {docText.split('\n\n').map((paragraph, i) => (
                            <p key={i} className="doc-paragraph">{paragraph}</p>
                        ))}
                    </div>
                </div>

            </div>

            <div className="output-footer">
                <button className="reset-btn" onClick={onReset}>
                    ← Genera un altro diagramma
                </button>
            </div>

        </section>
    );
}