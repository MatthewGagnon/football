let currentPlayer = null;

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

function createStatsTable(gameStats, position) {
    const headers = getStatHeaders(position);

    // Make sure we have stats to display
    if (!gameStats || gameStats.length === 0) {
        return '<p>No stats available for this season</p>';
    }

    const rows = gameStats.map(game => {
        const cells = headers.map(header => game[header.key] || '0');
        return { week: game.week, stats: cells };
    });

    return `
        <div class="stats-table-container">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Week</th>
                        ${headers.map(header => `<th>${header.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <td>Week ${row.week}</td>
                            ${row.stats.map(stat => `<td>${stat}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function getStatHeaders(position) {
    switch (position) {
        case 'QB':
            return [
                { key: 'pass_yd', label: 'Pass Yds' },
                { key: 'pass_td', label: 'Pass TDs' },
                { key: 'pass_int', label: 'INTs' },
                { key: 'rush_yd', label: 'Rush Yds' },
                { key: 'rush_td', label: 'Rush TDs' }
            ];
        case 'RB':
            return [
                { key: 'rush_yd', label: 'Rush Yds' },
                { key: 'rush_td', label: 'Rush TDs' },
                { key: 'rec', label: 'Receptions' },
                { key: 'rec_yd', label: 'Rec Yds' },
                { key: 'rec_td', label: 'Rec TDs' }
            ];
        case 'WR':
        case 'TE':
            return [
                { key: 'rec', label: 'Receptions' },
                { key: 'rec_yd', label: 'Rec Yds' },
                { key: 'rec_td', label: 'Rec TDs' },
                { key: 'rush_yd', label: 'Rush Yds' },
                { key: 'rush_td', label: 'Rush TDs' }
            ];
        default:
            return [
                { key: 'rec', label: 'Receptions' },
                { key: 'rec_yd', label: 'Rec Yds' },
                { key: 'rec_td', label: 'Rec TDs' }
            ];
    }
}

function createStatsTable(gameStats, position) {
    const headers = getStatHeaders(position);
    const rows = gameStats.map(game => {
        const cells = headers.map(header => game[header.key] || 0);
        return { week: game.week, stats: cells };
    });

    return `
        <div class="stats-table-container">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Week</th>
                        ${headers.map(header => `<th>${header.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <td>Week ${row.week}</td>
                            ${row.stats.map(stat => `<td>${stat}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Function to create season options
function createSeasonOptions(currentSeason) {
    const startYear = 2018; // You can adjust this to show more historical seasons
    let options = '';
    for (let year = currentSeason; year >= startYear; year--) {
        options += `<option value="${year}">${year}</option>`;
    }
    return options;
}

async function updatePlayerStats(season) {
    if (!currentPlayer) return;

    const statsSection = document.getElementById('playerStats');
    const statsContent = document.getElementById('statsContent');
    const loadingElement = document.getElementById('loading');

    loadingElement.classList.add('active');

    try {
        // Fetch current stats and game-by-game stats for selected season
        const [seasonStats, gameStats] = await Promise.all([
            fetchPlayerStats(currentPlayer.player_id, season, 1), // Week 1 for season totals
            fetchGameStats(currentPlayer.player_id, season)
        ]);

        // Update the stats display
        document.getElementById('season-stats').innerHTML = `
            <div class="stat-grid">
                ${seasonStats ? `
                    <div class="stat-item">
                        <h4>Passing</h4>
                        <p>Yards: ${seasonStats.pass_yd || 0}</p>
                        <p>TDs: ${seasonStats.pass_td || 0}</p>
                        <p>INTs: ${seasonStats.pass_int || 0}</p>
                    </div>
                    <div class="stat-item">
                        <h4>Rushing</h4>
                        <p>Yards: ${seasonStats.rush_yd || 0}</p>
                        <p>TDs: ${seasonStats.rush_td || 0}</p>
                    </div>
                    <div class="stat-item">
                        <h4>Receiving</h4>
                        <p>Receptions: ${seasonStats.rec || 0}</p>
                        <p>Yards: ${seasonStats.rec_yd || 0}</p>
                        <p>TDs: ${seasonStats.rec_td || 0}</p>
                    </div>
                ` : '<p>No stats available for this season</p>'}
            </div>
        `;

        document.getElementById('game-stats').innerHTML = createStatsTable(gameStats, currentPlayer.position);
    } catch (error) {
        console.error('Error:', error);
        statsContent.innerHTML = '<p>Error fetching player data. Please try again later.</p>';
    } finally {
        loadingElement.classList.remove('active');
    }
}

async function displayPlayerStats(player) {
    currentPlayer = player; // Store the current player
    const statsSection = document.getElementById('playerStats');
    const statsContent = document.getElementById('statsContent');
    const loadingElement = document.getElementById('loading');

    loadingElement.classList.add('active');
    statsSection.classList.remove('active');

    try {
        const nflState = await fetchNFLState();
        if (!nflState) {
            throw new Error('Failed to fetch NFL state');
        }

        const currentSeason = nflState.season;

        // Create initial HTML structure with season selector
        statsContent.innerHTML = `
            <div class="player-card">
                <img 
                    src="${getPlayerImageUrl(player)}" 
                    class="player-image" 
                    onerror="handleImageError(this, ${JSON.stringify(player)})"
                    alt="${player.full_name}"
                >
                <div class="player-info">
                    <h3>${player.full_name}</h3>
                    <p>Team: ${player.team || 'N/A'}</p>
                    <p>Position: ${player.position || 'N/A'}</p>
                    <p>Status: ${player.status || 'Active'}</p>
                </div>
            </div>

            <div class="season-selector">
                <label for="season-select">Select Season:</label>
                <select id="season-select" onchange="updatePlayerStats(this.value)">
                    ${createSeasonOptions(currentSeason)}
                </select>
            </div>

            <div class="tab-container">
                <div class="tab-buttons">
                    <button class="tab-button active" onclick="switchTab('season-stats')">Season Stats</button>
                    <button class="tab-button" onclick="switchTab('game-stats')">Game by Game</button>
                </div>

                <div id="season-stats" class="tab-content active"></div>
                <div id="game-stats" class="tab-content"></div>
            </div>
        `;

        // Load initial stats for current season
        await updatePlayerStats(currentSeason);
        statsSection.classList.add('active');
    } catch (error) {
        console.error('Error:', error);
        statsContent.innerHTML = '<p>Error fetching player data. Please try again later.</p>';
        statsSection.classList.add('active');
    } finally {
        loadingElement.classList.remove('active');
    }
}

// Function to switch between tabs
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}