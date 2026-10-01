// ==============================
// GET PARAMETERS
// ==============================

const params = new URLSearchParams(window.location.search);
const playerName = params.get("name");
const leagueFile = params.get("league");

document.getElementById("playerName").innerText = playerName;


// ==============================
// LEAGUE RULES
// ==============================

const leagueRules = {
  "league1": { startEpisode: 2 },
  "league2": { startEpisode: 3 },
  "league3": { startEpisode: 2 }
};

const startEpisode =
  leagueRules[leagueFile]?.startEpisode || 2;


// ==============================
// LOAD EPISODES
// ==============================

async function loadEpisodes() {

  const episodes = [];
  let episodeNumber = 2;

  while (true) {
    try {
      const response = await fetch(`data/episode${episodeNumber}.json`);
      if (!response.ok) break;

      const data = await response.json();
      episodes.push(data);

      episodeNumber++;

    } catch (err) {
      break;
    }
  }

  return episodes;
}


// ==============================
// MAIN
// ==============================

async function loadData() {

  const container = document.getElementById("weeklyBreakdown");
  const episodes = await loadEpisodes();

  let totalScore = 0;

  for (let episode of episodes) {

    const episodeNumber = episode.episode;

    // ✅ Skip rendering episodes before startEpisode
    if (episodeNumber < startEpisode) {
      continue;
    }

    const playerArray = episode.matrix[playerName];

    const episodeDiv = document.createElement("div");
    episodeDiv.innerHTML = `<h3>Episode ${episodeNumber}</h3>`;

    if (!playerArray) {
      episodeDiv.innerHTML += "<p>No data.</p>";
      container.appendChild(episodeDiv);
      continue;
    }

    const ul = document.createElement("ul");
    let episodeTotal = 0;

    playerArray.forEach((points, index) => {
      if (points !== 0) {

        episodeTotal += points;

        const li = document.createElement("li");
        li.innerText = `${episode.actions[index]} (${points})`;
        ul.appendChild(li);
      }
    });

    if (ul.children.length === 0) {
      episodeDiv.innerHTML += "<p>No points this episode.</p>";
    } else {
      episodeDiv.appendChild(ul);
    }

    totalScore += episodeTotal;

    container.appendChild(episodeDiv);
  }

  document.getElementById("totalScore").innerText = totalScore;
}

loadData();
