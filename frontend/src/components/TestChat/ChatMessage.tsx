import { ChatHistoryItem } from '../../types';

type Props = {
  isGroup: boolean;
  message: ChatHistoryItem;
};

export const ChatMessage = ({ message, isGroup }: Props) => {
  return (
    <div className={`message ${message.name}`}>
      <div>
        {isGroup && <strong>{message.name}: </strong>}
        {message.content}
      </div>
      <i className="fa-solid fa-reply" id={`reply-${message.id}`}></i>
    </div>
  );
};
