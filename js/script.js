async function loadData(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return false;
  }
}

const excludedArrivalAirports = new Set([
  "LSZH",
  "LSGG",
  "LSZB",
  "LSGS",
  "LSZA",
  "LSZR",
  "LSZS",
  "LSGL",
  "LSZG",
  "LSZL",
  "LSZF",
  "LSZC",
  "LSGC",
  "LSGK",
  "LSGN",
  "LSGE",
  "LSGT",
  "LSGR",
  "LSGP",
  "LSPV",
  "LSGY",
  "LSGB",
  "LSPL",
  "LSZE",
  "LSZU",
  "LSZK",
  "LSTA",
  "LSZW",
  "LSMD",
  "LSZN",
  "LSZP",
  "LSTO",
  "LSPM",
  "LSMP",
  "LSZQ",
  "LSTS",
  "LSPG",
  "LSPN",
  "LSTZ",
  "LSMA",
  "LSZM",
  "LSZJ",
  "LSML",
  "LSZT",
  "LSMM",
  "LSPU",
  "LSZO",
  "LSZI",
  "CH-0047",
  "LSPD",
  "CH-0042",
  "LSPF",
  "CH-0045",
  "CH-0002",
  "LSZX",
  "LSXU",
  "LSME",
  "CH-0003",
  "CH-0046",
  "CH-0004",
  "LSZV",
  "LSTB",
  "CH-0043",
  "LSPH",
  "CH-0018",
  "CH-0019",
  "CH-0028",
  "LSXL",
  "CH-0009",
  "CH-0010",
  "LSER",
  "LSPA",
  "CH-0044",
  "LSVP",
  "LSYX",
  "LSYR",
  "LSTR",
  "LSYI",
  "LSPO",
  "LSVD",
  "LSVV",
  "LSYK",
  "LSHA",
  "CH-0008",
  "CH-0026",
  "CH-0031",
  "CH-0032",
  "CH-0024",
  "LSHI",
  "CH-0022",
  "CH-0041",
  "CH-0023",
  "CH-0016",
  "LSHC",
  "CH-0021",
  "LSMV",
  "CH-0035",
  "CH-0030",
  "CH-0040",
  "LSHG",
  "LSHU",
  "CH-0017",
  "LSXG",
  "CH-0036",
  "CH-0025",
  "LSXH",
  "CH-0020",
  "LSXY",
  "LSXR",
  "CH-0037",
  "CH-0007",
  "LSXP",
  "CH-0038",
  "CH-0001",
  "CH-0006",
  "LSXO",
  "CH-0027",
  "CH-0005",
  "LSXM",
  "CH-0039",
  "LSXZ",
  "LSXS",
  "CH-0012",
  "CH-0034",
  "LSXT",
  "CH-0029",
  "CH-0033",
  "CH-0048",
  "LSEZ",
  "CH-0011",
  "CH-0013",
  "CH-0014",
  "CH-0015",
]);

const data1 = await loadData("../api/get_all_flights1.php");
const data2 = await loadData("../api/get_all_flights2.php");

const data1Array = Array.isArray(data1?.flights) ? data1.flights : [];
const data2Array = Array.isArray(data2?.flights) ? data2.flights : [];

const sortedFlights = [...data1Array, ...data2Array]
  .filter((flight) => !excludedArrivalAirports.has(flight.estArrivalAirport))
  .sort((a, b) => Number(a.firstSeen) - Number(b.firstSeen));

console.log("filtered and sorted flights:", sortedFlights);

console.log("data1:", data1);
console.log("data2:", data2);
console.log("sortedFlights length:", sortedFlights.length);
console.log("first sorted flight:", sortedFlights[0]);
console.log(
  "flights without firstSeen:",
  sortedFlights.filter((flight) => flight.firstSeen === undefined).slice(0, 5),
);

const animationButton = document.getElementById("animation-button");
const planeTemplate = document.getElementById("plane-template");
const animationArea = document.querySelector(".image-wrap");

const recapDurationMs = 60_000;
const planeAnimationDurationMs = 20_000;

let activeTimeouts = [];
let activePlanes = new Set();

function clearCurrentAnimation() {
  activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  activeTimeouts = [];

  activePlanes.forEach((plane) => plane.remove());
  activePlanes.clear();
}

function getFlightTimestamp(flight) {
  const timestamp = Number(flight.firstSeen);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return timestamp;
}

function createPlaneForFlight(flight) {
  const plane = document.createElement("img");

  plane.src = planeTemplate.src;
  plane.alt = flight.callsign ? `Plane ${flight.callsign.trim()}` : "Plane";

  plane.classList.add("flight-plane");

  plane.style.setProperty(
    "--flight-animation-duration",
    `${planeAnimationDurationMs}ms`,
  );

  plane.dataset.arrivalAirport = flight.estArrivalAirport || "";
  plane.dataset.firstSeen = flight.firstSeen || "";

  animationArea.appendChild(plane);
  activePlanes.add(plane);

  function removePlane() {
    plane.remove();
    activePlanes.delete(plane);
  }

  plane.addEventListener("animationend", removePlane, { once: true });

  // Safety fallback in case animationend does not fire
  setTimeout(removePlane, planeAnimationDurationMs + 1000);
}

function getScheduledFlights(flights) {
  const validFlights = flights
    .map((flight) => {
      return {
        flight,
        timestamp: getFlightTimestamp(flight),
      };
    })
    .filter((item) => item.timestamp !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (validFlights.length === 0) {
    return [];
  }

  const firstTimestamp = validFlights[0].timestamp;
  const lastTimestamp = validFlights[validFlights.length - 1].timestamp;
  const timestampSpan = lastTimestamp - firstTimestamp || 1;

  return validFlights.map(({ flight, timestamp }) => {
    const relativePosition = (timestamp - firstTimestamp) / timestampSpan;
    const delay = relativePosition * recapDurationMs;

    return {
      flight,
      delay,
    };
  });
}

function startFlightRecap() {
  clearCurrentAnimation();

  const scheduledFlights = getScheduledFlights(sortedFlights);

  if (scheduledFlights.length === 0) {
    console.warn("No valid flights to animate.");
    return;
  }

  animationButton.disabled = true;

  scheduledFlights.forEach(({ flight, delay }) => {
    const timeoutId = setTimeout(() => {
      createPlaneForFlight(flight);
    }, delay);

    activeTimeouts.push(timeoutId);
  });

  const finishTimeoutId = setTimeout(
    () => {
      animationButton.disabled = false;
      activeTimeouts = [];
    },
    recapDurationMs + planeAnimationDurationMs + 1000,
  );

  activeTimeouts.push(finishTimeoutId);

  console.log(`Started recap with ${scheduledFlights.length} flights.`);
}

animationButton.addEventListener("click", startFlightRecap);

/*

let time_begin = 1777960800;
let time_end = 1777964400;

function createOpenSkyDepartureUrl(airport = "LSZH") {
  const now = new Date();

  // Day before at 07:30
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 1);
  startDate.setHours(7, 30, 0, 0);

  // Day before at 23:00
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - 1);
  endDate.setHours(23, 0, 0, 0);

  // Unix timestamps in seconds
  const start = Math.floor(startDate.getTime() / 1000);
  const end = Math.floor(endDate.getTime() / 1000);

  const url = `https://opensky-network.org/api/flights/departure?airport=${airport}&begin=${start}&end=${end}`;

  return {
    start,
    end,
    url,
  };
}

// Example usage
const { start, end, url } = createOpenSkyDepartureUrl();

console.log(start);
console.log(end);
console.log(url);


*/
