"use client";

import {
  CreateProjectKeyResponse,
  LiveClient,
  LiveTranscriptionEvents,
  createClient,
} from "@deepgram/sdk";
import { useState, useEffect, useCallback, use } from "react";
import { useQueue } from "@uidotdev/usehooks";
import Recording from "./recording.svg";
import axios from "axios";
import Siriwave from "react-siriwave";
import { useVoice } from "@/hook/useVoice";

export default function Microphone() {
  const { add, remove, first, size, queue } = useQueue<any>([]);
  const [apiKey, setApiKey] = useState<CreateProjectKeyResponse | null>();
  const [connection, setConnection] = useState<LiveClient | null>();
  const [isListening, setListening] = useState(false);
  const [isLoadingKey, setLoadingKey] = useState(true);
  const [isLoading, setLoading] = useState(true);
  const [isProcessing, setProcessing] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [microphone, setMicrophone] = useState<MediaRecorder | null>();
  const [userMedia, setUserMedia] = useState<MediaStream | null>();
  const [caption, setCaption] = useState<string | null>();
  const [audio, setAudio] = useState<HTMLAudioElement | null>();
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [text, setText] = useState("");

  const { voiceData, setVoiceData }: any = useVoice();
  const callWhisperAPI = async () => {
    try {
      console.log("coming in call whisper api");

      const body = "Tell me something about Elon Musk in 500 words.";

      const res = await axios.post("/api/whisper", { text: text });
      setVoiceData(res.data);
      setCaption(res.data.completion || "");

      // Process TTS data if available
      const ttsResponse1 = res?.data?.tts;
      if (ttsResponse1) {
        const audioData = new Uint8Array(ttsResponse1.data);
        const blob = new Blob([audioData], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);

        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }

        const newAudio = new Audio(url);
        setAudio(newAudio);
      }
    } catch (error) {
      console.error("Error calling Whisper API:", error);
    }
  };

  const toggleMicrophone = useCallback(async () => {
    if (microphone && userMedia) {
      setUserMedia(null);
      setMicrophone(null);

      microphone.stop();
    } else {
      console.log(" coming inside else");

      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const microphone = new MediaRecorder(userMedia);
      microphone.start(1000);
      microphone.onstart = () => {
        setMicOpen(true);
      };

      microphone.onstop = async () => {
        setMicOpen(false);
        console.log("mic stop");

        // Trigger Whisper API if there's any remaining caption
        callWhisperAPI();
      };

      microphone.ondataavailable = (e) => {
        add(e.data);
      };

      setUserMedia(userMedia);
      setMicrophone(microphone);
    }
  }, [add, microphone, userMedia]);

  useEffect(() => {
    if (apiKey === undefined) {
      console.log("getting a new api key");
      fetch("/api", { cache: "no-store" })
        .then((res) => res.json())
        .then((object) => {
          if (!("key" in object)) throw new Error("No api key returned");

          setApiKey(object);
          setLoadingKey(false);
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey && "key" in apiKey) {
      console.log("Connecting to Deep-gram");
      const deepgram = createClient(apiKey?.key ?? "");
      const connection = deepgram.listen.live({
        model: "nova-2",
        interim_results: false,
        language: "en",
        smart_format: true,
      });

      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("Connection established");
        setListening(true);
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("Connection closed");
        setListening(false);
        setApiKey(null);
        setConnection(null);
      });

      connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
        console.log("data", data);
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript && data.is_final) {
          setCurrentTranscript(transcript); // Store latest transcript
        }
      });

      setConnection(connection);
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    const processQueue = async () => {
      console.log("coming insdide queue");

      if (size > 0 && !isProcessing) {
        setProcessing(true);

        if (isListening) {
          const blob = first;
          connection?.send(blob);
          remove();
        }

        const waiting = setTimeout(() => {
          clearTimeout(waiting);
          setProcessing(false);
        }, 250);
      }
    };

    processQueue();
  }, [connection, queue, add]);

  function handleAudio() {
    return (
      audio &&
      audio.currentTime > 0 &&
      !audio.paused &&
      !audio.ended &&
      audio.readyState > 2
    );
  }

  if (isLoadingKey)
    return (
      <span className="w-full text-center">Loading temporary API key...</span>
    );

  return (
    <div className="w-full relative">
      {/* <div className="w-full text-center">
        Deep-gram - open ai - eleven labs
      </div> */}

      <div>
        <Siriwave theme="ios" autostart={handleAudio() || false} />
      </div>
      {/* <input
        type="text"
        placeholder="Enter your question"
        onChange={(e) => {
          setCaption(e.target.value);
        }}
      /> */}
      <div className="mt-10 flex flex-col align-middle items-center">
        {/* <button className="w-24 h-24" onClick={() => toggleMicrophone()}>
          <Recording
            width="96"
            height="96"
            className={
              `cursor-pointer` + !!userMedia && !!microphone && micOpen
                ? "fill-red-400 drop-shadow-glowRed"
                : "fill-gray-600"
            }
          />
        </button> */}
        <input
          type="text"
          name="input"
          id="input"
          placeholder="Type something..."
          onChange={(e) => setText(e.target.value)}
          style={{ color: "black", border: "1px solid black", padding: "12px" }}
        />
        <button
          className=""
          onClick={() => {
            callWhisperAPI();
          }}
          style={{ background: "black", padding: "12px", marginTop: "12px" }}
        >
          Send
        </button>
        <div className="mt-20 p-6 text-xl text-center font-sans">{caption}</div>
      </div>
    </div>
  );
}
