import 'dotenv/config'; 
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export { tambahBuku as uploadBuku } from './buku.controller';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function tanyaPustakawanAI(req: Request, res: Response) {
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
  } catch (error: any) {
    console.error('Error AI:', error);
    return res.status(500).json({ success: false, error: 'Gagal memproses AI', detail: error.message });
  }
}