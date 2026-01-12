const perfBody2 = document.getElementById("perfBody2");
const filterJenis = document.getElementById("filterJenis");
const API_URL = "https://script.google.com/macros/s/AKfycbwOkWjZTW7ikhAcexlE6JEKD8Vo7EZ5YncP9oVxWgJSqJh3ppYQW-11rg-J1t38rnZMqw/exec";

const tableBody = document.getElementById("tableBody");
const perfBody = document.getElementById("perfBody");
const filterWorkzone = document.getElementById("filterWorkzone");
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
  [...new Set(data.map(d => d.WORKZONE))].forEach(t => {
    filterWorkzone.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

function applyFilter() {
  const workzone = filterWorkzone.value;
  const periode = filterPeriode.value;
  const jenis = filterJenis.value;

  // 1. Filter workzone
  let filtered =
    workzone === "ALL"
      ? rawData
      : rawData.filter(d => d.WORKZONE === workzone);

  // 2. Group by periode (harian / mingguan / bulanan)
  filtered = groupByPeriod(filtered, periode);

  // 3. Mapping jenis tiket
  filtered = filtered.map(d => {
    let open = 0;
    let close = 0;

    switch (jenis) {
      case "SQM":
        open = Number(d.OPEN_SQM);
        close = Number(d.SQM_CLOSE);
        break;

      case "REGULER":
        open = Number(d.OPEN_REGULER);
        close = Number(d.REGULER_CLOSE);
        break;

      case "HVC":
        open = Number(d.OPEN_UNSPEC);
        close = Number(d.UNSPEC_CLOSE);
        break;

      default: // ALL
        open = Number(d.OPEN_TTL);
        close = Number(d.CLOSE_TIKET);
    }

    return {
      ...d,
      OPEN_TTL: open,
      CLOSE_TIKET: close,
      TOTAL_TIKET: open + close
    };
  });

  // 4. Render semua komponen
  renderTable(filtered);
  renderKPI(filtered);
  renderPerformance(filtered);
  renderChart(filtered);
  renderTanggalDinamis(filterPeriode.value);
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
  // gabungkan teknisi & teknisi2
  const teknisiGabungan = new Set();

  data.forEach(d => {
    if (d.TEKNISI && d.TEKNISI.trim() !== "") {
      teknisiGabungan.add(d.TEKNISI.trim());
    }
    if (d.TEKNISI2 && d.TEKNISI2.trim() !== "") {
      teknisiGabungan.add(d.TEKNISI2.trim());
    }
  });

  document.getElementById("kpiTeknisi").textContent =
    teknisiGabungan.size;

  // KPI lain tetap
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
    const open = Number(d.OPEN_TTL);
    const close = Number(d.CLOSE_TIKET);

    const shareOpen = open / 2;
    const shareClose = close / 2;

    // Teknisi utama
    if (d.TEKNISI) {
      if (!map[d.TEKNISI]) map[d.TEKNISI] = { open: 0, close: 0 };
      map[d.TEKNISI].open += shareOpen;
      map[d.TEKNISI].close += shareClose;
    }

    // Teknisi 2
    if (d.TEKNISI2) {
      if (!map[d.TEKNISI2]) map[d.TEKNISI2] = { open: 0, close: 0 };
      map[d.TEKNISI2].open += shareOpen;
      map[d.TEKNISI2].close += shareClose;
    }
  });

  // Konversi ke array + hitung achievement
  const result = Object.keys(map).map(nama => {
    const open = Math.round(map[nama].open);
    const close = Math.round(map[nama].close);
    const total = open + close;
    const ach = total === 0 ? 0 : Math.round((close / total) * 100);
    return { nama, open, close, ach };
  });

  // Ranking berdasarkan achievement
  result.sort((a, b) => b.ach - a.ach);

  perfBody.innerHTML = "";

  result.forEach((r, i) => {
    const cls =
      r.ach >= 80 ? "perf-good" :
      r.ach >= 50 ? "perf-medium" :
      "perf-bad";

    perfBody.innerHTML += `
      <tr class="${cls}">
        <td>${i + 1}</td>
        <td>${r.nama}</td>
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

// Tanggal hari ini
function renderTanggalDinamis(periode) {
  const now = new Date();
  let text = "";

  if (periode === "HARIAN") {
    text = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  if (periode === "MINGGUAN") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    text =
      start.toLocaleDateString("id-ID") +
      " - " +
      end.toLocaleDateString("id-ID");
  }

  if (periode === "BULANAN") {
    text = now.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric"
    });
  }

  document.getElementById("tanggalDinamis").textContent = text;
}


filterWorkzone.addEventListener("change", applyFilter);
filterPeriode.addEventListener("change", applyFilter);
filterJenis.addEventListener("change", applyFilter);


renderTanggalHariIni();
