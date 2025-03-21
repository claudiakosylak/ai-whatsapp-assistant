import { useEffect, useState } from 'react';
import { DummyChatItem, ReplyingMessage } from '.';
import { base64ToBlobUrl } from '../../helpers/images';
import { ChatHistoryItem } from '../../types';
import { AudioPlayer } from '../AudioPlayer';
import { ReplyBox } from './ReplyBox';
import { FaReply } from 'react-icons/fa';

type Props = {
  isGroup: boolean;
  message: ChatHistoryItem | DummyChatItem;
  findMessage: (
    messageId: string,
  ) => ChatHistoryItem | DummyChatItem | undefined;
  replyToMessage: (messageId: string, imageUrl?: string) => void;
};

export const ChatMessage = ({
  message,
  isGroup,
  findMessage,
  replyToMessage,
}: Props) => {
  const [repliedMessage, setRepliedMessage] = useState<
    ReplyingMessage | undefined
  >();
  let imageUrl;
  let audioUrl;

  if (message.media) {
    let url = base64ToBlobUrl(message.media.data, message.media.mimetype);
    if (message.mediaType === 'image' && !repliedMessage) {
      imageUrl = url;
    } else {
      audioUrl = url;
    }
  }

  let reaction;
  if ('reaction' in message) {
    reaction = message.reaction;
  }

  useEffect(() => {
    const fetchQuotedMessage = async () => {
      if (message.repliedMessage) {
        try {
          const replied: ReplyingMessage = {
            message: findMessage(
              message.repliedMessage.id._serialized,
            ) as ChatHistoryItem,
          };
          if (
            replied &&
            replied.message.mediaType === 'image' &&
            replied.message.media
          ) {
            let url = base64ToBlobUrl(
              replied.message.media.data,
              replied.message.media.mimetype,
            );
            replied.imageUrl = url;
          }

          setRepliedMessage(replied);
        } catch (error) {
          console.error('Error fetching quoted message:', error);
        }
      }
    };

    fetchQuotedMessage();
  }, [message, findMessage]);

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
              <FaReply id={`reply-${message.id}`} className="fa-reply" />
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
      {(message.content || audioUrl || repliedMessage) && (
        <div
          className={`message ${message.name} ${
            reaction ? 'reaction-message' : ''
          }`}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {repliedMessage && (
              <ReplyBox
                replyingMessage={repliedMessage}
                isActiveReply={false}
              />
            )}
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
              <FaReply id={`reply-${message.id}`} className="fa-reply" />
            </div>
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
