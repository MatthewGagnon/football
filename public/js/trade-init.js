document.addEventListener('DOMContentLoaded', async () => {
    // Initialize all functionality when the DOM is loaded
    try {
        // Pre-fetch players data
        allPlayers = await fetchAllPlayers();

        // Set up search functionality for both teams
        setupTeamSearch('team1');
        setupTeamSearch('team2');

        // Set up analyze button
        document.getElementById('analyzeButton').addEventListener('click', analyzeTrade);

    } catch (error) {
        console.error('Error initializing trade analyzer:', error);
    }
});