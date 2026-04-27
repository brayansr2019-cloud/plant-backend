require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VALID_PLANTS = [
  "sabila",
  "zacate_limon",
  "ruda",
  "papaya",
  "matali",
  "chaya",
  "maguey_morado"
];

app.post("/identify-plant", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió imagen." });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString("base64");

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Identifica la planta de la imagen.

Solo puedes responder una de estas:
${VALID_PLANTS.join(", ")}

Responde SOLO en JSON:
{
  "plantId": "id_de_la_planta",
  "confidence": 0.0
}
`
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`
            }
          ]
        }
      ]
    });

    const text = response.output_text.trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      console.error("Respuesta inválida:", text);
      return res.status(500).json({ error: "Respuesta IA inválida" });
    }

    res.json({
      plantId: result.plantId,
      confidence: result.confidence
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error identificando planta." });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});