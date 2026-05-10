import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "../styles/OutputSection.css";
import type { DiagramType } from './HomePage';

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    darkMode: true,
    fontFamily: 'monospace',
    themeVariables: {
        background: 'transparent',
        primaryColor: '#1a1640',
        primaryTextColor: '#e8ecf0',
        primaryBorderColor: '#4a3fa0',
        lineColor: '#6b7a90',
        secondaryColor: '#0d1e35',
        tertiaryColor: '#161b25',
    }
});

function getTypewriterSpeed(length: number): number {
    if (length < 200) return 30;
    if (length < 800) return 12;
    return 4;
}

// calcola lo zoom ottimale per far entrare il diagramma nel contenitore
function calcAutoZoom(svgString: string, containerW: number, containerH: number): number {
    const mwMatch = svgString.match(/max-width:\s*([\d.]+)px/);
    const svgW = mwMatch ? parseFloat(mwMatch[1]) : null;

    if (svgW && svgW > 0) {
        const vbMatch = svgString.match(/viewBox="[\d.\s-]+ ([\d.]+) ([\d.]+)"/);
        const svgH = vbMatch
            ? svgW * (parseFloat(vbMatch[2]) / parseFloat(vbMatch[1]))
            : svgW;

        const pad = 32;
        const fitZoom = Math.min(
            (containerW - pad) / svgW,
            (containerH - pad) / svgH
        );
        // parte almeno a 1.8x anche se il diagramma è grande
        return Math.max(2, Math.min(fitZoom * 2.75, 6));
    }

    return 2.25;
}
const DIAGRAM_LABELS: Record<DiagramType, string> = {
    class:     'Class Diagram',
    sequence:  'Sequence Diagram',
    flowchart: 'Flowchart',
    component: 'Component Diagram',
};

const ZOOM_STEP = 0.4;
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;

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
    const [diagramSvg, setDiagramSvg] = useState<string>('');
    const [diagramError, setDiagramError] = useState<string>('');
    const [zoom, setZoom] = useState(1);
    const [isHoveringDiagram, setIsHoveringDiagram] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelledRef = useRef(false);
    const diagramAreaRef = useRef<HTMLDivElement>(null);

    // nasconde il toast di errore di Mermaid
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const toast = document.querySelector('#d2, .error-icon');
            if (toast) (toast as HTMLElement).style.display = 'none';
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    // typewriter
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
        setDiagramSvg('');
        setDiagramError('');
        setZoom(1);
        timerRef.current = setTimeout(tick, speed);

        return () => {
            cancelledRef.current = true;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [mermaidCode]);

    // rendering Mermaid con zoom automatico basato sulle dimensioni reali del SVG
    useEffect(() => {
        if (!typewriterDone || !mermaidCode) return;

        const render = async () => {
            if (mermaidCode.trim().startsWith('//')) {
                setDiagramError('Codice sorgente non valido — nessun diagramma da mostrare.');
                setDiagramSvg('');
                return;
            }

            try {
                await document.fonts.ready;
                await new Promise(resolve => setTimeout(resolve, 100));

                // gestione errori strutturati dal backend
                const errorMessages: Record<string, string> = {
                    ERR_NOT_CODE: 'Il contenuto inserito non è codice sorgente riconoscibile.',
                    ERR_WRONG_DIAGRAM: 'Il tipo di diagramma selezionato non è adatto al codice fornito.',
                    ERR_TOO_SIMPLE: 'Il codice è troppo semplice per generare un diagramma significativo.',
                    ERR_INCOHERENT_FILES: 'I file caricati appartengono a domini diversi e non correlati.',
                    ERR_INCOMPLETE_CODE: 'Il codice sembra incompleto o frammentato.',
                };

                const errorMatch = mermaidCode.trim().match(/^\/\/\s*(ERR_[A-Z_]+)/);
                if (errorMatch) {
                    const msg = errorMessages[errorMatch[1]] ?? 'Errore nella generazione del diagramma.';
                    setDiagramError(msg);
                    setDiagramSvg('');
                    return;
                }

                const id = `mermaid-${Date.now()}`;
                const { svg } = await mermaid.render(id, mermaidCode);

                const containerW = diagramAreaRef.current?.clientWidth ?? 600;
                const containerH = diagramAreaRef.current?.clientHeight ?? 536;
                const autoZoom = calcAutoZoom(svg, containerW, containerH);

                setDiagramSvg(svg);
                setZoom(autoZoom);
                setDiagramError('');
            } catch {
                setDiagramError('Impossibile renderizzare il diagramma.');
                setDiagramSvg('');
            }
        };

        render();
    }, [typewriterDone, mermaidCode]);

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN));
    };

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

    const handleDownloadMmd = () => {
        const blob = new Blob([mermaidCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Code.mmd';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDocCopy = () => {
        navigator.clipboard.writeText(docText).then(() => {
            setDocCopied(true);
            setTimeout(() => setDocCopied(false), 2000);
        });
    };

    // export PDF diagramma
    // export PDF diagramma con tema mermaid.live (dark)
    const handleDownloadDiagramPDF = async () => {
        if (!mermaidCode) return;

        let container: HTMLDivElement | null = null;

        try {
            // 1. switcha al tema dark (mermaid.live)
            mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                fontFamily: 'monospace',
            });

            // 2. ri-renderizza con il nuovo tema
            const { svg: darkSvg } = await mermaid.render(`pdf-${Date.now()}`, mermaidCode);

            // 3. crea container con sfondo stile mermaid.live
            container = document.createElement('div');
            container.style.cssText = [
                'position:fixed;left:-9999px;top:0;',
                'padding:60px;',
                'background:#ffffff;',
                'display:inline-block;',
            ].join('');
            container.innerHTML = darkSvg;
            document.body.appendChild(container);

            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 5,
                useCORS: true,
            });

            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const maxW = pageW - margin * 2;
            const maxH = pageH - margin * 2;
            const ratio = canvas.width / canvas.height;
            let imgW = maxW;
            let imgH = imgW / ratio;
            if (imgH > maxH) { imgH = maxH; imgW = imgH * ratio; }

            // sfondo intera pagina A4 uguale al container
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH);
            pdf.save('Diagram.pdf');

        } finally {
            // 4. ripristina sempre il tema originale dell'app
            mermaid.initialize({
                startOnLoad: false,
                theme: 'base',
                darkMode: true,
                fontFamily: 'monospace',
                themeVariables: {
                    background: 'transparent',
                    primaryColor: '#1a1640',
                    primaryTextColor: '#e8ecf0',
                    primaryBorderColor: '#4a3fa0',
                    lineColor: '#6b7a90',
                    secondaryColor: '#0d1e35',
                    tertiaryColor: '#161b25',
                }
            });
            if (container && document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
    };

    // export PDF documentazione
    const handleDownloadDocPDF = () => {
        const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const maxW = pageW - margin * 2;
        const lineH = 6.5;
        let y = margin;

        const newPageIfNeeded = (needed: number) => {
            if (y + needed > pageH - margin) {
                pdf.addPage();
                y = margin;
            }
        };

        const lines = docText.split('\n');

        for (const line of lines) {
            if (line.startsWith('## ')) {
                newPageIfNeeded(12);
                y += 4;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(13);
                pdf.setTextColor(30, 30, 30);
                pdf.text(line.replace('## ', ''), margin, y);
                y += lineH + 2;
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                const raw = line.replace(/^[-*] /, '').replace(/\*\*(.+?)\*\*/g, '$1');
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
                pdf.setTextColor(60, 60, 60);
                const wrapped = pdf.splitTextToSize('• ' + raw, maxW - 6);
                newPageIfNeeded(wrapped.length * lineH);
                pdf.text(wrapped, margin + 6, y);
                y += wrapped.length * lineH + 1;
            } else if (line.trim()) {
                const raw = line.replace(/\*\*(.+?)\*\*/g, '$1');
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
                pdf.setTextColor(60, 60, 60);
                const wrapped = pdf.splitTextToSize(raw, maxW);
                newPageIfNeeded(wrapped.length * lineH);
                pdf.text(wrapped, margin, y);
                y += wrapped.length * lineH + 1;
            } else {
                y += lineH / 2;
            }
        }

        pdf.save('Documentation.pdf');
    };

    return (
        <section className="output-section phase-enter">
            <div className="output-grid">

                {/* codice Mermaid */}
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
                            {typewriterDone && (
                                <button className="card-btn" onClick={handleDownloadMmd}>
                                    ↓ Scarica .mmd
                                </button>
                            )}
                        </div>
                    </div>
                    <pre className="code-block">
                        <code>{displayedCode}</code>
                        {!typewriterDone && <span className="cursor">▋</span>}
                    </pre>
                </div>

                {/* diagramma */}
                <div
                    className={`output-card diagram-card ${typewriterDone ? 'visible' : ''}`}
                    onMouseEnter={() => setIsHoveringDiagram(true)}
                    onMouseLeave={() => setIsHoveringDiagram(false)}
                >
                    <div className="card-header">
                        <div className="card-header-left">
                            <span className="card-title">Diagramma UML</span>
                            <span className="diagram-type-badge">
                                {DIAGRAM_LABELS[diagramType]}
                            </span>
                        </div>
                        <button className="card-btn download" onClick={handleDownloadDiagramPDF}>
                            ↓ Scarica PDF
                        </button>
                    </div>

                    <div className="diagram-wrapper">
                        {diagramSvg && (
                            <div className={`zoom-controls ${isHoveringDiagram ? 'visible' : ''}`}>
                                <button className="zoom-btn" onClick={handleZoomIn} title="Zoom in">+</button>
                                <button className="zoom-btn" onClick={handleZoomOut} title="Zoom out">−</button>
                            </div>
                        )}
                        <div className="diagram-area" ref={diagramAreaRef}>
                            {diagramSvg ? (
                                <div
                                    className="diagram-scroll-inner"
                                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                                >
                                    <div
                                        className="diagram-svg"
                                        dangerouslySetInnerHTML={{ __html: diagramSvg }}
                                    />
                                </div>
                            ) : diagramError ? (
                                <p className="diagram-placeholder">{diagramError}</p>
                            ) : (
                                <p className="diagram-placeholder">
                                    {typewriterDone ? 'Rendering...' : 'Il diagramma apparirà qui'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* documentazione */}
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
                            <button className="card-btn download-doc" onClick={handleDownloadDocPDF}>
                                ↓ Scarica PDF
                            </button>
                        </div>
                    </div>
                    <div className="doc-body">
                        <ReactMarkdown>{docText}</ReactMarkdown>
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