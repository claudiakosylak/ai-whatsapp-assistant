import { RefObject, useEffect, useRef, useState } from 'react';

type Props = {
  imageInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLButtonElement | null>;
};

export const AddMedia = ({ imageInputRef, audioInputRef}: Props) => {
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
        <i className="fa-solid fa-plus"></i>
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
            <i className="fa-solid fa-image"></i>
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
            <i className="fa-solid fa-microphone"></i>
          </button>
        </div>
      )}
    </>
  );
};
