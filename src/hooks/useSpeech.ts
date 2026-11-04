import { useState, useCallback, useEffect } from 'react';

export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceAccent, setVoiceAccent] = useState<'en-US' | 'en-GB'>('en-US');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const speak = useCallback(
    (text: string, rate: number = 0.9) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = voiceAccent;

      // Try to find a high-quality voice for the target accent
      const matchingVoice = availableVoices.find(
        (v) => v.lang.startsWith(voiceAccent) && (v.name.includes('Natural') || v.name.includes('Siri') || v.name.includes('Google') || true)
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    },
    [voiceAccent, availableVoices]
  );

  const toggleAccent = useCallback(() => {
    setVoiceAccent((prev) => (prev === 'en-US' ? 'en-GB' : 'en-US'));
  }, []);

  return {
    speak,
    isPlaying,
    voiceAccent,
    toggleAccent,
  };
}
