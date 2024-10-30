import axios from 'axios';
import { ElevenLabsClient } from 'elevenlabs';
import { fstat } from 'fs';
import { NextResponse, NextRequest } from 'next/server';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { runCommands } from 'rhubarb-lip-sync';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY, // This is the default and can be omitted
});

export const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // -------------------> OpenAI Text generation <---------------------
      const bodyData = req.body;
      console.log('body :', bodyData);
      const { text } = bodyData;
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
      // --------------------- > ElevenLabs TTS <---------------------
      const headers = {
        Accept: 'audio/mp3',

        'xi-api-key': process.env.ELEVENLABS_API_KEY,
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
      const filePath = path.join(
        process.cwd(),
        'public',
        'audio',
        'output.mp3'
      );
      await fs.writeFile(filePath, audio);

      const lipSyncJson = await runCommands(audio);
      console.log('lipSyncJson :', lipSyncJson);
      const lipSync = JSON.parse(lipSyncJson);

      // const execCommand = (command) => {
      //   return new Promise((resolve, reject) => {
      //     exec(command, (error, stdout, stderr) => {
      //       if (error) reject(error);
      //       resolve(stdout);
      //     });
      //   });
      // };
      // // -------------------> Rhubarb Lip Sync <---------------------
      // const lipSyncMessage = async () => {
      //   const time = new Date().getTime();
      //   console.log(`Starting conversion for message `);
      //   await execCommand(
      //     `ffmpeg -y -i public/audio/output.mp3 public/audio/output.wav`
      //     // -y to overwrite the file
      //   );
      //   console.log(`Conversion done in ${new Date().getTime() - time}ms`);
      //   await execCommand(
      //     `/var/www/html/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb -f json -o public/audio/output.json public/audio/output.wav -r phonetic`
      //   );
      //   // -r phonetic is faster but less accurate
      //   console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
      // };
      // await lipSyncMessage();
      // const readJsonTranscript = async (file) => {
      //   const data = await fs.readFile(file, 'utf8');
      //   return JSON.parse(data);
      // };
      // const lipSync = await readJsonTranscript(`public/audio/output.json`);
      res.status(200).json({
        completion: chatCompletion.choices[0].message.content,
        tts: audio,
        lipSync: lipSync,
      });
    } catch (error) {
      console.log('error in openai response', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
