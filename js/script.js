async function loadData() {
  const url = "../api/get_all_flights.php";
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(error);
    return false;
  }
}
const data = await loadData();
console.log(data);
