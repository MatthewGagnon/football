document.addEventListener('DOMContentLoaded', async () => {
    // Initialize autocomplete
    initializeAutocomplete();

    const positionSelect = document.getElementById('positionSelect');
    const loadingElement = document.getElementById('loading');
    const rankingsContent = document.getElementById('rankingsContent');
    let allPlayers = null;

    // Fetch all players data
    try {
        allPlayers = await fetchAllPlayers();
    } catch (error) {
        console.error('Error fetching players:', error);
        rankingsContent.innerHTML = '<p class="error">Error loading player data. Please try again later.</p>';
        return;
    }

    // Helper function to get player stats for the 2024 season
    async function getPlayerStats(playerId) {
        try {
            // We specifically want 2024 season stats
            const season = 2024;
            const maxWeek = 18; // Full season
            let totalStats = {
                pass_yd: 0, pass_td: 0, pass_int: 0,
                rush_yd: 0, rush_td: 0,
                rec: 0, rec_yd: 0, rec_td: 0,
                games_played: 0
            };

            // Get stats for all weeks
            for (let week = 1; week <= maxWeek; week++) {
                const weekStats = await fetchWeekStats(playerId, season, week);
                // Only count weeks where the player had any meaningful stats
                if (weekStats && (weekStats.pass_yd || weekStats.rush_yd || weekStats.rec)) {
                    totalStats.games_played++;
                    Object.keys(totalStats).forEach(key => {
                        if (key !== 'games_played') {
                            totalStats[key] += (weekStats[key] || 0);
                        }
                    });
                }
            }

            // Only return stats if the player actually played games
            return totalStats.games_played > 0 ? totalStats : null;
        } catch (error) {
            console.error('Error fetching player stats:', error);
            return null;
        }
    }

    // Function to calculate fantasy points
    function calculateFantasyPoints(stats) {
        if (!stats) return 0;
        return (
            (stats.pass_yd || 0) * 0.04 +
            (stats.pass_td || 0) * 4 +
            (stats.pass_int || 0) * -2 +
            (stats.rush_yd || 0) * 0.1 +
            (stats.rush_td || 0) * 6 +
            (stats.rec || 0) * 1 + // PPR scoring
            (stats.rec_yd || 0) * 0.1 +
            (stats.rec_td || 0) * 6
        );
    }

    // Function to update rankings for selected position
    async function updateRankings(position) {
        loadingElement.classList.add('active');
        rankingsContent.innerHTML = '';

        try {
            // Filter players by position and active status
            const positionPlayers = Object.values(allPlayers)
                .filter(player =>
                    player.position === position &&
                    player.active &&
                    player.team  // Only include players with a current team
                );

            // Get stats for each player
            const playersWithStats = await Promise.all(
                positionPlayers.map(async player => {
                    const stats = await getPlayerStats(player.player_id);
                    const fantasyPoints = calculateFantasyPoints(stats);
                    return {
                        ...player,
                        stats,
                        fantasyPoints, // Total fantasy points for the season
                        pointsPerGame: stats && stats.games_played > 0 ?
                            (fantasyPoints / stats.games_played) : 0
                    };
                })
            );

            // Filter out players with no games played and sort by TOTAL fantasy points
            const rankedPlayers = playersWithStats
                .filter(player => player.stats && player.stats.games_played > 0)
                .sort((a, b) => b.fantasyPoints - a.fantasyPoints) // Sort by total points instead of PPG
                .slice(0, 30);

            // Create rankings table
            const tableHTML = `
            <table class="rankings-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Games</th>
                        ${generateStatsHeaders(position)}
                        <th>Total Points</th>
                        <th>Fantasy PPG</th>
                    </tr>
                </thead>
                <tbody>
                    ${rankedPlayers.map((player, index) => `
                        <tr class="player-row" onclick="window.location.href='player.html?id=${player.player_id}'">
                            <td class="rank">#${index + 1}</td>
                            <td class="player-name">
                                <img src="${getPlayerImageUrl(player)}" 
                                     onerror="this.src='${getFallbackImageUrl(player)}'"
                                     alt="${player.full_name}"
                                     class="player-avatar">
                                ${player.full_name}
                            </td>
                            <td>${player.team}</td>
                            <td>${player.stats?.games_played || 0}</td>
                            ${generateStatsColumns(player, position)}
                            <td class="total-points"><strong>${player.fantasyPoints.toFixed(1)}</strong></td>
                            <td class="points">${player.pointsPerGame.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

            rankingsContent.innerHTML = tableHTML;
        } catch (error) {
            console.error('Error updating rankings:', error);
            rankingsContent.innerHTML = '<p class="error">Error loading rankings. Please try again later.</p>';
        } finally {
            loadingElement.classList.remove('active');
        }
    }

    // Helper function to generate stats headers based on position
    function generateStatsHeaders(position) {
        switch (position) {
            case 'QB':
                return `
                    <th>Pass Yards</th>
                    <th>Pass TD</th>
                    <th>INT</th>
                    <th>Rush Yards</th>
                `;
            case 'RB':
                return `
                    <th>Rush Yards</th>
                    <th>Rush TD</th>
                    <th>Receptions</th>
                    <th>Rec Yards</th>
                `;
            case 'WR':
            case 'TE':
                return `
                    <th>Receptions</th>
                    <th>Rec Yards</th>
                    <th>Rec TD</th>
                    <th>YPR</th>
                `;
            case 'K':
                return `
                    <th>FG Made</th>
                    <th>FG Att</th>
                    <th>XP Made</th>
                    <th>XP Att</th>
                `;
            case 'DEF':
                return `
                    <th>Sacks</th>
                    <th>INT</th>
                    <th>Fum Rec</th>
                    <th>Safety</th>
                `;
        }
    }

    // Helper function to generate stats columns based on position
    function generateStatsColumns(player, position) {
        const stats = player.stats || {};
        switch (position) {
            case 'QB':
                return `
                    <td>${stats.pass_yd || 0}</td>
                    <td>${stats.pass_td || 0}</td>
                    <td>${stats.pass_int || 0}</td>
                    <td>${stats.rush_yd || 0}</td>
                `;
            case 'RB':
                return `
                    <td>${stats.rush_yd || 0}</td>
                    <td>${stats.rush_td || 0}</td>
                    <td>${stats.rec || 0}</td>
                    <td>${stats.rec_yd || 0}</td>
                `;
            case 'WR':
            case 'TE':
                const ypr = stats.rec ? (stats.rec_yd / stats.rec).toFixed(1) : '0.0';
                return `
                    <td>${stats.rec || 0}</td>
                    <td>${stats.rec_yd || 0}</td>
                    <td>${stats.rec_td || 0}</td>
                    <td>${ypr}</td>
                `;
            case 'K':
                return `
                    <td>${stats.fg_made || 0}</td>
                    <td>${stats.fg_att || 0}</td>
                    <td>${stats.xp_made || 0}</td>
                    <td>${stats.xp_att || 0}</td>
                `;
            case 'DEF':
                return `
                    <td>${stats.sack || 0}</td>
                    <td>${stats.int || 0}</td>
                    <td>${stats.fumble_rec || 0}</td>
                    <td>${stats.safety || 0}</td>
                `;
        }
    }

    // Add event listener for position select
    positionSelect.addEventListener('change', (e) => {
        updateRankings(e.target.value);
    });

    // Initial load of QB rankings
    updateRankings('QB');
});