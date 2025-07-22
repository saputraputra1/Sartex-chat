// Device ID management
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Check if device has reached account limit
async function checkDeviceAccountLimit(deviceId) {
    try {
        const snapshot = await deviceAccountsRef.child(deviceId).once('value');
        if (snapshot.exists() && snapshot.val().count >= 3) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking device account limit:', error);
        return false;
    }
}

// Update device account count
async function updateDeviceAccountCount(deviceId, uid) {
    try {
        const deviceRef = deviceAccountsRef.child(deviceId);
        const snapshot = await deviceRef.once('value');
        
        if (snapshot.exists()) {
            await deviceRef.update({
                count: snapshot.val().count + 1,
                accountUids: [...snapshot.val().accountUids, uid]
            });
        } else {
            await deviceRef.set({
                count: 1,
                accountUids: [uid]
            });
        }
    } catch (error) {
        console.error('Error updating device account count:', error);
    }
}

// Register new user
async function registerUser(username, password, country, age, nativeLanguage) {
    try {
        const deviceId = getDeviceId();
        
        // Check device account limit
        const isLimitReached = await checkDeviceAccountLimit(deviceId);
        if (isLimitReached) {
            throw new Error('Batas maksimal 3 akun dari perangkat ini telah tercapai.');
        }
        
        // Check if username exists
        const usernameSnapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
        if (usernameSnapshot.exists()) {
            throw new Error('Username already exists');
        }
        
        // Create user with email/password (using username as email with domain)
        const email = `${username}@globalchat.com`;
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Save user data
        await usersRef.child(uid).set({
            username,
            password, // Note: In production, don't store plain passwords
            country,
            age,
            nativeLanguage,
            online: false,
            lastSeen: Date.now(),
            deviceId,
            banned: false,
            followers: {},
            following: {}
        });
        
        // Update device account count
        await updateDeviceAccountCount(deviceId, uid);
        
        return userCredential.user;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Login user
async function loginUser(username, password) {
    try {
        const email = `${username}@globalchat.com`;
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Check if user is banned
        const userSnapshot = await usersRef.child(uid).once('value');
        if (userSnapshot.val().banned) {
            await auth.signOut();
            throw new Error('Akun Anda telah diblokir karena pelanggaran aturan komunitas.');
        }
        
        // Update user status
        await usersRef.child(uid).update({
            online: true,
            lastSeen: Date.now()
        });
        
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Logout user
async function logoutUser(uid) {
    try {
        // Update user status
        if (uid) {
            await usersRef.child(uid).update({
                online: false,
                lastSeen: Date.now()
            });
        }
        
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Check auth state
function onAuthStateChanged(callback) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Verify user is not banned
            const userSnapshot = await usersRef.child(user.uid).once('value');
            if (userSnapshot.val().banned) {
                await logoutUser(user.uid);
                callback(null, 'Akun Anda telah diblokir karena pelanggaran aturan komunitas.');
                return;
            }
        }
        callback(user);
    });
}

// Password reset
async function resetPassword(username) {
    try {
        const email = `${username}@globalchat.com`;
        await auth.sendPasswordResetEmail(email);
    } catch (error) {
        console.error('Password reset error:', error);
        throw error;
    }
}
