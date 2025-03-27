import { RefObject, useEffect, useRef, useState } from 'react';
import { FaPlus } from "react-icons/fa";
import { FaMicrophone, FaVideo, FaImage } from "react-icons/fa";

type Props = {
  imageInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLButtonElement | null>;
  videoInputRef: RefObject<HTMLInputElement | null>;
};

export const AddMedia = ({ imageInputRef, audioInputRef, videoInputRef}: Props) => {
  const settingsModalRef = useRef<HTMLDivElement>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsModalRef.current &&
        !settingsModalRef.current.contains(event.target as Node)
      ) {
        setIsMediaModalOpen(false);
      }
    };

    if (isMediaModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMediaModalOpen]);

  return (
    <>
      <button
        type="button"
        id="addMediaButton"
        onClick={() => setIsMediaModalOpen(true)}
        className="button"
      >
        <FaPlus />
      </button>
      {isMediaModalOpen && (
        <div
          id="addMediaModal"
          className="modal media-modal"
          ref={settingsModalRef}
        >
          <button
            type="button"
            id="imageInputButton"
            className="button"
            onClick={() => {
              imageInputRef && imageInputRef.current?.click();
              setIsMediaModalOpen(false);
            }}
          >
            <FaImage />
          </button>
          <button
            type="button"
            id="videoInputButton"
            className="button"
            onClick={() => {
              videoInputRef && videoInputRef.current?.click();
              setIsMediaModalOpen(false);
            }}
          >
            <FaVideo />
          </button>
          <button
            type="button"
            id="recordAudio"
            className="button"
            onClick={() => {
              audioInputRef && audioInputRef.current?.click()
              setIsMediaModalOpen(false);
            }}
          >
            <FaMicrophone />
          </button>
        </div>
      )}
    </>
  );
};
