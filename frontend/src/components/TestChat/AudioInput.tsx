import { RefObject, useEffect, useRef, useState } from 'react';
import { AudioInputType } from '.';

type Props = {
  audioInput: AudioInputType | undefined;
  audioInputRef: RefObject<HTMLButtonElement | null>;
  setAudioInput: (val: AudioInputType | undefined) => void;
  setActiveMediaInput: (media: 'image' | 'audio' | null) => void;
};

export const AudioInput = ({
  audioInput,
  audioInputRef,
  setAudioInput,
  setActiveMediaInput,
}: Props) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<
    'retrieving' | 'denied' | null
  >(null);
  const [mediaRecorder, setMediaRecorder] = useState<any>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!audioRef) return;
    if (canvasRef.current && audioContext.current === null) {
      // Initialize AudioContext and AnalyserNode
      audioContext.current = new (window.AudioContext || window.AudioContext)();
      analyserNode.current = audioContext.current.createAnalyser();

      // Connect the audio source to the analyser
      const source = audioContext.current.createMediaElementSource(audioRef);
      source.connect(analyserNode.current);
      analyserNode.current.connect(audioContext.current.destination);

      analyserNode.current.fftSize = 256; // Number of frequency bins
    }
    // Reset the play button when the audio finishes
    audioRef.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    return () => {
      // Cleanup the event listener when component unmounts
      audioRef.removeEventListener('ended', () => {
        setIsPlaying(false);
      });
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
    if (!audioRef) return;
    if (audioRef.paused) {
      audioRef.play();
      setIsPlaying(true);
      animateWave();
    } else {
      audioRef.pause();
      setIsPlaying(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  };

  const recordAudio = async () => {
    setActiveMediaInput('audio');
    setPermissionStatus('retrieving');
    setPermissionStatus('retrieving');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setPermissionStatus('denied');
      return;
    }
    setPermissionStatus(null);
    let newMediaRecorder = new MediaRecorder(stream);
    setMediaRecorder(newMediaRecorder);
    setIsRecording(true);
    let audioChunks: Blob[] = [];

    newMediaRecorder.ondataavailable = (event: { data: Blob }) => {
      audioChunks.push(event.data);
    };

    newMediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      let base64String;
      reader.onloadend = () => {
        if (reader.result) {
          base64String = (reader.result as string).split(',')[1];
          const audioUrl = URL.createObjectURL(audioBlob);
          if (base64String) {
            setAudioInput({
              audioUrl,
              base64String,
              mimeType: 'audio/mp3',
            });
            setAudioRef(new Audio(audioUrl));
          }
        }
      };
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setMediaRecorder(undefined);
    };

    newMediaRecorder.start();
  };
  const stopAudio = () => {
    if (!audioRef) return;
    audioRef.pause();
    audioRef.currentTime = 0;
    setIsPlaying(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  };

  // const resetAudio = () => {
  //   if (!audioRef) return;
  //   setIsPlaying(false);
  //   // Reset the audio context, analyzer, and canvas when the audio is cleared
  //   if (audioRef.current) {
  //     audioRef.current.pause();
  //     audioRef.current.currentTime = 0;
  //   }
  //   if (animationFrameId.current) {
  //     cancelAnimationFrame(animationFrameId.current);
  //   }
  //   // Reset the canvas or other UI elements as needed
  // };

  return (
    <>
      <button
        style={{ display: 'none' }}
        onClick={recordAudio}
        ref={audioInputRef}
        type="button"
      >
        Record
      </button>
      {permissionStatus === 'retrieving' ? (
        <p id="recordingStatus" className="recording-status">
          Getting microphone permission...
        </p>
      ) : permissionStatus === 'denied' ? (
        <p id="recordingStatus" className="recording-status error-text">
          Microphone permission denied
        </p>
      ) : null}
      {isRecording && (
        <>
          <p id="recordingStatus" className="recording-status">
            Recording...
          </p>
          <button
            type="button"
            id="stopRecordAudio"
            className="button delete-button"
            onClick={() => mediaRecorder.stop()}
          >
            <i className="fa-solid fa-stop"></i>
          </button>
        </>
      )}
      {audioInput && (
        <>
          <audio
            id="inputAudio"
            controls={false}
            src={audioInput.audioUrl}
          ></audio>
          <div className="input-audio">
            <canvas
              ref={canvasRef}
              //   width={300}
              height={20}
              className="audio-canvas"
            />
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
              <button
                type="button"
                id="deleteRecordedAudio"
                className="delete-button button"
                style={{ padding: '5px 10px', margin: '5px' }}
                onClick={() => {
                  // resetAudio(); // Reset audio and animation when cleared
                  setAudioInput(undefined);
                  setActiveMediaInput(null);
                  setAudioRef(null);
                }}
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
