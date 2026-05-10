// limiti di validazione
const MAX_CHARS = 50000;
const MIN_LINES = 3;
const ALLOWED_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java',
    '.go', '.rs', '.cs', '.cpp', '.c', '.rb', '.php', '.swift', '.kt'
];

export interface FileInput {
    name: string;
    content: string;
}

export interface ValidationError {
    valid: false;
    message: string;
}

export interface ValidationSuccess {
    valid: true;
    combinedCode: string;
}

export function validateInput(
    code?: string,
    files?: FileInput[]
): ValidationError | ValidationSuccess {

    // deve arrivare o testo o almeno un file
    const hasCode = code && code.trim().length > 0;
    const hasFiles = files && files.length > 0;

    if (!hasCode && !hasFiles) {
        return { valid: false, message: 'Nessun codice o file ricevuto.' };
    }

    if (hasFiles) {
        for (const file of files!) {
            // controlla le estensioni
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                return {
                    valid: false,
                    message: `Estensione non supportata: ${file.name}. Usa file sorgente (.ts, .js, .py, .java, .go, ecc.)`
                };
            }

            // controlla file vuoti o troppo piccoli
            const meaningfulLines = file.content
                .split('\n')
                .filter(l => l.trim().length > 0 && !l.trim().startsWith('//') && !l.trim().startsWith('#'));

            if (meaningfulLines.length < MIN_LINES) {
                return {
                    valid: false,
                    message: `Il file "${file.name}" è vuoto o troppo breve per essere analizzato.`
                };
            }
        }
    } else {
        // controlla testo troppo breve
        const meaningfulLines = code!
            .split('\n')
            .filter(l => l.trim().length > 0 && !l.trim().startsWith('//') && !l.trim().startsWith('#'));

        if (meaningfulLines.length < MIN_LINES) {
            return {
                valid: false,
                message: 'Il codice inserito è troppo breve per essere analizzato. Inserisci almeno 3 righe di codice significativo.'
            };
        }
    }

    // costruisce la stringa da mandare all'LLM
    let combinedCode = '';

    if (hasFiles) {
        for (const file of files!) {
            combinedCode += `// === ${file.name} ===\n${file.content}\n\n`;
        }
    } else {
        combinedCode = code!;
    }

    // controlla il limite di caratteri
    if (combinedCode.length > MAX_CHARS) {
        return {
            valid: false,
            message: `Il codice supera il limite di ${MAX_CHARS} caratteri. Riduci la quantità di codice inserita.`
        };
    }

    return { valid: true, combinedCode };
}