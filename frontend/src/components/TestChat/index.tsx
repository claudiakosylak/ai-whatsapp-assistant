import { useEffect, useMemo, useState } from 'react';
import { ChatHistoryItem, MockChat } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatSettings } from './ChatSettings';
import { AddMedia } from './AddMedia';

export const TestChat = () => {
  const [chat, setChat] = useState<MockChat | null>(null);
  const [messages, setMessages] = useState<ChatHistoryItem[] | null>(null);
  const [activeUser, setActiveUser] = useState<'user' | 'user2'>('user');
  const [activeMediaInput, setActiveMediaInput] = useState<
    'audio' | 'image' | null
  >(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [textInput, setTextInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [audioInput, setAudioInput] = useState('');

  const fetchChatData = async () => {
    const response = await fetch('/api/chat');
    if (response.ok) {
      const data = await response.json();
      setChat(data.chat);
      setMessages(data.messages);
    }
  };

  const sendNewMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: textInput, user: activeUser }),
    });
    setTextInput('');
    if (response.ok) {
      await fetchChatData();
    }
  };

  useEffect(() => {
    fetchChatData();
  }, []);

  const isSendDisabled = useMemo(() => {
    return !textInput && !imageInput && !audioInput;
  }, [textInput, imageInput, audioInput]);

  if (!chat || !messages) return null;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3 id="chat-name">{chat.isGroup ? 'Test Group Chat' : 'Test Chat'}</h3>
        <ChatSettings
          chat={chat}
          messages={messages}
          setChat={setChat}
          setMessages={setMessages}
        />
      </div>
      <div className="chat-messages" id="chatMessages">
        <div id="chatMessagesInner">
          {messages.map((msg) => (
            <ChatMessage message={msg} isGroup={chat.isGroup} />
          ))}
        </div>
      </div>
      <form className="chat-input" id="chatForm" onSubmit={sendNewMessage}>
        <div className="chat-input-top" id="chatInputTop">
          {chat.isGroup && (
            <select
              id="userName"
              name="userName"
              value={activeUser}
              onChange={(e) =>
                setActiveUser(e.target.value as 'user' | 'user2')
              }
            >
              <option value="user">User 1</option>
              <option value="user2">User 2</option>
            </select>
          )}
          {activeMediaInput !== 'audio' ? (
            <input
              type="text"
              id="messageInput"
              placeholder="Type your message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          ) : (
            <>
              {isRecording ? (
                <>
                  <p id="recordingStatus" className="recording-status">
                    Recording...
                  </p>
                  <button type="button" id="stopRecordAudio">
                    <i className="fa-solid fa-stop"></i>
                  </button>
                </>
              ) : (
                <>
                  <audio
                    id="inputAudio"
                    controls
                    className="input-audio"
                  ></audio>
                  <button
                    type="button"
                    id="deleteRecordedAudio"
                    className="delete-button"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </>
              )}
            </>
          )}
          {activeMediaInput === null && (
            <AddMedia setActiveMediaInput={setActiveMediaInput} />
          )}
          <button
            type="submit"
            className={isSendDisabled ? 'button-disabled' : 'button'}
            disabled={isSendDisabled}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <div className="image-input-container">
          <div style={{ display: 'flex', gap: '20px' }}>
            <input
              type="file"
              id="imageInput"
              accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
              style={{ display: 'none' }}
            />
            <img src="" className="image-preview" id="imagePreview" />
            <button
              type="button"
              id="deleteSelectedImage"
              className="delete-button"
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
