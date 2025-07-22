// Chat functionality
let currentUser = null;
let bannedWords = [];

// Load banned words
bannedWordsRef.once('value').then(snapshot => {
    bannedWords = snapshot.val() || [];
});

// Initialize chat
function initChat(user) {
    currentUser = user;
    
    // Load chat messages
    loadMessages();
    
    // Set up message sending
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Set up typing indicator
    setupTypingIndicator();
    
    // Set up emoji picker
    setupEmojiPicker();
    
    // Set up image upload
    setupImageUpload();
}

// Load messages
function loadMessages() {
    chatroomRef.limitToLast(100).on('value', (snapshot) => {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            displayMessage(message, childSnapshot.key);
        });
        
        scrollToBottom(messagesContainer);
    });
}

// Display message
function displayMessage(message, messageId) {
    const messagesContainer = document.getElementById('chat-messages');
    const isCurrentUser = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    messageElement.dataset.id = messageId;
    
    messageElement.innerHTML = `
        <div class="message-info">
            <img src="images/default-avatar.png" alt="${message.username}">
            <span class="message-username">${message.username}</span>
            <span class="message-country">${message.country}</span>
            <span class="message-time">${formatTime(message.timestamp)}</span>
        </div>
        <div class="message-text">${message.text}</div>
        ${message.imageUrl ? `<img src="${message.imageUrl}" class="message-image" alt="Uploaded image">` : ''}
        <div class="message-actions">
            <button class="message-action translate-button" data-lang="${message.language}">
                <i class="fas fa-language"></i> Translate
            </button>
            ${isCurrentUser ? `<button class="message-action delete-button"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Add event listeners
    messageElement.querySelector('.translate-button').addEventListener('click', () => translateMessage(messageId, message.text, message.language));
    if (isCurrentUser) {
        messageElement.querySelector('.delete-button').addEventListener('click', () => deleteMessage(messageId));
    }
    
    scrollToBottom(messagesContainer);
}

// Send message
async function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();
    const imageUrl = input.dataset.imageUrl || '';
    
    if (!messageText && !imageUrl) return;
    
    // Check for banned words
    if (containsBannedWords(messageText)) {
        alert('Your message contains inappropriate language.');
        return;
    }
    
    // Check for spam
    if (await isSpamming(currentUser.uid)) {
        alert('You are sending messages too quickly. Please wait a moment.');
        return;
    }
    
    try {
        // Get user data
        const userSnapshot = await usersRef.child(currentUser.uid).once('value');
        const userData = userSnapshot.val();
        
        // Create message
        const message = {
            senderId: currentUser.uid,
            username: userData.username,
            country: userData.country,
            language: userData.nativeLanguage,
            text: messageText,
            timestamp: Date.now(),
            imageUrl: imageUrl
        };
        
        // Push to database
        await chatroomRef.push(message);
        
        // Clear input
        input.value = '';
        delete input.dataset.imageUrl;
        
        // Reset typing status
        await typingStatusRef.child(currentUser.uid).set(false);
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

// Check for banned words
function containsBannedWords(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return bannedWords.some(word => lowerText.includes(word.toLowerCase()));
}

// Check for spam
let messageTimestamps = [];
async function isSpamming(uid) {
    const now = Date.now();
    messageTimestamps = messageTimestamps.filter(timestamp => now - timestamp < 10000); // 10 seconds
    
    if (messageTimestamps.length >= 5) {
        // Potential spam - mark user
        await usersRef.child(uid).update({
            banned: true
        });
        return true;
    }
    
    messageTimestamps.push(now);
    return false;
}

// Translate message
async function translateMessage(messageId, text, sourceLang) {
    try {
        // In a real app, you would call a translation API here
        // This is a mock implementation
        const translations = {
            'en': `Translated (from ${sourceLang}): ${text}`,
            'es': `Traducido (de ${sourceLang}): ${text}`,
            'fr': `Traduit (de ${sourceLang}): ${text}`,
            // Add more languages as needed
        };
        
        const userSnapshot = await usersRef.child(currentUser.uid).once('value');
        const userData = userSnapshot.val();
        const targetLang = userData.nativeLanguage;
        
        const translatedText = translations[targetLang] || `Translation not available for ${targetLang}`;
        
        // Find the message element and update it
        const messageElement = document.querySelector(`.message[data-id="${messageId}"] .message-text`);
        if (messageElement) {
            messageElement.textContent = translatedText;
        }
    } catch (error) {
        console.error('Translation error:', error);
        alert('Failed to translate message.');
    }
}

// Delete message
async function deleteMessage(messageId) {
    try {
        await chatroomRef.child(messageId).remove();
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message.');
    }
}

// Setup typing indicator
function setupTypingIndicator() {
    const messageInput = document.getElementById('message-input');
    let typingTimeout;
    
    messageInput.addEventListener('input', async () => {
        await typingStatusRef.child(currentUser.uid).set(true);
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(async () => {
            await typingStatusRef.child(currentUser.uid).set(false);
        }, 2000);
    });
    
    // Listen for others typing
    typingStatusRef.on('value', (snapshot) => {
        const typingUsers = [];
        snapshot.forEach((childSnapshot) => {
            if (childSnapshot.val() && childSnapshot.key !== currentUser.uid) {
                typingUsers.push(childSnapshot.key);
            }
        });
        
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingUsers.length > 0) {
            // Get usernames of typing users
            Promise.all(typingUsers.map(uid => usersRef.child(uid).once('value')))
                .then(userSnapshots => {
                    const names = userSnapshots.map(snap => snap.val().username);
                    typingIndicator.textContent = `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} typing...`;
                });
        } else {
            typingIndicator.textContent = '';
        }
    });
}

// Setup emoji picker
function setupEmojiPicker() {
    const emojiButton = document.getElementById('emoji-picker-button');
    const emojiPicker = document.getElementById('emoji-picker');
    const messageInput = document.getElementById('message-input');
    
    // Sample emojis - in a real app, you might use an emoji library
    const emojis = ['😀', '😂', '😍', '😎', '👍', '❤️', '🔥', '🎉', '🙏', '🤔'];
    
    emojis.forEach(emoji => {
        const emojiElement = document.createElement('span');
        emojiElement.className = 'emoji-item';
        emojiElement.textContent = emoji;
        emojiElement.addEventListener('click', () => {
            messageInput.value += emoji;
            messageInput.focus();
        });
        emojiPicker.appendChild(emojiElement);
    });
    
    emojiButton.addEventListener('click', () => {
        emojiPicker.classList.toggle('show');
    });
    
    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });
}

// Setup image upload
function setupImageUpload() {
    const uploadInput = document.getElementById('image-upload');
    const messageInput = document.getElementById('message-input');
    
    uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            alert('Please select an image file.');
            return;
        }
        
        try {
            // Create storage reference
            const storageRef = storage.ref(`chat_images/${currentUser.uid}/${Date.now()}_${file.name}`);
            
            // Upload file
            const uploadTask = storageRef.put(file);
            
            // Show upload progress
            uploadTask.on('state_changed', 
                (snapshot) => {
                    // Progress monitoring could be added here
                }, 
                (error) => {
                    console.error('Upload error:', error);
                    alert('Failed to upload image.');
                }, 
                async () => {
                    // Get download URL
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    messageInput.dataset.imageUrl = downloadURL;
                    messageInput.placeholder = 'Image ready to send (type a caption if needed)';
                }
            );
        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image.');
        }
    });
}

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
}
