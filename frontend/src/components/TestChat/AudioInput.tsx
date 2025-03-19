import { RefObject, useState } from 'react';
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

  const togglePlayPause = () => {
    if (!audioRef) return;
    if (audioRef.paused) {
      audioRef.play();
      setIsPlaying(true);
    } else {
      audioRef.pause();
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (!audioRef) return;
    audioRef.pause();
    audioRef.currentTime = 0;
    setIsPlaying(false);
  };

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
            <div className="audio-controls">
              <button
                onClick={togglePlayPause}
                style={{ padding: '5px 10px', margin: '5px' }}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={stopAudio}
                style={{ padding: '5px 10px', margin: '5px' }}
              >
                Stop
              </button>
            </div>
            <audio
              id="inputAudio"
              style={{ display: 'none' }}
              src={audioInput.audioUrl}
            ></audio>
          </div>
          <button
            type="button"
            id="deleteRecordedAudio"
            className="delete-button button"
            onClick={() => {
              setAudioInput(undefined);
              setActiveMediaInput(null);
              setAudioRef(null);
            }}
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </>
      )}
    </>
  );
};
