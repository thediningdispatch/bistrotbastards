(function () {
  const tPageStart = performance.now();
  // DOM elements – waiter step
  const stepServer = document.getElementById("btStepServer");
  const stepClient = document.getElementById("btStepClient");
  const form = document.getElementById("btServerForm");
  const billInput = document.getElementById("btBill");
  const cryptoSelect = document.getElementById("btCrypto");
  const walletInput = document.getElementById("btWallet");
  const errorLabel = document.getElementById("btServerError");
  const serverSummary = document.getElementById("btServerSummary");

  // DOM elements – client step
  const clientBillValue = document.getElementById("btClientBill");
  const summaryBill = document.getElementById("btSummaryBill");
  const summaryCrypto = document.getElementById("btSummaryCrypto");
  const summaryWallet = document.getElementById("btSummaryWallet");
  const tips = Array.prototype.slice.call(document.querySelectorAll(".bt-tip[data-tip]"));
  const customTile = document.querySelector(".bt-tip-custom");
  const customAmountField = document.getElementById("btCustomAmount");
  const qrWrapper = document.getElementById("btQRWrapper");
  const qrCodeEl = document.getElementById("btQRCode");
  const tipAmountDisplay = document.getElementById("btTipAmount");
  const tipCryptoDisplay = document.getElementById("btTipCrypto");
  const editButton = document.getElementById("btEdit");
  const rateStatus = document.getElementById("btRateStatus");
  const primaryUriEl = document.getElementById("btPrimaryUri");
  const fallbackUriEl = document.getElementById("btFallbackUri");
  const primaryLabel = document.getElementById("btPrimaryLabel");
  const fallbackLabel = document.getElementById("btFallbackLabel");

  // State
  const state = {
    bill: 0,
    crypto: "",
    wallet: "",
    tipPercent: null,
    tipAmount: null,
    rateEUR: null,
    rateUpdatedAt: null,
    rateLoading: false,
    lastUri: "",
    lastFallbackUri: ""
  };

  // User profile helpers -----------------------------------------------------
  function getUserProfile() {
    if (window.appState && window.appState.user) {
      return window.appState.user;
    }
    try {
      const raw = localStorage.getItem("bb_user");
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.warn("Lecture du profil impossible:", error);
      return {};
    }
  }

  function cloneProfile() {
    const profile = getUserProfile() || {};
    const copy = Object.assign({}, profile);
    if (profile.wallets) {
      copy.wallets = Object.assign({}, profile.wallets);
    }
    return copy;
  }

  function saveProfile(profile) {
    if (window.appState && typeof window.appState.setUser === "function") {
      window.appState.setUser(profile);
      return;
    }
    try {
      localStorage.setItem("bb_user", JSON.stringify(profile));
      if (profile.restaurant) {
        localStorage.setItem("restaurant", profile.restaurant);
      }
      if (profile.username) {
        localStorage.setItem("username", profile.username);
      }
      if (profile.avatar) {
        localStorage.setItem("avatarURL", profile.avatar);
      } else {
        localStorage.removeItem("avatarURL");
      }
    } catch (error) {
      console.warn("Sauvegarde du profil impossible:", error);
    }
  }

  function persistWalletAddress(chain, address) {
    if (!chain || !address) return;
    const profile = cloneProfile();
    if (!profile.wallets) profile.wallets = {};
    if (profile.wallets[chain] === address) return;
    profile.wallets[chain] = address;
    saveProfile(profile);
  }

  function getStoredWalletAddress(chain) {
    const profile = getUserProfile();
    const wallets = profile && profile.wallets ? profile.wallets : {};
    return wallets && typeof wallets[chain] === "string" ? wallets[chain] : "";
  }

  // Formatting helpers -------------------------------------------------------
  function formatAmount(value) {
    return value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatCrypto(amount, decimals) {
    if (!isFinite(amount)) return "0";
    let str = amount.toFixed(decimals);
    if (str.indexOf(".") !== -1) {
      str = str.replace(/\.?0+$/, "");
    }
    return str;
  }

  function toWeiString(amount) {
    const fixed = amount.toFixed(18);
    const parts = fixed.split(".");
    const integer = parts[0].replace(/^0+(?=\d)/, "");
    const fraction = (parts[1] || "").padEnd(18, "0");
    let combined = (integer || "0") + fraction;
    combined = combined.replace(/^0+(?=\d)/, "") || "0";
    return combined;
  }

  // Rate status --------------------------------------------------------------
  function setRateStatus(message, isError) {
    rateStatus.textContent = message;
    if (isError) {
      rateStatus.classList.add("bt-error");
    } else {
      rateStatus.classList.remove("bt-error");
    }
  }

  function fetchRate(crypto) {
    if (state.rateLoading) {
      return state.rateLoading;
    }
    state.rateLoading = true;
    setRateStatus("Récupération du taux Coinbase…", false);
    state.rateEUR = null;
    state.rateUpdatedAt = null;
    state.rateLoading = fetch("https://api.coinbase.com/v2/exchange-rates?currency=" + encodeURIComponent(crypto))
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        const eur = payload && payload.data && payload.data.rates && payload.data.rates.EUR;
        const value = parseFloat(eur);
        if (!isFinite(value) || value <= 0) {
          throw new Error("Taux invalide");
        }
        state.rateEUR = value;
        state.rateUpdatedAt = new Date();
        const formatted = value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setRateStatus("Taux Coinbase : 1 " + crypto + " = " + formatted + " €", false);
      })
      .catch(function (error) {
        console.error("Coinbase rate error:", error);
        state.rateEUR = null;
        state.rateUpdatedAt = null;
        setRateStatus("Impossible de récupérer le taux. Vérifie la connexion et réessaie.", true);
      })
      .finally(function () {
        state.rateLoading = false;
      });
    return state.rateLoading;
  }

  // Helpers ------------------------------------------------------------------
  function clearTipSummary() {
    qrWrapper.classList.add("bt-hidden");
    tipAmountDisplay.textContent = "—";
    tipCryptoDisplay.textContent = "—";
    qrCodeEl.innerHTML = "";
    primaryLabel.textContent = "URI portefeuille :";
    primaryUriEl.textContent = "—";
    fallbackLabel.classList.add("bt-hidden");
    fallbackUriEl.classList.add("bt-hidden");
    fallbackUriEl.textContent = "—";
    state.lastUri = "";
    state.lastFallbackUri = "";
  }

  function resetTips() {
    tips.forEach(function (btn) { btn.classList.remove("bt-active"); });
    if (customTile) { customTile.classList.remove("bt-active"); }
    if (customAmountField) { customAmountField.value = ""; }
    clearTipSummary();
    state.tipPercent = null;
    state.tipAmount = null;
  }

  function ensureTipReady() {
    if (!state.bill) {
      return false;
    }
    if (!state.rateEUR) {
      if (!state.rateLoading) {
        fetchRate(state.crypto);
      }
      setRateStatus("Taux absent : patiente un instant puis réessaie.", true);
      return false;
    }
    return true;
  }

  function updateTipSummary(tipAmount) {
    if (!tipAmount || tipAmount <= 0) {
      clearTipSummary();
      return;
    }

    const eurosFormatted = formatAmount(tipAmount);
    tipAmountDisplay.textContent = eurosFormatted;

    const cryptoAmount = tipAmount / state.rateEUR;
    let uriInfo;

    if (state.crypto === "BTC") {
      const btcAmountStr = formatCrypto(cryptoAmount, 8);
      uriInfo = {
        primary: "bitcoin:" + state.wallet + "?amount=" + btcAmountStr,
        fallback: null,
        cryptoDisplay: btcAmountStr + " BTC"
      };
      primaryLabel.textContent = "URI portefeuille (BIP21) :";
      fallbackLabel.classList.add("bt-hidden");
      fallbackUriEl.classList.add("bt-hidden");
      fallbackUriEl.textContent = "—";
    } else {
      const ethAmountStr = formatCrypto(cryptoAmount, 18);
      const weiBig = BigInt(toWeiString(cryptoAmount));
      const primaryUri = "ethereum:pay-" + state.wallet + "@1?value=" + weiBig.toString();
      const fallbackUri = "ethereum:" + state.wallet + "?amount=" + ethAmountStr;
      uriInfo = {
        primary: primaryUri,
        fallback: fallbackUri,
        cryptoDisplay: ethAmountStr + " ETH"
      };
      primaryLabel.textContent = "URI portefeuille (EIP-681) :";
      fallbackLabel.textContent = "URI fallback (compatibilité) :";
      fallbackLabel.classList.remove("bt-hidden");
      fallbackUriEl.classList.remove("bt-hidden");
      fallbackUriEl.textContent = fallbackUri;
    }

    tipCryptoDisplay.textContent = uriInfo.cryptoDisplay;
    primaryUriEl.textContent = uriInfo.primary;
    state.lastUri = uriInfo.primary;
    state.lastFallbackUri = uriInfo.fallback || "";

    qrWrapper.classList.remove("bt-hidden");
    qrCodeEl.innerHTML = "";
    new QRCode(qrCodeEl, {
      text: uriInfo.primary,
      width: 200,
      height: 200,
      colorDark: "#0b172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function ensureWallet(type, value) {
    if (type === "ETH") {
      return value.startsWith("0x") && value.length >= 6;
    }
    if (type === "BTC") {
      return value.length > 26;
    }
    return false;
  }

  // Form submit --------------------------------------------------------------
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const billValue = parseFloat(billInput.value);
    const cryptoValue = cryptoSelect.value;
    const walletValue = walletInput.value.trim();
    errorLabel.textContent = "";

    if (!billValue || billValue <= 0) {
      errorLabel.textContent = "Indique un montant valide.";
      return;
    }
    if (!cryptoValue) {
      errorLabel.textContent = "Sélectionne une crypto.";
      return;
    }
    if (!walletValue) {
      errorLabel.textContent = "Ajoute une adresse de portefeuille.";
      return;
    }
    if (!ensureWallet(cryptoValue, walletValue)) {
      errorLabel.textContent = cryptoValue === "ETH"
        ? "Adresse ETH invalide (doit commencer par 0x)."
        : "Adresse BTC invalide (trop courte).";
      return;
    }

    state.bill = billValue;
    state.crypto = cryptoValue;
    state.wallet = walletValue;
    state.tipPercent = null;
    state.tipAmount = null;

    persistWalletAddress(state.crypto, state.wallet);

    summaryBill.textContent = formatAmount(billValue);
    summaryCrypto.textContent = cryptoValue;
    summaryWallet.textContent = walletValue;
    clientBillValue.textContent = formatAmount(billValue);

    serverSummary.classList.remove("bt-hidden");
    form.classList.add("bt-hidden");

    stepServer.classList.add("bt-hidden");
    stepClient.classList.remove("bt-hidden");

    fetchRate(cryptoValue);
    resetTips();
  });

  // Percentage tip cards -----------------------------------------------------
  function activatePercentage(percent) {
    tips.forEach(function (btn) {
      const matches = parseFloat(btn.dataset.tip);
      btn.classList.toggle("bt-active", matches === percent);
    });
    if (customTile) { customTile.classList.remove("bt-active"); }
    if (customAmountField) { customAmountField.value = ""; }
  }

  function applyPercentageTip(percent) {
    if (!ensureTipReady()) { return; }
    state.tipPercent = percent;
    state.tipAmount = state.bill * percent / 100;
    activatePercentage(percent);
    updateTipSummary(state.tipAmount);
  }

  tips.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const percent = parseFloat(btn.dataset.tip);
      applyPercentageTip(percent);
    });
  });

  // Custom amount ------------------------------------------------------------
  function focusCustomTile() {
    tips.forEach(function (btn) { btn.classList.remove("bt-active"); });
    if (customTile) { customTile.classList.add("bt-active"); }
  }

  function applyCustomAmount(value) {
    if (!value || value <= 0) {
      state.tipAmount = null;
      updateTipSummary(0);
      return;
    }
    if (!ensureTipReady()) { return; }
    state.tipPercent = null;
    state.tipAmount = value;
    updateTipSummary(value);
  }

  if (customTile) {
    customTile.addEventListener("click", function () {
      focusCustomTile();
      if (customAmountField) {
        customAmountField.focus();
        const existing = parseFloat(customAmountField.value);
        applyCustomAmount(existing);
      }
    });
  }

  if (customAmountField) {
    customAmountField.addEventListener("focus", function () {
      focusCustomTile();
    });

    customAmountField.addEventListener("input", function () {
      focusCustomTile();
      const customValue = parseFloat(customAmountField.value);
      applyCustomAmount(customValue);
    });
  }

  // Edit button --------------------------------------------------------------
  editButton.addEventListener("click", function () {
    form.classList.remove("bt-hidden");
    serverSummary.classList.add("bt-hidden");
    stepServer.classList.remove("bt-hidden");
    stepClient.classList.add("bt-hidden");
    resetTips();
    setRateStatus("Taux Coinbase chargé après validation.", false);
  });

  // Stored wallet ------------------------------------------------------------
  function applyStoredWallet(chain) {
    const stored = getStoredWalletAddress(chain);
    if (!stored) return;
    walletInput.value = stored;
  }

  applyStoredWallet(cryptoSelect.value);
  cryptoSelect.addEventListener("change", function () {
    applyStoredWallet(cryptoSelect.value);
  });

  console.log('[Perf] waiter-crypto-tips init in', (performance.now() - tPageStart).toFixed(1), 'ms');
})();
