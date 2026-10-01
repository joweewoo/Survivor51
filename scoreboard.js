// ======================================================
// SCOREBOARD ROUTING
// ======================================================

window.addEventListener("DOMContentLoaded", () => {

  const path = window.location.pathname;

  if (path.includes("team-scoreboard")) {
    loadTeamScoreboard();
  }
  else if (path.includes("league-player-scoreboard")) {
    loadPlayerScoreboard();
  }

});


// ======================================================
// LOAD ALL EPISODES DYNAMICALLY
// ======================================================

async function loadAllEpisodes() {

  const episodes = [];
  let episodeNumber = 1;

  while (true) {
    try {
      const response = await fetch(`data/episode${episodeNumber}.json?v=${Date.now()}`);
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


// ======================================================
// GET LEAGUE START EPISODE
// ======================================================

function getStartEpisode(leagueFile) {

  const leagueRules = {
    "league1": 2,
    "league2": 3,
    "league3": 2
  };

  return leagueRules[leagueFile] || 1;
}


// ======================================================
// LOAD PLAYER SCOREBOARD
// ======================================================

async function loadPlayerScoreboard() {

  const container = document.getElementById("scoreboardContainer");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const leagueFile = params.get("league");
  if (!leagueFile) return;

  const startEpisode = getStartEpisode(leagueFile);

  // Load contestants for tribe + elimination info
  const contestantRes = await fetch("data/leaguecontestants.json?v=" + Date.now());
  const contestantData = await contestantRes.json();

  let eliminationMap = {};
  let tribeMap = {};

  contestantData.teams?.forEach(player => {
    eliminationMap[player.teamName] = player.eliminatedAfter ?? null;
    tribeMap[player.teamName] = player.tribe || null;
  });

  const episodes = await loadAllEpisodes();
  let overallTotals = {};

  for (let episode of episodes) {

    if (episode.episode < startEpisode) continue;

    const block = document.createElement("div");
    block.className = "scoreboard-block";
    block.innerHTML = `<h2>EPISODE ${episode.episode}</h2>`;

    let rankings = [];

    for (let player in episode.matrix) {

      const eliminatedAfter = eliminationMap[player];
      if (eliminatedAfter !== null &&
          eliminatedAfter < episode.episode) {
        continue;
      }

      const score = episode.matrix[player].reduce((a, b) => a + b, 0);

      rankings.push({ name: player, score });

      overallTotals[player] =
        (overallTotals[player] || 0) + score;
    }

    rankings.sort((a, b) => b.score - a.score);

    rankings.forEach((p, index) => {

      const tribe = tribeMap[p.name];

      block.innerHTML += `
        <div class="score-row">
          ${index + 1}.
          <a href="player.html?name=${encodeURIComponent(p.name)}&league=${leagueFile}"
             class="new-player-link ${tribe ? `tribe-${tribe}` : ""}">
             ${p.name}
          </a>
          : ${p.score}
        </div>
      `;
    });

    container.appendChild(block);
  }

  // ================= OVERALL BLOCK =================

  const overallBlock = document.createElement("div");
  overallBlock.className = "scoreboard-block";
  overallBlock.innerHTML = `<h2>OVERALL RANKING</h2>`;

  const overallArray = Object.entries(overallTotals)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);

  overallArray.forEach((p, index) => {

    const tribe = tribeMap[p.name];

    overallBlock.innerHTML += `
      <div class="score-row">
        ${index + 1}.
        <a href="player.html?name=${encodeURIComponent(p.name)}&league=${leagueFile}"
           class="new-player-link ${tribe ? `tribe-${tribe}` : ""}">
           ${p.name}
        </a>
        : ${p.score}
      </div>
    `;
  });

  container.appendChild(overallBlock);
}


// ======================================================
// LOAD TEAM SCOREBOARD (RESTORED — UNCHANGED FUNCTIONALITY)
// ======================================================

async function loadTeamScoreboard() {

  const params = new URLSearchParams(window.location.search);
  const leagueFile = params.get("league");
  if (!leagueFile) return;

  const startEpisode = getStartEpisode(leagueFile);

  const leagueResponse = await fetch(`data/${leagueFile}.json?v=${Date.now()}`);
  const league = await leagueResponse.json();

  document.getElementById("teamScoreboardTitle").innerText =
    `${league.leagueName} Team Scoreboard`;

  const container = document.getElementById("teamScoreboardContainer");
  if (!container) return;

  const contestantRes = await fetch("data/leaguecontestants.json?v=" + Date.now());
  const contestantData = await contestantRes.json();

  let eliminationMap = {};
  contestantData.teams?.forEach(team => {
    eliminationMap[team.teamName] = team.eliminatedAfter ?? null;
  });

  const episodes = await loadAllEpisodes();
  let overallTotals = {};

  for (let episode of episodes) {

    if (episode.episode < startEpisode) continue;

    const block = document.createElement("div");
    block.className = "scoreboard-block";
    block.innerHTML = `<h2>EPISODE ${episode.episode}</h2>`;

    let rankings = [];

    for (let team of league.teams) {

      let teamScore = 0;

      for (let player of team.players) {

        const eliminatedAfter = eliminationMap[player.name];
        if (eliminatedAfter !== null &&
            eliminatedAfter < episode.episode) {
          continue;
        }

        const playerScores = episode.matrix[player.name];
        if (playerScores) {
          teamScore += playerScores.reduce((a, b) => a + b, 0);
        }
      }

      rankings.push({ name: team.teamName, score: teamScore });

      overallTotals[team.teamName] =
        (overallTotals[team.teamName] || 0) + teamScore;
    }

    rankings.sort((a, b) => b.score - a.score);

    rankings.forEach((t, index) => {
      block.innerHTML += `
        <div class="score-row">
          ${index + 1}. ${t.name} : ${t.score}
        </div>
      `;
    });

    container.appendChild(block);
  }

  // -------- Overall Team Block --------

  const overallBlock = document.createElement("div");
  overallBlock.className = "scoreboard-block";
  overallBlock.innerHTML = `<h2>OVERALL RANKING</h2>`;

  const overallArray = Object.entries(overallTotals)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);

  overallArray.forEach((t, index) => {
    overallBlock.innerHTML += `
      <div class="score-row">
        ${index + 1}. ${t.name} : ${t.score}
      </div>
    `;
  });

  container.appendChild(overallBlock);
}
