'use client';
import { createContext, useContext, useState } from 'react';

const VoiceContext: any = createContext('');

export const VoiceProvider = ({ children }: any) => {
  const [voiceData, setVoiceData] = useState<any>();
  return (
    <VoiceContext.Provider value={{ voiceData, setVoiceData }}>
      {children}
    </VoiceContext.Provider>
  );
};
export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
