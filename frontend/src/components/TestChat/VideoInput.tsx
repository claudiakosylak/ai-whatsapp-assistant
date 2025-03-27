import { RefObject } from 'react';
import { FaTrash } from 'react-icons/fa';

type Props = {
  videoInput: string | undefined;
  videoInputRef: RefObject<HTMLInputElement | null>;
  setActiveMediaInput: (media: 'image' | 'audio' | 'video' | null) => void;
  setVideoInput: (video: string | undefined) => void;
};

export const VideoInput = ({
  videoInput,
  setVideoInput,
  videoInputRef,
  setActiveMediaInput,
}: Props) => {
  return (
    <div className="image-input-container">
      <div style={{ display: 'flex', gap: '20px' }}>
        <input
          ref={videoInputRef}
          type="file"
          id="imageInput"
          accept="video/mp4, video/mpeg, video/mov, video/avi, video/x-flv, video/mpg, video/webm, video/wmv, video/3gpp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const imageUrl = URL.createObjectURL(e.target.files[0]);
              setVideoInput(imageUrl);
              setActiveMediaInput('video');
            }
          }}
        />
        {videoInput && (
          <>
            <video src={videoInput} className="image-preview" id="imagePreview" controls />
            <button
              type="button"
              id="deleteSelectedImage"
              className="delete-button button"
              onClick={() => {
                setVideoInput(undefined);
                setActiveMediaInput(null);
                if (videoInputRef.current) {
                  videoInputRef.current.value = '';
                }
              }}
            >
              <FaTrash />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
