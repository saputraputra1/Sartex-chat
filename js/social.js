// Social features
let currentUser = null;

// Initialize social features
function initSocial(user) {
    currentUser = user;
    
    // Load explore users
    loadExploreUsers();
    
    // Set up search
    document.getElementById('search-button').addEventListener('click', searchUsers);
    document.getElementById('user-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
    
    // Load user profile
    loadUserProfile();
}

// Load explore users
async function loadExploreUsers() {
    try {
        const snapshot = await usersRef.limitToLast(50).once('value');
        displayUsers(snapshot);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Search users
async function searchUsers() {
    const query = document.getElementById('user-search').value.trim().toLowerCase();
    if (!query) {
        loadExploreUsers();
        return;
    }
    
    try {
        const snapshot = await usersRef.once('value');
        const filteredUsers = {};
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.username.toLowerCase().includes(query) || 
                user.country.toLowerCase().includes(query) || 
                user.nativeLanguage.toLowerCase().includes(query)) {
                filteredUsers[childSnapshot.key] = user;
            }
        });
        
        displayUsers({ val: () => filteredUsers });
    } catch (error) {
        console.error('Error searching users:', error);
    }
}

// Display users
function displayUsers(snapshot) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    
    snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (user.uid === currentUser.uid) return; // Don't show current user
        
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        
        userCard.innerHTML = `
            <div class="user-card-header">
                <img src="images/default-avatar.png" class="user-card-avatar" alt="${user.username}">
                <div class="user-card-info">
                    <h4>${user.username}</h4>
                    <p>${user.country}</p>
                </div>
            </div>
            <div class="user-card-details">
                <div class="user-card-detail">
                    <i class="fas fa-language"></i>
                    <span>${user.nativeLanguage}</span>
                </div>
                <div class="user-card-detail">
                    <i class="fas fa-birthday-cake"></i>
                    <span>${user.age} years</span>
                </div>
            </div>
            <div class="user-card-actions">
                <button class="follow-button" data-user-id="${childSnapshot.key}">
                    <i class="fas fa-user-plus"></i> Follow
                </button>
            </div>
        `;
        
        // Check if already following
        usersRef.child(`${currentUser.uid}/following/${childSnapshot.key}`).once('value', (followSnapshot) => {
            if (followSnapshot.exists()) {
                const button = userCard.querySelector('.follow-button');
                button.innerHTML = '<i class="fas fa-user-check"></i> Following';
                button.classList.add('following');
            }
        });
        
        // Add follow event
        userCard.querySelector('.follow-button').addEventListener('click', () => toggleFollow(childSnapshot.key));
        
        usersList.appendChild(userCard);
    });
}

// Toggle follow/unfollow
async function toggleFollow(userId) {
    try {
        const followRef = usersRef.child(`${currentUser.uid}/following/${userId}`);
        const followerRef = usersRef.child(`${userId}/followers/${currentUser.uid}`);
        
        const snapshot = await followRef.once('value');
        
        if (snapshot.exists()) {
            // Unfollow
            await followRef.remove();
            await followerRef.remove();
        } else {
            // Follow
            // Check for follow spam
            if (await isFollowingTooMuch(currentUser.uid)) {
                alert('You are following/unfollowing too quickly. Please wait a moment.');
                return;
            }
            
            await followRef.set(true);
            await followerRef.set(true);
        }
        
        // Reload UI
        loadExploreUsers();
        loadUserProfile();
    } catch (error) {
        console.error('Error toggling follow:', error);
    }
}

// Check for follow spam
let followTimestamps = [];
async function isFollowingTooMuch(uid) {
    const now = Date.now();
    followTimestamps = followTimestamps.filter(timestamp => now - timestamp < 300000); // 5 minutes
    
    if (followTimestamps.length >= 10) {
        // Potential spam - mark user
        await usersRef.child(uid).update({
            banned: true
        });
        return true;
    }
    
    followTimestamps.push(now);
    return false;
}

// Load user profile
function loadUserProfile() {
    usersRef.child(currentUser.uid).on('value', (snapshot) => {
        const user = snapshot.val();
        
        // Update profile header
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('profile-country').textContent = user.country;
        document.getElementById('profile-language').textContent = user.nativeLanguage;
        document.getElementById('profile-age').textContent = `${user.age} years old`;
        
        // Update stats
        const followersCount = user.followers ? Object.keys(user.followers).length : 0;
        const followingCount = user.following ? Object.keys(user.following).length : 0;
        
        document.getElementById('followers-count').textContent = followersCount;
        document.getElementById('following-count').textContent = followingCount;
        
        // Update sidebar
        document.getElementById('sidebar-username').textContent = user.username;
    });
    
    // Edit profile button
    document.getElementById('edit-profile-button').addEventListener('click', showEditProfileModal);
    document.getElementById('save-profile-button').addEventListener('click', saveProfile);
}

// Show edit profile modal
async function showEditProfileModal() {
    const snapshot = await usersRef.child(currentUser.uid).once('value');
    const user = snapshot.val();
    
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-age').value = user.age;
    
    // Set country select
    const countrySelect = document.getElementById('edit-country');
    if (!countrySelect.hasChildNodes()) {
        await populateCountries(countrySelect);
    }
    countrySelect.value = user.country;
    
    // Set language select
    document.getElementById('edit-language').value = user.nativeLanguage;
    
    document.getElementById('edit-profile-modal').classList.add('show');
}

// Save profile
async function saveProfile() {
    const age = document.getElementById('edit-age').value;
    const country = document.getElementById('edit-country').value;
    const language = document.getElementById('edit-language').value;
    
    try {
        await usersRef.child(currentUser.uid).update({
            age,
            country,
            nativeLanguage: language
        });
        
        document.getElementById('edit-profile-modal').classList.remove('show');
        loadUserProfile();
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile. Please try again.');
    }
}
