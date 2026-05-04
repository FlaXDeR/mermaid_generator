import { useEffect, useState, useRef } from 'react';
import "../styles/OutputSection.css";
import type { DiagramType } from './HomePage';

// velocità typewriter adattiva in base alla lunghezza del codice
function getTypewriterSpeed(length: number): number {
    if (length < 200) return 30;
    if (length < 800) return 12;
    return 4;
}

const DIAGRAM_LABELS: Record<DiagramType, string> = {
    class:     'Class Diagram',
    sequence:  'Sequence Diagram',
    flowchart: 'Flowchart',
    component: 'Component Diagram',
};

interface OutputSectionProps {
    mermaidCode: string;
    docText: string;
    diagramType: DiagramType;
    onReset: () => void;
}

export default function OutputSection({ mermaidCode, docText, diagramType, onReset }: OutputSectionProps) {
    const [displayedCode, setDisplayedCode] = useState<string>('');
    const [typewriterDone, setTypewriterDone] = useState(false);
    const [copied, setCopied] = useState(false);
    const [docCopied, setDocCopied] = useState(false);
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

    // TODO: implementare export PDF con jsPDF + html2canvas
    const handleDownloadPDF = () => {
        console.log('Download PDF diagramma');
    };

    const handleDownloadDoc = () => {
        console.log('Download PDF documento');
    };

    return (
        <section className="output-section phase-enter">
            <div className="output-grid">

                {/* codice Mermaid generato */}
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

                {/* diagramma renderizzato — visibile dopo il typewriter */}
                <div className={`output-card diagram-card ${typewriterDone ? 'visible' : ''}`}>
                    <div className="card-header">
                        <div className="card-header-left">
                            <span className="card-title">Diagramma UML</span>
                            <span className="diagram-type-badge">
                                {DIAGRAM_LABELS[diagramType]}
                            </span>
                        </div>
                        <button className="card-btn download" onClick={handleDownloadPDF}>
                            ↓ Scarica PDF
                        </button>
                    </div>
                    <div className="diagram-area">
                        {/* TODO: rendere il diagramma con mermaid.js */}
                        <p className="diagram-placeholder">Il diagramma apparirà qui</p>
                    </div>
                </div>

                {/* documentazione generata dall'LLM */}
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