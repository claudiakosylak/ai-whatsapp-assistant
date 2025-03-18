import { useEffect, useRef, useState } from 'react';
import { ChatHistoryItem, MockChat } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatSettings } from './ChatSettings';

export const TestChat = () => {
  const [chat, setChat] = useState<MockChat | null>(null);
  const [messages, setMessages] = useState<ChatHistoryItem[] | null>(null);
  const [activeUser, setActiveUser] = useState<'user' | 'user2'>('user');
  const [activeMediaInput, setActiveMediaInput] = useState<
    'audio' | 'image' | null
  >(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);

  const fetchChatData = async () => {
    const response = await fetch('/api/chat');
    if (response.ok) {
      const data = await response.json();
      setChat(data.chat);
      setMessages(data.messages);
    }
  };

  useEffect(() => {
    fetchChatData();
  }, []);

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
            <ChatMessage message={msg} />
          ))}
        </div>
      </div>
      <form className="chat-input" id="chatForm">
        <div className="chat-input-top" id="chatInputTop">
          {chat.isGroup && (
            <select id="userName" name="userName" value={activeUser}>
              <option value="user">User 1</option>
              <option value="user2">User 2</option>
            </select>
          )}
          {activeMediaInput !== 'audio' ? (
            <input
              type="text"
              id="messageInput"
              placeholder="Type your message..."
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
            <button
              type="button"
              id="addMediaButton"
              onClick={() => setIsMediaModalOpen(true)}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          )}
          {isMediaModalOpen && (
            <div id="addMediaModal" className="media-modal">
              <button type="button" id="imageInputButton">
                <i className="fa-solid fa-image"></i>
              </button>
              <button type="button" id="recordAudio">
                <i className="fa-solid fa-microphone"></i>
              </button>
            </div>
          )}
          <button type="submit">Send</button>
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
