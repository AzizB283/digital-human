"use client";
import Image from "next/image";
import Microphone from "./microphone";
import { FaGithub } from "react-icons/fa";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./Experience";

import { CiLinkedin } from "react-icons/ci";
import Siriwave from "react-siriwave";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Canvas
        shadows
        camera={{ position: [0, 0, 8], fov: 42 }}
        style={{ width: "70vw", height: "50vh" }}
      >
        {/* <color attach="background" args={['#ececec']} /> */}
        <Experience />
      </Canvas>
      <div className="mb-32 flex justify-center items-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4">
        <Microphone />
      </div>
    </main>
  );
}
