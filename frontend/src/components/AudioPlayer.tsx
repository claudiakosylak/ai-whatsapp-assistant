import { useEffect, useRef, useState } from 'react';
import { AudioInputType } from './TestChat';

type Props = {
  audioUrl: string;
  showDelete?: boolean;
  setAudioInput?: (val: AudioInputType | undefined) => void;
  setActiveMediaInput?: (media: 'image' | 'audio' | null) => void;
};

export const AudioPlayer = ({
  audioUrl,
  showDelete,
  setAudioInput,
  setActiveMediaInput,
}: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(new Audio(audioUrl));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (canvasRef.current && audioContext.current === null) {
      // Initialize AudioContext and AnalyserNode
      audioContext.current = new (window.AudioContext || window.AudioContext)();
      analyserNode.current = audioContext.current.createAnalyser();

      // Connect the audio source to the analyser
      const source = audioContext.current.createMediaElementSource(audioRef.current);
      source.connect(analyserNode.current);
      analyserNode.current.connect(audioContext.current.destination);

      analyserNode.current.fftSize = 256; // Number of frequency bins
    }
    // Reset the play button when the audio finishes
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    return () => {
      if (audioRef.current) {
        // Cleanup the event listener when component unmounts
        audioRef.current.removeEventListener('ended', () => {
          setIsPlaying(false);
        });
      }
    };
  }, [audioRef]);

  const animateWave = () => {
    if (!analyserNode.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get frequency data from the analyser node
    const bufferLength = analyserNode.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.current.getByteFrequencyData(dataArray);

    const barWidth = canvas.width / bufferLength;
    let x = 0;

    // Draw the waveform
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      const r = barHeight + 25 * (i / bufferLength);
      const g = 250 * (i / bufferLength);
      const b = 50;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth;
    }

    // Request the next frame
    animationFrameId.current = requestAnimationFrame(animateWave);
  };

  const startWaveAnimation = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
      animateWave();
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  };

  const resetAudio = () => {
    if (!audioRef.current) return;
    setIsPlaying(false);
    // Reset the audio context, analyzer, and canvas when the audio is cleared
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    // Reset the canvas or other UI elements as needed
  };

  return (
    <>
      <audio id="inputAudio" controls={false} src={audioUrl}></audio>
      <div className="input-audio">
        <canvas ref={canvasRef} height={20} className="audio-canvas" />
        <div className="audio-controls">
          <button
            onClick={startWaveAnimation}
            style={{ padding: '5px 10px', margin: '5px' }}
            type="button"
            className="button"
          >
            {isPlaying ? (
              <i className="fa-solid fa-pause"></i>
            ) : (
              <i className="fa-solid fa-play"></i>
            )}
          </button>
          <button
            onClick={stopAudio}
            style={{ padding: '5px 10px', margin: '5px' }}
            className="button"
            type="button"
          >
            <i className="fa-solid fa-stop"></i>
          </button>
          {showDelete && (
            <button
              type="button"
              id="deleteRecordedAudio"
              className="delete-button button"
              style={{ padding: '5px 10px', margin: '5px' }}
              onClick={() => {
                resetAudio(); // Reset audio and animation when cleared
                if (setAudioInput && setActiveMediaInput) {
                  setAudioInput(undefined);
                  setActiveMediaInput(null);
                }
                audioRef.current = null;
              }}
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
