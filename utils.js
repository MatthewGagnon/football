function getPlayerImageUrl(player) {
    return `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`;
}

function getFallbackImageUrl(player) {
    return `/api/placeholder/200/200`;
}

async function handleImageError(img, player) {
    img.src = getFallbackImageUrl(player);
}

// Add smooth scrolling for navigation links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}