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

const data1 = await loadData("../api/get_all_flights1.php");
console.log(data1);

const data2 = await loadData("../api/get_all_flights2.php");
console.log(data2);

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
