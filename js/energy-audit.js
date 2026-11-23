/* ── FREE ENERGY ASSESSMENT TOOL (/energy-audit/) ───────────
   Works out daily load, a solar system size and payback from what
   the visitor enters. The system price is used for payback only and
   is never shown to the visitor (client decision). It is sent to the
   EMA team with a site-visit request. */
(function () {
  const form = document.getElementById("eaForm");
  if (!form) return;

  // ── Sizing assumptions (from the original EMA tool) ──
  const PEAK_SUN_HOURS = 5.5;
  const SYSTEM_EFFICIENCY = 0.8;
  const BATTERY_SHARE = 0.6; // battery holds 60% of daily load
  const INVERTER_HEADROOM = 1.5;
  const INVERTER_SIZES = [3, 5, 7.5, 10, 15, 20, 25, 30];
  const COST_PER_KWP = 850000; // ₦, internal estimate only
  const SAVINGS_SHARE = 0.7; // solar replaces ~70% of grid + fuel spend
  const HP_TO_WATTS = 746 * 1.1; // 1 HP = 746 W, +10% real-world draw

  const APPLIANCES = [
    { id: "ac", label: "Air conditioner", hp: true, def: 1.5 },
    { id: "fridge", label: "Fridge", def: 150 },
    { id: "deepfreezer", label: "Deep freezer", def: 200 },
    { id: "pc", label: "Computer / Laptop", def: 65 },
    { id: "light", label: "LED lights", def: 18 },
    { id: "tv", label: "Television", def: 100 },
    { id: "fan", label: "Fan", def: 75 },
    { id: "pump", label: "Water pump", def: 750 },
    { id: "washer", label: "Washing machine", def: 500 },
    { id: "microwave", label: "Microwave", def: 1000 },
    { id: "kettle", label: "Electric kettle", def: 1500 },
    { id: "iron", label: "Pressing iron", def: 1000 },
    { id: "cooker", label: "Electric cooker", def: 2000 },
    { id: "printer", label: "Printer", def: 50 },
    { id: "cctv", label: "CCTV / Router", def: 30 },
    { id: "other", label: "Other", def: 0 },
  ];
  const DEFAULT_ROWS = [
    ["ac", 2, 1.5, 10],
    ["fridge", 2, 150, 24],
    ["pc", 5, 65, 9],
    ["light", 20, 18, 12],
    ["pump", 1, 750, 3],
  ];
  const STATES = [
    "Abia", "Abuja (FCT)", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
    "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
    "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
    "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
    "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Outside Nigeria",
  ];

  const $ = (id) => document.getElementById(id);
  const num = (el) => {
    const v = parseFloat(el && el.value);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ── Building fields ──
  const stateSel = $("eaState");
  stateSel.innerHTML =
    '<option value="">Select state</option>' +
    STATES.map((s) => `<option>${esc(s)}</option>`).join("");
  const sector = $("eaSector");
  sector.addEventListener("change", () => {
    $("eaHomeTypeWrap").hidden = sector.value !== "Home";
  });

  // ── Appliance rows ──
  const rowsEl = $("eaAppRows");
  let rowCount = 0;
  const removeIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function addRow(preset) {
    const [id, qty, power, hrs] = preset || ["", "", "", ""];
    const n = ++rowCount;
    const row = document.createElement("div");
    row.className = "ea-app";
    row.setAttribute("role", "row");
    row.innerHTML = `
      <div class="ea-app__cell ea-app__name" role="cell">
        <label class="ea-app__mlabel" for="apName${n}">Appliance</label>
        <select class="ea-input" id="apName${n}" data-k="name">
          <option value="">Choose appliance</option>
          ${APPLIANCES.map((a) => `<option value="${a.id}">${esc(a.label)}</option>`).join("")}
        </select>
      </div>
      <div class="ea-app__cell" role="cell">
        <label class="ea-app__mlabel" for="apQty${n}">How many</label>
        <input class="ea-input" type="number" id="apQty${n}" data-k="qty" min="0" step="1" inputmode="numeric" placeholder="0" />
      </div>
      <div class="ea-app__cell ea-app__cell--power" role="cell">
        <label class="ea-app__mlabel" for="apPow${n}">Power</label>
        <div class="ea-power">
          <input class="ea-input" type="number" id="apPow${n}" data-k="power" min="0" inputmode="decimal" placeholder="0" />
          <span class="ea-power__unit" data-k="unit">W</span>
        </div>
      </div>
      <div class="ea-app__cell" role="cell">
        <label class="ea-app__mlabel" for="apHrs${n}">Hours a day</label>
        <input class="ea-input" type="number" id="apHrs${n}" data-k="hrs" min="0" max="24" inputmode="decimal" placeholder="0" />
      </div>
      <div role="cell">
        <button type="button" class="ea-app__remove" aria-label="Remove this appliance">${removeIcon}</button>
      </div>`;

    const sel = row.querySelector('[data-k="name"]');
    const pow = row.querySelector('[data-k="power"]');
    const setUnit = () => {
      const a = APPLIANCES.find((x) => x.id === sel.value);
      const isHp = !!(a && a.hp);
      row.querySelector('[data-k="unit"]').textContent = isHp ? "HP" : "W";
      pow.step = isHp ? "0.5" : "1";
      pow.setAttribute("aria-label", isHp ? "Power in horsepower" : "Power in watts");
      return a;
    };
    sel.addEventListener("change", () => {
      const a = setUnit();
      // Fill a typical rating when the box is empty or still holds a default
      if (a && (!pow.value || pow.dataset.auto === "1")) {
        pow.value = a.def || "";
        pow.dataset.auto = "1";
      }
    });
    pow.addEventListener("input", () => (pow.dataset.auto = "0"));
    row.querySelector(".ea-app__remove").addEventListener("click", () => {
      const next = row.nextElementSibling || row.previousElementSibling;
      row.remove();
      (next ? next.querySelector("select") : $("eaAddRow")).focus();
    });

    if (id) {
      sel.value = id;
      setUnit();
      row.querySelector('[data-k="qty"]').value = qty;
      pow.value = power;
      row.querySelector('[data-k="hrs"]').value = hrs;
    }
    rowsEl.appendChild(row);
    return row;
  }

  DEFAULT_ROWS.forEach(addRow);
  $("eaAddRow").addEventListener("click", () => {
    addRow().querySelector("select").focus();
  });

  function readAppliances() {
    return Array.from(rowsEl.querySelectorAll(".ea-app")).map((row) => {
      const sel = row.querySelector('[data-k="name"]');
      const a = APPLIANCES.find((x) => x.id === sel.value);
      const qty = num(row.querySelector('[data-k="qty"]'));
      const power = num(row.querySelector('[data-k="power"]'));
      const hrs = Math.min(24, num(row.querySelector('[data-k="hrs"]')));
      const watts = a && a.hp ? power * HP_TO_WATTS : power;
      const name = a ? a.label + (a.hp ? ` (${power} HP)` : "") : "Appliance";
      return { name, qty, power, unit: a && a.hp ? "HP" : "W", watts, hrs, kwh: (qty * watts * hrs) / 1000 };
    });
  }

  // ── Calculate ──
  let report = null;

  function calculate() {
    const apps = readAppliances();
    const used = apps.filter((a) => a.kwh > 0);
    const gridBill = num($("eaGridBill"));
    const fuel = num($("eaFuel"));
    const monthly = gridBill + fuel;
    const dailyKwh = used.reduce((s, a) => s + a.kwh, 0);
    const peakKw = used.reduce((s, a) => s + (a.qty * a.watts) / 1000, 0);

    const pv = Math.ceil((dailyKwh / PEAK_SUN_HOURS / SYSTEM_EFFICIENCY) * 10) / 10;
    const bat = Math.ceil(dailyKwh * BATTERY_SHARE * 10) / 10;
    const invRaw = peakKw * INVERTER_HEADROOM;
    const inv = INVERTER_SIZES.find((s) => s >= invRaw) || Math.ceil(invRaw);
    const cost = pv * COST_PER_KWP;
    const saveMonthly = monthly * SAVINGS_SHARE;
    const saveYearly = saveMonthly * 12;
    const paybackYears = saveYearly > 0 ? cost / saveYearly : null;

    const homeType = sector.value === "Home" ? $("eaHomeType").value : "";
    return {
      id: "EMA-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      date: new Date(),
      name: $("eaName").value.trim() || "Your building",
      sector: [sector.value, homeType].filter(Boolean).join(" · "),
      state: stateSel.value,
      gridHours: num($("eaGridHours")),
      tariff: num($("eaTariff")),
      genHours: num($("eaGenHours")),
      genSize: num($("eaGenSize")),
      apps: used,
      gridBill, fuel, monthly, yearly: monthly * 12,
      dailyKwh, pv, bat, inv, cost,
      saveMonthly, saveYearly, paybackYears,
    };
  }

  function paybackText(p) {
    if (p === null) return "Add your monthly spend";
    if (p < 1) return "under 1 year";
    let lo = Math.floor(p);
    let hi = Math.ceil(p);
    if (lo === hi) hi = lo + 1;
    return `about ${lo} to ${hi} years`;
  }

  // ── Render report ──
  function render(r) {
    $("eaReportTitle").textContent = r.name;
    $("eaReportMeta").textContent = [r.sector, r.state].filter(Boolean).join(" · ");
    $("eaReportId").textContent = r.id;
    $("eaKpiMonthly").textContent = naira(r.monthly);
    $("eaKpiYearly").textContent = naira(r.yearly);
    $("eaKpiLoad").textContent = r.dailyKwh.toFixed(1) + " kWh";

    const fuelShare = r.monthly > 0 ? Math.round((r.fuel / r.monthly) * 100) : 0;
    $("eaAlert").hidden = !(r.fuel > 0 && fuelShare >= 50);
    $("eaAlertText").textContent =
      `${fuelShare}% of what you spend on power goes on generator fuel. That is about ${naira(r.fuel * 12)} a year. ` +
      "Fuel is usually the most expensive way to make electricity, and it is the first cost solar cuts.";

    const max = Math.max(...r.apps.map((a) => a.kwh));
    $("eaBreakdown").innerHTML = r.apps
      .slice()
      .sort((a, b) => b.kwh - a.kwh)
      .map(
        (a) => `<div class="ea-bar-row">
          <div class="ea-bar-row__top"><span class="ea-bar-row__name">${esc(a.qty)} × ${esc(a.name)}</span><span class="ea-bar-row__val">${a.kwh.toFixed(1)} kWh/day</span></div>
          <div class="ea-bar"><span style="width:${Math.max(2, (a.kwh / max) * 100).toFixed(0)}%"></span></div>
        </div>`,
      )
      .join("");

    $("eaCosts").innerHTML = `
      <div class="ea-cost-row"><span>Grid bill</span><span>${naira(r.gridBill)}</span></div>
      <div class="ea-cost-row"><span>Diesel / petrol</span><span>${naira(r.fuel)}</span></div>
      <div class="ea-cost-row ea-cost-row--total"><span>Total each month</span><span>${naira(r.monthly)}</span></div>
      <div class="ea-cost-row ea-cost-row--total"><span>Total each year</span><span>${naira(r.yearly)}</span></div>`;

    $("eaPv").textContent = r.pv.toFixed(1);
    $("eaBat").textContent = r.bat.toFixed(1);
    $("eaInv").textContent = r.inv;
    $("eaSaveMonthly").textContent = r.monthly > 0 ? naira(r.saveMonthly) : "—";
    $("eaSaveYearly").textContent = r.monthly > 0 ? naira(r.saveYearly) : "—";
    $("eaPayback").textContent = paybackText(r.paybackYears);
  }

  const formError = $("eaFormError");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const apps = readAppliances();
    if (!apps.some((a) => a.kwh > 0)) {
      formError.textContent =
        "Add at least one appliance with how many, its power and the hours it runs each day.";
      formError.hidden = false;
      return;
    }
    formError.hidden = true;
    report = calculate();
    render(report);
    form.hidden = true;
    const rep = $("eaReport");
    rep.hidden = false;
    rep.scrollIntoView({ behavior: "smooth", block: "start" });
    rep.focus({ preventScroll: true });
  });

  $("eaRestart").addEventListener("click", () => {
    $("eaReport").hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.querySelector("input, select").focus({ preventScroll: true });
  });

  // ── PDF (print window) ──
  $("eaPdf").addEventListener("click", () => {
    if (!report) return;
    const r = report;
    const win = window.open("", "_blank");
    if (!win) {
      $("eaPdfError").hidden = false;
      return;
    }
    $("eaPdfError").hidden = true;
    const today = r.date.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
    const appRows = r.apps
      .map((a) => `<tr><td>${esc(a.qty)} × ${esc(a.name)}</td><td class="r">${a.kwh.toFixed(1)} kWh/day</td></tr>`)
      .join("");
    const meta = [r.sector, r.state].filter(Boolean).join(" · ");
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>EMA Energy Report - ${esc(r.name)}</title>
<style>
@page{size:A4;margin:14mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#0a1628;font-size:12px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{background:#050d1a;color:#fff;padding:22px 26px;border-bottom:4px solid #f5a623}
.brand{font-weight:700;font-size:13px;letter-spacing:.5px}.brand span{color:#f5a623}
.name{font-size:22px;font-weight:700;margin-top:12px}.meta{color:#a8bccf;font-size:11px;margin-top:2px}
.row{display:flex;justify-content:space-between;color:#7a90b0;font-size:10px;margin-top:10px}
.kpis{display:flex;border-bottom:1px solid #dde3ec}.kpi{flex:1;padding:14px 18px;border-right:1px solid #dde3ec}.kpi:last-child{border-right:0}
.kl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#5b6b82}.kv{font-size:18px;font-weight:700;margin-top:3px}
.sec{padding:16px 26px}.st{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#5b6b82;border-bottom:1px solid #dde3ec;padding-bottom:5px;margin-bottom:6px}
.warn{background:#fff6e5;border:1px solid #f5c76a;border-radius:6px;padding:10px 12px;margin-bottom:14px;color:#6b4a00}
.two{display:flex;gap:20px}.two>div{flex:1}
table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #eef1f5}.r{text-align:right;white-space:nowrap}.b td{font-weight:700}
.rec{background:#0f2040;color:#fff;padding:18px 26px;margin-top:4px}
.rt{font-size:14px;font-weight:700}.rs{color:#a8bccf;font-size:10px;margin:2px 0 12px}
.specs{display:flex;gap:8px;margin-bottom:12px}.spec{flex:1;background:rgba(255,255,255,.08);border-radius:6px;padding:9px 12px}
.sl{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#a8bccf}.sv{font-size:16px;font-weight:700;color:#f5a623}
.note{color:#a8bccf;font-size:10px;margin-top:10px}
.ft{padding:12px 26px;font-size:9px;color:#5b6b82;border-top:1px solid #dde3ec;margin-top:10px}
</style></head><body>
<div class="hd"><div class="brand">Energy Metrics <span>Africa</span> · Free Energy Assessment</div>
<div class="name">${esc(r.name)}</div><div class="meta">${esc(meta)}</div>
<div class="row"><span>${esc(r.id)}</span><span>${esc(today)}</span></div></div>
<div class="kpis">
<div class="kpi"><div class="kl">Monthly power spend</div><div class="kv">${naira(r.monthly)}</div></div>
<div class="kpi"><div class="kl">Yearly power spend</div><div class="kv">${naira(r.yearly)}</div></div>
<div class="kpi"><div class="kl">Daily energy use</div><div class="kv">${r.dailyKwh.toFixed(1)} kWh</div></div></div>
<div class="sec">
${$("eaAlert").hidden ? "" : `<div class="warn">${esc($("eaAlertText").textContent)}</div>`}
<div class="two"><div><div class="st">Where your energy goes</div><table>${appRows}</table></div>
<div><div class="st">What you spend each month</div><table>
<tr><td>Grid bill</td><td class="r">${naira(r.gridBill)}</td></tr>
<tr><td>Diesel / petrol</td><td class="r">${naira(r.fuel)}</td></tr>
<tr class="b"><td>Total each month</td><td class="r">${naira(r.monthly)}</td></tr>
<tr class="b"><td>Total each year</td><td class="r">${naira(r.yearly)}</td></tr></table></div></div></div>
<div class="rec"><div class="rt">Recommended solar hybrid system</div>
<div class="rs">Solar panels, lithium (LiFePO4) batteries and a hybrid inverter that still works with the grid.</div>
<div class="specs">
<div class="spec"><div class="sl">Solar panels</div><div class="sv">${r.pv.toFixed(1)} kWp</div></div>
<div class="spec"><div class="sl">Battery storage</div><div class="sv">${r.bat.toFixed(1)} kWh</div></div>
<div class="spec"><div class="sl">Inverter</div><div class="sv">${esc(r.inv)} kVA</div></div></div>
<div class="specs">
<div class="spec"><div class="sl">Savings each month</div><div class="sv">${r.monthly > 0 ? naira(r.saveMonthly) : "—"}</div></div>
<div class="spec"><div class="sl">Savings each year</div><div class="sv">${r.monthly > 0 ? naira(r.saveYearly) : "—"}</div></div>
<div class="spec"><div class="sl">Pays for itself in</div><div class="sv">${esc(paybackText(r.paybackYears))}</div></div></div>
<div class="note">These savings assume solar replaces about 70% of your grid and fuel spend. Our engineers confirm the real figure and the price after a site visit.</div></div>
<div class="ft">Energy Metrics Africa Limited · energymetricsafrica.com · info@energymetricsafrica.com · WhatsApp 0814 653 4567<br>
This report is an estimate. Final system size and price depend on a site visit by an engineer.</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
    win.document.close();
  });

  // ── Site visit request ──
  const dlg = $("eaBook");
  const bookForm = $("eaBookForm");
  const bookErr = $("eaBookError");
  const bookBtn = $("eaBookSubmit");
  const bookLabel = bookBtn.innerHTML;
  const dateInput = $("bkDate");

  $("eaBookOpen").addEventListener("click", () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    dateInput.min = t.toISOString().slice(0, 10);
    $("eaBookBody").hidden = false;
    $("eaBookDone").hidden = true;
    bookErr.hidden = true;
    dlg.showModal();
    $("bkName").focus();
  });
  const closeDlg = () => dlg.close();
  $("eaBookClose").addEventListener("click", closeDlg);
  $("eaBookDoneClose").addEventListener("click", closeDlg);
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) closeDlg(); // click on the dark backdrop
  });

  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const req = ["bkName", "bkPhone", "bkAddress", "bkDate"].map($);
    let firstBad = null;
    req.forEach((el) => {
      const bad = !el.value.trim();
      el.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad && !firstBad) firstBad = el;
    });
    const email = $("bkEmail");
    if (email.value.trim() && !email.checkValidity()) {
      email.setAttribute("aria-invalid", "true");
      firstBad = firstBad || email;
    } else email.setAttribute("aria-invalid", "false");
    if (firstBad) {
      bookErr.textContent = "Please fill in your name, phone number, address and a visit date.";
      if (email.getAttribute("aria-invalid") === "true" && firstBad === email)
        bookErr.textContent = "Please check your email address.";
      bookErr.hidden = false;
      firstBad.focus();
      return;
    }
    bookErr.hidden = true;
    bookBtn.disabled = true;
    bookBtn.textContent = "Sending…";

    const r = report;
    const fd = new FormData();
    fd.append("_subject", "Site visit request from the energy assessment tool");
    fd.append("_gotcha", $("eaGotcha").value);
    fd.append("Full name", $("bkName").value.trim());
    fd.append("Phone", $("bkPhone").value.trim());
    if (email.value.trim()) fd.append("email", email.value.trim());
    fd.append("Address", $("bkAddress").value.trim());
    fd.append("Preferred date", dateInput.value);
    fd.append("Notes", $("bkNotes").value.trim() || "None");
    if (r) {
      fd.append("Report ID", r.id);
      fd.append("Building", r.name);
      fd.append("Type of building", r.sector || "Not given");
      fd.append("State", r.state || "Not given");
      fd.append("Grid hours per day", r.gridHours || "Not given");
      fd.append("Grid tariff (₦/kWh)", r.tariff || "Not given");
      fd.append("Monthly grid bill", naira(r.gridBill));
      fd.append("Generator hours per day", r.genHours || "Not given");
      fd.append("Generator size (kVA)", r.genSize || "Not given");
      fd.append("Monthly fuel spend", naira(r.fuel));
      fd.append(
        "Appliances",
        r.apps.map((a) => `${a.qty} × ${a.name}, ${a.power}${a.unit}, ${a.hrs} h/day = ${a.kwh.toFixed(1)} kWh/day`).join("\n"),
      );
      fd.append("Daily load", r.dailyKwh.toFixed(1) + " kWh");
      fd.append("Recommended system", `${r.pv.toFixed(1)} kWp panels, ${r.bat.toFixed(1)} kWh battery, ${r.inv} kVA inverter`);
      fd.append("Internal cost estimate (not shown to visitor)", naira(r.cost) + ` at ${naira(COST_PER_KWP)}/kWp`);
      fd.append("Payback shown to visitor", paybackText(r.paybackYears));
    }

    try {
      const res = await fetch(bookForm.action, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Send failed: " + res.status);
      bookForm.reset();
      $("eaBookBody").hidden = true;
      $("eaBookDone").hidden = false;
      $("eaBookDoneClose").focus();
    } catch (err) {
      bookErr.innerHTML =
        'Sorry, your request didn&rsquo;t send. Please try again, or WhatsApp us on <a href="https://wa.me/2348146534567" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">0814 653 4567</a>.';
      bookErr.hidden = false;
    } finally {
      bookBtn.disabled = false;
      bookBtn.innerHTML = bookLabel;
    }
  });
})();
