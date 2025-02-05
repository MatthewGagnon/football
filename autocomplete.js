async function initializeAutocomplete() {
    const searchInput = document.getElementById('playerSearch');
    const autocompleteList = document.getElementById('autocomplete-list');

    // Pre-fetch players data when the page loads
    const allPlayers = await fetchAllPlayers();
    if (!allPlayers) return;

    searchInput.addEventListener('input', async function () {
        const searchTerm = this.value.toLowerCase();
        autocompleteList.innerHTML = '';

        if (searchTerm.length < 2) {
            autocompleteList.style.display = 'none';
            return;
        }

        // Filter players based on the search term
        const matchingPlayers = Object.values(allPlayers)
            .filter(player =>
                (player.full_name?.toLowerCase().includes(searchTerm) ||
                    player.last_name?.toLowerCase().includes(searchTerm)) &&
                player.active && // Only show active players
                ['QB', 'RB', 'WR', 'TE'].includes(player.position) // Only show key positions
            )
            .slice(0, 5); // Limit to top 5 matches

        if (matchingPlayers.length > 0) {
            autocompleteList.style.display = 'block';
            matchingPlayers.forEach(player => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';

                // Get team abbreviation
                const teamAbbrev = player.team || 'FA';

                div.innerHTML = `
                    <img 
                        src="${getPlayerImageUrl(player)}" 
                        onerror="this.src='${getFallbackImageUrl(player)}'"
                        alt="${player.full_name}"
                    >
                    <span>${player.full_name} (${player.position} - ${teamAbbrev})</span>
                `;

                div.addEventListener('click', () => {
                    searchInput.value = player.full_name;
                    autocompleteList.style.display = 'none';
                    displayPlayerStats(player);
                });

                autocompleteList.appendChild(div);
            });
        } else {
            autocompleteList.style.display = 'none';
        }
    });

    // Close autocomplete list when clicking outside
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.style.display = 'none';
        }
    });

    // Handle enter key
    searchInput.addEventListener('keypress', async function (e) {
        if (e.key === 'Enter' && this.value.length >= 2) {
            const searchTerm = this.value.toLowerCase();
            const matchingPlayers = Object.values(allPlayers)
                .filter(player =>
                    player.full_name?.toLowerCase().includes(searchTerm) ||
                    player.last_name?.toLowerCase().includes(searchTerm)
                );

            if (matchingPlayers.length > 0) {
                displayPlayerStats(matchingPlayers[0]);
                autocompleteList.style.display = 'none';
            }
        }
    });
}