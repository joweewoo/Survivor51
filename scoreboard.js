// ======================================================
// SCOREBOARD ROUTING
// ======================================================

window.addEventListener("DOMContentLoaded", () => {

  const path = window.location.pathname;

  if (path.includes("team-scoreboard")) {
    loadTeamScoreboard();
  }
  else if (
    path.includes("player-scoreboard") ||
    path.includes("league-player-scoreboard")
  ) {
    loadPlayerScoreboard();
  }

});


// ======================================================
// LOAD ALL EPISODES DYNAMICALLY
// ======================================================

async function loadAllEpisodes() {

  const episodes = [];
  let episodeNumber = 2;

  while (true) {

    try {

      const response = await fetch(
        `data/episode${episodeNumber}.json?v=${Date.now()}`
      );

      if (!response.ok) break;

      const data = await response.json();

      episodes.push(data);
      episodeNumber++;

    } catch (err) {

      console.error(
        "Error loading episode:",
        episodeNumber,
        err
      );

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

  return leagueRules[leagueFile] || 2;
}


// ======================================================
// LOAD PLAYER SCOREBOARD
// ======================================================

async function loadPlayerScoreboard() {

  const container =
    document.getElementById("scoreboardContainer");

  if (!container) return;

  container.innerHTML = "";


  // ------------------------------------------------------
  // Get league from URL
  // ------------------------------------------------------

  const params =
    new URLSearchParams(window.location.search);

  const leagueFile =
    params.get("league");

  if (!leagueFile) {
    console.error("No league specified in URL.");
    return;
  }


  const startEpisode =
    getStartEpisode(leagueFile);


  // ------------------------------------------------------
  // Load contestants
  // ------------------------------------------------------

  const contestantRes = await fetch(
    "data/leaguecontestants.json?v=" + Date.now()
  );

  if (!contestantRes.ok) {
    console.error(
      "Could not load leaguecontestants.json"
    );
    return;
  }

  const contestantData =
    await contestantRes.json();


  // ------------------------------------------------------
  // Build elimination + tribe maps
  // ------------------------------------------------------

  let eliminationMap = {};
  let tribeMap = {};

  contestantData.teams?.forEach(player => {

    eliminationMap[player.teamName] =
      player.eliminatedAfter ?? null;

    tribeMap[player.teamName] =
      player.tribe || null;

  });


  // ------------------------------------------------------
  // Load episodes
  // ------------------------------------------------------

  const episodes =
    await loadAllEpisodes();


  // ======================================================
  // GRAPH DATA
  // ======================================================

  // Episodes included in this league
  const graphEpisodes = [];

  // Cumulative score for every player
  const graphData = {};

  // Overall totals
  const overallTotals = {};


  // ======================================================
  // PROCESS EPISODES
  // ======================================================

  for (let episode of episodes) {

    // Do not include episodes before league starts
    if (episode.episode < startEpisode) {
      continue;
    }


    // Add episode to graph x-axis
    graphEpisodes.push(episode.episode);


    // ----------------------------------------------------
    // Process every player appearing in this episode
    // ----------------------------------------------------

    for (let playerName in episode.matrix) {

      // Initialize player if needed
      if (!graphData[playerName]) {
        graphData[playerName] = [];
      }

      if (overallTotals[playerName] === undefined) {
        overallTotals[playerName] = 0;
      }


      // --------------------------------------------------
      // Determine whether player is still eligible
      // --------------------------------------------------

      const eliminatedAfter =
        eliminationMap[playerName];


      if (
        eliminatedAfter !== null &&
        eliminatedAfter < episode.episode
      ) {

        // Player was already eliminated.
        // Their cumulative score remains unchanged.

        graphData[playerName].push(
          overallTotals[playerName]
        );

        continue;
      }


      // --------------------------------------------------
      // Calculate episode score
      // --------------------------------------------------

      const playerScores =
        episode.matrix[playerName];

      let episodeScore = 0;

      if (playerScores) {

        episodeScore =
          playerScores.reduce(
            (a, b) => a + b,
            0
          );

      }


      // --------------------------------------------------
      // Add episode score to cumulative score
      // --------------------------------------------------

      overallTotals[playerName] += episodeScore;


      // --------------------------------------------------
      // Save cumulative score for graph
      // --------------------------------------------------

      graphData[playerName].push(
        overallTotals[playerName]
      );

    }


    // ----------------------------------------------------
    // Make sure players who did not appear in this
    // episode still have a graph value.
    // ----------------------------------------------------

    for (let playerName in graphData) {

      if (
        graphData[playerName].length <
        graphEpisodes.length
      ) {

        graphData[playerName].push(
          overallTotals[playerName] || 0
        );

      }

    }

  }


  // ======================================================
  // RENDER PLAYER GRAPH
  // ======================================================

  renderPlayerScoreChart(
    graphEpisodes,
    graphData,
    tribeMap
  );


  // ======================================================
  // RENDER WEEKLY PLAYER SCOREBOARDS
  // ======================================================

  for (let episode of episodes) {

    if (episode.episode < startEpisode) {
      continue;
    }


    const block =
      document.createElement("div");

    block.className =
      "scoreboard-block";

    block.innerHTML =
      `<h2>EPISODE ${episode.episode}</h2>`;


    let rankings = [];


    // ----------------------------------------------------
    // Calculate weekly scores
    // ----------------------------------------------------

    for (let player in episode.matrix) {

      const eliminatedAfter =
        eliminationMap[player];


      if (
        eliminatedAfter !== null &&
        eliminatedAfter < episode.episode
      ) {
        continue;
      }


      const score =
        episode.matrix[player]
          .reduce((a, b) => a + b, 0);


      rankings.push({
        name: player,
        score: score
      });

    }


    // ----------------------------------------------------
    // Sort weekly ranking
    // ----------------------------------------------------

    rankings.sort(
      (a, b) => b.score - a.score
    );


    // ----------------------------------------------------
    // Render weekly ranking
    // ----------------------------------------------------

    rankings.forEach((p, index) => {

      const tribe =
        tribeMap[p.name];


      block.innerHTML += `
        <div class="score-row">
          ${index + 1}.
          <a
            href="player.html?name=${encodeURIComponent(p.name)}&league=${leagueFile}"
            class="new-player-link ${tribe ? `tribe-${tribe}` : ""}">
            ${p.name}
          </a>
          : ${p.score}
        </div>
      `;

    });


    container.appendChild(block);

  }


  // ======================================================
  // OVERALL PLAYER RANKING
  // ======================================================

  const overallBlock =
    document.createElement("div");

  overallBlock.className =
    "scoreboard-block";

  overallBlock.innerHTML =
    `<h2>OVERALL RANKING</h2>`;


  const overallArray =
    Object.entries(overallTotals)
      .map(([name, score]) => ({
        name,
        score
      }))
      .sort(
        (a, b) => b.score - a.score
      );


  overallArray.forEach((p, index) => {

    const tribe =
      tribeMap[p.name];


    const row =
      document.createElement("div");

    row.className =
      "score-row";


    row.innerHTML = `
      ${index + 1}.
      <a
        href="player.html?name=${encodeURIComponent(p.name)}&league=${leagueFile}"
        class="new-player-link ${tribe ? `tribe-${tribe}` : ""}">
        ${p.name}
      </a>
      : ${p.score}
    `;


    overallBlock.appendChild(row);

  });


  container.appendChild(overallBlock);

}


// ======================================================
// RENDER PLAYER SCORE CHART
// ======================================================

function renderPlayerScoreChart(
  graphEpisodes,
  graphData,
  tribeMap
) {

  const canvas =
    document.getElementById("playerScoreChart");


  if (!canvas) {

    console.error(
      "playerScoreChart canvas not found."
    );

    return;
  }


  // ------------------------------------------------------
  // Make sure Chart.js loaded
  // ------------------------------------------------------

  if (typeof Chart === "undefined") {

    console.error(
      "Chart.js was not loaded."
    );

    return;
  }


  // ------------------------------------------------------
  // Create one line for every player
  // ------------------------------------------------------

  const datasets =
    Object.entries(graphData).map(
      ([playerName, scores]) => {

        return {

          label: playerName,

          data: scores,

          tension: 0.2,

          pointRadius: 2,

          fill: false

        };

      }
    );


  // ------------------------------------------------------
  // Create chart
  // ------------------------------------------------------

  new Chart(canvas, {

    type: "line",

    data: {

      labels: graphEpisodes,

      datasets: datasets

    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      interaction: {

        mode: "index",

        intersect: false

      },

      plugins: {

        title: {

          display: true,

          text:
            "Player Overall Score by Episode"

        },

        legend: {

          position: "bottom"

        },

        tooltip: {

          callbacks: {

            label: function(context) {

              return (
                `${context.dataset.label}: ` +
                `${context.parsed.y} pts`
              );

            }

          }

        }

      },

      scales: {

        x: {

          title: {

            display: true,

            text: "Episode"

          }

        },

        y: {

          beginAtZero: true,

          title: {

            display: true,

            text: "Cumulative Points"

          }

        }

      }

    }

  });

}


// ======================================================
// LOAD TEAM SCOREBOARD
// ======================================================

async function loadTeamScoreboard() {

  // ------------------------------------------------------
  // Get league from URL
  // ------------------------------------------------------

  const params =
    new URLSearchParams(window.location.search);

  const leagueFile =
    params.get("league");

  if (!leagueFile) {

    console.error(
      "No league specified in URL."
    );

    return;
  }


  const startEpisode =
    getStartEpisode(leagueFile);


  // ------------------------------------------------------
  // Load league
  // ------------------------------------------------------

  const leagueResponse =
    await fetch(
      `data/${leagueFile}.json?v=${Date.now()}`
    );


  if (!leagueResponse.ok) {

    console.error(
      "League file not found:",
      leagueFile
    );

    return;
  }


  const league =
    await leagueResponse.json();


  // ------------------------------------------------------
  // Set title
  // ------------------------------------------------------

  const title =
    document.getElementById(
      "teamScoreboardTitle"
    );


  if (title) {

    title.innerText =
      `${league.leagueName} Team Scoreboard`;

  }


  // ------------------------------------------------------
  // Get container
  // ------------------------------------------------------

  const container =
    document.getElementById(
      "teamScoreboardContainer"
    );


  if (!container) return;

  container.innerHTML = "";


  // ------------------------------------------------------
  // Load contestants
  // ------------------------------------------------------

  const contestantRes =
    await fetch(
      "data/leaguecontestants.json?v=" +
      Date.now()
    );


  if (!contestantRes.ok) {

    console.error(
      "Could not load leaguecontestants.json"
    );

    return;
  }


  const contestantData =
    await contestantRes.json();


  // ------------------------------------------------------
  // Build elimination map
  // ------------------------------------------------------

  let eliminationMap = {};


  contestantData.teams?.forEach(team => {

    eliminationMap[team.teamName] =
      team.eliminatedAfter ?? null;

  });


  // ------------------------------------------------------
  // Load episodes
  // ------------------------------------------------------

  const episodes =
    await loadAllEpisodes();


  // ======================================================
  // GRAPH DATA
  // ======================================================

  const graphEpisodes = [];

  const graphData = {};

  const overallTotals = {};


  league.teams.forEach(team => {

    graphData[team.teamName] = [];

    overallTotals[team.teamName] = 0;

  });


  // ======================================================
  // PROCESS EPISODES
  // ======================================================

  for (let episode of episodes) {

    if (episode.episode < startEpisode) {
      continue;
    }


    graphEpisodes.push(
      episode.episode
    );


    const rankings = [];


    // ----------------------------------------------------
    // Calculate each team
    // ----------------------------------------------------

    for (let team of league.teams) {

      let teamScore = 0;


      for (let player of team.players) {

        const eliminatedAfter =
          eliminationMap[player.name];


        if (
          eliminatedAfter !== null &&
          eliminatedAfter < episode.episode
        ) {
          continue;
        }


        const playerScores =
          episode.matrix[player.name];


        if (playerScores) {

          teamScore +=
            playerScores.reduce(
              (a, b) => a + b,
              0
            );

        }

      }


      // --------------------------------------------------
      // Update cumulative total
      // --------------------------------------------------

      overallTotals[team.teamName] +=
        teamScore;


      // --------------------------------------------------
      // Save graph point
      // --------------------------------------------------

      graphData[team.teamName].push(
        overallTotals[team.teamName]
      );


      rankings.push({

        name: team.teamName,

        score: teamScore

      });

    }


    // ----------------------------------------------------
    // Sort weekly ranking
    // ----------------------------------------------------

    rankings.sort(
      (a, b) => b.score - a.score
    );


    // ----------------------------------------------------
    // Render weekly ranking
    // ----------------------------------------------------

    const block =
      document.createElement("div");

    block.className =
      "scoreboard-block";

    block.innerHTML =
      `<h2>EPISODE ${episode.episode}</h2>`;


    rankings.forEach((team, index) => {

      block.innerHTML += `
        <div class="score-row">
          ${index + 1}.
          ${team.name} :
          ${team.score}
        </div>
      `;

    });


    container.appendChild(block);

  }


  // ======================================================
  // RENDER TEAM GRAPH
  // ======================================================

  renderTeamScoreChart(
    graphEpisodes,
    graphData
  );


  // ======================================================
  // OVERALL TEAM RANKING
  // ======================================================

  const overallBlock =
    document.createElement("div");

  overallBlock.className =
    "scoreboard-block";

  overallBlock.innerHTML =
    `<h2>OVERALL RANKING</h2>`;


  const overallArray =
    Object.entries(overallTotals)
      .map(([name, score]) => ({
        name,
        score
      }))
      .sort(
        (a, b) => b.score - a.score
      );


  overallArray.forEach((team, index) => {

    overallBlock.innerHTML += `
      <div class="score-row">
        ${index + 1}.
        ${team.name} :
        ${team.score}
      </div>
    `;

  });


  container.appendChild(overallBlock);

}


// ======================================================
// RENDER TEAM SCORE CHART
// ======================================================

function renderTeamScoreChart(
  graphEpisodes,
  graphData
) {

  const canvas =
    document.getElementById(
      "teamScoreChart"
    );


  if (!canvas) {

    console.error(
      "teamScoreChart canvas not found."
    );

    return;
  }


  if (typeof Chart === "undefined") {

    console.error(
      "Chart.js was not loaded."
    );

    return;
  }


  const datasets =
    Object.entries(graphData).map(
      ([teamName, scores]) => {

        return {

          label: teamName,

          data: scores,

          tension: 0.2,

          pointRadius: 3,

          fill: false

        };

      }
    );


  new Chart(canvas, {

    type: "line",

    data: {

      labels: graphEpisodes,

      datasets: datasets

    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      interaction: {

        mode: "index",

        intersect: false

      },

      plugins: {

        title: {

          display: true,

          text:
            "Team Overall Score by Episode"

        },

        legend: {

          position: "bottom"

        },

        tooltip: {

          callbacks: {

            label: function(context) {

              return (
                `${context.dataset.label}: ` +
                `${context.parsed.y} pts`
              );

            }

          }

        }

      },

      scales: {

        x: {

          title: {

            display: true,

            text: "Episode"

          }

        },

        y: {

          beginAtZero: true,

          title: {

            display: true,

            text: "Cumulative Points"

          }

        }

      }

    }

  });

}
