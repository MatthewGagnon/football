// auth.js
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('linkSleeperForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const sleeperUsername = document.getElementById('sleeperUsername').value;

        console.log('Form submitted with:', { email, sleeperUsername });

        try {
            const response = await fetch('/api/link-sleeper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    sleeperUsername
                })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                // Hide auth form and show leagues
                document.querySelector('.auth-section').style.display = 'none';
                document.querySelector('.leagues-section').style.display = 'block';

                // Load leagues
                loadLeagues();
            } else {
                alert(data.error || 'Error linking account');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error linking account');
        }
    });
});

async function loadLeagues() {
    try {
        const response = await fetch('/api/leagues');
        const data = await response.json();

        const leaguesList = document.getElementById('leaguesList');
        leaguesList.innerHTML = data.leagues.map(league => `
            <div class="league-card">
                <h3>${league.leagueName}</h3>
                <p>Season: ${league.season}</p>
                <a href="./fantasy.html?id=${league.leagueId}" class="view-league-button">
                    View League
                </a>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading leagues:', error);
    }
}

// Function to check login status
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        return data.authenticated;
    } catch (error) {
        return false;
    }
}

// Function to handle logout
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Error logging out:', error);
    }
}