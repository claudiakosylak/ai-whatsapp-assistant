import { RefObject, useEffect, useRef, useState } from 'react';
import { AudioInputType } from '.';
import { AudioPlayer } from '../AudioPlayer';

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
          }
        }
      };
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setMediaRecorder(undefined);
    };

    newMediaRecorder.start();
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
        <AudioPlayer
          audioUrl={audioInput.audioUrl}
          showDelete={true}
          setAudioInput={setAudioInput}
          setActiveMediaInput={setActiveMediaInput}
        />
      )}
    </>
  );
};
