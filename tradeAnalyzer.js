// Store selected players for each team
let team1Players = [];
let team2Players = [];
let allPlayers = null;

// Function to fetch game-by-game stats for a player
async function fetchGameStats(playerId, season) {
    try {
        // Get current NFL state
        const nflState = await fetchNFLState();

        // Always fetch all 18 weeks for 2024 season or earlier
        const maxWeek = (season <= 2024) ? 18 : nflState.week;
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
        // Get current NFL state
        const nflState = await fetchNFLState();
        if (!nflState) {
            throw new Error('Could not fetch NFL state');
        }

        const currentSeason = nflState.season;

        // Calculate season averages for each player
        const team1Stats = await Promise.all(team1Players.map(async player => {
            const stats = await fetchGameStats(player.player_id, currentSeason);
            const averages = calculateAverageStats(stats);
            return { player, stats: averages };
        }));

        const team2Stats = await Promise.all(team2Players.map(async player => {
            const stats = await fetchGameStats(player.player_id, currentSeason);
            const averages = calculateAverageStats(stats);
            return { player, stats: averages };
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
                ${generateTeamAnalysis(team1Stats)}
            </div>
            <div class="analysis-side">
                <h3>Team 2 Receives</h3>
                ${generateTeamAnalysis(team2Stats)}
            </div>
        </div>
    `;
}

function generateTeamAnalysis(teamStats) {
    return teamStats.map(({ player, stats }) => {
        return `
            <div class="player-analysis">
                <h4>${player.full_name}</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Fantasy Points/Game</span>
                        <span class="stat-value">${calculateFantasyPoints(stats).toFixed(1)}</span>
                    </div>
                    ${generatePositionStats(player, stats)}
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to calculate average stats
function calculateAverageStats(weeklyStats) {
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
        week.pass_yd > 0 || week.rush_yd > 0 || week.rec > 0
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
        pass_yd: acc.pass_yd + (week.pass_yd || 0),
        pass_td: acc.pass_td + (week.pass_td || 0),
        pass_int: acc.pass_int + (week.pass_int || 0),
        rush_yd: acc.rush_yd + (week.rush_yd || 0),
        rush_td: acc.rush_td + (week.rush_td || 0),
        rec: acc.rec + (week.rec || 0),
        rec_yd: acc.rec_yd + (week.rec_yd || 0),
        rec_td: acc.rec_td + (week.rec_td || 0)
    }), {
        pass_yd: 0, pass_td: 0, pass_int: 0,
        rush_yd: 0, rush_td: 0,
        rec: 0, rec_yd: 0, rec_td: 0
    });

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
    return (
        (Number(stats.pass_yd) || 0) * 0.04 +
        (Number(stats.pass_td) || 0) * 4 +
        (Number(stats.pass_int) || 0) * -2 +
        (Number(stats.rush_yd) || 0) * 0.1 +
        (Number(stats.rush_td) || 0) * 6 +
        (Number(stats.rec) || 0) * 1 + // PPR scoring
        (Number(stats.rec_yd) || 0) * 0.1 +
        (Number(stats.rec_td) || 0) * 6
    );
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
                    <span class="stat-value">${stats.pass_yd?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Pass TDs/Game</span>
                    <span class="stat-value">${stats.pass_td?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rush Yards/Game</span>
                    <span class="stat-value">${stats.rush_yd?.toFixed(1) || '0.0'}</span>
                </div>
            `;
        case 'RB':
            return `
                <div class="stat-item">
                    <span class="stat-label">Rush Yards/Game ${gamesStr}</span>
                    <span class="stat-value">${stats.rush_yd?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rush TDs/Game</span>
                    <span class="stat-value">${stats.rush_td?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Receptions/Game</span>
                    <span class="stat-value">${stats.rec?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rec Yards/Game</span>
                    <span class="stat-value">${stats.rec_yd?.toFixed(1) || '0.0'}</span>
                </div>
            `;
        case 'WR':
        case 'TE':
            return `
                <div class="stat-item">
                    <span class="stat-label">Receptions/Game ${gamesStr}</span>
                    <span class="stat-value">${stats.rec?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rec Yards/Game</span>
                    <span class="stat-value">${stats.rec_yd?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rec TDs/Game</span>
                    <span class="stat-value">${stats.rec_td?.toFixed(1) || '0.0'}</span>
                </div>
            `;
        default:
            return '';
    }
}