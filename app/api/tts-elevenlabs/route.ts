import axios from 'axios';
import { ElevenLabsClient } from 'elevenlabs';
import { fstat } from 'fs';
import { NextResponse, NextRequest } from 'next/server';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
// import { runCommands } from 'rhubarb-lip-sync';

export const GET = async () => {
  const apiKey = process.env.OPEN_AI_KEY;
  return NextResponse.json({ apiKey: apiKey }, { status: 200 });
};
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY!, // This is the default and can be omitted
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // -------------------> OpenAI Text generation <---------------------
    const { text } = await req.json();
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a school teacher.Give the all answers to the questions asked by the student.give the answers in a simple and short.',
        },
        { role: 'user', content: text },
      ],
    });
    console.log(
      'open_ai_response :',
      chatCompletion.choices[0].message.content
    );
    // -------------------> Whisper open Ai TTS <---------------------
    // const baseDir = path.resolve(process.cwd(), 'public', 'audio');
    // await fs.mkdir(baseDir, { recursive: true });

    // const mp3Response = await openai.audio.speech.create({
    //   model: 'tts-1',
    //   voice: 'shimmer',
    //   input: chatCompletion.choices[0].message.content || '',
    // });

    // const buffer = Buffer.from(await mp3Response.arrayBuffer());
    // console.log('buffer', buffer);
    // const speechFile = path.join(baseDir, `output.mp3`);
    // await fs.writeFile(speechFile, buffer);

    // --------------------- > ElevenLabs TTS <---------------------
    const headers = {
      Accept: 'audio/mp3',

      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({
      text: chatCompletion?.choices[0]?.message?.content || '',
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    });
    const ttsResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/OYTbf65OHHFELVut7v2H/with-timestamps`,
      body,
      {
        headers: headers,
        responseType: 'arraybuffer',
      }
    );
    const responseBase64 = Buffer.from(ttsResponse.data).toString('binary');
    const data = JSON.parse(responseBase64);

    const audio = Buffer.from(data?.audio_base64, 'base64');
    const filePath = path.join(process.cwd(), 'public', 'audio', 'output.mp3');
    // await fs.writeFile(filePath, audio);

    // const lipSyncJson = await runCommands(bufferAudio);
    // -------------------> Rhubarb Lip Sync <---------------------
    const execCommand = (command: any) => {
      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) reject(error);
          resolve(stdout);
        });
      });
    };
    const lipSyncMessage = async () => {
      const time = new Date().getTime();
      console.log(`Starting conversion for message `);
      await execCommand(
        `ffmpeg -y -i public/audio/output.mp3 public/audio/output.wav`
        // -y to overwrite the file
      );
      console.log(`Conversion done in ${new Date().getTime() - time}ms`);
      await execCommand(
        `/var/www/html/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb -f json -o public/audio/output.json public/audio/output.wav -r phonetic`
      );
      // -r phonetic is faster but less accurate
      console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
    };
    await lipSyncMessage();
    const readJsonTranscript = async (file: any) => {
      const data = await fs.readFile(file, 'utf8');
      return JSON.parse(data);
    };
    const lipSync = await readJsonTranscript(`public/audio/output.json`);

    return NextResponse.json(
      {
        completion: chatCompletion.choices[0].message.content,
        tts: audio,
        lipSync: lipSync,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.log('error in openai response', error);
    return NextResponse.json(
      { message: 'Internal Server error', error: error?.error?.message },
      { status: 500 }
    );
  }
}
