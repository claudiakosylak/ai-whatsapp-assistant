import { ReplyingMessage } from '.';

type Props = {
  replyingMessage: ReplyingMessage;
  isActiveReply: boolean;
  closeReplyingMessage?: () => void;
};

export const ReplyBox = ({ replyingMessage, isActiveReply, closeReplyingMessage }: Props) => {
  return (
    <div
      className={`reply-box ${
        isActiveReply ? 'reply-box-replying' : 'reply-box-message'
      }`}
    >
      <div className="reply-content">
        <p style={{ fontWeight: 600 }}>{replyingMessage.message.name}</p>
        {replyingMessage.message.content ? (
          <p
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '14px',
            }}
          >
            {replyingMessage.message.content}
          </p>
        ) : (
          <p
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              fontSize: '14px',
            }}
          >
            <i className="fa-solid fa-image"></i>
            Image
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {replyingMessage.imageUrl && (
          <img
            src={replyingMessage.imageUrl}
            className={
                isActiveReply ? 'reply-image' : 'reply-image-replied'
            }
          />
        )}
        {isActiveReply && (
          <button
            className="reply-close"
            onClick={closeReplyingMessage}
            type="button"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
    </div>
  );
};
