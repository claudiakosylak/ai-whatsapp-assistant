import { useEffect, useRef, useState } from 'react';
import { ChatHistoryItem, DummyChatItem, MockChat } from '../../types';

type Props = {
  chat: MockChat;
  messages: ChatHistoryItem[] | DummyChatItem[];
  setChat: (chat: MockChat) => void;
  setMessages: (messages: ChatHistoryItem[]) => void;
};

export const ChatSettings = ({
  chat,
  messages,
  setChat,
  setMessages,
}: Props) => {
  const settingsModalRef = useRef<HTMLDivElement>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  const editChat = async (isGroup: boolean) => {
    const response = await fetch('/api/chat', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isGroup }),
    });
    if (response.ok) {
      const data = await response.json();
      setChat({ ...chat, isGroup: data.isGroup });
      setMessages([]);
    }
  };

  const switchChatType = () => {
    editChat(!chat.isGroup);
    setIsSettingsModalOpen(false);
  };

  const clearChat = () => {
    editChat(chat.isGroup);
    setIsSettingsModalOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsModalRef.current &&
        !settingsModalRef.current.contains(event.target as Node)
      ) {
        setIsSettingsModalOpen(false);
      }
    };

    if (isSettingsModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsModalOpen]);

  return (
    <>
      <button
        type="button"
        className="button"
        onClick={() => setIsSettingsModalOpen(true)}
      >
        <i className="fa-solid fa-gear"></i>
      </button>
      {isSettingsModalOpen && (
        <div className="modal chat-settings" ref={settingsModalRef}>
          <button
            type="button"
            id="switchGroupButton"
            className="button"
            onClick={switchChatType}
          >
            {chat.isGroup ? 'Test Individual Chat' : 'Test Group Chat'}
          </button>
          <button
            type="button"
            id="clearChatButton"
            className={messages.length === 0 ? 'button-disabled' : 'button'}
            disabled={messages.length === 0}
            onClick={clearChat}
          >
            Clear Chat
          </button>
        </div>
      )}
    </>
  );
};
