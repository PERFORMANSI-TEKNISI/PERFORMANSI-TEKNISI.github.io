const API_URL = "https://script.google.com/macros/s/AKfycbwOkWjZTW7ikhAcexlE6JEKD8Vo7EZ5YncP9oVxWgJSqJh3ppYQW-11rg-J1t38rnZMqw/exec";

const tableBody = document.getElementById("tableBody");
const perfBody = document.getElementById("perfBody");
const filterTeknisi = document.getElementById("filterTeknisi");
const filterPeriode = document.getElementById("filterPeriode");

let rawData = [];
let chart;

fetch(API_URL)
  .then(r => r.json())
  .then(json => {
    rawData = json.data;
    initFilter(rawData);
    applyFilter();
  });

function initFilter(data) {
  [...new Set(data.map(d => d.TEKNISI))].forEach(t => {
    filterTeknisi.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

function applyFilter() {
  const teknisi = filterTeknisi.value;
  const periode = filterPeriode.value;

  let filtered =
    teknisi === "ALL"
      ? rawData
      : rawData.filter(d => d.TEKNISI === teknisi);

  filtered = groupByPeriod(filtered, periode);

  renderTable(filtered);
  renderKPI(filtered);
  renderPerformance(filtered);
  renderChart(filtered);
}

function groupByPeriod(data, periode) {
  if (periode === "HARIAN") return data;

  const map = {};

  data.forEach(d => {
    const date = new Date(d.REPORTED_DATE);
    let key;

    if (periode === "MINGGUAN") {
      key = date.getFullYear() + "-W" +
        Math.ceil((date.getDate() + date.getDay()) / 7);
    } else {
      key = date.getFullYear() + "-" + (date.getMonth()+1);
    }

    if (!map[key]) {
      map[key] = {...d};
    } else {
      map[key].OPEN_TTL += d.OPEN_TTL;
      map[key].CLOSE_TIKET += d.CLOSE_TIKET;
      map[key].TOTAL_TIKET += d.TOTAL_TIKET;
    }
  });

  return Object.values(map);
}

function renderTable(data) {
  tableBody.innerHTML = "";
  data.forEach(d => {
    tableBody.innerHTML += `
      <tr>
        <td>${d.STO}</td>
        <td>${d.TEKNISI}</td>
        <td>${d.TEKNISI2}</td>
        <td>${d.TOTAL_TIKET}</td>
        <td>${d.OPEN_TTL}</td>
        <td>${d.CLOSE_TIKET}</td>
        <td>${d.REPORTED_DATE}</td>
      </tr>
    `;
  });
}

function renderKPI(data) {
  document.getElementById("kpiTeknisi").textContent =
    new Set(data.map(d => d.TEKNISI)).size;

  document.getElementById("kpiTotal").textContent =
    data.reduce((a,b)=>a+Number(b.TOTAL_TIKET),0);

  document.getElementById("kpiClose").textContent =
    data.reduce((a,b)=>a+Number(b.CLOSE_TIKET),0);

  document.getElementById("kpiOpen").textContent =
    data.reduce((a,b)=>a+Number(b.OPEN_TTL),0);
}

function renderPerformance(data) {
  const map = {};

  data.forEach(d => {
    if (!map[d.TEKNISI]) map[d.TEKNISI]={open:0, close:0};
    map[d.TEKNISI].open += d.OPEN_TTL;
    map[d.TEKNISI].close += d.CLOSE_TIKET;
  });

  const result = Object.keys(map).map(t => {
    const total = map[t].open + map[t].close;
    const ach = total === 0 ? 0 : Math.round(map[t].close / total * 100);
    return { teknisi:t, ...map[t], ach };
  }).sort((a,b)=>b.ach-a.ach);

  perfBody.innerHTML = "";

  result.forEach((r,i)=>{
    const cls = r.ach>=80?"perf-good":r.ach>=50?"perf-medium":"perf-bad";
    perfBody.innerHTML += `
      <tr class="${cls}">
        <td>${i+1}</td>
        <td>${r.teknisi}</td>
        <td>${r.open}</td>
        <td>${r.close}</td>
        <td>${r.ach}%</td>
      </tr>
    `;
  });
}

function renderChart(data) {
  const map = {};
  data.forEach(d=>{
    if(!map[d.TEKNISI]) map[d.TEKNISI]={open:0,close:0};
    map[d.TEKNISI].open+=d.OPEN_TTL;
    map[d.TEKNISI].close+=d.CLOSE_TIKET;
  });

  const labels = Object.keys(map);
  const closeData = labels.map(t=>map[t].close);
  const openData = labels.map(t=>map[t].open);

  const ctx = document.getElementById("chart");

  if(chart) chart.destroy();

  chart = new Chart(ctx,{
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"CLOSE", data:closeData},
        {label:"OPEN", data:openData}
      ]
    },
    options:{responsive:true, scales:{y:{beginAtZero:true}}}
  });
}

filterTeknisi.addEventListener("change", applyFilter);
filterPeriode.addEventListener("change", applyFilter);
