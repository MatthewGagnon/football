// Cache for league data
let leagueCache = new Map();

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Check if response is empty
            if (!data || (Array.isArray(data) && data.length === 0) ||
                (typeof data === 'object' && Object.keys(data).length === 0)) {
                throw new Error('Empty response received');
            }
            return data;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

async function fetchLeague(leagueId) {
    // Check cache first
    if (leagueCache.has(leagueId)) {
        return leagueCache.get(leagueId);
    }

    try {
        const data = await fetchWithRetry(`https://api.sleeper.app/v1/league/${leagueId}`);
        if (data) {
            leagueCache.set(leagueId, data);
            return data;
        }
        throw new Error('League not found');
    } catch (error) {
        console.error('Error fetching league:', error);
        return null;
    }
}

async function fetchLeagueUsers(leagueId) {
    try {
        const data = await fetchWithRetry(`https://api.sleeper.app/v1/league/${leagueId}/users`);
        return data || [];
    } catch (error) {
        console.error('Error fetching league users:', error);
        return [];
    }
}

async function fetchLeagueRosters(leagueId) {
    try {
        const data = await fetchWithRetry(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
        return data || [];
    } catch (error) {
        console.error('Error fetching league rosters:', error);
        return [];
    }
}

async function fetchUserLeagues(userId, season) {
    try {
        const data = await fetchWithRetry(`https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`);
        return data || [];
    } catch (error) {
        console.error('Error fetching user leagues:', error);
        return [];
    }
}

async function searchLeague(leagueId) {
    try {
        // Check if league exists first
        const league = await fetchLeague(leagueId);
        if (!league) {
            throw new Error('League not found');
        }

        // If league exists, fetch users and rosters
        const [users, rosters] = await Promise.all([
            fetchLeagueUsers(leagueId),
            fetchLeagueRosters(leagueId)
        ]);

        return {
            league,
            users,
            rosters
        };
    } catch (error) {
        console.error('Error searching league:', error);
        return null;
    }
}