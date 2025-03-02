// Initialize all functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize autocomplete
    initializeAutocomplete();

    // Initialize smooth scrolling
    initializeSmoothScrolling();

    // Check authentication status and update UI
    const isAuthenticated = await Auth.checkLoginStatus();
    updateAuthUI(isAuthenticated);

    // Mobile navigation toggle
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            nav.classList.toggle('expanded');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                nav.classList.remove('expanded');
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                nav.classList.remove('expanded');
            });
        });
    }
});

function updateAuthUI(isAuthenticated) {
    const navLinks = document.querySelector('.nav-links');
    const authLink = document.createElement('a');

    if (isAuthenticated) {
        authLink.href = '/my-leagues.html';
        authLink.textContent = 'My Leagues';

        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });

        navLinks.appendChild(authLink);
        navLinks.appendChild(logoutLink);
    } else {
        authLink.href = '/auth.html';
        authLink.textContent = 'Link Sleeper';
        navLinks.appendChild(authLink);
    }
}