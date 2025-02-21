document.addEventListener('DOMContentLoaded', async () => {
    const newsContent = document.getElementById('newsContent');
    const loadingElement = document.getElementById('loading');

    async function fetchNews() {
        try {
            // Using NFL's news API directly
            const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=50');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.articles || [];
        } catch (error) {
            console.error('Error fetching news:', error);
            throw error;
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function createNewsCard(article) {
        return `
            <div class="news-card">
                ${article.images && article.images.length > 0 ? `
                    <div class="news-image">
                        <img src="${article.images[0].url}" 
                             alt="${article.headline}"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}
                <div class="news-content">
                    <h3 class="news-title">${article.headline}</h3>
                    <div class="news-meta">
                        <span class="news-date">${formatDate(article.published)}</span>
                    </div>
                    <p class="news-description">${article.description}</p>

                    <a href="${article.links.web.href}" target="_blank" class="read-more">Read More →</a>
                </div>
            </div>
        `;
    }

    // Initialize
    loadingElement.classList.add('active');
    try {
        const news = await fetchNews();
        if (news && news.length > 0) {
            newsContent.innerHTML = `
                <div class="news-grid">
                    ${news.map(article => createNewsCard(article)).join('')}
                </div>
            `;
        } else {
            throw new Error('No news articles found');
        }
    } catch (error) {
        console.error('Error:', error);
        newsContent.innerHTML = `
            <div class="error-message">
                Unable to load news at this time. Please try again later.<br>
                Error: ${error.message}
            </div>
        `;
    } finally {
        loadingElement.classList.remove('active');
    }
});