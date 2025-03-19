import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatHistoryItem, DummyChatItem, MockChat } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatSettings } from './ChatSettings';
import { AddMedia } from './AddMedia';
import { ImageInput } from './ImageInput';
import { readImageFile } from '../../helpers/images';

export const TestChat = () => {
  const [chat, setChat] = useState<MockChat | null>(null);
  const [messages, setMessages] = useState<
    ChatHistoryItem[] | DummyChatItem[] | null
  >(null);
  const [activeUser, setActiveUser] = useState<'user' | 'user2'>('user');
  const [activeMediaInput, setActiveMediaInput] = useState<
    'audio' | 'image' | null
  >(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [textInput, setTextInput] = useState('');
  const [imageInput, setImageInput] = useState<string | undefined>(undefined);
  const [audioInput, setAudioInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const fetchChatData = async () => {
    const response = await fetch('/api/chat');
    if (response.ok) {
      const data = await response.json();
      setChat(data.chat);
      setMessages(data.messages);
    }
  };

  const sendNewMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    let mimeType;
    let base64String;

    if (
      imageInputRef.current &&
      imageInputRef.current.files &&
      imageInputRef.current.files[0]
    ) {
      const fileResult = await readImageFile(imageInputRef.current.files[0]);
      mimeType = fileResult.mimeType;
      base64String = fileResult.base64String;
      imageInputRef.current.value = ''
    }

    const dummyChatItem: DummyChatItem = {
      name: activeUser,
      content: textInput,
      id: '',
      imageUrl: imageInput,
    };
    const newMessages = messages ? [...messages] : [];
    newMessages.push(dummyChatItem);
    setMessages(newMessages);
    setIsTyping(true);
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: textInput,
        user: activeUser,
        imageBase64: base64String,
        mimeType,
        imageUrl: imageInput,
      }),
    });
    setTextInput('');
    setImageInput(undefined)
    setActiveMediaInput(null)
    if (response.ok) {
      await fetchChatData();
    }
    setIsTyping(false);
  };

  useEffect(() => {
    fetchChatData();
  }, []);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
            <ChatMessage message={msg} isGroup={chat.isGroup} key={msg.id} />
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
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
            <AddMedia
              imageInputRef={imageInputRef}
              setActiveMediaInput={setActiveMediaInput}
            />
          )}
          <button
            type="submit"
            className={isSendDisabled ? 'button-disabled' : 'button'}
            disabled={isSendDisabled}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <ImageInput
          imageInputRef={imageInputRef}
          imageInput={imageInput}
          setImageInput={setImageInput}
          setActiveMediaInput={setActiveMediaInput}
        />
      </form>
    </div>
  );
};
