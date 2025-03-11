let lastChatHistory = [];
let lastWhatsappStatus = false;
let replyingMessageId = '';
let recordedAudioBase64 = '';
// Auto-refresh logs every 5 seconds

const clearAudioRecordingElements = () => {
  document.getElementById('recordAudio').style.display = 'block';
  document.getElementById('deleteRecordedAudio').style.display = 'none';
  document.getElementById('inputAudio').style.display = 'none';
  document.getElementById('inputAudio').src = '';
  const textInput = document.getElementById('messageInput');
  textInput.style.display = 'block';
  document.getElementById('imageInputContainer').style.display = 'block';
};

const chatMessagesList = document.querySelector('#chatMessagesInner');

const typingIndicator = document.createElement('div');
typingIndicator.id = 'typingIndicator';
typingIndicator.className = 'typing-indicator';
typingIndicator.innerHTML = '<span></span><span></span><span></span>';
const showTypingIndicator = () => {
  typingIndicator.style.opacity = '1';
  typingIndicator.style.display = 'flex';
  chatMessagesList.appendChild(typingIndicator);
};

const hideTypingIndicator = () => {
  typingIndicator.style.opacity = '0';
  typingIndicator.style.display = 'none';
  chatMessagesList.removeChild(typingIndicator);
};

setInterval(() => {
  fetch('/logs')
    .then((response) => response.json())
    .then((data) => {
      document.querySelector('.logs').innerHTML = data
        .map((log) => '<div class="log-entry">' + log + '</div>')
        .join('');
    });

  fetch('/whatsapp-connection')
    .then((response) => response.json())
    .then((data) => {
      if (data.connected !== lastWhatsappStatus) {
        document.querySelector('#whatsapp-status').innerHTML = data.connected
          ? '<strong>WhatsApp Status:</strong> <span style="color: #2e7d32;">Connected</span>'
          : '<strong>WhatsApp Status:</strong> <span style="color: #d32f2f;">Disconnected</span>';
        lastWhatsappStatus = data.connected;
      }
    });

  fetch('/chat-history')
    .then((response) => response.json())
    .then((data) => {
      // Compare chat history with the last known state
      if (JSON.stringify(data) !== JSON.stringify(lastChatHistory)) {
        document.querySelector('#chatMessagesInner').innerHTML = data
          .map(
            (msg) =>
              '<div class="message ' +
              msg.name +
              '">' +
              '<div>' +
              '<strong>' +
              msg.name +
              ':</strong> ' +
              msg.content +
              '</div>' +
              `<i class="fa-solid fa-reply" id='reply-${msg.id}'></i>` +
              '</div>',
          )
          .join('');

        if (typingIndicator.style.opacity === '1') {
          showTypingIndicator();
        }

        // Scroll to the bottom of the chat container
        const chatMessages = document.querySelector('#chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (data[data.length - 1].role === 'assistant') {
          hideTypingIndicator();
        }

        // Update the last known chat history
        lastChatHistory = data;
      }
    });
}, 5000);

document.getElementById('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('messageInput');
  const message = input.value;
  const userSelect = document.querySelector('#userName');
  const user = userSelect.value;
  input.value = '';
  const newDiv = document.createElement('div');
  newDiv.className = 'message ' + user;
  newDiv.innerHTML = `<div><strong>${user}:</strong> ${recordedAudioBase64 ? '<audio controls></audio>' : message}</div>`;
  document.querySelector('#chatMessagesInner').appendChild(newDiv);
  const chatMessages = document.querySelector('#chatMessages');
  let replyId = '';
  if (replyingMessageId) {
    replyId = replyingMessageId;
    replyingMessageId = '';
    const oldReplyBox = document.querySelector('#replyBox');
    chatMessages.removeChild(oldReplyBox);
  }
  showTypingIndicator();
  chatMessages.scrollTop = chatMessages.scrollHeight;
  let mimeType = '';
  let base64String;
  let imageName;
  const fileInput = document.getElementById('imageInput');
  if (fileInput && fileInput.files.length) {
    const file = fileInput.files[0];
    imageName = file.name;
    const reader = new FileReader();

    reader.onload = function (event) {
      base64String = event.target.result.split(',')[1]; // Get only the Base64 part
      mimeType = event.target.result.split(';')[0].split(':')[1];
    };

    reader.readAsDataURL(file);
    fileInput.value = '';
  }
  if (recordedAudioBase64) {
    clearAudioRecordingElements();
    base64String = recordedAudioBase64;
    recordedAudioBase64 = '';
  }
  await fetch('/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      image: imageName ? base64String : '',
      imageName: imageName || '',
      mimeType,
      user,
      replyingMessageId: replyId,
      audio: !imageName ? base64String : '',
    }),
  }).then((response) => {
    if (!response.ok) {
      hideTypingIndicator();
    }
  });
});

document
  .getElementById('clearChatButton')
  .addEventListener('click', async () => {
    const endpoint = '/chat-history';

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        document.querySelector('#chatMessagesInner').innerHTML = '';
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Request failed', error);
      alert('Failed to clear chat history.');
    }
  });

const switchGroupButton = document.getElementById('switchGroupButton');

switchGroupButton.addEventListener('click', async () => {
  fetch('/update-chat-type', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(async (response) => {
    const data = await response.json();
    const newIsGroupChat = data.isGroup;
    const chatNameContainer = document.querySelector('#chat-name');
    const userSelect = document.querySelector('#userName');
    chatNameContainer.innerHTML = newIsGroupChat
      ? 'Test Group Chat'
      : 'Test Chat';
    switchGroupButton.innerText = newIsGroupChat
      ? 'Test Individual Chat'
      : 'Test Group Chat';
    userSelect.style.display = newIsGroupChat ? 'block' : 'none';
  });
  document.querySelector('#chatMessagesInner').innerHTML = '';
});

const chatMessagesContainer = document.querySelector('#chatMessages');

chatMessagesContainer.addEventListener('click', async (event) => {
  if (event.target.classList.contains('fa-reply')) {
    const messageId = event.target.id.replace('reply-', '');
    const messageResponse = await fetch(`/get-message/${messageId}`);
    if (!messageResponse.ok) return;
    const message = await messageResponse.json();
    if (replyingMessageId) {
      const oldReplyBox = document.querySelector('#replyBox');
      oldReplyBox.innerHTML = `<div class="reply-box-top"><strong>Replying to: ${message.name}</strong><i class="fa-solid fa-x" id="cancel-reply"></i></div><p>${message.content}</p>`;
      replyingMessageId = messageId;
      return;
    } else {
      replyingMessageId = messageId;
      const replyBox = document.createElement('div');
      replyBox.className = 'reply-box';
      replyBox.id = 'replyBox';
      replyBox.innerHTML = `<div class="reply-box-top"><strong>Replying to: ${message.name}</strong><i class="fa-solid fa-x" id="cancel-reply"></i></div><p>${message.content}</p>`;
      chatMessagesContainer.appendChild(replyBox);
    }
  }

  if (event.target.classList.contains('fa-x')) {
    const oldReplyBox = document.querySelector('#replyBox');
    chatMessagesContainer.removeChild(oldReplyBox);
    replyingMessageId = '';
  }
});

let mediaRecorder;

document.getElementById('recordAudio').addEventListener('click', async () => {
  const textInput = document.getElementById('messageInput');
  textInput.style.display = 'none';
  textInput.value = '';
  document.getElementById('imageInputContainer').style.display = 'none';
  const fileInput = document.getElementById('imageInput');
  fileInput.value = '';
  const recordingStatus = document.getElementById('recordingStatus');
  recordingStatus.style.display = 'block';
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  let audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      recordedAudioBase64 = base64String;
    };
    const audioUrl = URL.createObjectURL(audioBlob);
    document.getElementById('inputAudio').src = audioUrl;
    stream.getTracks().forEach((track) => track.stop());
  };

  mediaRecorder.start();
  document.getElementById('recordAudio').style.display = 'none';
  document.getElementById('stopRecordAudio').style.display = 'block';
});

document.getElementById('stopRecordAudio').addEventListener('click', () => {
  mediaRecorder.stop();
  document.getElementById('deleteRecordedAudio').style.display = 'block';
  document.getElementById('stopRecordAudio').style.display = 'none';
  document.getElementById('inputAudio').style.display = 'block';
  const recordingStatus = document.getElementById('recordingStatus');
  recordingStatus.style.display = 'none';
});

document.getElementById('deleteRecordedAudio').addEventListener('click', () => {
  recordedAudioBase64 = '';
  clearAudioRecordingElements();
});
