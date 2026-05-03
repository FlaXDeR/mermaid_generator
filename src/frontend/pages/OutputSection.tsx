import { useEffect, useState, useRef } from 'react';
import "../styles/OutputSection.css";

// Velocità adattiva: più è lungo il codice, più va veloce
function getTypewriterSpeed(length: number): number {
    if (length < 200)  return 30;
    if (length < 800)  return 12;
    return 4;
}

interface OutputSectionProps {
    mermaidCode: string;
    onReset: () => void;
}

export default function OutputSection({ mermaidCode, onReset }: OutputSectionProps) {
    const [displayedCode, setDisplayedCode] = useState<string>('');
    const [typewriterDone, setTypewriterDone] = useState(false);
    const [copied, setCopied] = useState(false);
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

    // Click sulla card — salta il typewriter e mostra tutto
    const handleSkip = () => {
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

    const handleDownloadPDF = () => {
        // TODO: collegare libreria mermaid per export PDF
        console.log('Download PDF');
    };

    return (
        <section className="output-section phase-enter">

            <div className="output-grid">

                {/* Sinistra — codice Mermaid, cliccabile per skippare */}
                <div
                    className={`output-card ${!typewriterDone ? 'skippable' : ''}`}
                    onClick={handleSkip}
                    title={!typewriterDone ? 'Clicca per visualizzare subito' : ''}
                >
                    <div className="card-header">
                        <span className="card-title">Codice Mermaid</span>
                        <button
                            className={`card-btn ${copied ? 'success' : ''}`}
                            onClick={handleCopy}
                        >
                            {copied ? '✓ Copiato' : '⎘ Copia'}
                        </button>
                    </div>
                    {!typewriterDone && (
                        <div className="skip-hint">clicca per saltare →</div>
                    )}
                    <pre className="code-block">
                        <code>{displayedCode}</code>
                        {!typewriterDone && <span className="cursor">▋</span>}
                    </pre>
                </div>

                {/* Destra — diagramma UML, appare dopo il typewriter */}
                <div className={`output-card diagram-card ${typewriterDone ? 'visible' : ''}`}>
                    <div className="card-header">
                        <span className="card-title">Diagramma UML</span>
                        <button className="card-btn download" onClick={handleDownloadPDF}>
                            ↓ Scarica PDF
                        </button>
                    </div>
                    <div className="diagram-area">
                        <p className="diagram-placeholder">Il diagramma apparirà qui</p>
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