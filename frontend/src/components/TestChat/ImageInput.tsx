import { RefObject } from 'react';
import { FaTrash } from "react-icons/fa";

type Props = {
  imageInput: string | undefined;
  imageInputRef: RefObject<HTMLInputElement | null>;
  setActiveMediaInput: (media: 'image' | 'audio' | null) => void;
  setImageInput: (image: string | undefined) => void;
};

export const ImageInput = ({
  imageInput,
  setImageInput,
  imageInputRef,
  setActiveMediaInput,
}: Props) => {
  return (
    <div className="image-input-container">
      <div style={{ display: 'flex', gap: '20px' }}>
        <input
          ref={imageInputRef}
          type="file"
          id="imageInput"
          accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const imageUrl = URL.createObjectURL(e.target.files[0]);
              setImageInput(imageUrl);
              setActiveMediaInput('image');
            }
          }}
        />
        {imageInput && (
          <>
            <img src={imageInput} className="image-preview" id="imagePreview" />
            <button
              type="button"
              id="deleteSelectedImage"
              className="delete-button button"
              onClick={() => {
                setImageInput(undefined)
                setActiveMediaInput(null)
                if (imageInputRef.current) {
                    imageInputRef.current.value = ''
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
