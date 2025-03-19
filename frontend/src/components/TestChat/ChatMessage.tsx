import { ChatHistoryItem, DummyChatItem } from '../../types';

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
      {message.content && (
        <div className={`message ${message.name}`}>
          <div>
            {isGroup && <strong>{message.name}: </strong>}
            {message.content}
          </div>
          <i className="fa-solid fa-reply" id={`reply-${message.id}`}></i>
        </div>
      )}
    </>
  );
};
