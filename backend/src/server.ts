import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Backend attivo",
  });
});

app.post("/api/generate", (req, res) => {
  const { prompt } = req.body as { prompt?: string };

  if (!prompt) {
    return res.status(400).json({
      error: "Prompt mancante",
    });
  }

  res.json({
    diagram: `graph TD\nA[${prompt}] --> B[Diagramma generato]`,
  });
});

app.listen(port, () => {
  console.log(`Backend in ascolto su http://localhost:${port}`);
});
