import { DummyChatItem } from '.';
import { base64ToBlobUrl } from '../../helpers/images';
import { ChatHistoryItem } from '../../types';
import { AudioPlayer } from '../AudioPlayer';

type Props = {
  isGroup: boolean;
  message: ChatHistoryItem | DummyChatItem;
  replyToMessage: (messageId: string, imageUrl?: string) => void;
};

export const ChatMessage = ({ message, isGroup, replyToMessage }: Props) => {
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

  let quotedMessage;
  if (message.message.hasQuotedMsg) {
    const getQuotedMessage = async () => {
      quotedMessage = await message.message.getQuotedMessage();
    };
    getQuotedMessage();
  }

  return (
    <>
      {imageUrl && (
        <div
          className={`message ${message.name} ${
            reaction && !message.content ? 'reaction-message' : ''
          }`}
        >
          <div className="message-content">
            <img src={imageUrl} className="image-preview" />
            <div
              className="reply-icon"
              onClick={() => {
                replyToMessage(message.id, imageUrl);
              }}
            >
              <i className="fa-solid fa-reply" id={`reply-${message.id}`}></i>
            </div>
          </div>
          {reaction && !message.content && (
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
        <div
          className={`message ${message.name} ${
            reaction ? 'reaction-message' : ''
          }`}
        >
          <div className="message-content">
            {isGroup && <strong>{message.name}: </strong>}
            {message.content ? (
              message.content
            ) : audioUrl ? (
              <AudioPlayer audioUrl={audioUrl} />
            ) : null}
          </div>
          <div
            className="reply-icon"
            onClick={() => {
              replyToMessage(message.id);
            }}
          >
            <i className="fa-solid fa-reply" id={`reply-${message.id}`}></i>
          </div>
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
