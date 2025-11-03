(() => {
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const dayButtons = Array.from(document.querySelectorAll(".pw-day[data-day]"));
  const tipsContainer = document.getElementById("pwTipsContainer");
  const saveBtn = document.getElementById("pwSave");
  const resetBtn = document.getElementById("pwReset");
  const statusEl = document.getElementById("pwStatus");

  let activeDays = loadActiveDays();
  let tipsWeek = loadTipsWeek();

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function loadActiveDays() {
    const stored = safeParse(localStorage.getItem("bb_active_days"), []);
    return Array.isArray(stored) ? stored.filter(day => DAYS.includes(day)) : [];
  }

  function loadTipsWeek() {
    const stored = safeParse(localStorage.getItem("bb_tips_week"), {});
    return stored && typeof stored === "object" ? stored : {};
  }

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.remove("pw-status-success", "pw-status-error");
    if (type === "success") statusEl.classList.add("pw-status-success");
    if (type === "error") statusEl.classList.add("pw-status-error");
  }

  function sortActiveDays(days) {
    return DAYS.filter(day => days.includes(day));
  }

  function toggleDay(day) {
    if (activeDays.includes(day)) {
      activeDays = activeDays.filter(d => d !== day);
      delete tipsWeek[day];
    } else {
      activeDays.push(day);
      activeDays = sortActiveDays(activeDays);
    }
    syncDayButtons();
    renderTipInputs();
  }

  function syncDayButtons() {
    dayButtons.forEach(btn => {
      const day = btn.dataset.day;
      const isActive = activeDays.includes(day);
      btn.classList.toggle("pw-day-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function createTipField(day) {
    const wrapper = document.createElement("label");
    wrapper.className = "pw-field";
    wrapper.htmlFor = `pwTip-${day}`;
    wrapper.textContent = `Pourboires ${day} (€)`;

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.min = "0";
    input.id = `pwTip-${day}`;
    input.name = `tip-${day}`;
    input.placeholder = "0,00";
    input.dataset.day = day;
    const stored = Number(tipsWeek[day]);
    input.value = Number.isFinite(stored) && stored >= 0 ? stored : "";

    wrapper.appendChild(input);
    return wrapper;
  }

  function renderTipInputs() {
    if (!tipsContainer) return;
    tipsContainer.innerHTML = "";
    if (!activeDays.length) {
      const empty = document.createElement("p");
      empty.className = "pw-empty";
      empty.textContent = "Sélectionne d’abord tes jours travaillés.";
      tipsContainer.appendChild(empty);
      return;
    }
    activeDays.forEach(day => tipsContainer.appendChild(createTipField(day)));
  }

  function collectTipValues() {
    const collected = {};
    activeDays.forEach(day => {
      const input = tipsContainer.querySelector(`input[data-day="${day}"]`);
      if (!input) return;
      const raw = input.value ? input.value.toString().trim() : "";
      if (raw === "") {
        return;
      }
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Montant invalide pour ${day}`);
      }
      collected[day] = parseFloat(value.toFixed(2));
    });
    return collected;
  }

  function saveData() {
    if (!activeDays.length) {
      setStatus("Sélectionne au moins un jour avant d’enregistrer.", "error");
      return;
    }
    try {
      const tips = collectTipValues();
      localStorage.setItem("bb_active_days", JSON.stringify(activeDays));
      const hasTips = Object.keys(tips).length > 0;
      if (hasTips) {
        localStorage.setItem("bb_tips_week", JSON.stringify(tips));
      } else {
        localStorage.removeItem("bb_tips_week");
      }
      tipsWeek = tips;
      setStatus("Données enregistrées avec succès.", "success");
    } catch (error) {
      setStatus(error.message || "Erreur lors de l’enregistrement.", "error");
    }
  }

  function resetData() {
    localStorage.removeItem("bb_active_days");
    localStorage.removeItem("bb_tips_week");
    activeDays = [];
    tipsWeek = {};
    syncDayButtons();
    renderTipInputs();
    setStatus("Semaine réinitialisée.", "success");
  }

  dayButtons.forEach(btn => {
    btn.addEventListener("click", () => toggleDay(btn.dataset.day));
  });

  if (saveBtn) {
    saveBtn.addEventListener("click", saveData);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetData);
  }

  // Initial render
  activeDays = sortActiveDays(activeDays);
  syncDayButtons();
  renderTipInputs();
})();
