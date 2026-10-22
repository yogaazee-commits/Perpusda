"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBuku = void 0;
exports.tanyaPustakawanAI = tanyaPustakawanAI;
require("dotenv/config");
const genai_1 = require("@google/genai");
var buku_controller_1 = require("./buku.controller");
Object.defineProperty(exports, "uploadBuku", { enumerable: true, get: function () { return buku_controller_1.tambahBuku; } });
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function tanyaPustakawanAI(req, res) {
    try {
        const { pesan } = req.body;
        if (!pesan) {
            return res.status(400).json({ error: 'Pesan atau pertanyaan tidak boleh kosong!' });
        }
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: `Kamu adalah asisten AI perpustakaan digital: ${pesan}` }] }],
        });
        return res.status(200).json({ success: true, jawaban: response.text });
    }
    catch (error) {
        console.error('Error AI:', error);
        return res.status(500).json({ success: false, error: 'Gagal memproses AI', detail: error.message });
    }
}
