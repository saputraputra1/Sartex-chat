// Main application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tabs
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
    });
    
    // Initialize auth buttons
    document.getElementById('register-button').addEventListener('click', handleRegister);
    document.getElementById('login-button').addEventListener('click', handleLogin);
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Menu navigation
    document.querySelectorAll('.menu-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const section = button.dataset.section;
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(section).classList.add('active');
        });
    });
    
    // Check auth state
    onAuthStateChanged((user, error) => {
        if (error) {
            document.getElementById('login-error').textContent = error;
            return;
        }
        
        if (user) {
            // User is logged in
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            
            // Initialize app modules
            initChat(user);
            initGroupChat(user);
            initSocial(user);
            
            // Set up logout
            document.getElementById('logout-button').addEventListener('click', () => {
                logoutUser(user.uid).then(() => {
                    document.getElementById('auth-container').style.display = 'flex';
                    document.getElementById('app-container').style.display = 'none';
                    document.getElementById('login-form').style.display = 'block';
                    document.getElementById('register-form').style.display = 'none';
                    document.getElementById('login-tab').classList.add('active');
                    document.getElementById('register-tab').classList.remove('active');
                });
            });
        } else {
            // User is logged out
            document.getElementById('auth-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
        }
    });
});

// Handle register
async function handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const country = document.getElementById('register-country').value;
    const age = document.getElementById('register-age').value;
    const language = document.getElementById('register-language').value;
    
    const errorElement = document.getElementById('register-error');
    errorElement.textContent = '';
    
    try {
        if (!username || !password || !country || !age || !language) {
            throw new Error('All fields are required');
        }
        
        if (username.length < 4) {
            throw new Error('Username must be at least 4 characters');
        }
        
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
        if (age < 13) {
            throw new Error('You must be at least 13 years old');
        }
        
        await registerUser(username, password, country, age, language);
        
        // Clear form
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-country').value = '';
        document.getElementById('register-age').value = '';
        document.getElementById('register-language').value = '';
        
        // Switch to login tab
        document.getElementById('login-tab').click();
    } catch (error) {
        errorElement.textContent = error.message;
    }
}

// Handle login
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = '';
    
    try {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }
        
        await loginUser(username, password);
        
        // Clear form
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    } catch (error) {
        errorElement.textContent = error.message;
    }
}

// Toggle theme
function toggleTheme() {
    const darkModeStyle = document.getElementById('dark-mode-style');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (darkModeStyle.disabled) {
        darkModeStyle.disabled = false;
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    } else {
        darkModeStyle.disabled = true;
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    }
}

// Check saved theme
function checkSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const darkModeStyle = document.getElementById('dark-mode-style');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (savedTheme === 'dark') {
        darkModeStyle.disabled = false;
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        darkModeStyle.disabled = true;
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Initialize theme
checkSavedTheme();
