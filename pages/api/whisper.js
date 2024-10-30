import axios from "axios";
import { ElevenLabsClient } from "elevenlabs";
import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { runCommands } from "rhubarb-lip-sync";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const bodyData = req.body;
      console.log("body :", bodyData);
      const { text } = bodyData;
      // OpenAI Text generation
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          // {
          //   role: 'system',
          //   content:
          //     'You are a school teacher.Your name is Tina. Give answers to the questions asked by the student in a simple and short manner.and make sure to answer the questions in a way that the student can understand. ',
          // },
          { role: "user", content: text },
        ],
      });

      const generatedText = chatCompletion?.choices[0]?.message?.content;

      // Whisper OpenAI TTS
      //   const baseDir = path.resolve(process.cwd(), 'public', 'audio');
      //   await fs.mkdir(baseDir, { recursive: true });

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer",
        input: generatedText || "",
        response_format: "mp3",
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      //   const speechFile = path.join(baseDir, 'output.mp3');
      //   await fs.writeFile(speechFile, buffer);

      const lipSyncJson = await runCommands(buffer);
      console.log("lipSyncJson :-", lipSyncJson);
      const lipSync = JSON.parse(lipSyncJson);

      console.log("lipSync", lipSync);
      res.status(200).json({
        completion: generatedText,
        tts: buffer,
        lipSync: lipSync,
      });
    } catch (error) {
      console.log("error in open ai response", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
