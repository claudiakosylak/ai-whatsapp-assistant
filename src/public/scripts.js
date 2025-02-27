let lastChatHistory =[]
// Auto-refresh logs every 5 seconds
setInterval(() => {
    fetch('/logs')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.logs').innerHTML =
                data.map(log => '<div class="log-entry">' + log + '</div>').join('');
        });

fetch('/chat-history')
    .then(response => response.json())
    .then(data => {
        // Compare chat history with the last known state
        if (JSON.stringify(data) !== JSON.stringify(lastChatHistory)) {
            document.querySelector('#chatMessages').innerHTML =
                data.map(msg =>
                    '<div class="message ' + msg.role + '">' +
                        '<strong>' + msg.role + ':</strong> ' + msg.content +
                    '</div>'
                ).join('');

            // Scroll to the bottom of the chat container
            const chatMessages = document.querySelector('#chatMessages');
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Update the last known chat history
            lastChatHistory = data;
        }
    });
}, 5000);

document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const message = input.value;
    input.value = '';

    await fetch('/send-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
    });
});
