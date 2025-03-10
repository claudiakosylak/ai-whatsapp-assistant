let lastChatHistory = [];
let lastWhatsappStatus = false;
// Auto-refresh logs every 5 seconds

const typingIndicator = document.getElementById('typingIndicator');
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
              '<strong>' +
              msg.name +
              ':</strong> ' +
              msg.content +
              '</div>',
          )
          .join('');

        // Scroll to the bottom of the chat container
        const chatMessages = document.querySelector('#chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (data[data.length - 1].role === 'assistant') {
          typingIndicator.style.opacity = '0';
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
  const userSelect = document.querySelector('#userName')
  const user = userSelect.value;
  input.value = '';
  const newDiv = document.createElement('div');
  newDiv.className = 'message ' + user;
  newDiv.innerHTML = `<strong>${user}:</strong> ${message}`;
  typingIndicator.style.opacity = '1';
  document.querySelector('#chatMessagesInner').appendChild(newDiv);
  const fileInput = document.getElementById('imageInput');
  if (fileInput && fileInput.files.length) {
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
      const base64String = event.target.result.split(',')[1]; // Get only the Base64 part
      const mimeType = event.target.result.split(';')[0].split(':')[1];

      fetch('/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          image: base64String,
          imageName: file.name,
          mimeType,
          user,
        }),
      }).then((response) => {
        if (!response.ok) {
          typingIndicator.style.opacity = '0';
        }
      });
    };

    reader.readAsDataURL(file);
    fileInput.value = '';
  } else {
    await fetch('/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, image: '', imageName: '', mimeType: '', user }),
    }).then((response) => {
      if (!response.ok) {
        typingIndicator.style.opacity = '0';
      }
    });
  }
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
    const data = await response.json()
    const newIsGroupChat = data.isGroup;
    const chatNameContainer = document.querySelector('#chat-name');
    const userSelect = document.querySelector('#userName')
    chatNameContainer.innerHTML =
      newIsGroupChat ? "Test Group Chat" : "Test Chat"
    switchGroupButton.innerText =
      newIsGroupChat ? "Test Individual Chat" : "Test Group Chat"
    userSelect.style.display = newIsGroupChat ? 'block' : 'none';
  })
  document.querySelector('#chatMessagesInner').innerHTML = '';
});
