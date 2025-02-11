document.addEventListener('DOMContentLoaded', function () {
    const episodeCards = document.querySelectorAll('.episode-card');
    const showMoreButton = document.createElement('button');
    showMoreButton.className = 'show-more-button';
    showMoreButton.textContent = 'Show More Episodes';

    // Initially hide all episodes after the fourth one
    episodeCards.forEach((card, index) => {
        if (index >= 4) {
            card.style.display = 'none';
        }
    });

    // Add show more button after the episode grid
    const episodeGrid = document.querySelector('.episode-grid');
    const showMoreContainer = document.createElement('div');
    showMoreContainer.className = 'show-more-container';
    showMoreContainer.appendChild(showMoreButton);
    episodeGrid.after(showMoreContainer);

    // Add click event to show more button
    let isExpanded = false;
    showMoreButton.addEventListener('click', () => {
        episodeCards.forEach((card, index) => {
            if (index >= 4) {
                card.style.display = isExpanded ? 'none' : 'flex';
            }
        });

        showMoreButton.textContent = isExpanded ? 'Show More Episodes' : 'Show Less Episodes';
        isExpanded = !isExpanded;
    });
});