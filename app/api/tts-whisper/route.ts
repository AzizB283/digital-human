import axios from 'axios';
import { ElevenLabsClient } from 'elevenlabs';
import { NextResponse, NextRequest } from 'next/server';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';
import { put } from '@vercel/blob';
import { exec } from 'child_process';
import { url } from 'inspector';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY!,
});

// export const client = new ElevenLabsClient({
//   apiKey: process.env.ELEVENLABS_API_KEY,
// });

export const GET = async () => {
  const apiKey = process.env.OPEN_AI_KEY;
  return NextResponse.json({ apiKey: apiKey }, { status: 200 });
};

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    // OpenAI Text generation
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a school teacher. Give answers to the questions asked by the student in a simple and short manner.',
        },
        { role: 'user', content: text },
      ],
    });

    const generatedText = chatCompletion?.choices[0]?.message?.content;

    // Whisper OpenAI TTS
    // const baseDir = path.resolve(process.cwd(), 'public', 'audio');
    const baseDir = 'audio';
    await fs.mkdir(baseDir, { recursive: true });

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'shimmer',
      input: generatedText || '',
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const speechFile = path.join(baseDir, 'output.mp3');
    await fs.writeFile(speechFile, buffer);

    const blob = await put(`output.mp3`, buffer, {
      access: 'public',
      contentType: 'audio/mp3',
    });
    console.log('Blob URL:', blob?.url);
    try {
    } catch (error) {
      console.error('Error uploading to Vercel Blob Storage:', error);
      // Optionally, handle the error more gracefully, e.g., by retrying the upload
    }

    // Rhubarb Lip Sync
    const execCommand = (command: any) => {
      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) reject(error);
          resolve(stdout);
        });
      });
    };
    console.log('speech file', speechFile);
    console.log('base Directory ', baseDir);

    const lipSyncMessage = async () => {
      if (!blob?.url) {
        console.error('Blob URL is not available');
        return;
      }
      await execCommand(`ffmpeg -y -i ${blob?.url} ${baseDir}/output.wav`);
      await execCommand(
        `/var/www/html/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb -f json -o ${baseDir}/output.json ${baseDir}/output.wav -r phonetic`
      );
    };

    await lipSyncMessage();

    const readJsonTranscript = async (file: any) => {
      const data = await fs.readFile(file, 'utf8');
      return JSON.parse(data);
    };

    const lipSync = await readJsonTranscript(`${baseDir}/output.json`);
    console.log('lipSync', lipSync);
    return NextResponse.json(
      {
        completion: generatedText,
        tts: buffer,
        lipSync: lipSync,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.log('error in openai response', error);
    return NextResponse.json(
      { message: 'Internal Server error', error: error.message },
      { status: 500 }
    );
  }
}
