import { DummyChatItem } from '.';
import { base64ToBlobUrl } from '../../helpers/images';
import { ChatHistoryItem } from '../../types';
import { AudioPlayer } from '../AudioPlayer';

type Props = {
  isGroup: boolean;
  message: ChatHistoryItem | DummyChatItem;
};

export const ChatMessage = ({ message, isGroup }: Props) => {
  let imageUrl;
  let audioUrl;

  if (message.media) {
    let url = base64ToBlobUrl(message.media.data, message.media.mimetype);
    if (message.mediaType === 'image') {
      imageUrl = url;
    } else {
      audioUrl = url;
    }
  }

  let reaction;
  if ('reaction' in message) {
    reaction = message.reaction;
  }

  return (
    <>
      {imageUrl && (
        <div
          className={`message ${message.name} ${
            reaction && !message.content ? 'reaction-message' : ''
          }`}
        >
          <img src={imageUrl} className="image-preview" />
          {(reaction && !message.content) && (
            <div
              className={`reaction ${
                message.name === 'assistant' ? 'assistant' : 'user'
              }`}
            >
              {reaction}
            </div>
          )}
        </div>
      )}
      {(message.content || audioUrl) && (
        <div className={`message ${message.name} ${reaction ? 'reaction-message' : ''}`}>
          <div style={{ flex: 1 }}>
            {isGroup && <strong>{message.name}: </strong>}
            {message.content ? (
              message.content
            ) : audioUrl ? (
              <AudioPlayer audioUrl={audioUrl} />
            ) : null}
          </div>
          {/* <i className="fa-solid fa-reply" id={`reply-${message.id}`}></i> */}
          {reaction && (
            <div
              className={`reaction ${
                message.name === 'assistant' ? 'assistant' : 'user'
              }`}
            >
              {reaction}
            </div>
          )}
        </div>
      )}
    </>
  );
};
