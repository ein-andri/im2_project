// script.js

// ------------------------------------------------------
// 1. Einstellungen
// ------------------------------------------------------

// Flughäfen, von denen deine APIs Flüge liefern.
// x und y sind Prozentwerte innerhalb deiner Schweiz-Karte / .image-wrap.
const departureAirports = [
  {
    code: "LSZH",
    name: "Zürich",
    url: "../api/get_all_flights1.php",
    position: { x: 62, y: 34 },
  },
  {
    code: "LSZR",
    name: "St. Gallen-Altenrhein",
    url: "../api/get_all_flights2.php",
    position: { x: 82, y: 50 },
  },

  // Später kannst du hier einfach den dritten Flughafen ergänzen:
  // {
  //   code: "LSZB",
  //   name: "Bern",
  //   url: "../api/get_all_flights3.php",
  //   position: { x: 46, y: 56 },
  // },
];

// Bekannte Flughafenpositionen auf deiner Karte.
// Auch hier sind x/y Prozentwerte innerhalb der Schweiz-Karte.
const airportPositions = {
  LSZH: { x: 62, y: 34 },
  LSZR: { x: 82, y: 50 },

  // Beispiele, musst du feinjustieren:
  LSGG: { x: 15, y: 78 }, // Genf
  LSZB: { x: 46, y: 56 }, // Bern
  LSZA: { x: 72, y: 84 }, // Lugano
  LFSB: { x: 32, y: 58 }, // Basel/Mulhouse ungefähr
};

// Für Ziele außerhalb deiner Schweiz-Karte.
// Werte kleiner als 0 oder größer als 100 fliegen aus der Karte heraus.
const destinationDirections = {
  EDDF: { x: 75, y: -20 }, // Frankfurt: nach oben/rechts
  EDDM: { x: 115, y: 45 }, // München: nach rechts
  LOWW: { x: 130, y: 55 }, // Wien: weit nach rechts
  LFPG: { x: -25, y: 35 }, // Paris: nach links
  LIRF: { x: 65, y: 125 }, // Rom: nach unten
  EGLL: { x: -25, y: 15 }, // London: links/oben
};

// Falls du gewisse Zielflughäfen komplett ignorieren willst:
const excludedArrivalAirports = new Set([
  // "LSZH",
  // "LSZR",
]);

const recapDurationMs = 60_000;
const planeAnimationDurationMs = 20_000;

// Falls dein Flugzeugbild falsch herum schaut, ändere diesen Wert.
// Gute Testwerte sind: 0, 90, -90 oder 180.
const planeImageRotationOffset = 90;

// ------------------------------------------------------
// 2. HTML-Elemente holen
// ------------------------------------------------------

const animationButton = document.getElementById("animation-button");
const planeTemplate = document.getElementById("plane-template");
const animationArea = document.querySelector(".image-wrap");

// ------------------------------------------------------
// 3. Aktive Animation merken
// ------------------------------------------------------

let sortedFlights = [];
let activeTimeouts = [];
let activePlanes = new Set();

// ------------------------------------------------------
// 4. Daten laden
// ------------------------------------------------------

async function loadData(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Fehler beim Laden von ${url}: ${response.status}`);
  }

  return response.json();
}

async function loadFlightsFromDepartureAirports() {
  const results = await Promise.all(
    departureAirports.map(async (airport) => {
      try {
        const data = await loadData(airport.url);
        const flights = Array.isArray(data?.flights) ? data.flights : [];

        return flights.map((flight) => {
          return {
            ...flight,

            // Wichtig:
            // Damit weiß jedes Flugzeug später, von welchem Flughafen es starten soll.
            departureAirport: flight.estDepartureAirport || airport.code,
          };
        });
      } catch (error) {
        console.error(`Konnte Flüge von ${airport.code} nicht laden:`, error);
        return [];
      }
    }),
  );

  return results.flat();
}

async function initializeFlights() {
  const allFlights = await loadFlightsFromDepartureAirports();

  sortedFlights = allFlights
    .filter((flight) => {
      return !excludedArrivalAirports.has(flight.estArrivalAirport);
    })
    .sort((a, b) => {
      return Number(a.firstSeen) - Number(b.firstSeen);
    });

  console.log("All loaded flights:", allFlights);
  console.log("Filtered and sorted flights:", sortedFlights);
  console.log("sortedFlights length:", sortedFlights.length);
  console.log("first sorted flight:", sortedFlights[0]);
  console.log(
    "flights without firstSeen:",
    sortedFlights
      .filter((flight) => flight.firstSeen === undefined)
      .slice(0, 5),
  );
}

// ------------------------------------------------------
// 5. Animation zurücksetzen
// ------------------------------------------------------

function clearCurrentAnimation() {
  activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  activeTimeouts = [];

  activePlanes.forEach((plane) => plane.remove());
  activePlanes.clear();

  if (animationButton) {
    animationButton.disabled = false;
  }
}

// ------------------------------------------------------
// 6. Zeitstempel der Flüge
// ------------------------------------------------------

function getFlightTimestamp(flight) {
  const timestamp = Number(flight.firstSeen);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return timestamp;
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

// ------------------------------------------------------
// 7. Start- und Zielposition bestimmen
// ------------------------------------------------------

function getDepartureAirportConfig(departureAirportCode) {
  return departureAirports.find((airport) => {
    return airport.code === departureAirportCode;
  });
}

function getDeparturePosition(flight) {
  const departureAirportCode = flight.departureAirport;
  const airportConfig = getDepartureAirportConfig(departureAirportCode);

  if (airportConfig?.position) {
    return airportConfig.position;
  }

  console.warn(
    `Keine Startposition für ${departureAirportCode} gefunden. Nutze Mitte der Karte.`,
  );

  return { x: 50, y: 50 };
}

function getArrivalPosition(flight) {
  const arrivalAirportCode = flight.estArrivalAirport;

  if (airportPositions[arrivalAirportCode]) {
    return airportPositions[arrivalAirportCode];
  }

  if (destinationDirections[arrivalAirportCode]) {
    return destinationDirections[arrivalAirportCode];
  }

  return getFallbackDestinationPosition(arrivalAirportCode);
}

function getFallbackDestinationPosition(arrivalAirportCode) {
  const fallbackPositions = [
    { x: 50, y: -25 }, // nach oben
    { x: 120, y: 20 }, // nach rechts oben
    { x: 125, y: 70 }, // nach rechts unten
    { x: 50, y: 125 }, // nach unten
    { x: -25, y: 70 }, // nach links unten
    { x: -25, y: 20 }, // nach links oben
  ];

  const code = String(arrivalAirportCode || "UNKNOWN");

  const hash = [...code].reduce((sum, character) => {
    return sum + character.charCodeAt(0);
  }, 0);

  return fallbackPositions[hash % fallbackPositions.length];
}

function getPlaneRotation(startPosition, endPosition) {
  const deltaX = endPosition.x - startPosition.x;
  const deltaY = endPosition.y - startPosition.y;

  const angleInRadians = Math.atan2(deltaY, deltaX);
  const angleInDegrees = angleInRadians * (180 / Math.PI);

  return angleInDegrees + planeImageRotationOffset;
}

// ------------------------------------------------------
// 8. Flugzeug erzeugen
// ------------------------------------------------------

function createPlaneForFlight(flight) {
  if (!animationArea || !planeTemplate) {
    console.error("animationArea oder planeTemplate wurde nicht gefunden.");
    return;
  }

  const plane = document.createElement("img");

  const startPosition = getDeparturePosition(flight);
  const endPosition = getArrivalPosition(flight);
  const rotation = getPlaneRotation(startPosition, endPosition);

  plane.src = planeTemplate.src;
  plane.alt = flight.callsign ? `Plane ${flight.callsign.trim()}` : "Plane";

  plane.classList.add("flight-plane");

  plane.style.setProperty(
    "--flight-animation-duration",
    `${planeAnimationDurationMs}ms`,
  );

  plane.style.setProperty("--start-x", `${startPosition.x}%`);
  plane.style.setProperty("--start-y", `${startPosition.y}%`);
  plane.style.setProperty("--end-x", `${endPosition.x}%`);
  plane.style.setProperty("--end-y", `${endPosition.y}%`);
  plane.style.setProperty("--plane-rotation", `${rotation}deg`);

  plane.dataset.departureAirport = flight.departureAirport || "";
  plane.dataset.arrivalAirport = flight.estArrivalAirport || "";
  plane.dataset.firstSeen = flight.firstSeen || "";
  plane.dataset.callsign = flight.callsign || "";

  animationArea.appendChild(plane);
  activePlanes.add(plane);

  function removePlane() {
    plane.remove();
    activePlanes.delete(plane);
  }

  plane.addEventListener("animationend", removePlane, { once: true });

  // Sicherheits-Fallback, falls animationend nicht ausgelöst wird.
  const fallbackTimeoutId = setTimeout(
    removePlane,
    planeAnimationDurationMs + 1000,
  );

  activeTimeouts.push(fallbackTimeoutId);
}

// ------------------------------------------------------
// 9. Flug-Rekap starten
// ------------------------------------------------------

function startFlightRecap() {
  clearCurrentAnimation();

  const scheduledFlights = getScheduledFlights(sortedFlights);

  if (scheduledFlights.length === 0) {
    console.warn("Keine gültigen Flüge zum Animieren gefunden.");
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

// ------------------------------------------------------
// 10. Seite initialisieren
// ------------------------------------------------------

async function init() {
  if (!animationButton) {
    console.error("Button mit ID animation-button wurde nicht gefunden.");
    return;
  }

  if (!planeTemplate) {
    console.error("Bild mit ID plane-template wurde nicht gefunden.");
    return;
  }

  if (!animationArea) {
    console.error("Element mit Klasse .image-wrap wurde nicht gefunden.");
    return;
  }

  animationButton.disabled = true;

  await initializeFlights();

  animationButton.disabled = false;
  animationButton.addEventListener("click", startFlightRecap);
}

init();
