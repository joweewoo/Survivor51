// ======================================================
// PLAYER SCOREBOARD (LEAGUE-SPECIFIC)
// ======================================================

window.addEventListener("DOMContentLoaded", () => {
  loadLeaguePlayerScoreboard();
});

async function loadLeaguePlayerScoreboard() {

  const params = new URLSearchParams(window.location.search);
  const leagueFile = params.get("league");

  if (!leagueFile) {
    console.error("No league specified in URL");
    return;
  }

  const container = document.getElementById("scoreboardContainer");
  if (!container) return;

  container.innerHTML = "";

  // ======================================================
  // LEAGUE RULES (START EPISODE)
  // ======================================================

  const leagueRules = {
    "league1": 2,
    "league2": 3,
    "league3": 2,
  };

  const startEpisode = leagueRules[leagueFile] || 1;

  // ======================================================
  // LOAD CONTESTANTS + BUILD TRIBE MAP
  // ======================================================

  const contestantRes = await fetch("data/leaguecontestants.json?v=" + Date.now());
  const contestantData = await contestantRes.json();

  let eliminationMap = {};
  let tribeMap = {};

  contestantData.teams?.forEach(player => {
    eliminationMap[player.teamName] = player.eliminatedAfter ?? null;
    tribeMap[player.teamName] = player.tribe || null;
  });

  // ======================================================
  // LOAD EPISODES DYNAMICALLY
  // ======================================================

  let episodes = [];
  let episodeNumber = 1;

  while (true) {

    const res = await fetch(`data/episode${episodeNumber}.json?v=${Date.now()}`);
    if (!res.ok) break;

    const data = await res.json();
    episodes.push(data);
    episodeNumber++;
  }

  let overallTotals = {};

  // ======================================================
  // RENDER EPISODES
  // ======================================================

  for (let episode of episodes) {

    if (episode.episode < startEpisode) continue;

    const block = document.createElement("div");
    block.className = "scoreboard-block";

    const title = document.createElement("h2");
    title.innerText = `EPISODE ${episode.episode}`;
    block.appendChild(title);

    let rankings = [];

    for (let playerName in episode.matrix) {

      const eliminatedAfter = eliminationMap[playerName];

      if (eliminatedAfter !== null &&
          eliminatedAfter < episode.episode) {
        continue;
      }

      const score = episode.matrix[playerName]
        .reduce((a, b) => a + b, 0);

      rankings.push({
        name: playerName,
        score: score
      });

      overallTotals[playerName] =
        (overallTotals[playerName] || 0) + score;
    }

    rankings.sort((a, b) => b.score - a.score);

    rankings.forEach((p, index) => {

      const tribe = tribeMap[p.name];

      const row = document.createElement("div");
      row.className = "score-row";

      row.innerHTML = `
        ${index + 1}.
        <a href="player.html?name=${encodeURIComponent(p.name)}&league=${leagueFile}"
           class="new-player-link ${tribe ? `tribe-${tribe}` : ""}">
           ${p.name}
        </a>
        : ${p.score}
      `;

      block.appendChild(row);
    });

    container.appendChild(block);
  }

  // ======================================================
  // OVERALL BLOCK
  // ======================================================

  const overallBlock = document.createElement("div");
  overallBlock.className = "scoreboard-block";

  const overallTitle = document.createElement("h2");
  overallTitle.innerText = "OVERALL RANKING";
  overallBlock.appendChild(overallTitle);

  const overallArray = Object.entries(overallTotals)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);

  overallArray.forEach((p, index) => {

    const tribe = tribeMap[p.name];

    const row = document.createElement("div");
    row.className = "score-row";

    row.innerHTML = `
      ${index + 1}.
      <a href="player.html?name=${encodeURIComponent(p.name)}&league=${leagueFile}"
         class="new-player-link ${tribe ? `tribe-${tribe}` : ""}">
         ${p.name}
      </a>
      : ${p.score}
    `;

    overallBlock.appendChild(row);
  });

  container.appendChild(overallBlock);
}
