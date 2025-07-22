// Group chat functionality
let currentGroupId = null;

// Initialize group chat
function initGroupChat(user) {
    currentUser = user;
    
    // Load user's groups
    loadUserGroups();
    
    // Set up group creation
    document.getElementById('create-group-button').addEventListener('click', showCreateGroupModal);
    document.getElementById('confirm-create-group').addEventListener('click', createGroup);
    
    // Set up group message sending
    document.getElementById('send-group-button').addEventListener('click', sendGroupMessage);
    document.getElementById('group-message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendGroupMessage();
        }
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });
}

// Load user's groups
function loadUserGroups() {
    groupsRef.orderByChild('members/' + currentUser.uid).equalTo(true).on('value', (snapshot) => {
        const groupsContainer = document.getElementById('user-groups');
        groupsContainer.innerHTML = '';
        
        snapshot.forEach((groupSnapshot) => {
            const group = groupSnapshot.val();
            displayGroup(group, groupSnapshot.key);
        });
    });
}

// Display group in sidebar
function displayGroup(group, groupId) {
    const groupsContainer = document.getElementById('user-groups');
    
    const groupElement = document.createElement('div');
    groupElement.className = 'group-item';
    groupElement.dataset.groupId = groupId;
    
    groupElement.innerHTML = `
        <h4>${group.groupName}</h4>
        <p>${group.description || 'No description'}</p>
    `;
    
    groupElement.addEventListener('click', () => loadGroupChat(groupId, group));
    
    groupsContainer.appendChild(groupElement);
}

// Load group chat
function loadGroupChat(groupId, group) {
    currentGroupId = groupId;
    
    // Update UI
    document.querySelectorAll('.group-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.group-item[data-group-id="${groupId}"]`).classList.add('active');
    
    document.getElementById('active-group-name').textContent = group.groupName;
    document.getElementById('active-group-description').textContent = group.description || '';
    
    const messageInput = document.getElementById('group-message-input');
    messageInput.disabled = false;
    messageInput.placeholder = 'Type your message...';
    
    document.getElementById('send-group-button').disabled = false;
    
    // Load messages
    groupsRef.child(`${groupId}/messages`).limitToLast(100).on('value', (snapshot) => {
        const messagesContainer = document.getElementById('group-messages');
        messagesContainer.innerHTML = '';
        
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            displayGroupMessage(message, childSnapshot.key);
        });
        
        scrollToBottom(messagesContainer);
    });
}

// Display group message
function displayGroupMessage(message, messageId) {
    const messagesContainer = document.getElementById('group-messages');
    const isCurrentUser = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    messageElement.dataset.id = messageId;
    
    messageElement.innerHTML = `
        <div class="message-info">
            <img src="images/default-avatar.png" alt="${message.username}">
            <span class="message-username">${message.username}</span>
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
        messageElement.querySelector('.delete-button').addEventListener('click', () => deleteGroupMessage(messageId));
    }
    
    scrollToBottom(messagesContainer);
}

// Send group message
async function sendGroupMessage() {
    if (!currentGroupId) return;
    
    const input = document.getElementById('group-message-input');
    const messageText = input.value.trim();
    
    if (!messageText) return;
    
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
            text: messageText,
            timestamp: Date.now(),
            language: userData.nativeLanguage
        };
        
        // Push to database
        await groupsRef.child(`${currentGroupId}/messages`).push(message);
        
        // Clear input
        input.value = '';
    } catch (error) {
        console.error('Error sending group message:', error);
        alert('Failed to send message. Please try again.');
    }
}

// Show create group modal
function showCreateGroupModal() {
    document.getElementById('create-group-modal').classList.add('show');
    
    // Clear previous inputs
    document.getElementById('group-name').value = '';
    document.getElementById('group-description').value = '';
    document.getElementById('invite-user').value = '';
    document.getElementById('invited-users').innerHTML = '';
}

// Create new group
async function createGroup() {
    const groupName = document.getElementById('group-name').value.trim();
    const description = document.getElementById('group-description').value.trim();
    
    if (!groupName) {
        alert('Group name is required');
        return;
    }
    
    try {
        // Create group
        const newGroupRef = groupsRef.push();
        const groupId = newGroupRef.key;
        
        // Add group data
        await newGroupRef.set({
            groupName,
            description,
            createdBy: currentUser.uid,
            members: {
                [currentUser.uid]: true
            }
        });
        
        // Add invited members
        const invitedUsers = document.getElementById('invited-users').querySelectorAll('.invited-user');
        for (const userElement of invitedUsers) {
            const userId = userElement.dataset.userId;
            await groupsRef.child(`${groupId}/members/${userId}`).set(true);
        }
        
        // Close modal
        document.getElementById('create-group-modal').classList.remove('show');
        
        // Load the new group
        loadGroupChat(groupId, {
            groupName,
            description,
            createdBy: currentUser.uid
        });
    } catch (error) {
        console.error('Error creating group:', error);
        alert('Failed to create group. Please try again.');
    }
}

// Delete group message
async function deleteGroupMessage(messageId) {
    if (!currentGroupId) return;
    
    try {
        await groupsRef.child(`${currentGroupId}/messages/${messageId}`).remove();
    } catch (error) {
        console.error('Error deleting group message:', error);
        alert('Failed to delete message.');
    }
}

// Invite user to group
async function inviteUserToGroup() {
    const username = document.getElementById('invite-user').value.trim();
    if (!username) return;
    
    try {
        // Find user by username
        const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
        if (!snapshot.exists()) {
            alert('User not found');
            return;
        }
        
        let userId, userData;
        snapshot.forEach((childSnapshot) => {
            userId = childSnapshot.key;
            userData = childSnapshot.val();
        });
        
        // Check if already invited
        const invitedUsersContainer = document.getElementById('invited-users');
        if (invitedUsersContainer.querySelector(`[data-user-id="${userId}"]`)) {
            alert('User already invited');
            return;
        }
        
        // Add to invited list
        const invitedUserElement = document.createElement('div');
        invitedUserElement.className = 'invited-user';
        invitedUserElement.dataset.userId = userId;
        invitedUserElement.innerHTML = `
            ${userData.username} (${userData.country})
            <button class="remove-invite">&times;</button>
        `;
        
        invitedUserElement.querySelector('.remove-invite').addEventListener('click', () => {
            invitedUserElement.remove();
        });
        
        invitedUsersContainer.appendChild(invitedUserElement);
        document.getElementById('invite-user').value = '';
    } catch (error) {
        console.error('Error inviting user:', error);
        alert('Failed to invite user. Please try again.');
    }
}
