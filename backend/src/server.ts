import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { validateInput, type FileInput } from './validate.js';
import { generateDiagram } from './generate.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' })); // limite per file multipli

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend attivo' });
});

app.post('/api/generate', async (req, res) => {
  const { code, files, diagramType } = req.body as {
    code?: string;
    files?: FileInput[];
    diagramType?: string;
  };

  // validazione input
  const validation = validateInput(code, files);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    const result = await generateDiagram(
        validation.combinedCode,
        diagramType ?? 'class'
    );
    res.json(result);
  } catch (err) {
    console.error('Errore OpenAI:', err);
    res.status(500).json({ error: 'Errore durante la generazione del diagramma.' });
  }
});

app.listen(port, () => {
  console.log(`Backend in ascolto su http://localhost:${port}`);
});