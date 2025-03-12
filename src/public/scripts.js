let lastChatHistory = [];
let lastWhatsappStatus = false;
let replyingMessageId = '';
let recordedAudioBase64 = '';
let tempImageUrl = '';
let tempVideoUrl = '';
// Auto-refresh logs every 5 seconds

const mediaModalContainer = document.getElementById('addMediaModal');
const plusMediaButton = document.getElementById('addMediaButton');

const recordAudioButton = document.getElementById('recordAudio');
const deleteRecordedAudioButton = document.getElementById(
  'deleteRecordedAudio',
);
const stopRecordAudio = document.getElementById('stopRecordAudio');
const inputAudio = document.getElementById('inputAudio');

const imageInputContainer = document.getElementById('imageInputContainer');
const imageInput = document.getElementById('imageInput');
const uploadImageButton = document.getElementById('imageInputButton');
const imagePreview = document.getElementById('imagePreview');
const deleteImagePreviewButton = document.getElementById('deleteSelectedImage');

const uploadVideoButton = document.getElementById('videoInputButton');
const videoInput = document.getElementById('videoInput')
const videoPreview = document.getElementById('videoPreview')

const hideImageInput = () => {
  imageInputContainer.style.display = 'none';
  imageInput.value = '';
  videoInput.value = '';
};

const chatTextInput = document.getElementById('messageInput');

const hideChatTextInput = () => {
  chatTextInput.style.display = 'none';
  chatTextInput.value = '';
};

const hideMediaModalContainer = () => {
  mediaModalContainer.style.display = 'none';
};

const clearAudioRecordingElements = () => {
  deleteRecordedAudioButton.style.display = 'none';
  inputAudio.style.display = 'none';
  inputAudio.src = '';
  chatTextInput.style.display = 'block';
  imageInputContainer.style.display = 'block';
  plusMediaButton.style.display = 'block';
};

const clearImagePreview = () => {
  imagePreview.src = '';
  imagePreview.style.display = 'none';
  deleteImagePreviewButton.style.display = 'none';
  plusMediaButton.style.display = 'block';
};

const clearVideoPreview = () => {
  videoPreview.style.display = "none";
  videoPreview.src = ''
  plusMediaButton.style.display = 'block';
}

const clearChatForm = () => {
  clearAudioRecordingElements();
  clearImagePreview();
  chatTextInput.value = '';
  imageInput.value = '';
};

const chatMessagesContainer = document.querySelector('#chatMessages');
const chatMessagesList = document.querySelector('#chatMessagesInner');

const scrollToBottomOfChat = () => {
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

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

  fetch('/errors')
    .then((response) => response.json())
    .then((data) => {
      const errorArray = Object.entries(data);
      errorArray.forEach((error) => {
        document.getElementById(error[0]).innerText = error[1];
        document.getElementById(error[0]).style.display = 'block';
      });
    });

  fetch('/chat-history')
    .then((response) => response.json())
    .then((data) => {
      // Compare chat history with the last known state
      if (JSON.stringify(data) !== JSON.stringify(lastChatHistory)) {
        chatMessagesList.innerHTML = data
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
        scrollToBottomOfChat();
        if (
          data.length > 0 &&
          typingIndicator &&
          data[data.length - 1].role === 'assistant'
        ) {
          hideTypingIndicator();
        }

        // Update the last known chat history
        lastChatHistory = data;
      }
    });
}, 5000);

const userSelect = document.querySelector('#userName');
const createPlaceholderUserMessage = () => {
  const message = chatTextInput.value;
  const user = userSelect.value;
  const newDiv = document.createElement('div');
  newDiv.className = 'message ' + user;
  newDiv.innerHTML = `<div><strong>${user}:</strong> ${
    recordedAudioBase64
      ? '<audio controls></audio>'
      : tempImageUrl
      ? `<p>${message}</p>`
      : message
  }${
    tempImageUrl
      ? `<img src='${tempImageUrl}' style="width:50px;height:50px;object-fit:cover;"/>`
      : ''
  }</div>`;
  chatMessagesList.appendChild(newDiv);
};

const clearReplyBox = () => {
  replyingMessageId = '';
  const oldReplyBox = document.querySelector('#replyBox');
  chatMessagesContainer.removeChild(oldReplyBox);
};

document.getElementById('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = userSelect.value;
  const message = chatTextInput.value;
  if (!message && !tempImageUrl && !recordedAudioBase64) {
    alert('Please enter an input to send message.');
    return;
  }
  let file;
  if (imageInput && imageInput.files.length) {
    file = imageInput.files[0];
  }
  clearChatForm();
  createPlaceholderUserMessage();
  tempImageUrl = '';

  let replyId = '';
  if (replyingMessageId) {
    replyId = replyingMessageId;
    clearReplyBox();
  }
  showTypingIndicator();
  scrollToBottomOfChat();
  let mimeType = '';
  let base64String;
  let imageName;
  if (file) {
    imageName = file.name;
    const reader = new FileReader();

    reader.onload = function (event) {
      base64String = event.target.result.split(',')[1]; // Get only the Base64 part
      mimeType = event.target.result.split(';')[0].split(':')[1];
      fetch('/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          image: base64String,
          imageName: imageName,
          mimeType,
          user,
          replyingMessageId: replyId,
          audio: '',
        }),
      }).then((response) => {
        if (!response.ok) {
          hideTypingIndicator();
        }
      });
    };

    reader.readAsDataURL(file);
    return;
  }
  if (recordedAudioBase64) {
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
      image: '',
      imageName: '',
      mimeType,
      user,
      replyingMessageId: replyId,
      audio: base64String,
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
        chatMessagesList.innerHTML = '';
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
  chatMessagesList.innerHTML = '';
});

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
  hideChatTextInput();
  hideMediaModalContainer();
  hideImageInput();
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
  plusMediaButton.style.display = 'none';
  stopRecordAudio.style.display = 'block';
});

stopRecordAudio.addEventListener('click', () => {
  mediaRecorder.stop();
  deleteRecordedAudioButton.style.display = 'block';
  stopRecordAudio.style.display = 'none';
  inputAudio.style.display = 'block';
  const recordingStatus = document.getElementById('recordingStatus');
  recordingStatus.style.display = 'none';
});

document.getElementById('deleteRecordedAudio').addEventListener('click', () => {
  recordedAudioBase64 = '';
  clearAudioRecordingElements();
});

imageInput.addEventListener('change', (event) => {
  if (event.target.files[0]) {
    plusMediaButton.style.display = 'none';
    tempImageUrl = URL.createObjectURL(event.target.files[0]);
    imagePreview.src = tempImageUrl;
    imagePreview.style.display = 'block';
    deleteImagePreviewButton.style.display = 'block';
  } else {
    clearImagePreview();
  }
});

videoInput.addEventListener('change', (event) => {
  if (event.target.files[0]) {
    plusMediaButton.style.display = 'none';
    tempVideoUrl = URL.createObjectURL(event.target.files[0]);
    videoPreview.style.display = "block";
    videoPreview.src = tempVideoUrl;
    // Force the video to load
    videoPreview.load();

    // Don't forget to revoke the URL when done
    videoPreview.onload = function() {
      URL.revokeObjectURL(tempVideoUrl);
    };
    deleteImagePreviewButton.style.display = 'block';
  } else {
    clearVideoPreview()
  }
})

uploadImageButton.addEventListener('click', () => {
  imageInput.click();
});

uploadVideoButton.addEventListener('click', () => {
  videoInput.click();
})

deleteImagePreviewButton.addEventListener('click', () => {
  imageInput.value = '';
  videoInput.value = '';
  clearVideoPreview();
  clearImagePreview();
});

// Function to close the modal when clicking outside
function closeModalOnClickOutside(event) {
  if (
    !mediaModalContainer.contains(event.target) &&
    event.target !== plusMediaButton
  ) {
    mediaModalContainer.style.display = 'none';
    document.removeEventListener('click', closeModalOnClickOutside);
  }
}

plusMediaButton.addEventListener('click', () => {
  // Toggle the modal's visibility
  if (mediaModalContainer.style.display === 'none') {
    mediaModalContainer.style.display = 'flex';

    // Add an event listener to close the modal when clicking outside
    document.addEventListener('click', closeModalOnClickOutside);
  } else {
    mediaModalContainer.style.display = 'none';
    document.removeEventListener('click', closeModalOnClickOutside);
  }
});
