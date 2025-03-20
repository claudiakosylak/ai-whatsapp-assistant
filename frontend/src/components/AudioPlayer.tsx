import { useEffect, useRef, useState } from 'react';
import { AudioInputType } from './TestChat';
import { useTheme } from '../ThemeProvider';

// Create a single shared AudioContext for the application
// This prevents creating multiple contexts that might conflict
let sharedAudioContext: AudioContext | null = null;

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
  const {theme} = useTheme()
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isAudioSetup = useRef<boolean>(false);

  // Initialize shared audio context if needed
  useEffect(() => {
    if (!sharedAudioContext) {
      try {
        sharedAudioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
      }
    }

    return () => {
      // Clean up animation on unmount
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, []);

  // Update audio source when URL changes
  useEffect(() => {
    if (audioRef.current) {
      // Update audio source
      audioRef.current.src = audioUrl;

      // Reset player state
      setIsPlaying(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }

      // Reset setup flag to force reconnection when needed
      isAudioSetup.current = false;

      // Clean up previous audio nodes
      cleanupAudioNodes();
    }
  }, [audioUrl]);

  // Clean up everything on component unmount
  useEffect(() => {
    return () => {
      cleanupAudioNodes();

      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnd);
      }
    };
  }, []);

  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  const cleanupAudioNodes = () => {
    // Disconnect source node if it exists
    if (sourceNode.current) {
      try {
        sourceNode.current.disconnect();
        sourceNode.current = null;
      } catch (e) {
        console.warn('Error disconnecting source node:', e);
      }
    }

    // Disconnect analyser node if it exists
    if (analyserNode.current) {
      try {
        analyserNode.current.disconnect();
        analyserNode.current = null;
      } catch (e) {
        console.warn('Error disconnecting analyser node:', e);
      }
    }
  };

  const setupAudio = () => {
    // If already set up or missing required elements, return
    if (
      isAudioSetup.current ||
      !audioRef.current ||
      !canvasRef.current ||
      !sharedAudioContext
    ) {
      return false;
    }

    try {
      // Clean up any previous nodes
      cleanupAudioNodes();

      // Create new nodes
      analyserNode.current = sharedAudioContext.createAnalyser();
      analyserNode.current.fftSize = 256;

      // Create new source node
      sourceNode.current = sharedAudioContext.createMediaElementSource(
        audioRef.current,
      );
      sourceNode.current.connect(analyserNode.current);
      analyserNode.current.connect(sharedAudioContext.destination);

      // Add event listener for audio end
      audioRef.current.addEventListener('ended', handleAudioEnd);

      // Mark as set up
      isAudioSetup.current = true;
      return true;
    } catch (error) {
      console.error('Error setting up audio:', error);
      return false;
    }
  };

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

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      const r = barHeight + 25 * (i / bufferLength);
      const g = 250 * (i / bufferLength);
      const b = 50;

      ctx.fillStyle = theme === "dark" ? `rgb(${r},${g},${b})` : "#4caf50";
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth;
    }

    // Request the next frame
    animationFrameId.current = requestAnimationFrame(animateWave);
  };

  const startWaveAnimation = async () => {
    if (!audioRef.current) return;

    // Set up audio if not already set up
    if (!isAudioSetup.current) {
      if (!setupAudio()) {
        // If setup failed, try to play without visualization
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Error playing audio:', error);
        }
        return;
      }
    }

    // Resume AudioContext if it's suspended
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      try {
        await sharedAudioContext.resume();
      } catch (error) {
        console.error('Error resuming audio context:', error);
      }
    }

    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        animateWave();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
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
      animationFrameId.current = null;
    }
  };

  const resetAudio = () => {
    stopAudio();

    // Clear the canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    // Reset audio setup
    cleanupAudioNodes();
    isAudioSetup.current = false;
  };

  const handleDeleteClick = () => {
    resetAudio();
    if (setAudioInput && setActiveMediaInput) {
      setAudioInput(undefined);
      setActiveMediaInput(null);
    }
  };

  return (
    <>
      <audio
        id="inputAudio"
        controls
        style={{ display: 'none' }}
        src={audioUrl}
        ref={audioRef}
        preload="auto"
      ></audio>
      <div className="input-audio">
        <canvas ref={canvasRef} height={40} className="audio-canvas" />
        <div className="audio-controls">
          <button
            onClick={startWaveAnimation}
            style={{
              padding: '5px 10px',
              borderRadius: showDelete ? '0' : '0 10px 10px 0',
            }}
            type="button"
            className="button audio-control-button"
          >
            {isPlaying ? (
              <i className="fa-solid fa-pause"></i>
            ) : (
              <i className="fa-solid fa-play"></i>
            )}
          </button>
          {/* <button
            onClick={stopAudio}
            style={{ padding: '5px 10px', margin: '5px' }}
            className="button"
            type="button"
          >
            <i className="fa-solid fa-stop"></i>
          </button> */}
          {showDelete && (
            <button
              type="button"
              id="deleteRecordedAudio"
              className="delete-button button audio-control-button"
              style={{ padding: '5px 10px', borderRadius: '0 10px 10px 0' }}
              onClick={handleDeleteClick}
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
