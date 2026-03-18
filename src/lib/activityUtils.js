export function shouldShowDuration(activityName) {
  const durationTypes = [
    "Sleep",
    "Nap",
    "Feeding",
    "Pumping",
    "Play",
  ];

  return durationTypes.includes(activityName);
}

export function getActivityColor(activityName) {
  const map = {
    Feeding: "blue",
    Sleep: "purple",
    Nap: "indigo",
    Diaper: "gray",
    Play: "yellow",
    Bath: "cyan",
    Medicine: "red",
    Temperature: "orange",
    Growth: "emerald",
    Pumping: "pink",
  };

  return map[activityName] || "blue";
}