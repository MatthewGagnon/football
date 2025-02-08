// Store selected players for each team
let team1Players = [];
let team2Players = [];
let allPlayers = null;

// Function to fetch game-by-game stats for a player
async function fetchGameStats(playerId, season) {
    try {
        // Get current NFL state to know max weeks
        const nflState = await fetchNFLState();
        const maxWeek = (season < nflState.season) ? 18 : nflState.week;
        const stats = [];

        // Fetch stats for each week
        for (let week = 1; week <= maxWeek; week++) {
            const weekStats = await fetchWeekStats(playerId, season, week);
            if (weekStats) {
                stats.push({
                    week,
                    pass_yd: weekStats.pass_yd || 0,
                    pass_td: weekStats.pass_td || 0,
                    pass_int: weekStats.pass_int || 0,
                    rush_yd: weekStats.rush_yd || 0,
                    rush_td: weekStats.rush_td || 0,
                    rec: weekStats.rec || 0,
                    rec_yd: weekStats.rec_yd || 0,
                    rec_td: weekStats.rec_td || 0
                });
            }
        }

        return stats;
    } catch (error) {
        console.error('Error fetching game stats:', error);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize by fetching all players
    allPlayers = await fetchAllPlayers();

    // Set up search functionality for both teams
    setupTeamSearch('team1');
    setupTeamSearch('team2');

    // Set up analyze button
    document.getElementById('analyzeButton').addEventListener('click', analyzeTrade);
});

function setupTeamSearch(teamId) {
    const searchInput = document.querySelector(`.${teamId}-players`).previousElementSibling.querySelector('.player-search');
    const autocompleteList = searchInput.nextElementSibling;

    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        autocompleteList.innerHTML = '';

        if (searchTerm.length < 2) {
            autocompleteList.style.display = 'none';
            return;
        }

        // Filter players based on search term
        const matchingPlayers = Object.values(allPlayers)
            .filter(player =>
                (player.full_name?.toLowerCase().includes(searchTerm) ||
                    player.last_name?.toLowerCase().includes(searchTerm)) &&
                player.active &&
                ['QB', 'RB', 'WR', 'TE'].includes(player.position)
            )
            .slice(0, 5);

        if (matchingPlayers.length > 0) {
            autocompleteList.style.display = 'block';
            matchingPlayers.forEach(player => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';

                div.innerHTML = `
                    <img 
                        src="${getPlayerImageUrl(player)}"
                        onerror="this.src='${getFallbackImageUrl(player)}'"
                        alt="${player.full_name}"
                    >
                    <span>${player.full_name} (${player.position} - ${player.team || 'FA'})</span>
                `;

                div.addEventListener('click', () => {
                    addPlayer(player, teamId);
                    searchInput.value = '';
                    autocompleteList.style.display = 'none';
                });

                autocompleteList.appendChild(div);
            });
        } else {
            autocompleteList.style.display = 'none';
        }
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.style.display = 'none';
        }
    });
}

function addPlayer(player, teamId) {
    const playersList = teamId === 'team1' ? team1Players : team2Players;

    // Check if player is already added to either team
    if (team1Players.some(p => p.player_id === player.player_id) ||
        team2Players.some(p => p.player_id === player.player_id)) {
        alert('This player is already included in the trade!');
        return;
    }

    // Add player to team's array
    if (teamId === 'team1') {
        team1Players.push(player);
    } else {
        team2Players.push(player);
    }

    // Update display
    updatePlayersList(teamId);
}

function removePlayer(playerId, teamId) {
    if (teamId === 'team1') {
        team1Players = team1Players.filter(p => p.player_id !== playerId);
    } else {
        team2Players = team2Players.filter(p => p.player_id !== playerId);
    }

    // Update display
    updatePlayersList(teamId);
}

function updatePlayersList(teamId) {
    const container = document.querySelector(`.${teamId}-players`);
    const players = teamId === 'team1' ? team1Players : team2Players;

    container.innerHTML = players.map(player => `
        <div class="player-card">
            <img 
                src="${getPlayerImageUrl(player)}"
                onerror="this.src='${getFallbackImageUrl(player)}'"
                alt="${player.full_name}"
                class="player-avatar"
            >
            <div class="player-info">
                <span class="player-name">${player.full_name}</span>
                <span class="player-position">${player.position} - ${player.team || 'FA'}</span>
            </div>
            <button class="remove-player" onclick="removePlayer('${player.player_id}', '${teamId}')">×</button>
        </div>
    `).join('');
}

async function analyzeTrade() {
    if (team1Players.length === 0 || team2Players.length === 0) {
        alert('Please add players to both sides of the trade.');
        return;
    }

    const analysisResults = document.getElementById('analysisResults');
    analysisResults.innerHTML = '<div class="loading">Analyzing trade...</div>';

    try {
        // Get current NFL state to determine the season and week
        const nflState = await fetchNFLState();
        if (!nflState) {
            throw new Error('Could not fetch NFL state');
        }

        const currentSeason = nflState.season;
        const currentWeek = nflState.week;

        console.log('Analyzing trade for season:', currentSeason, 'week:', currentWeek);

        // Fetch game-by-game stats for all players
        const team1Stats = await Promise.all(team1Players.map(async player => {
            const stats = await fetchGameStats(player.player_id, currentSeason);
            return calculateAverageStats(stats, currentWeek);
        }));

        const team2Stats = await Promise.all(team2Players.map(async player => {
            const stats = await fetchGameStats(player.player_id, currentSeason);
            return calculateAverageStats(stats, currentWeek);
        }));

        // Display analysis
        displayAnalysis(team1Players, team2Players, team1Stats, team2Stats);
    } catch (error) {
        console.error('Error analyzing trade:', error);
        analysisResults.innerHTML = '<div class="error">Error analyzing trade. Please try again.</div>';
    }
}

function displayAnalysis(team1Players, team2Players, team1Stats, team2Stats) {
    const analysisResults = document.getElementById('analysisResults');

    analysisResults.innerHTML = `
        <div class="analysis-container">
            <div class="analysis-side">
                <h3>Team 1 Receives</h3>
                ${generateTeamAnalysis(team1Players, team1Stats)}
            </div>
            <div class="analysis-side">
                <h3>Team 2 Receives</h3>
                ${generateTeamAnalysis(team2Players, team2Stats)}
            </div>
        </div>
    `;
}

function generateTeamAnalysis(players, stats) {
    return players.map((player, index) => {
        const playerStats = stats[index] || {
            pass_yd: 0,
            pass_td: 0,
            pass_int: 0,
            rush_yd: 0,
            rush_td: 0,
            rec: 0,
            rec_yd: 0,
            rec_td: 0,
            games_played: 0
        };

        return `
            <div class="player-analysis">
                <h4>${player.full_name}</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Fantasy Points/Game</span>
                        <span class="stat-value">${calculateFantasyPoints(playerStats).toFixed(1)}</span>
                    </div>
                    ${generatePositionStats(player, playerStats)}
                </div>
            </div>
        `;
    }).join('');
}

// Calculate average stats from weekly stats
function calculateAverageStats(weeklyStats, currentWeek) {
    if (!Array.isArray(weeklyStats) || weeklyStats.length === 0) {
        return {
            pass_yd: 0,
            pass_td: 0,
            pass_int: 0,
            rush_yd: 0,
            rush_td: 0,
            rec: 0,
            rec_yd: 0,
            rec_td: 0,
            games_played: 0
        };
    }

    // Only consider weeks where the player actually played
    const gamesPlayed = weeklyStats.filter(week =>
        (week.pass_yd > 0 || week.rush_yd > 0 || week.rec > 0)
    ).length;

    if (gamesPlayed === 0) {
        return {
            pass_yd: 0,
            pass_td: 0,
            pass_int: 0,
            rush_yd: 0,
            rush_td: 0,
            rec: 0,
            rec_yd: 0,
            rec_td: 0,
            games_played: 0
        };
    }

    // Sum up all stats
    const totalStats = weeklyStats.reduce((acc, week) => ({
        pass_yd: (acc.pass_yd || 0) + (week.pass_yd || 0),
        pass_td: (acc.pass_td || 0) + (week.pass_td || 0),
        pass_int: (acc.pass_int || 0) + (week.pass_int || 0),
        rush_yd: (acc.rush_yd || 0) + (week.rush_yd || 0),
        rush_td: (acc.rush_td || 0) + (week.rush_td || 0),
        rec: (acc.rec || 0) + (week.rec || 0),
        rec_yd: (acc.rec_yd || 0) + (week.rec_yd || 0),
        rec_td: (acc.rec_td || 0) + (week.rec_td || 0)
    }), {});

    // Calculate averages
    return {
        pass_yd: +(totalStats.pass_yd / gamesPlayed).toFixed(1),
        pass_td: +(totalStats.pass_td / gamesPlayed).toFixed(1),
        pass_int: +(totalStats.pass_int / gamesPlayed).toFixed(1),
        rush_yd: +(totalStats.rush_yd / gamesPlayed).toFixed(1),
        rush_td: +(totalStats.rush_td / gamesPlayed).toFixed(1),
        rec: +(totalStats.rec / gamesPlayed).toFixed(1),
        rec_yd: +(totalStats.rec_yd / gamesPlayed).toFixed(1),
        rec_td: +(totalStats.rec_td / gamesPlayed).toFixed(1),
        games_played: gamesPlayed
    };
}

function calculateFantasyPoints(stats) {
    if (!stats) return 0;

    // Ensure all values are numbers with default of 0
    const weeklyPoints = (
        (Number(stats.pass_yd) || 0) * 0.04 +
        (Number(stats.pass_td) || 0) * 4 +
        (Number(stats.pass_int) || 0) * -2 +
        (Number(stats.rush_yd) || 0) * 0.1 +
        (Number(stats.rush_td) || 0) * 6 +
        (Number(stats.rec) || 0) * 1 + // PPR scoring
        (Number(stats.rec_yd) || 0) * 0.1 +
        (Number(stats.rec_td) || 0) * 6
    );

    return Number(weeklyPoints) || 0;
}

function generatePositionStats(player, stats) {
    if (!stats) return '';

    const gamesPlayed = stats.games_played || 0;
    const gamesStr = `(${gamesPlayed} games)`;

    switch (player.position) {
        case 'QB':
            return `
                <div class="stat-item">
                    <span class="stat-label">Pass Yards/Game ${gamesStr}</span>
                    <span class="stat-value">${stats.pass_yd.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Pass TDs/Game</span>
                    <span class="stat-value">${stats.pass_td.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rush Yards/Game</span>
                    <span class="stat-value">${stats.rush_yd.toFixed(1)}</span>
                </div>
            `;
        case 'RB':
            return `
                <div class="stat-item">
                    <span class="stat-label">Rush Yards/Game ${gamesStr}</span>
                    <span class="stat-value">${stats.rush_yd.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rush TDs/Game</span>
                    <span class="stat-value">${stats.rush_td.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Receptions/Game</span>
                    <span class="stat-value">${stats.rec.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rec Yards/Game</span>
                    <span class="stat-value">${stats.rec_yd.toFixed(1)}</span>
                </div>
            `;
        case 'WR':
        case 'TE':
            return `
                <div class="stat-item">
                    <span class="stat-label">Receptions/Game ${gamesStr}</span>
                    <span class="stat-value">${stats.rec.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rec Yards/Game</span>
                    <span class="stat-value">${stats.rec_yd.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rec TDs/Game</span>
                    <span class="stat-value">${stats.rec_td.toFixed(1)}</span>
                </div>
            `;
        default:
            return '';
    }
}