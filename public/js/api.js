// Cache for API responses
let allPlayersData = null;
let nflStateData = null;

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

async function fetchNFLState() {
    if (nflStateData) {
        console.log('Using cached NFL state:', nflStateData);
        return nflStateData;
    }

    try {
        const data = await fetchWithRetry('https://api.sleeper.app/v1/state/nfl');
        console.log('Fetched NFL state from API:', data);
        nflStateData = data;
        return data;
    } catch (error) {
        console.error('Error fetching NFL state:', error);
        const fallbackState = {
            season: 2024,    // Last completed season
            week: 18,       // Final week of regular season
            season_type: 'regular',
            season_start_date: '2024-09-07',
            season_completed: true,
            previous_season: 2023
        };
        console.log('Using fallback NFL state:', fallbackState);
        nflStateData = fallbackState;
        return fallbackState;
    }
}

async function fetchAllPlayers() {
    if (allPlayersData) return allPlayersData;

    try {
        const data = await fetchWithRetry('https://api.sleeper.app/v1/players/nfl');
        // Transform the data but keep it as an object for faster lookups
        allPlayersData = data;
        return data;
    } catch (error) {
        console.error('Error fetching players:', error);
        return {};
    }
}

async function fetchWeekStats(playerId, season, week) {
    try {
        console.log(`Fetching stats for player ${playerId}, season ${season}, week ${week}`);
        const url = `https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`;
        console.log('Fetching URL:', url);

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return null;
        }

        const allStats = await response.json();
        console.log(`Week ${week} all stats:`, allStats);

        const playerStats = allStats[playerId];
        console.log(`Week ${week} player stats:`, playerStats);

        // Return null if no stats, otherwise return the stats
        return playerStats || null;
    } catch (error) {
        console.error('Error fetching week stats:', error);
        return null;
    }
}

async function fetchPlayerStats(playerId, season) {
    try {
        // Get NFL state
        const nflState = await fetchNFLState();

        // For completed seasons, always fetch all 18 weeks
        // For current season, use the current week from NFL state
        const maxWeek = (season < nflState.season || nflState.season_completed) ? 18 : nflState.week;

        let seasonStats = {
            pass_yd: 0,
            pass_td: 0,
            pass_int: 0,
            rush_yd: 0,
            rush_td: 0,
            rec: 0,
            rec_yd: 0,
            rec_td: 0
        };

        // Get stats for each week and accumulate
        for (let week = 1; week <= maxWeek; week++) {
            const weekStats = await fetchWeekStats(playerId, season, week);
            if (weekStats) {
                Object.keys(seasonStats).forEach(key => {
                    seasonStats[key] += (weekStats[key] || 0);
                });
            }
        }

        return seasonStats;
    } catch (error) {
        console.error('Error fetching player stats:', error);
        return null;
    }
}

// Add new function to fetch all season weeks stats
async function fetchSeasonStats(playerId, season) {
    try {
        const url = `https://api.sleeper.app/v1/stats/nfl/player/${playerId}/gamelog/${season}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Season stats response:', data); // For debugging
        return data;
    } catch (error) {
        console.error('Error fetching season stats:', error);
        return [];
    }
}

function getPlayerImageUrl(player) {
    if (!player || !player.player_id) return null;
    return `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`;
}

function getFallbackImageUrl(player) {
    // Return position-specific default image
    return `/api/placeholder/200/200`;
}

// Helper function to validate stats data
function validateStats(stats) {
    if (!stats) return false;

    // Check if any meaningful stats exist
    const statKeys = ['pass_yd', 'pass_td', 'rush_yd', 'rush_td', 'rec', 'rec_yd', 'rec_td'];
    return statKeys.some(key => stats[key] && stats[key] > 0);
}