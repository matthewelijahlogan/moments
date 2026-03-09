const data = [
  { username: "SkyLynx", moment: "Final Set Spike", score: 92 },
  { username: "NovaPulse", moment: "Sunset Drive", score: 89 },
  { username: "WaveRunner", moment: "Cliff Dive", score: 84 }
];

data.sort((a, b) => b.score - a.score);

const list = document.querySelector(".leaderboard-list");

if (list) {
  const header = document.createElement("div");
  header.classList.add("card", "header");
  header.innerHTML = "<span>#</span><span>Username</span><span>Title</span><span>Score</span>";
  list.append(header);

  data.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "card";
    row.innerHTML = `<span>${index + 1}</span><span>${entry.username}</span><span>${entry.moment}</span><span>${entry.score}</span>`;
    list.append(row);
  });
}