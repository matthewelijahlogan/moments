document.addEventListener("DOMContentLoaded", () => {
  const userStats = {
    highestRated: "4.8",
    totalMoments: 132,
    momentsThisMonth: 12,
    averageRating: "4.4"
  };

  document.getElementById("stat-highest").textContent = userStats.highestRated;
  document.getElementById("stat-total").textContent = userStats.totalMoments;
  document.getElementById("stat-month").textContent = userStats.momentsThisMonth;
  document.getElementById("stat-average").textContent = userStats.averageRating;
});