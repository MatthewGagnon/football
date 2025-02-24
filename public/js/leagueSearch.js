document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('leagueSearch');
    const searchButton = document.getElementById('searchButton');
    const loadingElement = document.getElementById('loading');
    const leagueContent = document.getElementById('leagueContent');
    let allPlayers = null; // Will store player data

    // Check if user is authenticated
    const isAuthenticated = await Auth.checkLoginStatus();

    if (isAuthenticated) {
        // Show user's leagues if authenticated
        const userLeagues = await getUserLeagues();
        if (userLeagues.length > 0) {
            displayUserLeagues(userLeagues);
        }
    }

    // Helper function to get avatar URL
    function getAvatarUrl(avatar) {
        if (!avatar) {
            return '/api/placeholder/40/40';
        }

        // Handle full URLs (already complete URLs)
        if (avatar.startsWith('http')) {
            return avatar;
        }

        // Handle avatars that start with 'custom_'
        if (avatar.startsWith('custom_')) {
            return `https://sleepercdn.com/uploads/${avatar}`;
        }

        // Handle all other cases (default Sleeper avatars)
        return `https://sleepercdn.com/avatars/thumbs/${avatar}`;
    }

    // Helper function to handle avatar load errors
    function handleAvatarError(img) {
        console.log('Avatar failed to load:', img.src);
        img.src = '/api/placeholder/40/40';
    }

    // Function to show roster modal
    async function showRosterModal(roster, user) {
        // Ensure we have player data
        if (!allPlayers) {
            allPlayers = await fetchAllPlayers();
        }

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'roster-modal';

        // Sort players by position
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        const rosterPlayers = roster.players || [];
        const sortedPlayers = rosterPlayers
            .map(playerId => ({
                id: playerId,
                data: allPlayers[playerId] || { full_name: 'Unknown Player', position: 'Unknown' }
            }))
            .sort((a, b) => {
                const posA = positions.indexOf(a.data.position);
                const posB = positions.indexOf(b.data.position);
                return posA - posB;
            });

        modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-user-info">
                <img src="${getAvatarUrl(user.avatar)}" 
                     alt="${user.display_name}'s Avatar"
                     class="modal-user-avatar"
                     onerror="this.src='/api/placeholder/40/40'">
                <h3>${user.display_name}'s Roster</h3>
            </div>
            <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
            <div class="roster-grid">
                ${positions.map(pos => `
                    <div class="position-group">
                        <h4>${pos}</h4>
                        ${sortedPlayers
                .filter(p => p.data.position === pos)
                .map(p => `
                                <div class="player-item">
                                    ${p.data.position === 'DEF' ?
                        `<img src="https://sleepercdn.com/images/team_logos/nfl/${p.data.player_id.toLowerCase()}.png"
                                             onerror="this.src='/api/placeholder/32/32'"
                                             alt="${p.data.player_id} Defense"
                                             class="player-avatar">` :
                        `<img src="https://sleepercdn.com/content/nfl/players/${p.id}.jpg"
                                             onerror="this.src='/api/placeholder/32/32'"
                                             alt="${p.data.full_name}"
                                             class="player-avatar">`
                    }
                                    <span>${p.data.position === 'DEF' ?
                        `${p.data.player_id} Defense` :
                        p.data.full_name}</span>
                                </div>
                            `).join('') || `<p class="no-players">No ${pos}</p>`}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.appendChild(modalContent);

        // Add close functionality
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer || e.target.classList.contains('close-modal')) {
                document.body.removeChild(modalContainer);
            }
        });

        // Add to document
        document.body.appendChild(modalContainer);
    }

    function displayLeagueInfo(leagueData) {
        if (!leagueData || !leagueData.league) {
            leagueContent.innerHTML = `
            <p class="error">
                League not found. Please check the League ID and try again.<br>
                Make sure you're using a valid Sleeper league ID from the current or previous season.
            </p>`;
            return;
        }

        const { league, users, rosters } = leagueData;

        const leagueHeader = `
        <div class="league-header">
            <h2>${league.name || 'Unnamed League'}</h2>
            <div class="league-details">
                <p>Season: ${league.season || 'N/A'}</p>
                <p>Total Rosters: ${league.total_rosters || 'N/A'}</p>
                <p>Status: ${league.status || 'N/A'}</p>
                <p>Scoring Type: ${league.scoring_settings?.rec_ppr ? 'PPR' : 'Standard'}</p>
            </div>
        </div>
    `;

        const standings = rosters
            .sort((a, b) => (b.settings?.wins || 0) - (a.settings?.wins || 0))
            .map((roster, index) => {
                const user = users.find(u => u.user_id === roster.owner_id) || {};
                const avatarUrl = getAvatarUrl(user.avatar);
                console.log('User avatar data:', {
                    userName: user.display_name,
                    avatarId: user.avatar,
                    generatedUrl: avatarUrl
                });

                return `
            <div class="roster-item">
                <div class="roster-header">
                    <img src="${avatarUrl}" 
                         alt="${user.display_name || 'Unknown Manager'}'s Avatar" 
                         class="user-avatar"
                         onerror="handleAvatarError(this)"
                         loading="lazy">
                    <h3 class="user-name" data-roster-index="${index}">
                        ${user.display_name || 'Unknown Manager'}
                    </h3>
                </div>
                <div class="roster-stats">
                    <p class="rank">Rank: #${index + 1}</p>
                    <p>Record: ${roster.settings?.wins || 0}-${roster.settings?.losses || 0}</p>
                    <p>Points For: ${Math.round(roster.settings?.fpts || 0)}</p>
                    <p>Points Against: ${Math.round(roster.settings?.fpts_against || 0)}</p>
                </div>
            </div>
        `;
            })
            .join('');

        leagueContent.innerHTML = `
        ${leagueHeader}
        <div class="league-standings">
            <h3>League Standings</h3>
            <div class="standings-grid">
                ${standings}
            </div>
        </div>
    `;

        // Add click handlers for usernames
        document.querySelectorAll('.user-name').forEach(element => {
            element.addEventListener('click', () => {
                const index = element.dataset.rosterIndex;
                const roster = rosters[index];
                const user = users.find(u => u.user_id === roster.owner_id);
                showRosterModal(roster, user);
            });
        });
    }

    async function handleSearch() {
        const leagueId = searchInput.value.trim();
        if (!leagueId) {
            leagueContent.innerHTML = '<p class="error">Please enter a League ID</p>';
            return;
        }

        loadingElement.classList.add('active');
        leagueContent.innerHTML = '';

        try {
            const leagueData = await searchLeague(leagueId);
            displayLeagueInfo(leagueData);
        } catch (error) {
            console.error('Error:', error);
            leagueContent.innerHTML = `
                <p class="error">
                    Error fetching league data. Please try again later.<br>
                    Make sure you're using a valid Sleeper league ID.
                </p>`;
        } finally {
            loadingElement.classList.remove('active');
        }
    }

    // Event listeners
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
});

// Function to display user's leagues
function displayUserLeagues(leagues) {
    const container = document.createElement('div');
    container.className = 'user-leagues';
    container.innerHTML = `
        <h3>Your Leagues</h3>
        <div class="leagues-grid">
            ${leagues.map(league => `
                <div class="league-card">
                    <h4>${league.leagueName}</h4>
                    <p>Season: ${league.season}</p>
                    <button onclick="searchLeague('${league.leagueId}')">
                        View League
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    document.querySelector('.league-search').prepend(container);
}