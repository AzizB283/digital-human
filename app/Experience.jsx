import React from "react";
import { Environment, OrbitControls, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Avatar } from "./Avatar";

export const Experience = () => {
  const texture = useTexture("/textures/story.png");
  const viewport = useThree((state) => state.viewport);
  return (
    <>
      {/* <OrbitControls /> */}
      <Avatar position={[0, -3, 6]} scale={2} />
      <Environment preset="city" />
      <mesh>
        {/* <planeGeometry args={[viewport.width, viewport.height]} /> */}
        {/* <meshBasicMaterial /> */}
      </mesh>
    </>
  );
};
