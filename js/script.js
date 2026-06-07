// script.js

// ------------------------------------------------------
// 1. Einstellungen
// ------------------------------------------------------

// Flughäfen, von denen deine APIs Flüge liefern.
// x und y sind Prozentwerte innerhalb deiner Schweiz-Karte / .image-wrap.
// tableBodySelector bestimmt, in welches Board die Flüge geschrieben werden.

/*

const departureAirports = [
  {
    code: "LSZH",
    name: "Zürich",
    url: "../api/get_all_flights1.php",
    position: { x: 62, y: 34 },
    tableBodySelector: "#flight-table-body-1",
  },
  {
    code: "LSZB",
    name: "Bern-Belp",
    url: "../api/get_all_flights2.php",
    position: { x: 82, y: 50 },
    tableBodySelector: "#flight-table-body-2",
  },

  {
    code: "LSGG",
    name: "Genf",
    url: "../api/get_all_flights3.php",
    position: { x: 46, y: 56 },
    tableBodySelector: "#flight-table-body-3",
  },
];

// Bekannte Flughafenpositionen auf deiner Karte.
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
const destinationDirections = {
  EDDF: { x: 75, y: -20 }, // Frankfurt
  EDDM: { x: 115, y: 45 }, // München
  LOWW: { x: 130, y: 55 }, // Wien
  LFPG: { x: -25, y: 35 }, // Paris
  LIRF: { x: 65, y: 125 }, // Rom
  EGLL: { x: -25, y: 15 }, // London
};

// Falls du gewisse Zielflughäfen komplett ignorieren willst:
const excludedArrivalAirports = new Set([
  // "LSZH",
  // "LSZR",
]);

const recapDurationMs = 120_000;
const planeAnimationDurationMs = 20_000;
const maxFlightRowsPerTable = 4;

const bodyBackgroundIdleColor = "#33aad1";
const bodyBackgroundDarkColor = "#15718F";

// Diese drei Werte kannst du frei ändern.
// Sie müssen nicht zwingend 100 ergeben, werden unten automatisch normalisiert.
const bodyColorStartPercent = 10;
const bodyColorMiddlePercent = 80;
const bodyColorEndPercent = 10;

const bodyColorEasing = "ease-in";

// Falls dein Flugzeugbild falsch herum schaut, ändere diesen Wert.
// Gute Testwerte sind: 0, 90, -90 oder 180.
const planeImageRotationOffset = 90;

// ------------------------------------------------------
// 2. HTML-Elemente holen
// ------------------------------------------------------

const animationButton = document.getElementById("animation-button");
const planeTemplate = document.getElementById("plane-template");
const animationArea = document.querySelector(".image-wrap");

const timelineProgress = document.getElementById("timeline-progress");

// ------------------------------------------------------
// 3. Aktive Animation merken
// ------------------------------------------------------

let sortedFlights = [];
let activeTimeouts = [];
let activePlanes = new Set();
let activeFlightRows = new Set();

let timelineProgressAnimation = null;
let bodyColorAnimation = null;

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
// 5. Tabellen vorbereiten und aktualisieren
// ------------------------------------------------------

function getTableBodyForDepartureAirport(departureAirportCode) {
  const airportConfig = getDepartureAirportConfig(departureAirportCode);

  if (!airportConfig?.tableBodySelector) {
    return null;
  }

  return document.querySelector(airportConfig.tableBodySelector);
}

function createEmptyFlightTableRow() {
  const row = document.createElement("tr");
  row.dataset.emptyRow = "true";
  row.classList.add("empty-flight-row");

  const timeCell = document.createElement("td");
  const destinationCell = document.createElement("td");

  // &nbsp; sorgt dafür, dass die Zeile optisch Höhe behält.
  timeCell.textContent = "\u00A0";
  destinationCell.textContent = "\u00A0";

  row.appendChild(timeCell);
  row.appendChild(destinationCell);

  return row;
}

function getActiveRowsFromTable(tableBody) {
  return Array.from(tableBody.querySelectorAll("tr[data-flight-row='true']"));
}

function normalizeFlightTable(tableBody) {
  // Zuerst alle leeren Platzhalter-Zeilen entfernen.
  tableBody
    .querySelectorAll("tr[data-empty-row='true']")
    .forEach((row) => row.remove());

  let activeRows = getActiveRowsFromTable(tableBody);

  // Aktive Flüge nach Zeit sortieren.
  activeRows.sort((a, b) => {
    return Number(a.dataset.timestamp) - Number(b.dataset.timestamp);
  });

  // Falls mehr als 4 aktive Flüge vorhanden sind:
  // älteste löschen, neueste behalten.
  while (activeRows.length > maxFlightRowsPerTable) {
    const oldestRow = activeRows.shift();

    oldestRow.remove();
    activeFlightRows.delete(oldestRow);
  }

  // Sortierte aktive Zeilen wieder in die Tabelle einsetzen.
  activeRows.forEach((row) => {
    tableBody.appendChild(row);
  });

  // Mit leeren Zeilen auffüllen, bis immer 4 Zeilen sichtbar sind.
  while (tableBody.children.length < maxFlightRowsPerTable) {
    tableBody.appendChild(createEmptyFlightTableRow());
  }
}

function clearAllFlightTables() {
  departureAirports.forEach((airport) => {
    const tableBody = document.querySelector(airport.tableBodySelector);

    if (tableBody) {
      tableBody.innerHTML = "";
      normalizeFlightTable(tableBody);
    }
  });

  activeFlightRows.clear();
}

function formatTimestampAsTime(timestamp) {
  const numericTimestamp = Number(timestamp);

  if (!Number.isFinite(numericTimestamp)) {
    return "--:--";
  }

  const timestampInMs =
    numericTimestamp < 10_000_000_000
      ? numericTimestamp * 1000
      : numericTimestamp;

  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Zurich",
  }).format(new Date(timestampInMs));
}

function getFlightDestinationLabel(flight) {
  return flight.estArrivalAirport || "UNKNOWN";
}

function createFlightTableRow(flight) {
  const row = document.createElement("tr");

  const timestamp = getFlightTimestamp(flight);
  const timeCell = document.createElement("td");
  const destinationCell = document.createElement("td");

  timeCell.textContent = formatTimestampAsTime(flight.firstSeen);
  destinationCell.textContent = getFlightDestinationLabel(flight);

  row.appendChild(timeCell);
  row.appendChild(destinationCell);

  row.dataset.flightRow = "true";
  row.dataset.timestamp = timestamp ?? "";
  row.dataset.departureAirport = flight.departureAirport || "";
  row.dataset.arrivalAirport = flight.estArrivalAirport || "";
  row.dataset.callsign = flight.callsign || "";

  return row;
}

function addFlightToTable(flight) {
  const tableBody = getTableBodyForDepartureAirport(flight.departureAirport);

  if (!tableBody) {
    console.warn(
      `Keine Tabelle für Abflughafen ${flight.departureAirport} gefunden.`,
    );
    return null;
  }

  const row = createFlightTableRow(flight);

  tableBody.appendChild(row);
  activeFlightRows.add(row);

  normalizeFlightTable(tableBody);

  return row;
}

function removeFlightRow(row) {
  if (!row) {
    return;
  }

  const tableBody = row.parentElement;

  row.remove();
  activeFlightRows.delete(row);

  if (tableBody) {
    normalizeFlightTable(tableBody);
  }
}

// ------------------------------------------------------
// 6. Animation zurücksetzen
// ------------------------------------------------------

function clearCurrentAnimation() {
  activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  activeTimeouts = [];

  activePlanes.forEach((plane) => plane.remove());
  activePlanes.clear();

  clearAllFlightTables();

  if (animationButton) {
    animationButton.disabled = false;
  }
}

// ------------------------------------------------------
// 7. Zeitstempel der Flüge
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
// 8. Start- und Zielposition bestimmen
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
    { x: 50, y: -25 },
    { x: 120, y: 20 },
    { x: 125, y: 70 },
    { x: 50, y: 125 },
    { x: -25, y: 70 },
    { x: -25, y: 20 },
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
// 9. Flugzeug erzeugen
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

  // Neuer Teil:
  // Sobald das Flugzeug sichtbar wird, erscheint auch der Eintrag im Board.
  const flightRow = addFlightToTable(flight);

  let alreadyRemoved = false;

  function removePlaneAndTableRow() {
    if (alreadyRemoved) {
      return;
    }

    alreadyRemoved = true;

    plane.remove();
    activePlanes.delete(plane);

    // Sobald das Flugzeug verschwindet, verschwindet auch der Tabelleneintrag.
    removeFlightRow(flightRow);
  }

  plane.addEventListener("animationend", removePlaneAndTableRow, {
    once: true,
  });

  // Sicherheits-Fallback, falls animationend nicht ausgelöst wird.
  const fallbackTimeoutId = setTimeout(
    removePlaneAndTableRow,
    planeAnimationDurationMs + 1000,
  );

  activeTimeouts.push(fallbackTimeoutId);
}

function getTimelineProgressPositions() {
  const timeline = timelineProgress.closest(".timeline");
  const leftBar = timeline.querySelector(".bar-left");
  const rightBar = timeline.querySelector(".bar-right");

  const timelineRect = timeline.getBoundingClientRect();
  const leftBarRect = leftBar.getBoundingClientRect();
  const rightBarRect = rightBar.getBoundingClientRect();

  const startX = leftBarRect.left + leftBarRect.width / 2 - timelineRect.left;

  const endX = rightBarRect.left + rightBarRect.width / 2 - timelineRect.left;

  return {
    startX,
    endX,
    distance: endX - startX,
  };
}

function resetTimelineProgress() {
  if (!timelineProgress) {
    return;
  }

  const { startX } = getTimelineProgressPositions();

  timelineProgress.style.left = `${startX}px`;
  timelineProgress.style.transform = "translate(-50%, -50%)";
}

function stopRecapVisualAnimations() {
  if (timelineProgressAnimation) {
    timelineProgressAnimation.cancel();
    timelineProgressAnimation = null;
  }

  if (bodyColorAnimation) {
    bodyColorAnimation.cancel();
    bodyColorAnimation = null;
  }

  resetTimelineProgress();
  document.body.style.backgroundColor = bodyBackgroundIdleColor;
}

function getBodyColorOffsets() {
  const total =
    bodyColorStartPercent + bodyColorMiddlePercent + bodyColorEndPercent;

  if (total <= 0) {
    return {
      darkUntilOffset: 0.1,
      lightUntilOffset: 0.9,
    };
  }

  const darkUntilOffset = bodyColorStartPercent / total;
  const lightUntilOffset =
    (bodyColorStartPercent + bodyColorMiddlePercent) / total;

  return {
    darkUntilOffset,
    lightUntilOffset,
  };
}

function startTimelineProgressAnimation() {
  if (!timelineProgress) {
    return;
  }

  if (timelineProgressAnimation) {
    timelineProgressAnimation.cancel();
  }

  const { startX, distance } = getTimelineProgressPositions();

  timelineProgress.style.left = `${startX}px`;
  timelineProgress.style.transform = "translate(-50%, -50%)";

  timelineProgressAnimation = timelineProgress.animate(
    [
      {
        transform: "translate(-50%, -50%) translateX(0px)",
      },
      {
        transform: `translate(-50%, -50%) translateX(${distance}px)`,
      },
    ],
    {
      duration: recapDurationMs,
      easing: "linear",
      fill: "none",
    },
  );

  timelineProgressAnimation.addEventListener(
    "finish",
    () => {
      resetTimelineProgress();
      timelineProgressAnimation = null;
    },
    { once: true },
  );
}

function startBodyColorAnimation() {
  if (bodyColorAnimation) {
    bodyColorAnimation.cancel();
  }

  const total =
    bodyColorStartPercent + bodyColorMiddlePercent + bodyColorEndPercent;

  const lightFromOffset = bodyColorStartPercent / total;
  const darkFromOffset =
    (bodyColorStartPercent + bodyColorMiddlePercent) / total;

  document.body.style.backgroundColor = bodyBackgroundDarkColor;

  bodyColorAnimation = document.body.animate(
    [
      {
        backgroundColor: bodyBackgroundDarkColor,
        offset: 0,
        easing: bodyColorEasing,
      },
      {
        backgroundColor: bodyBackgroundIdleColor,
        offset: lightFromOffset,
      },
      {
        backgroundColor: bodyBackgroundIdleColor,
        offset: darkFromOffset,
        easing: bodyColorEasing,
      },
      {
        backgroundColor: bodyBackgroundDarkColor,
        offset: 1,
      },
    ],
    {
      duration: recapDurationMs,
      fill: "forwards",
    },
  );

  bodyColorAnimation.addEventListener(
    "finish",
    () => {
      document.body.style.backgroundColor = bodyBackgroundDarkColor;
      bodyColorAnimation = null;
    },
    { once: true },
  );
}

function startRecapVisualAnimations() {
  startTimelineProgressAnimation();
  startBodyColorAnimation();
}

// ------------------------------------------------------
// 10. Flug-Rekap starten
// ------------------------------------------------------

function startFlightRecap() {
  clearCurrentAnimation();

  const scheduledFlights = getScheduledFlights(sortedFlights);

  if (scheduledFlights.length === 0) {
    console.warn("Keine gültigen Flüge zum Animieren gefunden.");
    return;
  }

  animationButton.disabled = true;

  // Das hat bei dir gefehlt:
  startRecapVisualAnimations();

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
// 11. Seite initialisieren
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

  // Entfernt die statischen Beispiel-Zeilen aus deinem HTML.
  clearAllFlightTables();

  await initializeFlights();

  animationButton.disabled = false;
  animationButton.addEventListener("click", startFlightRecap);
}

init();

*/
