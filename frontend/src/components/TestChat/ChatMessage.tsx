import { DummyChatItem } from '.';
import { ChatHistoryItem } from '../../types';
import { AudioPlayer } from '../AudioPlayer';

type Props = {
  isGroup: boolean;
  message: ChatHistoryItem | DummyChatItem;
};

export const ChatMessage = ({ message, isGroup }: Props) => {
  return (
    <>
      {message.imageUrl && (
        <div className={`message ${message.name}`}>
          <img src={message.imageUrl} className="image-preview" />
        </div>
      )}
      {(message.content || message.audioUrl) && (
        <div className={`message ${message.name}`}>
          <div>
            {isGroup && <strong>{message.name}: </strong>}
            {message.content ? (
              message.content
            ) : message.audioUrl ? (
              <AudioPlayer audioUrl={message.audioUrl} />
            ) : null}
          </div>
          <i className="fa-solid fa-reply" id={`reply-${message.id}`}></i>
        </div>
      )}
    </>
  );
};
