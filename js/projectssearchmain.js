$(document).ready(function() {
    let games = [];
    let addons = [];

    function createCard(item) {
        return `
            <div class="col-md-4">
                <div class="card mb-4 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="card-text">${item.description}</p>
                        <a href="${item.repository}" class="btn btn-primary" target="_blank">Repository</a>
                        <p class="card-text mt-2"><small class="text-muted">License: ${item.license}</small></p>
                        <p class="card-text"><small class="text-muted">Tags: ${item.tags.join(', ')}</small></p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderItems(items, container) {
        let htmlContent = '';
        items.forEach(function(item) {
            htmlContent += createCard(item);
        });
        $(container).html(htmlContent);
    }

    function filterItems(query, items) {
        return items.filter(function(item) {
            return item.name.toLowerCase().includes(query) ||
                   item.description.toLowerCase().includes(query) ||
                   item.tags.join(' ').toLowerCase().includes(query);
        });
    }

    // Fetch the JSON file
    $.getJSON('data/projects.json', function(data) {
        games = data.games;
        addons = data.addons;

        renderItems(games, '#games');
        renderItems(addons, '#addons');
    });

    // Handle search input
    $('#search-input').on('input', function() {
        let query = $(this).val().toLowerCase();

        let filteredGames = filterItems(query, games);
        let filteredAddons = filterItems(query, addons);

        renderItems(filteredGames, '#games');
        renderItems(filteredAddons, '#addons');
    });
});
