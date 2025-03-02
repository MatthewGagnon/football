// Initialize all functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize autocomplete
    if (typeof initializeAutocomplete === 'function') {
        initializeAutocomplete();
    }

    // Initialize smooth scrolling
    if (typeof initializeSmoothScrolling === 'function') {
        initializeSmoothScrolling();
    }

    // Mobile navigation toggle
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelector('.nav-links');

    console.log('Hamburger element:', hamburger);
    console.log('Nav element:', nav);
    console.log('Nav links element:', navLinks);

    if (hamburger && navLinks) {
        // Add click handler for hamburger menu
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Hamburger clicked');

            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');

            if (nav) {
                nav.classList.toggle('expanded');
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (hamburger.classList.contains('active') &&
                !hamburger.contains(e.target) &&
                !navLinks.contains(e.target)) {

                hamburger.classList.remove('active');
                navLinks.classList.remove('active');

                if (nav) {
                    nav.classList.remove('expanded');
                }
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');

                if (nav) {
                    nav.classList.remove('expanded');
                }
            });
        });
    } else {
        console.error('Hamburger menu elements not found');
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