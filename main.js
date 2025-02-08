// Initialize all functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize autocomplete
    initializeAutocomplete();

    // Initialize smooth scrolling
    initializeSmoothScrolling();

    // Add enter key support for search
    document.getElementById('playerSearch').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.toLowerCase();
            if (searchTerm.length >= 2) {
                // Fetch all players and find the first match
                fetchAllPlayers().then(players => {
                    const matchingPlayers = Object.values(players)
                        .filter(player =>
                            player.full_name?.toLowerCase().includes(searchTerm) ||
                            player.last_name?.toLowerCase().includes(searchTerm)
                        );

                    if (matchingPlayers.length > 0) {
                        displayPlayerStats(matchingPlayers[0]);
                    }
                });
            }
        }
    });
});