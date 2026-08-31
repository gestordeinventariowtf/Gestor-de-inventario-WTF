const STORAGE_KEY = "wtf_pos_local_android_state_v1";
const HUB_URL_KEY = "wtf_pos_local_hub_url";
const DEVICE_KEY = "wtf_pos_local_device_config";
const ITBIS_RATE = 0.18;
const LEY_RATE = 0.1;

installNativeKeyboardGuard();

const products = [
  { id: "pos_camarofongo", name: "Camarofongo", sku: "ICG-1001", price: 895 },
  { id: "pos_wtf_burger", name: "WTF Burger", sku: "ICG-1002", price: 550 },
  { id: "pos_limonada", name: "Limonada", sku: "ICG-1003", price: 130 },
  { id: "pos_mozzarella", name: "Mozzarella Sticks", sku: "ICG-1004", price: 375 },
  { id: "pos_chicharron", name: "Chicharron Hervido", sku: "ICG-1005", price: 425 },
  { id: "pos_sazon_verde", name: "Sazon Verde", sku: "ICG-1006", price: 120 }
];

const tables = [
  { tableId: "mesa_1", label: "Mesa 1" },
  { tableId: "mesa_2", label: "Mesa 2" },
  { tableId: "mesa_3", label: "Mesa 3" },
  { tableId: "mesa_4", label: "Mesa 4" },
  { tableId: "mesa_5", label: "Mesa 5" },
  { tableId: "mesa_6", label: "Mesa 6" }
];

const $ = (id) => document.getElementById(id);

let state = loadState();
let hubMonitor = { ok: false, lastOkAt: "", lastErrorAt: "" };
let wakeLock = null;
let activeDrawerView = "home";
let activeMainView = "pos";
let printerDraft = createPrinterDraft();
let printerSearchMode = "";
let taxDraft = createTaxDraft();
let taxApplyQuery = "";
let generalModal = "";
let categoryQuery = "";
let categorySearchOpen = false;
let productSearchOpen = false;
let productFilter = "all";
let selectedSavedTicketIds = [];
let savedTicketSort = "tiempo";
let barcodeScanner = { stream: null, active: false, facingMode: "environment", torch: false, lastCode: "", lastReadAt: 0, mode: "product", returnTo: "pos" };
let ticketSaveMode = "";
let splitDraft = null;
let shiftCloseDraft = null;
let shiftCurrencyModalOpen = false;
let customerQuery = "";
let customerDraft = createCustomerDraft();

hydrateStaticIcons();
$("hub-url").value = localStorage.getItem(HUB_URL_KEY) || "";
const deviceConfig = loadDeviceConfig("POS");
$("device-name").value = deviceConfig.name;
$("device-station").value = deviceConfig.station;
renderProducts("");
render();
setInterval(async () => {
  await heartbeatDevice();
  render();
}, 10000);

$("main-menu").addEventListener("click", () => {
  const backTarget = topbarBackTarget(activeMainView);
  if (backTarget) showMainModule(backTarget);
  else openDrawer("home");
});
$("topbar-history").addEventListener("click", () => {
  showMainModule("cierres");
});
$("topbar-save").addEventListener("click", () => {
  if (activeMainView === "editar-ticket") saveTicketNameEdits();
  if (activeMainView === "dividir-ticket") saveSplitDraft();
  if (activeMainView === "crear-cliente") saveCustomerDraft();
});
$("ticket-mode-chip").addEventListener("click", () => {
  showMainModule("ticket");
});
$("tickets-action").addEventListener("click", () => {
  if (state.currentTicket.cart.lines.length) {
    if (state.currentTicket.savedAt) {
      releaseSavedTicketAndStartNew("Ticket guardado. Caja lista para un nuevo ticket.");
      return;
    }
    state.currentTicket.savedName = defaultTicketName(state.currentTicket);
    showMainModule("guardar-ticket");
    return;
  }
  showMainModule("tickets-abiertos");
});
$("charge-action").addEventListener("click", () => {
  if (!state.currentTicket.cart.lines.length) return;
  const total = calculateCart(state.currentTicket.cart).totals.total;
  $("cash").value = String(total);
  $("pay").click();
});
$("catalog-filter").addEventListener("change", (event) => {
  productFilter = event.target.value;
  renderProducts($("search")?.value || "");
});
$("open-product-search").addEventListener("click", () => {
  productSearchOpen = true;
  renderProductSearchState();
  setTimeout(() => $("search")?.focus(), 40);
});
$("open-barcode-scanner").addEventListener("click", () => {
  openBarcodeScanner("product", "pos");
});
$("close-product-search").addEventListener("click", () => {
  productSearchOpen = false;
  $("search").value = "";
  renderProductSearchState();
  renderProducts("");
});
$("drawer-close").addEventListener("click", closeDrawer);
$("drawer-backdrop").addEventListener("click", closeDrawer);
document.querySelectorAll("[data-drawer-view]").forEach((button) => {
  button.addEventListener("click", () => showMainModule(button.dataset.drawerView || "ventas"));
});
$("add-client").addEventListener("click", () => {
  showMainModule("anadir-cliente-ticket");
});
$("more-options").addEventListener("click", (event) => {
  event.stopPropagation();
  updateTopActionStates();
  const menu = $("more-menu");
  const willOpen = menu.hidden;
  menu.hidden = !willOpen;
  $("more-options").setAttribute("aria-expanded", String(willOpen));
});
document.addEventListener("click", (event) => {
  if (!$("more-menu").hidden && !event.target.closest(".topbar-more-wrap")) {
    $("more-menu").hidden = true;
    $("more-options").setAttribute("aria-expanded", "false");
  }
});
document.querySelectorAll("[data-top-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.disabled || button.classList.contains("is-disabled")) return;
    $("more-menu").hidden = true;
    $("more-options").setAttribute("aria-expanded", "false");
    await handleTopAction(button.dataset.topAction || "");
  });
});
$("search").addEventListener("input", (event) => renderProducts(event.target.value));
$("hub-url").addEventListener("change", (event) => {
  localStorage.setItem(HUB_URL_KEY, event.target.value.trim());
  render();
});
$("test-hub").addEventListener("click", async () => {
  const ok = await testHub();
  showToast(ok ? "Hub local conectado." : "No se pudo conectar al hub local.");
  render();
});
$("apply-pairing").addEventListener("click", async () => {
  const ok = await applyPairingText($("pairing-data").value);
  showToast(ok ? "Equipo emparejado con el hub." : "No pude leer ese dato de emparejamiento.");
  render();
});
$("scan-pairing").addEventListener("click", () => {
  scanPairingQr().catch(() => showToast("No pude abrir la camara para leer el QR."));
});
$("save-device").addEventListener("click", async () => {
  const config = loadDeviceConfig("POS");
  config.name = $("device-name").value.trim() || "POS";
  config.station = $("device-station").value.trim() || "Caja";
  saveDeviceConfig(config);
  const ok = await registerDevice(config);
  showToast(ok ? "Dispositivo POS registrado." : "Guardado local; hub no disponible.");
  render();
});
$("kiosk-mode").addEventListener("click", async () => {
  const ok = await enableKioskMode();
  showToast(ok ? "Modo kiosco activado." : "No pude activar el modo kiosco en este equipo.");
});
$("dining-option").addEventListener("change", (event) => {
  state.currentTicket.diningOption = event.target.value;
  if (event.target.value !== "dineIn") {
    state.currentTicket.tableId = "";
    state.currentTicket.tableLabel = event.target.value === "takeOut" ? "Para llevar" : "Delivery";
  }
  touchTicket(state.currentTicket);
  audit("dining_option_changed", { diningOption: event.target.value });
  saveAndRender();
});

$("send-kds").addEventListener("click", async () => {
  if (!state.currentTicket.cart.lines.length) {
    showToast("Agrega productos antes de enviar a cocina.");
    return;
  }
  const command = {
    commandId: id("kds"),
    ticketId: state.currentTicket.ticketId,
    tableLabel: state.currentTicket.tableLabel || "Orden",
    lines: state.currentTicket.cart.lines.map((line) => ({ name: line.name, qty: line.qty, notes: line.notes || "" })),
    status: "received",
    ackStatus: "local",
    createdAt: now(),
    updatedAt: now()
  };
  const hubOk = await postHub("/api/kds/commands", command);
  command.ackStatus = hubOk ? "acked" : "retry";
  state.kds.push(command);
  audit("kds_sent", { ticketId: state.currentTicket.ticketId });
  saveAndRender(hubOk ? "Comanda enviada al KDS por hub local." : "Comanda guardada local; hub no disponible.");
});

$("pay").addEventListener("click", async () => {
  const total = calculateCart(state.currentTicket.cart).totals.total;
  const cashReceived = Number($("cash").value || 0);
  if (!state.currentTicket.cart.lines.length) {
    showToast("No hay productos para cobrar.");
    return;
  }
  if (cashReceived < total) {
    showToast("El efectivo recibido es menor que el total.");
    return;
  }
  const sale = {
    saleId: id("sale"),
    ticketId: state.currentTicket.ticketId,
    createdAt: now(),
    status: "paid",
    lines: state.currentTicket.cart.lines,
    totals: calculateCart(state.currentTicket.cart).totals,
    payment: { method: "cash", received: round4(cashReceived), change: round4(cashReceived - total) }
  };
  state.sales.push(sale);
  state.currentTicket.status = "paid";
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("sale_paid", { saleId: sale.saleId, total: sale.totals.total });
  state.currentTicket = createTicket({ tableId: "mesa_1", tableLabel: "Mesa 1" });
  upsertTicket(state.currentTicket);
  await postHub("/api/cds/clear", {});
  saveAndRender(`Venta cerrada. Total: ${moneyWithCurrency(total)}`);
});

$("close-shift").addEventListener("click", () => {
  const countedCash = Number($("counted-cash").value || 0);
  const paidSales = state.sales.filter((sale) => sale.status === "paid");
  const cashExpected = round4(state.shift.openingCash + paidSales.reduce((sum, sale) => sum + sale.totals.total, 0));
  const closedAt = now();
  const report = {
    reportId: id("z"),
    createdAt: closedAt,
    openedAt: state.shift.openedAt || closedAt,
    closedAt,
    salesCount: paidSales.length,
    grossTotal: round4(paidSales.reduce((sum, sale) => sum + sale.totals.total, 0)),
    cashExpected,
    countedCash: round4(countedCash),
    difference: round4(countedCash - cashExpected)
  };
  state.shiftCloseReports.push(report);
  audit("shift_closed", report);
  saveAndRender(`Cierre Z creado. Diferencia: ${moneyWithCurrency(report.difference)}`);
});

$("split-last-line").addEventListener("click", splitLastTicketLine);

$("merge-split-ticket").addEventListener("click", mergeLatestOpenTicket);

$("reset-demo").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  saveAndRender("Datos locales reiniciados.");
});

function renderProducts(query) {
  const needle = normalize(query);
  renderProductFilters();
  renderProductSearchState();
  const visible = products.filter((product) => productMatchesFilter(product) && (!needle || normalize(`${product.name} ${product.sku}`).includes(needle)));
  $("products").classList.toggle("product-grid-list", (state.posSettings || createPosSettings()).articleLayout === "list");
  $("products").innerHTML = visible.map((product) => `
    <button class="product-card" data-product-id="${escapeHtml(product.id)}">
      <strong>${escapeHtml(product.name)}</strong>
      <span>${escapeHtml(product.sku)} · ${moneyWithCurrency(product.price)}</span>
    </button>
  `).join("");
  document.querySelectorAll("[data-product-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((row) => row.id === button.dataset.productId);
      addProduct(product);
      animateProductToTicket(button);
      saveAndRender(`${product.name} agregado.`);
    });
  });
}

function renderProductFilters() {
  const select = $("catalog-filter");
  if (!select) return;
  const categories = allCategories();
  const options = [
    { value: "all", label: "TODOS LOS ARTICULOS" },
    { value: "favorites", label: "FAVORITOS" },
    { value: "discounts", label: "DESCUENTOS" },
    ...categories.map((category) => ({ value: `cat:${category.categoryId}`, label: category.name }))
  ];
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}" ${productFilter === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function productMatchesFilter(product) {
  if (productFilter === "favorites") return Boolean(product.favorite);
  if (productFilter === "discounts") return Boolean(product.discounted);
  if (productFilter.startsWith("cat:")) {
    const categoryName = allCategories().find((category) => `cat:${category.categoryId}` === productFilter)?.name || "";
    return normalize(product.category || "").includes(normalize(categoryName));
  }
  return true;
}

function renderProductSearchState() {
  const filterRow = $("catalog-filter-row");
  const searchRow = $("product-search-row");
  if (!filterRow || !searchRow) return;
  filterRow.hidden = productSearchOpen;
  searchRow.hidden = !productSearchOpen;
  const scannerButton = $("open-barcode-scanner");
  if (scannerButton) {
    const showScanner = Boolean((state.posSettings || createPosSettings()).useBarcodeCamera) && !productSearchOpen;
    scannerButton.hidden = !showScanner;
    filterRow.classList.toggle("has-barcode", showScanner);
  }
}

function openDrawer(view = activeDrawerView) {
  activeDrawerView = view;
  $("drawer-backdrop").hidden = false;
  requestAnimationFrame(() => {
    $("drawer-backdrop").classList.add("is-open");
    $("main-drawer").classList.add("is-open");
    $("main-drawer").setAttribute("aria-hidden", "false");
  });
  renderDrawer();
}

function closeDrawer() {
  $("drawer-backdrop").classList.remove("is-open");
  $("main-drawer").classList.remove("is-open");
  $("main-drawer").setAttribute("aria-hidden", "true");
  setTimeout(() => {
    if (!$("main-drawer").classList.contains("is-open")) $("drawer-backdrop").hidden = true;
  }, 260);
}

function renderDrawer() {
  $("drawer-role").textContent = state.operator.role || "Operador";
  $("drawer-name").textContent = state.operator.name || "Operador";
  document.querySelectorAll("[data-drawer-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.drawerView === activeDrawerView);
  });
  $("drawer-content").innerHTML = renderDrawerHome();
  bindDrawerActions();
}

function bindDrawerActions() {
  document.querySelectorAll("[data-open-drawer-view]").forEach((button) => {
    button.addEventListener("click", () => openDrawer(button.dataset.openDrawerView || "home"));
  });
  document.querySelectorAll("[data-main-view]").forEach((button) => {
    button.addEventListener("click", () => showMainModule(button.dataset.mainView || "ventas"));
  });
  const newPrinterButton = $("new-printer");
  if (newPrinterButton) newPrinterButton.addEventListener("click", () => {
    printerDraft = createPrinterDraft();
    printerSearchMode = "";
    showMainModule("crear-impresora");
  });
  const newTaxButton = $("new-tax");
  if (newTaxButton) newTaxButton.addEventListener("click", () => {
    taxDraft = createTaxDraft();
    taxApplyQuery = "";
    showMainModule("crear-impuesto");
  });
  const categorySearchButton = $("category-search-button");
  if (categorySearchButton) categorySearchButton.addEventListener("click", () => {
    categorySearchOpen = !categorySearchOpen;
    renderMainModule();
  });
  const categorySearch = $("category-search");
  if (categorySearch) categorySearch.addEventListener("input", () => {
    categoryQuery = categorySearch.value;
    const list = $("category-list");
    if (list) list.innerHTML = renderCategoryRows();
  });
  const newCategoryButton = $("new-category");
  if (newCategoryButton) newCategoryButton.addEventListener("click", addCategory);
  bindSavedTicketActions();
  document.querySelectorAll("[data-shift-report-id]").forEach((button) => {
    button.addEventListener("click", () => showMainModule(`cierre:${button.dataset.shiftReportId}`));
  });
  const drawerMenuButton = $("drawer-page-menu");
  if (drawerMenuButton) drawerMenuButton.addEventListener("click", () => openDrawer("home"));
  const drawerBackButton = $("drawer-page-back");
  if (drawerBackButton) drawerBackButton.addEventListener("click", () => showMainModule(drawerBackButton.dataset.backTo || "pos"));
  const drawerHistoryButton = $("drawer-history-button");
  if (drawerHistoryButton) drawerHistoryButton.addEventListener("click", () => showMainModule("cierres"));
  const treasuryAmount = $("treasury-amount");
  if (treasuryAmount) {
    treasuryAmount.addEventListener("input", () => {
      treasuryAmount.value = treasuryAmount.value.replace(/[^\d.,]/g, "");
    });
    treasuryAmount.addEventListener("focus", () => {
      const amount = parseMoneyInput(treasuryAmount.value);
      treasuryAmount.value = amount > 0 ? String(amount) : "";
      treasuryAmount.select();
    });
    treasuryAmount.addEventListener("blur", () => {
      treasuryAmount.value = formatMoneyInput(treasuryAmount.value);
    });
  }
  const depositButton = $("treasury-deposit");
  const payoutButton = $("treasury-payout");
  if (depositButton) depositButton.addEventListener("click", () => addTreasuryMovement("deposito"));
  if (payoutButton) payoutButton.addEventListener("click", () => addTreasuryMovement("salida"));
  bindSplitTicketActions();
  bindPrinterActions();
  bindTaxActions();
  bindGeneralActions();
  bindCustomerActions();
  bindShiftSettingsActions();
  bindCloseShiftActions();
  bindUsersPermissionActions();
  bindBarcodeScannerActions();
  document.querySelectorAll("[data-delete-ticket-line]").forEach((button) => {
    button.addEventListener("click", () => deleteTicketLine(button.dataset.deleteTicketLine));
  });
  bindTicketSwipeRows();
}

function bindShiftSettingsActions() {
  const showTheoretical = $("setting-show-theoretical-cash");
  if (showTheoretical) showTheoretical.addEventListener("change", () => {
    state.shiftSettings = Object.assign(createShiftSettings(), state.shiftSettings || {}, { showTheoreticalCash: showTheoretical.checked });
    audit("shift_setting_changed", { showTheoreticalCash: showTheoretical.checked });
    saveAndRender("Configuracion de turno guardada.");
    showMainModule("config-turno");
  });
  const currencyButton = $("open-currency-modal");
  if (currencyButton) currencyButton.addEventListener("click", () => {
    shiftCurrencyModalOpen = true;
    renderMainModule();
  });
  const currencyCancel = $("currency-modal-cancel");
  if (currencyCancel) currencyCancel.addEventListener("click", () => {
    shiftCurrencyModalOpen = false;
    renderMainModule();
  });
  const currencyOk = $("currency-modal-ok");
  if (currencyOk) currencyOk.addEventListener("click", () => {
    const selected = document.querySelector("[data-currency-option]:checked")?.value || "DOP";
    state.shiftSettings = Object.assign(createShiftSettings(), state.shiftSettings || {}, { currency: selected });
    shiftCurrencyModalOpen = false;
    audit("shift_currency_changed", { currency: selected });
    saveAndRender("Moneda seleccionada.");
    showMainModule("billetes-monedas");
  });
  const newDenomination = $("new-denomination");
  if (newDenomination) newDenomination.addEventListener("click", addDenomination);
  document.querySelectorAll("[data-edit-denomination]").forEach((button) => {
    button.addEventListener("click", () => editDenomination(button.dataset.editDenomination || ""));
  });
  document.querySelectorAll("[data-delete-denomination]").forEach((button) => {
    button.addEventListener("click", () => deleteDenomination(button.dataset.deleteDenomination || ""));
  });
}

function bindCloseShiftActions() {
  const realCash = $("close-shift-real-cash");
  if (realCash) {
    realCash.addEventListener("input", () => {
      ensureShiftCloseDraft();
      shiftCloseDraft.realCash = parseMoneyInput(realCash.value);
    });
    realCash.addEventListener("focus", () => {
      realCash.value = String(parseMoneyInput(realCash.value) || defaultCloseRealCash());
      realCash.select();
      realCash.classList.remove("is-placeholder");
    });
    realCash.addEventListener("blur", () => {
      shiftCloseDraft.realCash = parseMoneyInput(realCash.value);
      renderMainModule();
    });
  }
  document.querySelectorAll("[data-close-denomination]").forEach((input) => {
    input.addEventListener("input", () => {
      ensureShiftCloseDraft();
      shiftCloseDraft.counts[input.dataset.closeDenomination || ""] = Math.max(0, Number(input.value || 0));
      shiftCloseDraft.realCash = shiftCloseCountedTotal();
      const realCash = $("close-shift-real-cash");
      if (realCash) realCash.value = formatMoneyInput(String(shiftCloseDraft.realCash));
      updateCloseShiftTotals();
    });
  });
  const confirm = $("confirm-close-shift");
  if (confirm) confirm.addEventListener("click", closeShiftFromDraft);
}

function bindUsersPermissionActions() {
  const clear = $("clear-pos-user-form");
  if (clear) clear.addEventListener("click", () => {
    ["pos-user-name", "pos-user-email", "pos-user-password"].forEach((idValue) => {
      const input = $(idValue);
      if (input) input.value = "";
    });
    document.querySelectorAll("[data-pos-permission]").forEach((input) => { input.checked = false; });
  });
  const save = $("save-pos-user");
  if (save) save.addEventListener("click", () => {
    const name = $("pos-user-name")?.value?.trim() || "";
    const email = $("pos-user-email")?.value?.trim() || "";
    const password = $("pos-user-password")?.value || "";
    const role = $("pos-user-role")?.value || "Cajero";
    if (!name || !email || !password) {
      showToast("Completa nombre, correo y contrasena.");
      return;
    }
    state.posUsers = state.posUsers || [];
    state.posUsers.push({
      userId: id("pos_user"),
      name,
      email,
      password,
      role,
      permissions: Array.from(document.querySelectorAll("[data-pos-permission]:checked")).map((input) => input.dataset.posPermission),
      createdAt: now()
    });
    audit("pos_user_created", { email, role });
    saveAndRender("Usuario POS guardado.");
    showMainModule("usuarios-permisos");
  });
}

function bindSavedTicketActions() {
  const saveHeld = $("save-held-ticket");
  if (saveHeld) saveHeld.addEventListener("click", saveCurrentTicketForLater);
  const nameInput = $("save-ticket-name");
  if (nameInput) nameInput.addEventListener("input", () => {
    state.currentTicket.savedName = nameInput.value;
  });
  const commentInput = $("save-ticket-comment");
  if (commentInput) commentInput.addEventListener("input", () => {
    state.currentTicket.comment = commentInput.value;
  });
  const selectAll = $("saved-ticket-select-all");
  if (selectAll) selectAll.addEventListener("change", () => {
    const ids = savedTickets().map((ticket) => ticket.ticketId);
    selectedSavedTicketIds = selectAll.checked ? ids : [];
    renderMainModule();
  });
  const sort = $("saved-ticket-sort");
  if (sort) sort.addEventListener("change", () => {
    savedTicketSort = sort.value;
    renderMainModule();
  });
  document.querySelectorAll("[data-saved-ticket-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const ticketId = checkbox.dataset.savedTicketSelect || "";
      selectedSavedTicketIds = checkbox.checked
        ? Array.from(new Set([...selectedSavedTicketIds, ticketId]))
        : selectedSavedTicketIds.filter((idValue) => idValue !== ticketId);
      renderMainModule();
    });
  });
  document.querySelectorAll("[data-open-saved-ticket]").forEach((button) => {
    button.addEventListener("click", () => openSavedTicket(button.dataset.openSavedTicket || ""));
  });
  const deleteSelected = $("delete-selected-tickets");
  if (deleteSelected) deleteSelected.addEventListener("click", deleteSelectedSavedTickets);
  const combineSelected = $("combine-selected-tickets");
  if (combineSelected) combineSelected.addEventListener("click", combineSelectedSavedTickets);
  const transferSelected = $("transfer-selected-tickets");
  if (transferSelected) transferSelected.addEventListener("click", transferSelectedSavedTickets);
}

function bindPrinterActions() {
  const model = $("printer-model");
  if (model) {
    model.addEventListener("change", () => {
      updatePrinterDraftFromForm();
      printerDraft.model = model.value;
      printerSearchMode = "";
      showMainModule("crear-impresora");
    });
  }
  ["printer-name", "printer-bluetooth-name", "printer-ip", "printer-usb-name"].forEach((idValue) => {
    const input = $(idValue);
    if (input) input.addEventListener("input", updatePrinterDraftFromForm);
  });
  [
    "printer-print-receipts",
    "printer-print-orders",
    "printer-auto-receipt",
    "printer-single-item",
    "printer-group-identical"
  ].forEach((idValue) => {
    const checkbox = $(idValue);
    if (!checkbox) return;
    checkbox.addEventListener("change", () => {
      updatePrinterDraftFromForm();
      showMainModule("crear-impresora");
    });
  });
  document.querySelectorAll("[data-printer-group-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const groupId = checkbox.dataset.printerGroupId || "";
      printerDraft.groupIds = checkbox.checked
        ? Array.from(new Set([...printerDraft.groupIds, groupId]))
        : printerDraft.groupIds.filter((idValue) => idValue !== groupId);
    });
  });
  const bluetoothSearch = $("search-bluetooth-printer");
  if (bluetoothSearch) bluetoothSearch.addEventListener("click", () => openPrinterSearch("bluetooth"));
  const usbSearch = $("search-usb-printer");
  if (usbSearch) usbSearch.addEventListener("click", () => openPrinterSearch("usb"));
  const ipOk = $("printer-ip-ok");
  if (ipOk) ipOk.addEventListener("click", () => {
    updatePrinterDraftFromForm();
    showToast(printerDraft.ipAddress ? "Direccion IP lista para vincular." : "Coloca la direccion IP de la impresora.");
  });
  document.querySelectorAll("[data-printer-device]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.printerDeviceMode;
      if (mode === "bluetooth") printerDraft.bluetoothName = button.dataset.printerDevice || "";
      if (mode === "usb") printerDraft.usbName = button.dataset.printerDevice || "";
      printerSearchMode = "";
      showMainModule("crear-impresora");
      showToast("Dispositivo seleccionado.");
    });
  });
  const searchOk = $("printer-search-ok");
  if (searchOk) searchOk.addEventListener("click", () => {
    printerSearchMode = "";
    showMainModule("crear-impresora");
  });
  const savePrinterButton = $("save-printer");
  if (savePrinterButton) savePrinterButton.addEventListener("click", savePrinterDraft);
  const testPrinterButton = $("printer-test");
  if (testPrinterButton) testPrinterButton.addEventListener("click", () => {
    updatePrinterDraftFromForm();
    showToast(printerDraft.name ? `Prueba preparada para ${printerDraft.name}.` : "Guarda o nombra la impresora para probar.");
  });
}

function bindTaxActions() {
  ["tax-name", "tax-rate", "tax-type"].forEach((idValue) => {
    const input = $(idValue);
    if (input) input.addEventListener("input", () => {
      updateTaxDraftFromForm();
      updateTaxApplyButtonState();
    });
  });
  const applyButton = $("apply-tax-products");
  if (applyButton) applyButton.addEventListener("click", () => {
    updateTaxDraftFromForm();
    if (!isTaxDraftComplete()) {
      showToast("Completa el impuesto antes de aplicarlo.");
      return;
    }
    showMainModule("aplicar-impuesto");
  });
  const saveTaxButton = $("save-tax");
  if (saveTaxButton) saveTaxButton.addEventListener("click", saveTaxDraft);
  const taxSearch = $("tax-product-search");
  if (taxSearch) {
    taxSearch.addEventListener("input", () => {
      taxApplyQuery = taxSearch.value;
      const list = document.querySelector(".tax-product-list");
      if (list) {
        list.innerHTML = renderTaxProductRows();
        bindTaxProductCheckboxes();
      }
    });
  }
  bindTaxProductCheckboxes();
  const taxMore = $("tax-more-options");
  const taxMenu = $("tax-action-menu");
  if (taxMore && taxMenu) {
    taxMore.addEventListener("click", (event) => {
      event.stopPropagation();
      taxMenu.hidden = !taxMenu.hidden;
    });
  }
  const selectAll = $("tax-select-all");
  if (selectAll) selectAll.addEventListener("click", () => {
    const visible = filteredTaxProducts().map((product) => product.id);
    taxDraft.productIds = Array.from(new Set([...taxDraft.productIds, ...visible]));
    const list = document.querySelector(".tax-product-list");
    if (list) {
      list.innerHTML = renderTaxProductRows();
      bindTaxProductCheckboxes();
    }
  });
  const clearSelection = $("tax-clear-selection");
  if (clearSelection) clearSelection.addEventListener("click", () => {
    const visible = new Set(filteredTaxProducts().map((product) => product.id));
    taxDraft.productIds = taxDraft.productIds.filter((idValue) => !visible.has(idValue));
    const list = document.querySelector(".tax-product-list");
    if (list) {
      list.innerHTML = renderTaxProductRows();
      bindTaxProductCheckboxes();
    }
  });
  const applyBack = $("tax-apply-close");
  if (applyBack) applyBack.addEventListener("click", () => showMainModule("crear-impuesto"));
  const applySave = $("save-tax-apply");
  if (applySave) applySave.addEventListener("click", () => {
    showToast(`${taxDraft.productIds.length} articulo${taxDraft.productIds.length === 1 ? "" : "s"} seleccionado${taxDraft.productIds.length === 1 ? "" : "s"}.`);
    showMainModule("crear-impuesto");
  });
}

function bindTaxProductCheckboxes() {
  document.querySelectorAll("[data-tax-product-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const productId = checkbox.dataset.taxProductId || "";
      taxDraft.productIds = checkbox.checked
        ? Array.from(new Set([...taxDraft.productIds, productId]))
        : taxDraft.productIds.filter((idValue) => idValue !== productId);
    });
  });
}

function bindGeneralActions() {
  const barcode = $("setting-barcode-camera");
  if (barcode) barcode.addEventListener("change", () => {
    state.posSettings = state.posSettings || createPosSettings();
    state.posSettings.useBarcodeCamera = barcode.checked;
    audit("pos_setting_changed", { key: "useBarcodeCamera", value: barcode.checked });
    saveAndRender("Configuracion guardada.");
    showMainModule("general");
  });
  const darkMode = $("open-dark-mode");
  if (darkMode) darkMode.addEventListener("click", () => {
    generalModal = "dark";
    showMainModule("general");
  });
  const layout = $("open-layout-mode");
  if (layout) layout.addEventListener("click", () => {
    generalModal = "layout";
    showMainModule("general");
  });
  document.querySelectorAll("[data-general-option]").forEach((radio) => {
    radio.addEventListener("change", () => {
      state.posSettings = state.posSettings || createPosSettings();
      state.posSettings[radio.name] = radio.value;
    });
  });
  const cancel = $("general-modal-cancel");
  if (cancel) cancel.addEventListener("click", () => {
    generalModal = "";
    showMainModule("general");
  });
  const ok = $("general-modal-ok");
  if (ok) ok.addEventListener("click", () => {
    generalModal = "";
    audit("pos_setting_changed", { settings: state.posSettings });
    saveAndRender("Configuracion guardada.");
    showMainModule("general");
  });
}

function iconSvg(name) {
  const icons = {
    ventas: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-1.6-2 1.1-2-1.1-2 1.1-2-1.1L5 21V5a2 2 0 0 1 2-2Z"></path>
        <path d="M8.5 8h7M8.5 12h4.5"></path>
        <path d="M15.5 15.5c0 1.1-.9 2-2.35 2H11v-4h2.15c1.45 0 2.35.9 2.35 2Z"></path>
      </svg>`,
    recibos: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 3h9l3 3v15l-3-1.4-2 1-2-1-2 1L6 21V3Z"></path>
        <path d="M15 3v4h4M8.5 10h7M8.5 13.5h7M8.5 17h4"></path>
      </svg>`,
    turno: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z"></path>
        <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M8 12h8"></path>
        <circle cx="17.5" cy="17.5" r="3.5"></circle>
        <path d="M17.5 15.7v1.9l1.3.8"></path>
      </svg>`,
    articulos: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"></path>
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9"></path>
        <path d="M8.2 5.1 16 9.6"></path>
      </svg>`,
    configuracion: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.7 1.7 0 0 0 .35 1.9l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.9-.35 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.07a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.9.35l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.05A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.35-1.9l-.05-.05a2 2 0 0 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.05a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.9-.35l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.05A1.7 1.7 0 0 0 19.4 15Z"></path>
      </svg>`,
    menu: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>`,
    back: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M15 18 9 12l6-6"></path>
      </svg>`,
    history: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7"></path>
        <path d="M4 4v4.7h4.7M12 8v4l2.7 1.6"></path>
      </svg>`,
    ticket: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-1.4-2 1-2-1-2 1-2-1L5 21V5a2 2 0 0 1 2-2Z"></path>
        <path d="M8.5 8h7M8.5 12h7M8.5 16h4"></path>
      </svg>`,
    "user-plus": `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="11" r="4"></circle>
        <path d="M5 21a7 7 0 0 1 14 0"></path>
        <circle cx="18" cy="5" r="4"></circle>
        <path d="M18 3v4M16 5h4"></path>
      </svg>`,
    "more-vertical": `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="5" r="1.5"></circle>
        <circle cx="12" cy="12" r="1.5"></circle>
        <circle cx="12" cy="19" r="1.5"></circle>
      </svg>`,
    search: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m16.5 16.5 3.5 3.5"></path>
      </svg>`,
    barcode: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"></path>
        <path d="M7 8v8M10 8v8M14 8v8M17 8v8"></path>
      </svg>`,
    "camera-flip": `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 7h3l1.5-2h3L16 7h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z"></path>
        <path d="M9 13a3 3 0 0 1 5.2-2M15 11h-1V9"></path>
        <path d="M15 13a3 3 0 0 1-5.2 2M9 15h1v2"></path>
      </svg>`,
    flash: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z"></path>
      </svg>`,
    trash: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"></path>
      </svg>`,
    printer: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"></path>
        <path d="M7 14h10v6H7zM17 12h.01"></path>
      </svg>`,
    edit: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17l-1 3Z"></path>
        <path d="m14 7 3 3"></path>
      </svg>`,
    assign: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="3.5"></circle>
        <path d="M3 20a5 5 0 0 1 10 0"></path>
        <path d="M16 7h5M19 4l3 3-3 3"></path>
      </svg>`,
    split: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 4h6v16H5zM13 4h6v16h-6zM8 8h0M16 8h0M8 12h0M16 12h0M8 16h0M16 16h0"></path>
      </svg>`,
    merge: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 4v4a4 4 0 0 0 4 4h6"></path>
        <path d="m14 9 3 3-3 3"></path>
        <path d="M7 20v-4a4 4 0 0 1 4-4"></path>
      </svg>`,
    sync: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"></path>
        <path d="M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16"></path>
        <path d="M20 20v-4h-4"></path>
      </svg>`,
    category: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"></path>
      </svg>`,
    modifier: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h10M4 17h16"></path>
        <circle cx="17" cy="7" r="3"></circle>
        <circle cx="8" cy="17" r="3"></circle>
      </svg>`,
    discount: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M19 5 5 19"></path>
        <circle cx="7.5" cy="7.5" r="2.5"></circle>
        <circle cx="16.5" cy="16.5" r="2.5"></circle>
      </svg>`,
    device: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="5" y="3" width="14" height="18" rx="2.5"></rect>
        <path d="M10 18h4"></path>
      </svg>`,
    tax: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-1.4-2 1-2-1-2 1-2-1L5 21V5a2 2 0 0 1 2-2Z"></path>
        <path d="M9 15 15 9M9.2 9.2h.01M14.8 14.8h.01"></path>
      </svg>`,
    cash: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="6" width="18" height="12" rx="2"></rect>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M6.5 9h.01M17.5 15h.01"></path>
      </svg>`,
    "cash-close": `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="6" width="18" height="12" rx="2"></rect>
        <path d="m9 12 2 2 4-5"></path>
      </svg>`,
    users: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="3"></circle>
        <circle cx="17" cy="9" r="2.5"></circle>
        <path d="M3 20a5 5 0 0 1 10 0M14 20a4 4 0 0 1 7 0"></path>
      </svg>`,
    coins: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <ellipse cx="12" cy="6" rx="7" ry="3"></ellipse>
        <path d="M5 6v8c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3"></path>
      </svg>`,
    bill: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="5" width="18" height="14" rx="2"></rect>
        <path d="M7 9h.01M17 15h.01"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>`,
    plus: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 5v14M5 12h14"></path>
      </svg>`,
    close: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 6l12 12M18 6 6 18"></path>
      </svg>`,
    sort: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M7 12h10M10 17h4"></path>
      </svg>`
  };
  return icons[name] || icons.configuracion;
}

function hydrateStaticIcons(root = document) {
  root.querySelectorAll("[data-vector-icon]").forEach((node) => {
    node.innerHTML = iconSvg(node.dataset.vectorIcon || "configuracion");
  });
}

function renderDrawerHome() {
  const selectedClass = (view) => {
    const normalized = view === "ventas" ? "pos" : view;
    const groups = {
      articulos: ["articulos", "catalogo-articulos", "categorias", "modificadores", "descuentos"],
      configuracion: ["configuracion", "equipo", "impresoras", "crear-impresora", "impuestos", "crear-impuesto", "aplicar-impuesto", "general", "config-turno", "billetes-monedas", "usuarios-permisos"],
      turno: ["turno", "tesoreria", "cerrar-turno", "cierres"],
      ventas: ["pos", "ticket", "guardar-ticket", "editar-ticket", "tickets-abiertos", "dividir-ticket", "barcode-scanner", "anadir-cliente-ticket", "crear-cliente", "customer-barcode-scanner"],
      recibos: ["recibos"]
    };
    const activeGroup = groups[view] || [normalized];
    return activeGroup.includes(activeMainView) ? " is-selected" : "";
  };
  return `
    <div class="drawer-home">
      <button class="drawer-home-card${selectedClass("ventas")}" type="button" data-main-view="ventas">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("ventas")}</span>
        <strong>Ventas</strong>
      </button>
      <button class="drawer-home-card${selectedClass("recibos")}" type="button" data-main-view="recibos">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("recibos")}</span>
        <strong>Recibos</strong>
      </button>
      <button class="drawer-home-card${selectedClass("turno")}" type="button" data-main-view="turno">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("turno")}</span>
        <strong>Turno</strong>
      </button>
      <button class="drawer-home-card${selectedClass("articulos")}" type="button" data-main-view="articulos">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("articulos")}</span>
        <strong>Articulos</strong>
      </button>
      <button class="drawer-home-card${selectedClass("configuracion")}" type="button" data-main-view="configuracion">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("configuracion")}</span>
        <strong>Configuracion</strong>
      </button>
    </div>
  `;
}

function showMainModule(view) {
  if (["barcode-scanner", "customer-barcode-scanner"].includes(activeMainView) && !["barcode-scanner", "customer-barcode-scanner"].includes(view)) stopBarcodeScanner();
  activeMainView = view === "ventas" ? "pos" : view || "pos";
  closeDrawer();
  const focusedId = document.activeElement?.id || "";
  if (activeMainView === "pos") {
    renderMainModule();
  } else if (!["treasury-amount", "treasury-description"].includes(focusedId)) {
    renderMainModule();
  }
  renderTopbarContext();
}

function renderMainModule() {
  const mainModule = $("main-module");
  const posShell = $("pos-shell");
  if (!mainModule || !posShell) return;
  if (activeMainView === "pos") {
    mainModule.hidden = true;
    mainModule.innerHTML = "";
    posShell.hidden = false;
    $("sale-action-bar").hidden = false;
    $("sale-action-bar").classList.remove("is-bottom");
    renderTopbarContext();
    return;
  }
  posShell.hidden = true;
  const actionBarBottom = ["ticket", "barcode-scanner"].includes(activeMainView);
  $("sale-action-bar").hidden = !actionBarBottom;
  $("sale-action-bar").classList.toggle("is-bottom", actionBarBottom);
  mainModule.hidden = false;
  if (activeMainView.startsWith("cierre:")) {
    mainModule.innerHTML = renderShiftCloseDetail(activeMainView.replace("cierre:", ""));
  } else if (activeMainView === "guardar-ticket") {
    mainModule.innerHTML = renderSaveTicketDrawer();
  } else if (activeMainView === "editar-ticket") {
    mainModule.innerHTML = renderEditTicketDrawer();
  } else if (activeMainView === "dividir-ticket") {
    mainModule.innerHTML = renderSplitTicketDrawer();
  } else if (activeMainView === "tickets-abiertos") {
    mainModule.innerHTML = renderOpenTicketsDrawer();
  } else if (activeMainView === "turno") {
    mainModule.innerHTML = renderTurnoDrawer();
  } else if (activeMainView === "tesoreria") {
    mainModule.innerHTML = renderTreasuryDrawer();
  } else if (activeMainView === "cerrar-turno") {
    mainModule.innerHTML = renderCloseShiftDrawer();
  } else if (activeMainView === "cierres") {
    mainModule.innerHTML = renderShiftCloseList();
  } else if (activeMainView === "ticket") {
    mainModule.innerHTML = renderTicketReview();
  } else if (activeMainView === "barcode-scanner") {
    mainModule.innerHTML = renderBarcodeScannerView();
  } else if (activeMainView === "customer-barcode-scanner") {
    mainModule.innerHTML = renderBarcodeScannerView("customer");
  } else if (activeMainView === "anadir-cliente-ticket") {
    mainModule.innerHTML = renderAddClientToTicketDrawer();
  } else if (activeMainView === "crear-cliente") {
    mainModule.innerHTML = renderCreateCustomerDrawer();
  } else if (activeMainView === "recibos") {
    mainModule.innerHTML = renderRecibosDrawer();
  } else if (activeMainView === "articulos") {
    mainModule.innerHTML = renderArticulosDrawer();
  } else if (activeMainView === "catalogo-articulos") {
    mainModule.innerHTML = renderCatalogItemsDrawer();
  } else if (activeMainView === "categorias") {
    mainModule.innerHTML = renderCategoriesDrawer();
  } else if (activeMainView === "modificadores") {
    mainModule.innerHTML = renderSimpleCatalogFunction("Modificadores", "Aqui se configuraran extras, terminos, acompanantes y cambios permitidos por articulo.");
  } else if (activeMainView === "descuentos") {
    mainModule.innerHTML = renderSimpleCatalogFunction("Descuentos", "Aqui se configuraran descuentos, promociones y reglas por rol.");
  } else if (activeMainView === "configuracion") {
    mainModule.innerHTML = renderConfiguracionDrawer();
  } else if (activeMainView === "equipo") {
    mainModule.innerHTML = renderEquipoConfigDrawer();
  } else if (activeMainView === "impresoras") {
    mainModule.innerHTML = renderPrintersDrawer();
  } else if (activeMainView === "crear-impresora") {
    mainModule.innerHTML = renderCreatePrinterDrawer();
  } else if (activeMainView === "impuestos") {
    mainModule.innerHTML = renderTaxesDrawer();
  } else if (activeMainView === "crear-impuesto") {
    mainModule.innerHTML = renderCreateTaxDrawer();
  } else if (activeMainView === "aplicar-impuesto") {
    mainModule.innerHTML = renderApplyTaxDrawer();
  } else if (activeMainView === "general") {
    mainModule.innerHTML = renderGeneralDrawer();
  } else if (activeMainView === "config-turno") {
    mainModule.innerHTML = renderShiftSettingsDrawer();
  } else if (activeMainView === "billetes-monedas") {
    mainModule.innerHTML = renderDenominationsDrawer();
  } else if (activeMainView === "usuarios-permisos") {
    mainModule.innerHTML = renderUsersPermissionsDrawer();
  } else {
    mainModule.innerHTML = renderVentasDrawer();
  }
  bindDrawerActions();
  renderTopbarContext();
}

function renderDrawerPageBar(title, { backTo = "", history = true } = {}) {
  const leftButton = backTo
    ? `<button id="drawer-page-back" class="drawer-page-action" type="button" data-back-to="${escapeHtml(backTo)}" aria-label="Volver"><span class="drawer-back-icon vector-icon">${iconSvg("back")}</span></button>`
    : `<button id="drawer-page-menu" class="drawer-page-action drawer-page-menu-icon" type="button" aria-label="Volver al menu"><span class="vector-icon">${iconSvg("menu")}</span></button>`;
  const rightButton = history
    ? `<button id="drawer-history-button" class="drawer-page-action drawer-history-action" type="button" aria-label="Historial de cierres"><span class="vector-icon">${iconSvg("history")}</span></button>`
    : `<span class="drawer-page-action-placeholder"></span>`;
  return `
    <div class="drawer-page-bar">
      ${leftButton}
      <strong>${escapeHtml(title)}</strong>
      ${rightButton}
    </div>
  `;
}

function renderTicketReview() {
  const cart = calculateCart(state.currentTicket.cart);
  const ticketOwner = state.currentTicket.assignedTo || state.operator.name || "Sin vendedor asignado";
  return `
    <div class="drawer-section ticket-review-screen">
      <div class="ticket-paper">
        <div class="ticket-review-head">
          <span class="kicker">Ticket actual</span>
          <h2>${escapeHtml(state.currentTicket.tableLabel || "Orden")}</h2>
          <small>${escapeHtml(state.currentTicket.clientName || "Cliente no asignado")} · ${escapeHtml(ticketOwner)}</small>
        </div>
        <div class="ticket-review-list">
          ${cart.lines.length ? cart.lines.map(renderTicketReviewLine).join("") : `<div class="ticket-empty">No hay articulos seleccionados.</div>`}
        </div>
        <div class="ticket-review-totals">
          <div class="ticket-review-total-row">
            <span>Sub Total</span>
            <strong>${moneyWithCurrency(cart.totals.subtotal)}</strong>
          </div>
          <div class="ticket-review-total-row">
            <span>LEY 10%</span>
            <strong>${moneyWithCurrency(cart.totals.ley)}</strong>
          </div>
          <div class="ticket-review-total-row">
            <span>ITBIS 18%</span>
            <strong>${moneyWithCurrency(cart.totals.itbis)}</strong>
          </div>
          <div class="ticket-review-total-row grand">
            <span>Total a pagar</span>
            <strong>${moneyWithCurrency(cart.totals.total)}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTicketReviewLine(line) {
  return `
    <div class="ticket-swipe-row" data-ticket-swipe-row>
      <button class="ticket-delete-action" type="button" data-delete-ticket-line="${escapeHtml(line.lineId)}">Eliminar</button>
      <div class="ticket-line-card" data-ticket-line-card>
        <span>${escapeHtml(line.name)} x ${round4(line.qty)}</span>
        <strong>${moneyWithCurrency(line.totals.total)}</strong>
      </div>
    </div>
  `;
}

function renderSaveTicketDrawer() {
  const name = state.currentTicket.savedName || defaultTicketName(state.currentTicket);
  const comment = state.currentTicket.comment || "";
  const title = ticketSaveMode === "split" ? "Guardar Ticket para Dividir" : "Guardar Ticket";
  return `
    <div class="drawer-section save-ticket-screen">
      <div class="printer-create-top">
        <div>
          <span class="kicker">Ticket</span>
          <h2>${title}</h2>
        </div>
        <button id="save-held-ticket" class="btn primary" type="button">Guardar</button>
      </div>
      <label class="line-input-field">
        <span>Nombre</span>
        <input id="save-ticket-name" value="${escapeHtml(name)}" placeholder="Ticket - hora">
      </label>
      <label class="field printer-field">
        <span>Comentario</span>
        <textarea id="save-ticket-comment" class="save-ticket-comment" placeholder="Comentario del ticket">${escapeHtml(comment)}</textarea>
      </label>
      <div class="ticket-review-totals">
        <div class="ticket-review-total-row grand">
          <span>Total del ticket</span>
          <strong>${moneyWithCurrency(calculateCart(state.currentTicket.cart).totals.total)}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderEditTicketDrawer() {
  const name = state.currentTicket.savedName || defaultTicketName(state.currentTicket);
  const comment = state.currentTicket.comment || "";
  return `
    <div class="drawer-section save-ticket-screen">
      <label class="line-input-field">
        <span>Nombre</span>
        <input id="edit-ticket-name" value="${escapeHtml(name)}" placeholder="Nombre del ticket" autofocus>
      </label>
      <label class="field printer-field">
        <span>Comentario</span>
        <textarea id="edit-ticket-comment" class="save-ticket-comment" placeholder="Comentario">${escapeHtml(comment)}</textarea>
      </label>
    </div>
  `;
}

function renderSplitTicketDrawer() {
  ensureSplitDraft();
  const selectedCount = splitSelectedLineIds().length;
  return `
    <div class="drawer-section split-ticket-screen">
      <div class="split-ticket-grid">
        ${splitDraft.tickets.map((ticket, index) => renderSplitTicketPane(ticket, index, selectedCount)).join("")}
      </div>
    </div>
  `;
}

function renderSplitTicketPane(ticket, index, selectedCount) {
  const cart = calculateCart(ticket.cart || { lines: [] });
  const hasSelectedInThisPane = (ticket.cart?.lines || []).some((line) => splitDraft.selectedLineIds.includes(line.lineId));
  const hasSelectedFromOtherPane = splitDraft.tickets.some((row, rowIndex) => (
    rowIndex !== index && (row.cart?.lines || []).some((line) => splitDraft.selectedLineIds.includes(line.lineId))
  ));
  const canMoveHere = Boolean(selectedCount && hasSelectedFromOtherPane && !hasSelectedInThisPane);
  return `
    <section class="split-ticket-pane${hasSelectedInThisPane ? " has-local-selection" : ""}" data-split-pane="${index}">
      <header>
        <strong>${escapeHtml(ticket.savedName || defaultTicketName(ticket))}</strong>
        <div class="split-pane-actions">
          ${index === 0 ? `<button class="split-add-pane" type="button" data-split-add-pane aria-label="Agregar ticket">${iconSvg("plus")}</button>` : ""}
          <button class="split-pane-menu" type="button" data-split-edit-pane="${index}" aria-label="Editar ticket">${iconSvg("more-vertical")}</button>
        </div>
      </header>
      <div class="split-ticket-lines">
        ${cart.lines.length ? cart.lines.map((line) => `
          <label class="split-ticket-line">
            <input type="checkbox" data-split-line="${escapeHtml(line.lineId)}" data-split-index="${index}" ${splitDraft.selectedLineIds.includes(line.lineId) ? "checked" : ""}>
            <span>${escapeHtml(line.name)} x ${line.qty}</span>
            <strong>${moneyWithCurrency(line.totals.total)}</strong>
          </label>
        `).join("") : `<div class="split-empty">Sin articulos</div>`}
      </div>
      <footer>
        <div class="split-total"><span>Total</span><strong>${moneyWithCurrency(cart.totals.total)}</strong></div>
        <button class="btn primary split-move-here${canMoveHere ? "" : " is-disabled"}" type="button" data-split-move-here="${index}" ${canMoveHere ? "" : "disabled"}>Mover aqui</button>
      </footer>
    </section>
  `;
}

function renderOpenTicketsDrawer() {
  const tickets = savedTickets();
  const selectedCount = selectedSavedTicketIds.length;
  return `
    <div class="drawer-section open-tickets-screen">
      <div class="open-ticket-actionbar ${selectedCount ? "has-selection" : ""}">
        <strong>${selectedCount ? `${selectedCount} seleccionado${selectedCount === 1 ? "" : "s"}` : "Tickets abiertos"}</strong>
        ${selectedCount ? `
          <button id="delete-selected-tickets" class="btn danger btn-sm" type="button">Borrar</button>
          <button id="combine-selected-tickets" class="btn secondary btn-sm" type="button">Combinar</button>
          <button id="transfer-selected-tickets" class="btn secondary btn-sm" type="button">Transferir ticket</button>
        ` : ""}
      </div>
      <div class="open-ticket-tools">
        <label class="mini-check">
          <input id="saved-ticket-select-all" type="checkbox" ${tickets.length && selectedCount === tickets.length ? "checked" : ""}>
        </label>
        <div class="open-ticket-spacer"></div>
        <label class="sort-select">
          <span class="vector-icon">${iconSvg("sort")}</span>
          <select id="saved-ticket-sort">
            <option value="nombre" ${savedTicketSort === "nombre" ? "selected" : ""}>nombre</option>
            <option value="cantidad" ${savedTicketSort === "cantidad" ? "selected" : ""}>cantidad</option>
            <option value="tiempo" ${savedTicketSort === "tiempo" ? "selected" : ""}>tiempo</option>
            <option value="empleado" ${savedTicketSort === "empleado" ? "selected" : ""}>empleado</option>
          </select>
        </label>
        <button class="icon-btn category-search-button" type="button" aria-label="Buscar tickets"><span class="vector-icon">${iconSvg("search")}</span></button>
      </div>
      <div class="saved-ticket-list">
        ${tickets.length ? tickets.map(renderSavedTicketRow).join("") : `<div class="ticket-empty">No hay tickets guardados.</div>`}
      </div>
    </div>
  `;
}

function renderSavedTicketRow(ticket) {
  const total = calculateCart(ticket.cart).totals.total;
  const age = ticketAgeLabel(ticket.savedAt || ticket.updatedAt || ticket.createdAt);
  const seller = ticket.assignedTo || state.operator.name || "Sin vendedor";
  return `
    <div class="saved-ticket-row">
      <input data-saved-ticket-select="${escapeHtml(ticket.ticketId)}" type="checkbox" ${selectedSavedTicketIds.includes(ticket.ticketId) ? "checked" : ""}>
      <button data-open-saved-ticket="${escapeHtml(ticket.ticketId)}" type="button">
        <span>${escapeHtml(ticket.savedName || defaultTicketName(ticket))}</span>
        <small>${escapeHtml(age)} · ${escapeHtml(seller)}</small>
      </button>
      <strong>${moneyWithCurrency(total)}</strong>
    </div>
  `;
}

function renderVentasDrawer() {
  const sales = state.sales.slice().reverse();
  const total = sales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0);
  const items = sales.reduce((sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + Number(line.qty || 0), 0), 0);
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Historial</span>
          <h2>Ventas</h2>
        </div>
        <span class="badge">${sales.length}</span>
      </div>
      <div class="drawer-stat-grid">
        <div class="drawer-stat"><span>Venta total</span><strong>${moneyWithCurrency(total)}</strong></div>
        <div class="drawer-stat"><span>Articulos</span><strong>${round4(items)}</strong></div>
      </div>
      <div class="drawer-sale-list">
        ${sales.length ? sales.map(renderSaleRow).join("") : `<div class="drawer-sale-row"><small>No hay ventas generadas todavia.</small></div>`}
      </div>
    </div>
  `;
}

function renderRecibosDrawer() {
  const sales = state.sales.slice().reverse();
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Documentos</span>
          <h2>Recibos</h2>
        </div>
        <span class="badge">${sales.length}</span>
      </div>
      <div class="drawer-sale-list">
        ${sales.length ? sales.map(renderReceiptRow).join("") : `<div class="drawer-sale-row"><small>No hay recibos generados todavia.</small></div>`}
      </div>
    </div>
  `;
}

function renderReceiptRow(sale) {
  const totalItems = sale.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  return `
    <article class="drawer-sale-row">
      <header>
        <span>Recibo ${escapeHtml(sale.saleId.slice(-8))}</span>
        <strong>${moneyWithCurrency(sale.totals?.total || 0)}</strong>
      </header>
      <small>${escapeHtml(formatDateTime(sale.createdAt))} · ${round4(totalItems)} articulos</small>
      <small>Metodo: ${escapeHtml(sale.payment?.method || "cash")} · Cambio: ${moneyWithCurrency(sale.payment?.change || 0)}</small>
    </article>
  `;
}

function renderArticulosDrawer() {
  const categories = Array.isArray(state.categories) ? state.categories.length : 0;
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Catalogo POS</span>
          <h2>Articulos</h2>
        </div>
        <span class="badge">${products.length}</span>
      </div>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="catalogo-articulos">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("articulos")}</span>
        <strong>Articulos</strong>
        <small>${products.length} productos del catalogo POS</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="categorias">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("category")}</span>
        <strong>Categorias</strong>
        <small>${categories} categoria${categories === 1 ? "" : "s"} configurada${categories === 1 ? "" : "s"}</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="modificadores">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("modifier")}</span>
        <strong>Modificadores</strong>
        <small>Extras, terminos y acompanantes</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="descuentos">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("discount")}</span>
        <strong>Descuentos</strong>
        <small>Promociones y reglas comerciales</small>
      </button>
    </div>
  `;
}

function renderCatalogItemsDrawer() {
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Catalogo POS</span>
          <h2>Articulos</h2>
        </div>
        <span class="badge">${products.length}</span>
      </div>
      <div class="drawer-sale-list">
        ${products.map((product) => `
          <article class="drawer-sale-row">
            <header>
              <span>${escapeHtml(product.name)}</span>
              <strong>${moneyWithCurrency(product.price)}</strong>
            </header>
            <small>${escapeHtml(product.sku)}</small>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCategoriesDrawer() {
  const categories = Array.isArray(state.categories) ? state.categories : [];
  return `
    <div class="drawer-section category-screen">
      <div class="drawer-section-head category-head">
        <div>
          <span class="kicker">Catalogo POS</span>
          <h2>Categorias</h2>
        </div>
        <button id="category-search-button" class="icon-btn category-search-button" type="button" aria-label="Buscar categorias" title="Buscar categorias"><span class="vector-icon">${iconSvg("search")}</span></button>
      </div>
      ${categorySearchOpen ? `
        <label class="tax-search-field">
          <span class="vector-icon">${iconSvg("search")}</span>
          <input id="category-search" value="${escapeHtml(categoryQuery)}" placeholder="Buscar categorias">
        </label>
      ` : ""}
      <div id="category-list" class="drawer-sale-list">
        ${renderCategoryRows(categories)}
      </div>
      <button id="new-category" class="printer-add-floating" type="button" aria-label="Agregar categoria"><span class="vector-icon">${iconSvg("plus")}</span></button>
    </div>
  `;
}

function renderCategoryRows(rows = filteredCategories()) {
  const categories = rows.length || categoryQuery ? rows : defaultCatalogCategories();
  return categories.map((category) => `
    <article class="drawer-sale-row">
      <header>
        <span>${escapeHtml(category.name)}</span>
        <strong>${category.system ? "Base" : "Activa"}</strong>
      </header>
      <small>${escapeHtml(category.description || "Categoria de articulos POS")}</small>
    </article>
  `).join("") || `<div class="printer-info-note">No se encontraron categorias.</div>`;
}

function renderSimpleCatalogFunction(title, description) {
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Catalogo POS</span>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <span class="badge">Proximo</span>
      </div>
      <div class="drawer-sale-row">
        <header>
          <span>${escapeHtml(title)}</span>
          <strong>Preparado</strong>
        </header>
        <small>${escapeHtml(description)}</small>
      </div>
    </div>
  `;
}

function renderConfiguracionDrawer() {
  const printers = Array.isArray(state.printers) ? state.printers.length : 0;
  const taxes = Array.isArray(state.taxes) ? state.taxes.length : 0;
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Ajustes POS</span>
          <h2>Configuracion</h2>
        </div>
        <span class="badge">${hubMonitor.ok ? "Online" : "Local"}</span>
      </div>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="equipo">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("device")}</span>
        <strong>Equipo</strong>
        <small>Dispositivo, estacion, hub local y version</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="impresoras">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("printer")}</span>
        <strong>Impresoras</strong>
        <small>${printers} configurada${printers === 1 ? "" : "s"} · Recibos, cocina y cuentas</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="impuestos">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("tax")}</span>
        <strong>Impuestos</strong>
        <small>${taxes} regla${taxes === 1 ? "" : "s"} · ITBIS, ley o tasas especiales</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="general">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("configuracion")}</span>
        <strong>General</strong>
        <small>Camara, modo oscuro y distribucion de articulos</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="config-turno">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("cash-close")}</span>
        <strong>Turno</strong>
        <small>Cierre, efectivo teorico, billetes y monedas</small>
      </button>
      <button class="drawer-home-card settings-action-card" type="button" data-main-view="usuarios-permisos">
        <span class="drawer-link-icon drawer-vector-icon">${iconSvg("users")}</span>
        <strong>Usuarios y permisos</strong>
        <small>Accesos POS protegidos por administrador</small>
      </button>
    </div>
  `;
}

function renderEquipoConfigDrawer() {
  const config = loadDeviceConfig("POS");
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Equipo</span>
          <h2>Configuracion</h2>
        </div>
        <span class="badge">${hubMonitor.ok ? "Online" : "Local"}</span>
      </div>
      <div class="drawer-stat-grid">
        <div class="drawer-stat"><span>Dispositivo</span><strong>${escapeHtml(config.name || "POS")}</strong></div>
        <div class="drawer-stat"><span>Estacion</span><strong>${escapeHtml(config.station || "Caja")}</strong></div>
        <div class="drawer-stat"><span>Hub</span><strong>${hubUrl() ? "Configurado" : "Sin hub"}</strong></div>
        <div class="drawer-stat"><span>Version</span><strong>${escapeHtml(config.appVersion || "0.1.0")}</strong></div>
      </div>
      <div class="drawer-sale-row">
        <header>
          <span>Conexion local</span>
          <strong>${hubMonitor.ok ? "Activa" : "Pendiente"}</strong>
        </header>
        <small>ID: ${escapeHtml(config.deviceId || "Sin registrar")}</small>
        <small>Ultimo latido: ${escapeHtml(formatConnectionTime(hubMonitor.lastOkAt))}</small>
      </div>
    </div>
  `;
}

function renderPrintersDrawer() {
  const printers = Array.isArray(state.printers) ? state.printers : [];
  return `
    <div class="drawer-section printer-screen">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Configuracion</span>
          <h2>Impresoras</h2>
        </div>
        <span class="badge">${printers.length}</span>
      </div>
      ${printers.length ? `
        <div class="drawer-sale-list">
          ${printers.map(renderPrinterRow).join("")}
        </div>
      ` : `
        <div class="printer-empty-state">
          <div class="printer-empty-icon vector-icon">${iconSvg("printer")}</div>
          <h3>Todavia no hay impresoras</h3>
          <p>Aqui puedes conectar tu impresora de recibos y de cocina. <a href="#help/hardware/printers">Aprende mas</a></p>
        </div>
      `}
      <button id="new-printer" class="printer-add-floating" type="button" aria-label="Agregar impresora"><span class="vector-icon">${iconSvg("plus")}</span></button>
    </div>
  `;
}

function renderPrinterRow(printer) {
  const capabilities = [];
  if (printer.printReceipts) capabilities.push("Recibos");
  if (printer.printOrders) capabilities.push("Pedidos");
  if (printer.autoReceipt) capabilities.push("Automatico");
  return `
    <article class="drawer-sale-row">
      <header>
        <span>${escapeHtml(printer.name || "Impresora")}</span>
        <strong>${escapeHtml(printer.connectionType || "Local")}</strong>
      </header>
      <small>${escapeHtml(printer.model || "Sin modelo")}</small>
      <small>${escapeHtml(capabilities.join(" · ") || "Sin funciones activas")}</small>
    </article>
  `;
}

function renderCreatePrinterDrawer() {
  const type = printerModelConnectionType(printerDraft.model);
  const showReceipts = Boolean(printerDraft.printReceipts);
  const showOrders = Boolean(printerDraft.printOrders);
  return `
    <div class="drawer-section printer-create-screen">
      <div class="printer-create-top">
        <div>
          <span class="kicker">Impresoras</span>
          <h2>Crear Impresora</h2>
        </div>
        <button id="save-printer" class="btn primary" type="button">Guardar</button>
      </div>
      <label class="field printer-field">
        <span>Nombre</span>
        <input id="printer-name" value="${escapeHtml(printerDraft.name)}" placeholder="Ej: Caja principal">
      </label>
      <label class="field printer-field">
        <span>Modelo de la impresora</span>
        <select id="printer-model">
          ${printerModelOptions().map((model) => `<option value="${escapeHtml(model)}" ${printerDraft.model === model ? "selected" : ""}>${escapeHtml(model)}</option>`).join("")}
        </select>
      </label>
      ${renderPrinterConnectionFields(type)}
      <div class="printer-switch-card">
        ${renderSwitchRow("printer-print-receipts", "Imprimir recibos y cuentas", printerDraft.printReceipts)}
        ${renderSwitchRow("printer-print-orders", "Imprimir pedidos", printerDraft.printOrders)}
      </div>
      ${showReceipts ? `
        <div class="printer-divider"></div>
        <div class="printer-switch-card">
          ${renderSwitchRow("printer-auto-receipt", "Imprimir recibos automaticamente", printerDraft.autoReceipt)}
        </div>
      ` : ""}
      ${showOrders ? `
        <div class="printer-divider"></div>
        <div class="printer-switch-card">
          ${renderSwitchRow("printer-single-item", "Imprima un solo articulo por orden de ticket", printerDraft.singleItemPerOrder)}
          ${renderSwitchRow("printer-group-identical", "Agrupar articulos identicos en los tickets de pedido", printerDraft.groupIdenticalItems)}
        </div>
        <div class="printer-group-table">
          <h3>Grupo de impresora</h3>
          ${renderPrinterGroupRows()}
        </div>
      ` : ""}
      <button id="printer-test" class="printer-test-button" type="button">
        <span class="menu-action-icon vector-icon">${iconSvg("printer")}</span>
        <strong>IMPRESION DE PRUEBA</strong>
      </button>
      ${printerSearchMode ? renderPrinterSearchModal(printerSearchMode) : ""}
    </div>
  `;
}

function renderPrinterConnectionFields(type) {
  if (type === "Bluetooth") {
    return `
      <div class="printer-inline-control">
        <label class="field printer-field">
          <span>Impresora Bluetooth</span>
          <input id="printer-bluetooth-name" value="${escapeHtml(printerDraft.bluetoothName)}" placeholder="Selecciona o escribe el dispositivo">
        </label>
        <button id="search-bluetooth-printer" class="btn secondary" type="button">Buscar</button>
      </div>
    `;
  }
  if (type === "Ethernet") {
    return `
      <label class="field printer-field">
        <span>Direccion IP de la impresora</span>
        <input id="printer-ip" inputmode="decimal" value="${escapeHtml(printerDraft.ipAddress)}" placeholder="Ej: 192.168.1.45">
      </label>
    `;
  }
  if (type === "USB") {
    return `
      <div class="printer-inline-control">
        <label class="field printer-field">
          <span>Impresora USB</span>
          <input id="printer-usb-name" value="${escapeHtml(printerDraft.usbName)}" placeholder="Selecciona un dispositivo USB">
        </label>
        <button id="search-usb-printer" class="btn secondary" type="button">Buscar</button>
      </div>
    `;
  }
  return `
    <div class="printer-info-note">Selecciona un modelo para configurar el tipo de conexion.</div>
  `;
}

function renderSwitchRow(idValue, label, checked) {
  return `
    <label class="printer-switch-row">
      <span>${escapeHtml(label)}</span>
      <input id="${escapeHtml(idValue)}" type="checkbox" ${checked ? "checked" : ""}>
    </label>
  `;
}

function renderPrinterGroupRows() {
  const groups = Array.isArray(state.printerGroups) ? state.printerGroups : [];
  if (!groups.length) return `<div class="printer-info-note">Los grupos de impresora se agregaran mas adelante desde el Dashboard.</div>`;
  return groups.map((group) => `
    <label class="printer-switch-row">
      <span>${escapeHtml(group.name)}</span>
      <input id="printer-group-${escapeHtml(group.groupId)}" data-printer-group-id="${escapeHtml(group.groupId)}" type="checkbox" ${printerDraft.groupIds.includes(group.groupId) ? "checked" : ""}>
    </label>
  `).join("");
}

function renderPrinterSearchModal(mode) {
  const isBluetooth = mode === "bluetooth";
  const title = isBluetooth ? "Impresora Bluetooth" : "Impresora USB";
  const devices = isBluetooth
    ? ["Star mPOP vinculada", "Star TSP654llBl", "Epson TM-P20"]
    : ["Epson TM-T20ll USB", "Star mC-Print3 USB"];
  return `
    <div class="printer-modal-backdrop">
      <div class="printer-search-modal">
        <h3>${title}</h3>
        <div class="printer-spinner" aria-hidden="true"></div>
        <div class="printer-device-list">
          ${devices.length ? devices.map((device) => `
            <button type="button" data-printer-device="${escapeHtml(device)}" data-printer-device-mode="${escapeHtml(mode)}">${escapeHtml(device)}</button>
          `).join("") : `<p>No se ha detectado ningun dispositivo</p>`}
          ${!isBluetooth ? `<p>No se ha detectado ningun dispositivo adicional.</p>` : ""}
        </div>
        <button id="printer-search-ok" class="btn secondary printer-modal-ok" type="button">OK</button>
      </div>
    </div>
  `;
}

function renderTaxesDrawer() {
  const taxes = Array.isArray(state.taxes) ? state.taxes : [];
  return `
    <div class="drawer-section printer-screen">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Configuracion</span>
          <h2>Impuestos</h2>
        </div>
        <span class="badge">${taxes.length}</span>
      </div>
      ${taxes.length ? `
        <div class="drawer-sale-list">
          ${taxes.map((tax) => `
            <article class="drawer-sale-row">
              <header>
                <span>${escapeHtml(tax.name)}</span>
                <strong>${money(tax.rate)}%</strong>
              </header>
              <small>${escapeHtml(tax.type || "Anadido al precio")}</small>
              <small>${Number(tax.productIds?.length || 0)} articulo${Number(tax.productIds?.length || 0) === 1 ? "" : "s"} asignado${Number(tax.productIds?.length || 0) === 1 ? "" : "s"}</small>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="printer-empty-state">
          <div class="tax-empty-icon vector-icon">${iconSvg("tax")}</div>
          <h3>Todavia no hay impuestos</h3>
          <p>Aqui puedes crear tasas y aplicarlas a los articulos del POS.</p>
        </div>
      `}
      <button id="new-tax" class="printer-add-floating" type="button" aria-label="Agregar impuesto"><span class="vector-icon">${iconSvg("plus")}</span></button>
    </div>
  `;
}

function renderCreateTaxDrawer() {
  const complete = isTaxDraftComplete();
  return `
    <div class="drawer-section printer-create-screen">
      <div class="printer-create-top">
        <div>
          <span class="kicker">Impuestos</span>
          <h2>Crear impuestos</h2>
        </div>
        <button id="save-tax" class="btn primary" type="button">Guardar</button>
      </div>
      <label class="line-input-field">
        <span>Nombre</span>
        <input id="tax-name" value="${escapeHtml(taxDraft.name)}" placeholder="Ej: ITBIS">
      </label>
      <label class="line-input-field">
        <span>Tasa de impuestos, %</span>
        <input id="tax-rate" inputmode="decimal" type="number" min="0" step="0.01" value="${escapeHtml(String(taxDraft.rate || ""))}" placeholder="18">
      </label>
      <label class="field printer-field">
        <span>Tipo</span>
        <select id="tax-type">
          <option value="">Seleccionar tipo</option>
          <option value="Incluido en el precio" ${taxDraft.type === "Incluido en el precio" ? "selected" : ""}>Incluido en el precio</option>
          <option value="Anadido al precio" ${taxDraft.type === "Anadido al precio" ? "selected" : ""}>Anadido al precio</option>
        </select>
      </label>
      <button id="apply-tax-products" class="btn primary full-width-action" type="button" ${complete ? "" : "disabled"}>APLICAR A LOS ARTICULOS</button>
    </div>
  `;
}

function renderApplyTaxDrawer() {
  const visible = filteredTaxProducts();
  return `
    <div class="drawer-section tax-apply-screen">
      <div class="tax-apply-topbar">
        <button id="tax-apply-close" class="tax-close-btn" type="button" aria-label="Cerrar"><span class="vector-icon">${iconSvg("close")}</span></button>
        <strong>Aplicar impuestos a los articulos</strong>
        <button id="save-tax-apply" class="btn primary btn-sm" type="button">Guardar</button>
        <div class="topbar-more-wrap">
          <button id="tax-more-options" class="icon-btn more-btn" type="button" aria-label="Mas opciones">
            <span class="vector-icon">${iconSvg("more-vertical")}</span>
          </button>
          <div id="tax-action-menu" class="more-menu tax-inline-menu" hidden>
            <button id="tax-select-all" type="button"><span class="menu-action-icon vector-icon">${iconSvg("assign")}</span>Seleccionar todo</button>
            <button id="tax-clear-selection" type="button"><span class="menu-action-icon vector-icon">${iconSvg("trash")}</span>Borrar seleccion</button>
          </div>
        </div>
      </div>
      <label class="tax-search-field">
        <span class="vector-icon">${iconSvg("search")}</span>
        <input id="tax-product-search" value="${escapeHtml(taxApplyQuery)}" placeholder="Buscar articulos">
      </label>
      <div class="tax-product-list">
        ${renderTaxProductRows(visible)}
      </div>
    </div>
  `;
}

function renderTaxProductRows(rows = filteredTaxProducts()) {
  return rows.map((product) => `
    <label class="tax-product-row">
      <span>${escapeHtml(product.name)}</span>
      <small>${escapeHtml(product.sku)}</small>
      <input data-tax-product-id="${escapeHtml(product.id)}" type="checkbox" ${taxDraft.productIds.includes(product.id) ? "checked" : ""}>
    </label>
  `).join("") || `<div class="printer-info-note">No se encontraron articulos.</div>`;
}

function renderGeneralDrawer() {
  const settings = state.posSettings || createPosSettings();
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Configuracion</span>
          <h2>General</h2>
        </div>
        <span class="badge">POS</span>
      </div>
      <div class="printer-switch-card">
        ${renderSwitchRow("setting-barcode-camera", "Utilice la camara para escanear codigos de barras", settings.useBarcodeCamera)}
        <button id="open-dark-mode" class="settings-line-button" type="button">
          <span>Modo Oscuro</span>
          <strong>${escapeHtml(generalDarkLabel(settings.darkMode))}</strong>
        </button>
        <button id="open-layout-mode" class="settings-line-button" type="button">
          <span>Distribucion de los articulos en la pantalla de inicio</span>
          <strong>${settings.articleLayout === "list" ? "Lista" : "Cuadricula"}</strong>
        </button>
      </div>
      ${generalModal === "dark" ? renderDarkModeModal(settings) : ""}
      ${generalModal === "layout" ? renderLayoutModal(settings) : ""}
    </div>
  `;
}

function renderShiftSettingsDrawer() {
  const settings = shiftSettings();
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Configuracion</span>
          <h2>Configuracion Turno</h2>
        </div>
        <span class="badge">Caja</span>
      </div>
      <div class="printer-switch-card">
        ${renderSwitchRow("setting-show-theoretical-cash", "Permitir visualizar Efectivo Teorico en caja", settings.showTheoreticalCash)}
        <button class="settings-line-button" type="button" data-main-view="billetes-monedas">
          <span>Billetes y Monedas</span>
          <strong>${shiftDenominations().length}</strong>
        </button>
      </div>
    </div>
  `;
}

function renderDenominationsDrawer() {
  const settings = shiftSettings();
  const rows = shiftDenominations().filter((row) => row.currency === settings.currency);
  return `
    <div class="drawer-section denominations-screen">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Configuracion Turno</span>
          <h2>Billetes y Monedas</h2>
        </div>
        <span class="badge">${rows.length}</span>
      </div>
      <button id="open-currency-modal" class="currency-selector" type="button">
        ${currencyBillArt(settings.currency)}
        <span>Tipo de Moneda</span>
        <strong>${escapeHtml(currencyLabel(settings.currency))}</strong>
      </button>
      <div class="denomination-list">
        ${rows.map(renderDenominationConfigRow).join("") || `<div class="printer-info-note">No hay denominaciones configuradas para esta moneda.</div>`}
      </div>
      <button id="new-denomination" class="printer-add-floating" type="button" aria-label="Agregar billete o moneda"><span class="vector-icon">${iconSvg("plus")}</span></button>
      ${shiftCurrencyModalOpen ? renderCurrencyModal(settings.currency) : ""}
    </div>
  `;
}

function renderDenominationConfigRow(row) {
  return `
    <div class="denomination-swipe-row">
      <button class="ticket-delete-action" type="button" data-delete-denomination="${escapeHtml(row.id)}">Eliminar</button>
      <article class="denomination-config-row" data-ticket-line-card>
        <span>${escapeHtml(currencySymbol(row.currency))}${money(row.value)}</span>
        <small>${escapeHtml(row.kind || "Denominacion")}</small>
        <button class="btn secondary btn-sm" type="button" data-edit-denomination="${escapeHtml(row.id)}"><span class="vector-icon">${iconSvg("edit")}</span></button>
      </article>
    </div>
  `;
}

function renderCurrencyModal(selected) {
  return `
    <div class="printer-modal-backdrop">
      <div class="settings-choice-modal wide currency-modal">
        <h3>Tipo de Moneda</h3>
        <div class="currency-choice-grid">
          ${["DOP", "USD", "EUR", "VES"].map((code) => `
            <label class="settings-choice-row currency-choice-row">
              ${currencyBillArt(code)}
              <input data-currency-option type="radio" name="currency" value="${escapeHtml(code)}" ${selected === code ? "checked" : ""}>
              <span>${escapeHtml(currencyLabel(code))}</span>
            </label>
          `).join("")}
        </div>
        <div class="settings-modal-actions">
          <button id="currency-modal-cancel" class="btn secondary" type="button">Cancelar</button>
          <button id="currency-modal-ok" class="btn primary" type="button">OK</button>
        </div>
      </div>
    </div>
  `;
}

function currencyBillArt(code) {
  const label = currencySymbol(code);
  return `
    <span class="currency-bill" aria-hidden="true">
      <svg viewBox="0 0 90 54" focusable="false">
        <rect x="4" y="7" width="82" height="40" rx="8"></rect>
        <circle cx="45" cy="27" r="13"></circle>
        <text x="45" y="31" text-anchor="middle">${escapeHtml(label)}</text>
      </svg>
    </span>
  `;
}

function renderUsersPermissionsDrawer() {
  if (!ensureAdminPassword()) return `
    <div class="drawer-section">
      <div class="printer-info-note">Acceso protegido. Vuelve a intentar desde Configuracion cuando tengas la clave administradora.</div>
    </div>
  `;
  const users = state.posUsers || [];
  const modules = posPermissionModules();
  return `
    <div class="drawer-section users-permission-screen">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Configuracion</span>
          <h2>Usuarios y Permisos</h2>
        </div>
        <span class="badge">${users.length}</span>
      </div>
      <div class="user-form-card">
        <label class="line-input-field"><span>Nombre</span><input id="pos-user-name" placeholder="Nombre"></label>
        <label class="line-input-field"><span>Correo</span><input id="pos-user-email" placeholder="correo@wtf.local"></label>
        <label class="line-input-field"><span>Contrasena</span><input id="pos-user-password" type="password" placeholder="Clave"></label>
        <label class="field printer-field"><span>Rol</span><select id="pos-user-role"><option>Admin</option><option>Cajero</option><option>Supervisor</option><option>Vendedor</option></select></label>
        <strong>Permitir acceso</strong>
        <div class="permission-grid">
          ${modules.map((module) => `<label><input data-pos-permission="${escapeHtml(module.id)}" type="checkbox"> ${escapeHtml(module.label)}</label>`).join("")}
        </div>
        <div class="user-form-actions">
          <button id="clear-pos-user-form" class="btn secondary" type="button"><span class="vector-icon">${iconSvg("trash")}</span>Limpiar</button>
          <button id="save-pos-user" class="btn primary" type="button"><span class="vector-icon">${iconSvg("users")}</span>Guardar</button>
          <button class="btn secondary" type="button" data-main-view="configuracion"><span class="vector-icon">${iconSvg("close")}</span>Cancelar</button>
        </div>
      </div>
      <div class="drawer-sale-list">
        ${users.map((user) => `<article class="drawer-sale-row"><header><span>${escapeHtml(user.name)}</span><strong>${escapeHtml(user.role)}</strong></header><small>${escapeHtml(user.email)}</small></article>`).join("")}
      </div>
    </div>
  `;
}

function renderDarkModeModal(settings) {
  return `
    <div class="printer-modal-backdrop">
      <div class="settings-choice-modal">
        <h3>Modo Oscuro</h3>
        ${renderChoice("darkMode", "system", "Usar ajuste del dispositivo", settings.darkMode)}
        ${renderChoice("darkMode", "off", "Desactivado", settings.darkMode)}
        ${renderChoice("darkMode", "on", "Activado", settings.darkMode)}
        <div class="settings-modal-actions">
          <button id="general-modal-cancel" class="btn secondary" type="button">Cancelar</button>
          <button id="general-modal-ok" class="btn primary" type="button">OK</button>
        </div>
      </div>
    </div>
  `;
}

function renderLayoutModal(settings) {
  return `
    <div class="printer-modal-backdrop">
      <div class="settings-choice-modal wide">
        <h3>Distribucion de los articulos</h3>
        ${renderLayoutChoice("grid", "Cuadricula", settings.articleLayout)}
        ${renderLayoutChoice("list", "Lista", settings.articleLayout)}
        <div class="settings-modal-actions">
          <button id="general-modal-cancel" class="btn secondary" type="button">Cancelar</button>
          <button id="general-modal-ok" class="btn primary" type="button">OK</button>
        </div>
      </div>
    </div>
  `;
}

function renderChoice(name, value, label, selectedValue) {
  return `
    <label class="settings-choice-row">
      <input data-general-option type="radio" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${selectedValue === value ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function renderLayoutChoice(value, label, selectedValue) {
  const previewClass = value === "list" ? "list" : "grid";
  return `
    <label class="settings-choice-row layout-choice">
      <div class="device-layout-preview ${previewClass}">
        <span class="vector-icon">${iconSvg(value === "grid" ? "category" : "articulos")}</span>
      </div>
      <input data-general-option type="radio" name="articleLayout" value="${escapeHtml(value)}" ${selectedValue === value ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function renderSaleRow(sale) {
  const itemCount = sale.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const lineText = sale.lines.map((line) => `${line.name} x ${line.qty}`).join(" · ");
  return `
    <article class="drawer-sale-row">
      <header>
        <span>${escapeHtml(sale.ticketId.slice(-8))}</span>
        <strong>${moneyWithCurrency(sale.totals?.total || 0)}</strong>
      </header>
      <small>${escapeHtml(formatDateTime(sale.createdAt))} · ${round4(itemCount)} articulos</small>
      <small>${escapeHtml(lineText || "Sin detalle")}</small>
    </article>
  `;
}

function renderTurnoDrawer() {
  const lastReport = state.shiftCloseReports.at(-1);
  const summary = shiftCashSummary();
  const showTheoretical = canViewTheoreticalCash();
  return `
    <div class="drawer-section">
      <button class="btn primary close-btn" type="button" data-main-view="tesoreria">Gestion de tesoreria</button>
      <button class="btn primary close-btn" type="button" data-main-view="cerrar-turno">Cerrar el Turno</button>
      <div class="drawer-sale-row">
        <header>
          <span>Numero del cierre de caja</span>
          <strong>${state.shiftCloseReports.length}</strong>
        </header>
        <small>Turno abierto por ${escapeHtml(state.shift.openedBy || state.operator.name || "Administrador")}</small>
        <small>${escapeHtml(formatDateTime(state.shift.openedAt))}</small>
      </div>
      <div class="drawer-stat-grid">
        <div class="drawer-stat"><span>Apertura</span><strong>${escapeHtml(formatDateTime(state.shift.openedAt))}</strong></div>
        <div class="drawer-stat"><span>Fondo inicial</span><strong>${moneyWithCurrency(state.shift.openingCash)}</strong></div>
      </div>
      <div class="shift-summary-card">
        <h3>Cajon de Efectivo</h3>
        <div class="shift-line"><span>Fondo de caja anterior</span><strong>${moneyWithCurrency(summary.previousCashFund)}</strong></div>
        ${canAccessShiftMetric("cashPayments") ? `<div class="shift-line"><span>Cobros en efectivo</span><strong>${moneyWithCurrency(summary.cashPayments)}</strong></div>` : ""}
        ${canAccessShiftMetric("cashRefunds") ? `<div class="shift-line"><span>Reembolsos en efectivo</span><strong>${moneyWithCurrency(summary.cashRefunds)}</strong></div>` : ""}
        ${canAccessShiftMetric("deposits") ? `<div class="shift-line"><span>Depositado</span><strong>${moneyWithCurrency(summary.deposits)}</strong></div>` : ""}
        ${canAccessShiftMetric("payouts") ? `<div class="shift-line"><span>Pagos/Salidas</span><strong>${moneyWithCurrency(summary.payouts)}</strong></div>` : ""}
        ${showTheoretical ? `<div class="shift-line is-strong"><span>Efectivo teorico en caja</span><strong>${moneyWithCurrency(summary.theoreticalCash)}</strong></div>` : ""}
      </div>
      <div class="shift-summary-card">
        <h3>Resumen de Ventas</h3>
        <div class="shift-line"><span>Ventas Brutas</span><strong>${moneyWithCurrency(summary.grossSales)}</strong></div>
        ${renderPaymentBreakdown(summary.paymentsByMethod)}
        <div class="shift-line"><span>Reembolsos</span><strong>${moneyWithCurrency(summary.totalRefunds)}</strong></div>
        ${renderPaymentBreakdown(summary.refundsByMethod)}
        <div class="shift-line"><span>Descuentos</span><strong>${moneyWithCurrency(summary.discounts)}</strong></div>
        <div class="shift-line is-total"><span>Ventas netas</span><strong>${moneyWithCurrency(summary.netSales)}</strong></div>
      </div>
      ${lastReport ? `<button class="drawer-sale-row as-button" type="button" data-shift-report-id="${escapeHtml(lastReport.reportId)}">
        <header><span>Ultimo cierre</span><strong>${moneyWithCurrency(lastReport.grossTotal)}</strong></header>
        <small>${escapeHtml(formatShiftRange(lastReport))}</small>
      </button>` : `<div class="drawer-sale-row"><small>Sin cierres de turno guardados todavia.</small></div>`}
    </div>
  `;
}

function renderTreasuryDrawer() {
  const treasury = state.treasury || [];
  const deposits = treasury.filter((row) => row.type === "deposito").reduce((sum, row) => sum + row.amount, 0);
  const payouts = treasury.filter((row) => row.type === "salida").reduce((sum, row) => sum + row.amount, 0);
  const balance = round4(deposits - payouts);
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Turno</span>
          <h2>Gestion de tesoreria</h2>
        </div>
        <span class="badge">Caja</span>
      </div>
      <div class="treasury-entry-card">
        <label class="treasury-line-field">
          <span>Cantidad</span>
          <input id="treasury-amount" inputmode="decimal" type="text" value="${moneyWithCurrency(0)}">
        </label>
        <label class="treasury-line-field">
          <span>Descripcion</span>
          <textarea id="treasury-description" placeholder="Motivo del movimiento"></textarea>
        </label>
        <div class="treasury-actions">
          <button id="treasury-deposit" class="btn primary" type="button">Depositar</button>
          <button id="treasury-payout" class="btn secondary" type="button">Pagos/Salidas</button>
        </div>
      </div>
      <div class="drawer-stat-grid">
        <div class="drawer-stat"><span>Depositado</span><strong>${moneyWithCurrency(deposits)}</strong></div>
        <div class="drawer-stat"><span>Balance</span><strong>${moneyWithCurrency(balance)}</strong></div>
      </div>
      <div class="treasury-list">
        ${treasury.length ? treasury.slice().reverse().map(renderTreasuryRow).join("") : `<div class="treasury-row"><small>Sin movimientos de tesoreria.</small></div>`}
      </div>
    </div>
  `;
}

function renderCloseShiftDrawer() {
  ensureShiftCloseDraft();
  const summary = shiftCashSummary();
  const realCash = shiftCloseRealCash();
  const countedTotal = shiftCloseCountedTotal();
  const discrepancy = round4(realCash - summary.theoreticalCash);
  const showTheoretical = canViewTheoreticalCash();
  return `
    <div class="drawer-section close-shift-screen">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Turno</span>
          <h2>Cerrar el turno</h2>
        </div>
        <span class="badge">Reporte Z</span>
      </div>
      ${showTheoretical ? `
        <div class="shift-line is-strong">
          <span>Efectivo teorico en caja</span>
          <strong>${moneyWithCurrency(summary.theoreticalCash)}</strong>
        </div>
      ` : ""}
      <label class="line-input-field cash-real-field">
        <span>Cantidad de efectivo real</span>
        <input id="close-shift-real-cash" inputmode="decimal" type="text" value="${escapeHtml(formatMoneyInput(String(shiftCloseDraft.realCash)))}" placeholder="${escapeHtml(formatMoneyInput(String(defaultCloseRealCash())))}">
      </label>
      <div class="denomination-list">
        ${shiftDenominations().map((row) => renderCloseDenominationRow(row)).join("")}
      </div>
      <div class="shift-close-totals">
        <div class="shift-line is-total"><span>Total de Billetes y monedas</span><strong id="close-counted-total">${moneyWithCurrency(countedTotal)}</strong></div>
        <div id="close-discrepancy-row" class="shift-line ${Math.abs(discrepancy) > 0.009 ? "is-warning" : "is-total"}"><span>Descuadre</span><strong id="close-discrepancy">${moneyWithCurrency(discrepancy)}</strong></div>
      </div>
      <button id="confirm-close-shift" class="btn primary close-btn" type="button">Guardar cierre de turno</button>
    </div>
  `;
}

function renderCloseDenominationRow(row) {
  const qty = shiftCloseDraft.counts?.[row.id] || "";
  return `
    <label class="denomination-row">
      <span>${escapeHtml(currencySymbol(row.currency))}${money(row.value)}</span>
      <input class="close-denomination-input" data-close-denomination="${escapeHtml(row.id)}" type="number" min="0" step="1" value="${escapeHtml(String(qty))}" placeholder="0">
      <strong data-close-denomination-total="${escapeHtml(row.id)}">${moneyWithCurrency(Number(qty || 0) * Number(row.value || 0))}</strong>
    </label>
  `;
}

function renderShiftCloseList() {
  const reports = state.shiftCloseReports.slice().reverse();
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Reportes Z</span>
          <h2>Cierres de turno</h2>
        </div>
        <span class="badge">${reports.length}</span>
      </div>
      <div class="drawer-sale-list">
        ${reports.length ? reports.map(renderShiftCloseRow).join("") : `<div class="drawer-sale-row"><small>No hay cierres registrados todavia.</small></div>`}
      </div>
    </div>
  `;
}

function renderShiftCloseRow(report) {
  return `
    <button class="drawer-shift-row" type="button" data-shift-report-id="${escapeHtml(report.reportId)}">
      <header>
        <span>${escapeHtml(formatDateOnly(report.openedAt || report.createdAt))} - ${escapeHtml(formatDateOnly(report.closedAt || report.createdAt))}</span>
        <strong>${moneyWithCurrency(report.grossTotal)}</strong>
      </header>
      <small>${escapeHtml(formatTimeOnly(report.openedAt || report.createdAt))} - ${escapeHtml(formatTimeOnly(report.closedAt || report.createdAt))}</small>
    </button>
  `;
}

function renderShiftCloseDetail(reportId) {
  const report = state.shiftCloseReports.find((row) => row.reportId === reportId);
  if (!report) {
    return `
      <div class="drawer-section">
        <div class="drawer-sale-row"><small>No encontre ese cierre de turno.</small></div>
      </div>
    `;
  }
  return `
    <div class="drawer-section">
      <div class="drawer-section-head">
        <div>
          <span class="kicker">Historico total</span>
          <h2>${escapeHtml(report.reportId.slice(-8))}</h2>
        </div>
        <span class="badge">${escapeHtml(formatDateOnly(report.closedAt || report.createdAt))}</span>
      </div>
      <div class="drawer-stat-grid">
        <div class="drawer-stat"><span>Apertura</span><strong>${escapeHtml(formatDateTime(report.openedAt || report.createdAt))}</strong></div>
        <div class="drawer-stat"><span>Cierre</span><strong>${escapeHtml(formatDateTime(report.closedAt || report.createdAt))}</strong></div>
        <div class="drawer-stat"><span>Ventas</span><strong>${report.salesCount}</strong></div>
        <div class="drawer-stat"><span>Total vendido</span><strong>${moneyWithCurrency(report.grossTotal)}</strong></div>
        <div class="drawer-stat"><span>Efectivo esperado</span><strong>${moneyWithCurrency(report.cashExpected)}</strong></div>
        <div class="drawer-stat"><span>Diferencia</span><strong>${moneyWithCurrency(report.difference)}</strong></div>
      </div>
    </div>
  `;
}

function renderTreasuryRow(row) {
  return `
    <article class="treasury-row">
      <header>
        <span>${row.type === "deposito" ? "Deposito" : "Pago/Salida"}</span>
        <strong>${row.type === "deposito" ? "+" : "-"} ${moneyWithCurrency(row.amount)}</strong>
      </header>
      <small>${escapeHtml(row.description || "Sin descripcion")}</small>
      <small>${escapeHtml(formatDateTime(row.createdAt))}</small>
    </article>
  `;
}

function addTreasuryMovement(type) {
  const amount = parseMoneyInput($("treasury-amount").value);
  const description = $("treasury-description").value.trim();
  if (amount <= 0) {
    showToast("Coloca una cantidad mayor que cero.");
    return;
  }
  state.treasury = state.treasury || [];
  state.treasury.push({
    movementId: id("treasury"),
    type,
    amount,
    description,
    actor: state.operator.name,
    createdAt: now()
  });
  audit("treasury_movement_created", { type, amount });
  saveAndRender(type === "deposito" ? "Deposito registrado." : "Pago/salida registrado.");
  showMainModule("tesoreria");
}

function createShiftSettings() {
  return {
    showTheoreticalCash: true,
    currency: "DOP",
    denominations: defaultDenominations()
  };
}

function defaultDenominations() {
  return [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1].map((value) => ({
    id: `dop_${value}`,
    currency: "DOP",
    value,
    kind: value >= 50 ? "Billete" : "Moneda"
  }));
}

function shiftSettings() {
  state.shiftSettings = Object.assign(createShiftSettings(), state.shiftSettings || {});
  state.shiftSettings.denominations = Array.isArray(state.shiftSettings.denominations) && state.shiftSettings.denominations.length
    ? state.shiftSettings.denominations
    : defaultDenominations();
  return state.shiftSettings;
}

function shiftDenominations() {
  return shiftSettings().denominations
    .slice()
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
}

function shiftCashSummary() {
  const treasury = state.treasury || [];
  const sales = state.sales || [];
  const shiftOpenedAt = new Date(state.shift?.openedAt || 0).getTime();
  const inShift = (dateValue) => new Date(dateValue || 0).getTime() >= shiftOpenedAt;
  const currentSales = sales.filter((sale) => inShift(sale.createdAt));
  const currentTreasury = treasury.filter((row) => inShift(row.createdAt));
  const cashPayments = currentSales
    .filter((sale) => normalize(sale.payment?.method || "cash") === "cash")
    .reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0);
  const cashRefunds = currentSales
    .filter((sale) => sale.status === "refunded" && normalize(sale.payment?.method || "cash") === "cash")
    .reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0);
  const deposits = currentTreasury.filter((row) => row.type === "deposito").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const payouts = currentTreasury.filter((row) => row.type === "salida").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const grossSales = currentSales.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0);
  const discounts = currentSales.reduce((sum, sale) => sum + Number(sale.totals?.discount || 0), 0);
  const refunds = currentSales.filter((sale) => sale.status === "refunded");
  return {
    previousCashFund: Number(state.shift?.openingCash || 0),
    cashPayments: round4(cashPayments),
    cashRefunds: round4(cashRefunds),
    deposits: round4(deposits),
    payouts: round4(payouts),
    theoreticalCash: round4(Number(state.shift?.openingCash || 0) + cashPayments - cashRefunds + deposits - payouts),
    grossSales: round4(grossSales),
    discounts: round4(discounts),
    totalRefunds: round4(refunds.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0)),
    netSales: round4(grossSales - discounts - refunds.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0)),
    paymentsByMethod: groupSalesByPayment(currentSales),
    refundsByMethod: groupSalesByPayment(refunds)
  };
}

function groupSalesByPayment(rows) {
  return rows.reduce((acc, sale) => {
    const method = sale.payment?.method || "cash";
    acc[method] = round4((acc[method] || 0) + Number(sale.totals?.total || 0));
    return acc;
  }, {});
}

function renderPaymentBreakdown(groups) {
  const entries = Object.entries(groups || {});
  if (!entries.length) return `<div class="shift-line is-muted"><span>Sin movimientos por metodo</span><strong>${moneyWithCurrency(0)}</strong></div>`;
  return entries.map(([method, amount]) => `<div class="shift-line is-sub"><span>${escapeHtml(paymentMethodLabel(method))}</span><strong>${moneyWithCurrency(amount)}</strong></div>`).join("");
}

function paymentMethodLabel(method) {
  const labels = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", dollars: "Dolares" };
  return labels[method] || method;
}

function canViewTheoreticalCash() {
  return Boolean(shiftSettings().showTheoreticalCash || normalize(state.operator?.role || "").includes("admin"));
}

function canAccessShiftMetric(metric) {
  const role = normalize(state.operator?.role || "");
  if (role.includes("admin")) return true;
  const permissions = state.operator?.permissions || [];
  return permissions.includes(metric) || permissions.includes("turno");
}

function ensureShiftCloseDraft() {
  if (shiftCloseDraft?.shiftId === state.shift?.shiftId) return;
  const counts = {};
  shiftDenominations().forEach((row) => { counts[row.id] = ""; });
  shiftCloseDraft = {
    shiftId: state.shift?.shiftId,
    realCash: defaultCloseRealCash(),
    counts
  };
}

function defaultCloseRealCash() {
  const lastReport = state.shiftCloseReports?.at(-1);
  return Number(lastReport?.realCash || lastReport?.cashFundNext || state.shift?.openingCash || 5000);
}

function shiftCloseCountedTotal() {
  ensureShiftCloseDraft();
  return round4(shiftDenominations().reduce((sum, row) => sum + Number(row.value || 0) * Number(shiftCloseDraft.counts?.[row.id] || 0), 0));
}

function shiftCloseRealCash() {
  ensureShiftCloseDraft();
  const counted = shiftCloseCountedTotal();
  return round4(counted > 0 ? counted : Number(shiftCloseDraft.realCash || defaultCloseRealCash()));
}

function updateCloseShiftTotals() {
  const summary = shiftCashSummary();
  const countedTotal = shiftCloseCountedTotal();
  const discrepancy = round4(shiftCloseRealCash() - summary.theoreticalCash);
  shiftDenominations().forEach((row) => {
    const target = Array.from(document.querySelectorAll("[data-close-denomination-total]"))
      .find((node) => node.dataset.closeDenominationTotal === row.id);
    if (target) target.textContent = moneyWithCurrency(Number(shiftCloseDraft.counts?.[row.id] || 0) * Number(row.value || 0));
  });
  const counted = $("close-counted-total");
  if (counted) counted.textContent = moneyWithCurrency(countedTotal);
  const discrepancyLabel = $("close-discrepancy");
  if (discrepancyLabel) discrepancyLabel.textContent = moneyWithCurrency(discrepancy);
  const discrepancyRow = $("close-discrepancy-row");
  if (discrepancyRow) {
    discrepancyRow.classList.toggle("is-warning", Math.abs(discrepancy) > 0.009);
    discrepancyRow.classList.toggle("is-total", Math.abs(discrepancy) <= 0.009);
  }
}

function closeShiftFromDraft() {
  ensureShiftCloseDraft();
  const summary = shiftCashSummary();
  const closedAt = now();
  const realCash = shiftCloseRealCash();
  const report = {
    reportId: id("z"),
    shiftId: state.shift.shiftId,
    createdAt: closedAt,
    openedAt: state.shift.openedAt || closedAt,
    closedAt,
    openedBy: state.shift.openedBy || state.operator.name,
    closedBy: state.operator.name,
    salesCount: (state.sales || []).filter((sale) => new Date(sale.createdAt || 0).getTime() >= new Date(state.shift.openedAt || 0).getTime()).length,
    grossTotal: summary.grossSales,
    cashExpected: summary.theoreticalCash,
    realCash,
    countedCash: shiftCloseCountedTotal(),
    denominationCounts: Object.assign({}, shiftCloseDraft.counts || {}),
    paymentsByMethod: summary.paymentsByMethod,
    refundsByMethod: summary.refundsByMethod,
    deposits: summary.deposits,
    payouts: summary.payouts,
    netSales: summary.netSales,
    difference: round4(realCash - summary.theoreticalCash)
  };
  state.shiftCloseReports.push(report);
  state.shift = { shiftId: id("shift"), openingCash: realCash, status: "open", openedAt: now(), openedBy: state.operator.name };
  shiftCloseDraft = null;
  audit("shift_closed", report);
  saveAndRender(`Cierre guardado. Descuadre: ${moneyWithCurrency(report.difference)}`);
  showMainModule("cierres");
}

function addDenomination() {
  const settings = shiftSettings();
  const raw = window.prompt("Valor del billete o moneda", "");
  const value = Number(String(raw || "").replace(",", "."));
  if (!value || value <= 0) return;
  settings.denominations.push({
    id: id(`den_${settings.currency.toLowerCase()}`),
    currency: settings.currency,
    value: round4(value),
    kind: value >= 50 ? "Billete" : "Moneda"
  });
  audit("denomination_created", { currency: settings.currency, value });
  saveAndRender("Denominacion agregada.");
  showMainModule("billetes-monedas");
}

function editDenomination(denominationId) {
  const settings = shiftSettings();
  const row = settings.denominations.find((item) => item.id === denominationId);
  if (!row) return;
  const raw = window.prompt("Nuevo valor", String(row.value));
  const value = Number(String(raw || "").replace(",", "."));
  if (!value || value <= 0) return;
  row.value = round4(value);
  row.kind = value >= 50 ? "Billete" : "Moneda";
  audit("denomination_updated", { denominationId, value });
  saveAndRender("Denominacion actualizada.");
  showMainModule("billetes-monedas");
}

function deleteDenomination(denominationId) {
  const settings = shiftSettings();
  settings.denominations = settings.denominations.filter((item) => item.id !== denominationId);
  audit("denomination_deleted", { denominationId });
  saveAndRender("Denominacion eliminada.");
  showMainModule("billetes-monedas");
}

function currencyLabel(code) {
  return ({ DOP: "Peso Dominicano", USD: "Dolar", EUR: "Euro", VES: "Bolivares" })[code] || code;
}

function currencySymbol(code) {
  return ({ DOP: "RD$", USD: "US$", EUR: "EUR$", VES: "BS$" })[code] || "";
}

function ensureAdminPassword() {
  const role = normalize(state.operator?.role || "");
  if (!role.includes("admin")) return false;
  if (sessionStorage.getItem("pos_admin_permissions_unlocked") === "1") return true;
  const users = state.posUsers || [];
  const admin = users.find((user) => normalize(user.role).includes("admin"));
  const expected = admin?.password || "301904";
  const password = window.prompt("Coloca la contrasena administradora");
  if (password === expected) {
    sessionStorage.setItem("pos_admin_permissions_unlocked", "1");
    return true;
  }
  showToast("Clave administradora incorrecta.");
  return false;
}

function posPermissionModules() {
  return [
    { id: "ventas", label: "Ventas" },
    { id: "recibos", label: "Recibos" },
    { id: "turno", label: "Turno" },
    { id: "tesoreria", label: "Gestion de tesoreria" },
    { id: "cerrar-turno", label: "Cerrar el turno" },
    { id: "articulos", label: "Articulos" },
    { id: "configuracion", label: "Configuracion" },
    { id: "cashPayments", label: "Ver cobros en efectivo" },
    { id: "cashRefunds", label: "Ver reembolsos" },
    { id: "deposits", label: "Ver depositos" },
    { id: "payouts", label: "Ver pagos/salidas" }
  ];
}

function createPrinterDraft() {
  return {
    printerId: "",
    name: "",
    model: "Ninguna Impresora",
    connectionType: "",
    bluetoothName: "",
    ipAddress: "",
    usbName: "",
    printReceipts: false,
    printOrders: false,
    autoReceipt: false,
    singleItemPerOrder: false,
    groupIdenticalItems: true,
    groupIds: []
  };
}

function createTaxDraft() {
  return {
    taxId: "",
    name: "",
    rate: "",
    type: "",
    productIds: []
  };
}

function createPosSettings() {
  return {
    useBarcodeCamera: false,
    darkMode: "system",
    articleLayout: "grid"
  };
}

function printerModelOptions() {
  return [
    "Ninguna Impresora",
    "Star mPOP (Bluetooth)",
    "Star TSP654llBl (Bluetooth)",
    "Star TSP654llLAN (Ethernet)",
    "Star mC-Print3 (USB)",
    "Epson TM-T20ll (Ethernet)",
    "Epson TM-P20 (Bluetooth)",
    "Otro Modelo (Ethernet)",
    "Pantalla de Cocina"
  ];
}

function printerModelConnectionType(model) {
  const value = String(model || "");
  if (value.includes("Bluetooth")) return "Bluetooth";
  if (value.includes("Ethernet")) return "Ethernet";
  if (value.includes("USB")) return "USB";
  if (value === "Pantalla de Cocina") return "Ethernet";
  return "";
}

function updatePrinterDraftFromForm() {
  const getValue = (idValue) => $(idValue)?.value?.trim() || "";
  const getChecked = (idValue) => Boolean($(idValue)?.checked);
  printerDraft.name = getValue("printer-name");
  printerDraft.model = getValue("printer-model") || printerDraft.model || "Ninguna Impresora";
  printerDraft.connectionType = printerModelConnectionType(printerDraft.model);
  printerDraft.bluetoothName = getValue("printer-bluetooth-name") || printerDraft.bluetoothName;
  printerDraft.ipAddress = getValue("printer-ip") || printerDraft.ipAddress;
  printerDraft.usbName = getValue("printer-usb-name") || printerDraft.usbName;
  printerDraft.printReceipts = getChecked("printer-print-receipts");
  printerDraft.printOrders = getChecked("printer-print-orders");
  printerDraft.autoReceipt = getChecked("printer-auto-receipt");
  printerDraft.singleItemPerOrder = getChecked("printer-single-item");
  printerDraft.groupIdenticalItems = $("printer-group-identical") ? getChecked("printer-group-identical") : printerDraft.groupIdenticalItems;
}

function openPrinterSearch(mode) {
  updatePrinterDraftFromForm();
  printerSearchMode = mode;
  showMainModule("crear-impresora");
}

function updateTaxDraftFromForm() {
  taxDraft.name = $("tax-name")?.value?.trim() || taxDraft.name || "";
  taxDraft.rate = $("tax-rate")?.value || taxDraft.rate || "";
  taxDraft.type = $("tax-type")?.value || taxDraft.type || "";
}

function isTaxDraftComplete() {
  return Boolean(taxDraft.name && Number(taxDraft.rate) > 0 && taxDraft.type);
}

function updateTaxApplyButtonState() {
  const button = $("apply-tax-products");
  if (button) button.disabled = !isTaxDraftComplete();
}

function filteredTaxProducts() {
  const needle = normalize(taxApplyQuery);
  return products.filter((product) => !needle || normalize(`${product.name} ${product.sku}`).includes(needle));
}

function defaultCatalogCategories() {
  return [];
}

function allCategories() {
  return [...defaultCatalogCategories(), ...(Array.isArray(state.categories) ? state.categories : [])];
}

function filteredCategories() {
  const needle = normalize(categoryQuery);
  return allCategories().filter((category) => !needle || normalize(`${category.name} ${category.description || ""}`).includes(needle));
}

function addCategory() {
  const name = window.prompt("Nombre de la categoria");
  if (name === null) return;
  const cleanName = name.trim();
  if (!cleanName) {
    showToast("Coloca el nombre de la categoria.");
    return;
  }
  state.categories = Array.isArray(state.categories) ? state.categories : [];
  state.categories.push({
    categoryId: id("cat"),
    name: cleanName,
    description: "Categoria agregada desde POS",
    createdAt: now(),
    updatedAt: now()
  });
  audit("pos_category_created", { name: cleanName });
  saveAndRender("Categoria agregada.");
  showMainModule("categorias");
}

function defaultTicketName(ticket) {
  return `TICKET - ${formatTimeOnly(ticket.createdAt || now())}`;
}

function savedTickets() {
  const rows = state.tickets.filter((ticket) =>
    ticket.status === "open" &&
    ticket.ticketId !== state.currentTicket.ticketId &&
    ticket.cart?.lines?.length
  );
  const sorted = rows.slice();
  sorted.sort((a, b) => {
    if (savedTicketSort === "nombre") return String(a.savedName || "").localeCompare(String(b.savedName || ""));
    if (savedTicketSort === "cantidad") return Number(b.cart?.lines?.length || 0) - Number(a.cart?.lines?.length || 0);
    if (savedTicketSort === "empleado") return String(a.assignedTo || "").localeCompare(String(b.assignedTo || ""));
    return new Date(b.savedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.savedAt || a.updatedAt || a.createdAt).getTime();
  });
  return sorted;
}

function saveCurrentTicketForLater() {
  if (!state.currentTicket.cart.lines.length) {
    showToast("No hay articulos para guardar.");
    return;
  }
  if (state.currentTicket.savedAt && ticketSaveMode !== "split") {
    releaseSavedTicketAndStartNew("Ticket guardado. Caja lista para un nuevo ticket.");
    return;
  }
  state.currentTicket.savedName = $("save-ticket-name")?.value?.trim() || defaultTicketName(state.currentTicket);
  state.currentTicket.comment = $("save-ticket-comment")?.value?.trim() || "";
  state.currentTicket.savedAt = state.currentTicket.savedAt || now();
  state.currentTicket.assignedTo = state.currentTicket.assignedTo || state.operator.name || "";
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("ticket_saved", { ticketId: state.currentTicket.ticketId, name: state.currentTicket.savedName });
  if (ticketSaveMode === "split") {
    ticketSaveMode = "";
    splitDraft = null;
    saveAndRender("Ticket guardado. Ahora puedes dividirlo.");
    showMainModule("dividir-ticket");
    return;
  }
  state.currentTicket = createTicket({ tableId: "mesa_1", tableLabel: "Mesa 1" });
  upsertTicket(state.currentTicket);
  selectedSavedTicketIds = [];
  saveAndRender("Ticket guardado.");
  showMainModule("pos");
}

function releaseSavedTicketAndStartNew(message = "Caja lista para un nuevo ticket.") {
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("saved_ticket_released", { ticketId: state.currentTicket.ticketId, name: state.currentTicket.savedName || defaultTicketName(state.currentTicket) });
  state.currentTicket = createTicket({ tableId: "mesa_1", tableLabel: "Mesa 1" });
  upsertTicket(state.currentTicket);
  selectedSavedTicketIds = [];
  productSearchOpen = false;
  saveAndRender(message);
  showMainModule("pos");
}

function openSavedTicket(ticketId) {
  const ticket = state.tickets.find((row) => row.ticketId === ticketId);
  if (!ticket) {
    showToast("No encontre ese ticket.");
    return;
  }
  state.currentTicket = JSON.parse(JSON.stringify(ticket));
  selectedSavedTicketIds = [];
  audit("ticket_reopened", { ticketId });
  saveAndRender("Ticket abierto.");
  showMainModule("pos");
}

function openEditCurrentTicket() {
  if (!topActionEnabled("edit-ticket")) {
    showToast("Guarda o abre un ticket guardado para editar su nombre.");
    return;
  }
  showMainModule("editar-ticket");
  setTimeout(() => $("edit-ticket-name")?.select(), 50);
}

function saveTicketNameEdits() {
  state.currentTicket.savedName = $("edit-ticket-name")?.value?.trim() || defaultTicketName(state.currentTicket);
  state.currentTicket.comment = $("edit-ticket-comment")?.value?.trim() || "";
  state.currentTicket.savedAt = state.currentTicket.savedAt || now();
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("ticket_name_edited", { ticketId: state.currentTicket.ticketId, name: state.currentTicket.savedName });
  saveAndRender("Ticket actualizado.");
  showMainModule("pos");
}

function beginSplitCurrentTicket() {
  if (!topActionEnabled("split-ticket")) {
    showToast("El ticket debe tener mas de 2 articulos para dividir.");
    return;
  }
  if (!state.currentTicket.savedAt && !state.currentTicket.savedName) {
    ticketSaveMode = "split";
    state.currentTicket.savedName = defaultTicketName(state.currentTicket);
    showMainModule("guardar-ticket");
    return;
  }
  splitDraft = null;
  showMainModule("dividir-ticket");
}

function ensureSplitDraft() {
  if (splitDraft?.sourceTicketId === state.currentTicket.ticketId) return;
  const source = JSON.parse(JSON.stringify(state.currentTicket));
  source.savedName = source.savedName || defaultTicketName(source);
  splitDraft = {
    sourceTicketId: state.currentTicket.ticketId,
    selectedLineIds: [],
    tickets: [source, createSplitDraftTicket(2)]
  };
}

function createSplitDraftTicket(count) {
  const ticket = createTicket({
    diningOption: state.currentTicket.diningOption,
    tableId: state.currentTicket.tableId,
    tableLabel: state.currentTicket.tableLabel
  });
  ticket.savedName = `${defaultTicketName(state.currentTicket)} - ${count}`;
  ticket.savedAt = now();
  ticket.assignedTo = state.currentTicket.assignedTo || state.operator.name || "";
  return ticket;
}

function bindSplitTicketActions() {
  if (!splitDraft) return;
  document.querySelectorAll("[data-split-line]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const lineId = checkbox.dataset.splitLine || "";
      splitDraft.selectedLineIds = checkbox.checked
        ? Array.from(new Set([...splitDraft.selectedLineIds, lineId]))
        : splitDraft.selectedLineIds.filter((idValue) => idValue !== lineId);
      renderMainModule();
    });
  });
  document.querySelectorAll("[data-split-add-pane]").forEach((button) => {
    button.addEventListener("click", () => {
      splitDraft.tickets.push(createSplitDraftTicket(splitDraft.tickets.length + 1));
      renderMainModule();
    });
  });
  document.querySelectorAll("[data-split-edit-pane]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.splitEditPane || 0);
      const ticket = splitDraft.tickets[index];
      const nextName = window.prompt("Nombre del ticket", ticket.savedName || defaultTicketName(ticket));
      if (nextName === null) return;
      ticket.savedName = nextName.trim() || ticket.savedName || defaultTicketName(ticket);
      renderMainModule();
    });
  });
  document.querySelectorAll("[data-split-move-here]").forEach((button) => {
    button.addEventListener("click", () => moveSelectedSplitLines(Number(button.dataset.splitMoveHere || 0)));
  });
}

function splitSelectedLineIds() {
  return splitDraft?.selectedLineIds || [];
}

function moveSelectedSplitLines(targetIndex) {
  if (!splitDraft?.selectedLineIds?.length) return;
  const selected = new Set(splitDraft.selectedLineIds);
  const target = splitDraft.tickets[targetIndex];
  if (!target) return;
  let moved = 0;
  splitDraft.tickets.forEach((ticket, sourceIndex) => {
    if (sourceIndex === targetIndex) return;
    const remaining = [];
    (ticket.cart.lines || []).forEach((line) => {
      if (!selected.has(line.lineId)) {
        remaining.push(line);
        return;
      }
      target.cart.lines.push(line);
      moved += 1;
    });
    ticket.cart.lines = remaining;
  });
  splitDraft.selectedLineIds = [];
  if (!moved) showToast("Selecciona articulos de otro ticket para mover aqui.");
  renderMainModule();
}

function saveSplitDraft() {
  if (!splitDraft) return;
  const ticketsWithLines = splitDraft.tickets.filter((ticket) => ticket.cart?.lines?.length);
  if (ticketsWithLines.length < 2) {
    showToast("Divide los articulos en al menos dos tickets.");
    return;
  }
  ticketsWithLines.forEach((ticket) => {
    ticket.savedAt = ticket.savedAt || now();
    ticket.assignedTo = ticket.assignedTo || state.currentTicket.assignedTo || state.operator.name || "";
    touchTicket(ticket);
    upsertTicket(ticket);
  });
  state.currentTicket = JSON.parse(JSON.stringify(ticketsWithLines[0]));
  audit("ticket_split_saved", { sourceTicketId: splitDraft.sourceTicketId, count: ticketsWithLines.length });
  splitDraft = null;
  saveAndRender("Ticket dividido y guardado.");
  showMainModule("pos");
}

function deleteSelectedSavedTickets() {
  if (!selectedSavedTicketIds.length) return;
  const ok = window.confirm(`Deseas borrar ${selectedSavedTicketIds.length} ticket${selectedSavedTicketIds.length === 1 ? "" : "s"}?`);
  if (!ok) return;
  const selected = new Set(selectedSavedTicketIds);
  state.tickets = state.tickets.map((ticket) => {
    if (!selected.has(ticket.ticketId)) return ticket;
    return Object.assign({}, ticket, { status: "void", voidedAt: now(), updatedAt: now() });
  });
  audit("saved_tickets_deleted", { count: selectedSavedTicketIds.length });
  selectedSavedTicketIds = [];
  saveAndRender("Tickets borrados.");
  showMainModule("tickets-abiertos");
}

function combineSelectedSavedTickets() {
  if (selectedSavedTicketIds.length < 2) {
    showToast("Selecciona al menos dos tickets para combinar.");
    return;
  }
  const selected = state.tickets.filter((ticket) => selectedSavedTicketIds.includes(ticket.ticketId));
  const target = selected[0];
  selected.slice(1).forEach((ticket) => {
    target.cart.lines.push(...ticket.cart.lines);
    ticket.cart.lines = [];
    ticket.status = "merged";
    ticket.mergedIntoTicketId = target.ticketId;
    touchTicket(ticket);
    upsertTicket(ticket);
  });
  target.savedName = `${target.savedName || defaultTicketName(target)} combinado`;
  touchTicket(target);
  upsertTicket(target);
  audit("saved_tickets_combined", { targetTicketId: target.ticketId, count: selected.length });
  selectedSavedTicketIds = [target.ticketId];
  saveAndRender("Tickets combinados.");
  showMainModule("tickets-abiertos");
}

function transferSelectedSavedTickets() {
  if (!selectedSavedTicketIds.length) return;
  const seller = window.prompt("Transferir ticket a vendedor o colaborador");
  if (seller === null) return;
  const cleanSeller = seller.trim();
  if (!cleanSeller) {
    showToast("Coloca el vendedor o colaborador.");
    return;
  }
  state.tickets.forEach((ticket) => {
    if (!selectedSavedTicketIds.includes(ticket.ticketId)) return;
    ticket.assignedTo = cleanSeller;
    touchTicket(ticket);
    upsertTicket(ticket);
  });
  audit("saved_tickets_transferred", { count: selectedSavedTicketIds.length, assignedTo: cleanSeller });
  saveAndRender("Tickets transferidos.");
  showMainModule("tickets-abiertos");
}

function ticketAgeLabel(value) {
  const created = new Date(value || now()).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (minutes < 1) return "Guardado ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

function saveTaxDraft() {
  updateTaxDraftFromForm();
  if (!isTaxDraftComplete()) {
    showToast("Completa nombre, tasa y tipo de impuesto.");
    return;
  }
  state.taxes = Array.isArray(state.taxes) ? state.taxes : [];
  const tax = Object.assign({}, taxDraft, {
    taxId: taxDraft.taxId || id("tax"),
    rate: round4(Number(taxDraft.rate || 0)),
    createdAt: taxDraft.createdAt || now(),
    updatedAt: now()
  });
  const index = state.taxes.findIndex((row) => row.taxId === tax.taxId);
  if (index >= 0) state.taxes[index] = tax;
  else state.taxes.push(tax);
  audit("tax_saved", { taxId: tax.taxId, products: tax.productIds.length });
  taxDraft = createTaxDraft();
  taxApplyQuery = "";
  saveAndRender("Impuesto guardado.");
  showMainModule("impuestos");
}

function generalDarkLabel(value) {
  if (value === "on") return "Activado";
  if (value === "off") return "Desactivado";
  return "Ajuste del dispositivo";
}

function savePrinterDraft() {
  updatePrinterDraftFromForm();
  if (!printerDraft.name) {
    showToast("Coloca el nombre de la impresora.");
    return;
  }
  if (!printerDraft.model || printerDraft.model === "Ninguna Impresora") {
    showToast("Selecciona el modelo de la impresora.");
    return;
  }
  const connectionType = printerModelConnectionType(printerDraft.model);
  if (connectionType === "Bluetooth" && !printerDraft.bluetoothName) {
    showToast("Busca o selecciona la impresora Bluetooth.");
    return;
  }
  if (connectionType === "Ethernet" && !printerDraft.ipAddress) {
    showToast("Coloca la direccion IP de la impresora.");
    return;
  }
  if (connectionType === "USB" && !printerDraft.usbName) {
    showToast("Busca o selecciona la impresora USB.");
    return;
  }
  state.printers = Array.isArray(state.printers) ? state.printers : [];
  const printer = Object.assign({}, printerDraft, {
    printerId: printerDraft.printerId || id("printer"),
    connectionType,
    createdAt: printerDraft.createdAt || now(),
    updatedAt: now()
  });
  state.printers.push(printer);
  audit("printer_created", { printerId: printer.printerId, model: printer.model });
  printerDraft = createPrinterDraft();
  printerSearchMode = "";
  saveAndRender("Impresora guardada.");
  showMainModule("impresoras");
}

function deleteTicketLine(lineId) {
  const line = state.currentTicket.cart.lines.find((row) => row.lineId === lineId);
  if (!line) return;
  state.currentTicket.cart.lines = state.currentTicket.cart.lines.filter((row) => row.lineId !== lineId);
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("ticket_line_deleted", { ticketId: state.currentTicket.ticketId, lineId, productId: line.productId });
  saveAndRender(`${line.name} eliminado del ticket.`);
  showMainModule("ticket");
}

async function handleTopAction(action) {
  if (!topActionEnabled(action)) {
    showToast("Esta opcion estara disponible cuando el ticket cumpla las condiciones.");
    return;
  }
  const actions = {
    "clear-ticket": clearCurrentTicket,
    "reprint-order": requestTicketReprint,
    "edit-ticket": openEditCurrentTicket,
    "assign-ticket": assignCurrentTicket,
    "split-ticket": beginSplitCurrentTicket,
    "merge-ticket": mergeLatestOpenTicket,
    "sync-now": syncPosNow
  };
  const run = actions[action];
  if (!run) {
    showToast("Accion no disponible.");
    return;
  }
  await run();
}

function topActionEnabled(action) {
  const ticket = state.currentTicket || {};
  const cart = ticket.cart || { lines: [] };
  const lines = Array.isArray(cart.lines) ? cart.lines : [];
  const itemCount = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const isSaved = Boolean(ticket.savedAt);
  if (action === "clear-ticket") return lines.length > 0;
  if (action === "edit-ticket") return isSaved;
  if (action === "assign-ticket") return isSaved;
  if (action === "split-ticket") return itemCount > 2 || lines.length > 2;
  if (action === "merge-ticket") return state.tickets.some((row) => row.status === "open" && row.ticketId !== ticket.ticketId && row.cart?.lines?.length);
  if (action === "reprint-order") return lines.length > 0;
  if (action === "sync-now") return true;
  return false;
}

function updateTopActionStates() {
  document.querySelectorAll("[data-top-action]").forEach((button) => {
    const enabled = topActionEnabled(button.dataset.topAction || "");
    button.disabled = !enabled;
    button.classList.toggle("is-disabled", !enabled);
    button.setAttribute("aria-disabled", String(!enabled));
  });
}

function clearCurrentTicket() {
  if (!state.currentTicket.cart.lines.length) {
    showToast("El ticket ya esta limpio.");
    return;
  }
  const ok = window.confirm("Deseas despejar todos los productos del ticket actual?");
  if (!ok) return;
  const removedCount = state.currentTicket.cart.lines.length;
  state.currentTicket.cart.lines = [];
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("ticket_cleared", { ticketId: state.currentTicket.ticketId, removedCount });
  saveAndRender("Ticket despejado.");
}

function requestTicketReprint() {
  if (!state.currentTicket.cart.lines.length) {
    showToast("No hay productos para reimprimir.");
    return;
  }
  state.printJobs = Array.isArray(state.printJobs) ? state.printJobs : [];
  const cart = calculateCart(state.currentTicket.cart);
  state.printJobs.push({
    jobId: id("print"),
    type: "order_reprint",
    status: "queued",
    ticketId: state.currentTicket.ticketId,
    tableLabel: state.currentTicket.tableLabel || "Orden",
    lines: cart.lines.map((line) => ({ name: line.name, qty: line.qty, total: line.totals.total })),
    totals: cart.totals,
    createdAt: now(),
    updatedAt: now()
  });
  audit("ticket_reprint_requested", { ticketId: state.currentTicket.ticketId, lines: cart.lines.length });
  saveAndRender("Pedido enviado a reimpresion virtual.");
}

function editCurrentTicket() {
  if (!state.currentTicket.cart.lines.length) {
    showToast("Agrega productos para editar el ticket.");
    return;
  }
  showMainModule("ticket");
  showToast("Desliza un producto hacia la izquierda para eliminarlo.");
}

function assignCurrentTicket() {
  const currentOwner = state.currentTicket.assignedTo || state.operator.name || "";
  const assignedTo = window.prompt("Asignar este ticket a vendedor o colaborador", currentOwner);
  if (assignedTo === null) return;
  state.currentTicket.assignedTo = assignedTo.trim();
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("ticket_assigned", { ticketId: state.currentTicket.ticketId, assignedTo: state.currentTicket.assignedTo });
  saveAndRender(state.currentTicket.assignedTo ? `Ticket asignado a ${state.currentTicket.assignedTo}.` : "Asignacion del ticket removida.");
}

function splitLastTicketLine() {
  const line = state.currentTicket.cart.lines.at(-1);
  if (!line) {
    showToast("Agrega un producto antes de dividir el ticket.");
    return;
  }
  const splitTicket = createTicket({
    diningOption: state.currentTicket.diningOption,
    tableLabel: `${state.currentTicket.tableLabel || "Orden"} - Cuenta separada`
  });
  splitTicket.assignedTo = state.currentTicket.assignedTo || "";
  moveLine(state.currentTicket, splitTicket, line.lineId, 1);
  upsertTicket(state.currentTicket);
  upsertTicket(splitTicket);
  audit("ticket_line_moved", {
    fromTicketId: state.currentTicket.ticketId,
    toTicketId: splitTicket.ticketId,
    lineId: line.lineId
  });
  saveAndRender("Producto movido a una cuenta separada.");
}

function mergeLatestOpenTicket() {
  const source = state.tickets.filter((ticket) => ticket.status === "open" && ticket.ticketId !== state.currentTicket.ticketId).at(-1);
  if (!source) {
    showToast("No hay cuenta separada disponible para combinar.");
    return;
  }
  state.currentTicket.cart.lines.push(...source.cart.lines);
  touchTicket(state.currentTicket);
  source.cart.lines = [];
  source.status = "merged";
  source.mergedIntoTicketId = state.currentTicket.ticketId;
  touchTicket(source);
  upsertTicket(state.currentTicket);
  upsertTicket(source);
  audit("ticket_merged", { sourceTicketId: source.ticketId, targetTicketId: state.currentTicket.ticketId });
  saveAndRender("Cuenta separada combinada con el ticket actual.");
}

async function syncPosNow() {
  const deviceOk = await registerDevice();
  await heartbeatDevice();
  await publishCdsSnapshot();
  audit("manual_sync_requested", { ticketId: state.currentTicket.ticketId, deviceOk });
  saveAndRender(deviceOk ? "Sincronizacion completada con el hub local." : "Sincronizacion local guardada; hub no disponible.");
}

function bindTicketSwipeRows() {
  document.querySelectorAll("[data-ticket-swipe-row]").forEach((row) => {
    const card = row.querySelector("[data-ticket-line-card]");
    if (!card) return;
    let startX = 0;
    let baseX = 0;
    let dragging = false;
    const setOffset = (value) => {
      const offset = Math.max(-96, Math.min(0, value));
      row.dataset.offset = String(offset);
      card.style.transform = `translateX(${offset}px)`;
      row.classList.toggle("is-open", offset < -48);
      return offset;
    };
    card.addEventListener("pointerdown", (event) => {
      dragging = true;
      startX = event.clientX;
      baseX = row.classList.contains("is-open") ? -96 : 0;
      card.setPointerCapture?.(event.pointerId);
    });
    card.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      setOffset(baseX + event.clientX - startX);
    });
    const finish = () => {
      if (!dragging) return;
      dragging = false;
      const isOpen = Number(row.dataset.offset || 0) < -48;
      row.dataset.offset = isOpen ? "-96" : "0";
      card.style.transform = isOpen ? "translateX(-96px)" : "translateX(0)";
      row.classList.toggle("is-open", isOpen);
    };
    card.addEventListener("pointerup", finish);
    card.addEventListener("pointercancel", finish);
  });
}

function render() {
  applyPosSettings();
  if ($("sync-state")) $("sync-state").textContent = hubMonitor.ok ? "Hub online" : hubUrl() ? "Hub sin conexion" : "Local";
  if ($("operator-label")) $("operator-label").textContent = `Operador: ${state.operator.name} · ${state.operator.role}`;
  $("ticket-label").textContent = state.currentTicket.tableLabel || "Orden";
  $("dining-option").value = state.currentTicket.diningOption || "dineIn";
  renderProducts($("search")?.value || "");
  updateTopActionStates();
  renderTables();
  const cart = calculateCart(state.currentTicket.cart);
  const itemCount = round4(cart.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0));
  updateSaleActionBar(cart);
  $("ticket-items-count").textContent = itemCount;
  $("cart-lines").innerHTML = cart.lines.length
    ? cart.lines.map((line) => `
      <div class="cart-line">
        <span>${escapeHtml(line.name)} x ${line.qty}</span>
        <strong>${moneyWithCurrency(line.totals.total)}</strong>
      </div>
    `).join("")
    : `<div class="mini-row"><span>Carrito vacio</span><strong>0.00</strong></div>`;
  const previousSummary = document.querySelector(".ticket-summary");
  if (previousSummary) previousSummary.remove();
  $("cart-lines").insertAdjacentHTML("beforebegin", `
    <div class="ticket-summary">
      <span>${escapeHtml(state.currentTicket.clientName || "Cliente no asignado")}</span>
      <strong>${itemCount} articulo${itemCount === 1 ? "" : "s"}</strong>
      <span>${escapeHtml(state.currentTicket.tableLabel || "Orden")} · ${escapeHtml(diningOptionLabel(state.currentTicket.diningOption))}</span>
    </div>
  `);
  $("subtotal").textContent = moneyWithCurrency(cart.totals.subtotal);
  $("itbis").textContent = moneyWithCurrency(cart.totals.itbis);
  $("ley").textContent = moneyWithCurrency(cart.totals.ley);
  $("total").textContent = moneyWithCurrency(cart.totals.total);
  $("cds-view").innerHTML = renderCds(cart);
  $("kds-view").innerHTML = renderRows(state.kds.slice(-5), (command) => `${command.tableLabel} · ${command.lines.length} productos · ACK`);
  $("backend-view").innerHTML = `
    <div class="mini-row"><span>Ventas locales</span><strong>${state.sales.length}</strong></div>
    <div class="mini-row"><span>Tickets abiertos</span><strong>${openTickets().length}</strong></div>
    <div class="mini-row"><span>Modo</span><strong>Operacion local</strong></div>
  `;
  $("hub-view").innerHTML = `
    <div class="mini-row"><span>Hub configurado</span><strong>${hubUrl() ? "Si" : "No"}</strong></div>
    <div class="mini-row"><span>Conexion</span><strong>${hubMonitor.ok ? "Online" : "Sin conexion"}</strong></div>
    <div class="mini-row"><span>Ultimo latido</span><strong>${escapeHtml(formatConnectionTime(hubMonitor.lastOkAt))}</strong></div>
    <div class="mini-row"><span>KDS enviados</span><strong>${state.kds.length}</strong></div>
    <div class="mini-row"><span>Pendientes retry</span><strong>${state.kds.filter((row) => row.ackStatus === "retry").length}</strong></div>
  `;
  const config = loadDeviceConfig("POS");
  $("device-view").innerHTML = `
    <div class="mini-row"><span>Rol</span><strong>${escapeHtml(config.role)}</strong></div>
    <div class="mini-row"><span>ID</span><strong>${escapeHtml(config.deviceId.slice(-8))}</strong></div>
    <div class="mini-row"><span>Estacion</span><strong>${escapeHtml(config.station || "Sin definir")}</strong></div>
  `;
  const close = state.shiftCloseReports.at(-1);
  $("shift-close-view").innerHTML = close ? `
    <div class="mini-row"><span>Ventas</span><strong>${close.salesCount}</strong></div>
    <div class="mini-row"><span>Total</span><strong>${moneyWithCurrency(close.grossTotal)}</strong></div>
    <div class="mini-row"><span>Diferencia</span><strong>${moneyWithCurrency(close.difference)}</strong></div>
  ` : `<div class="mini-row"><span>Turno abierto</span><strong>${escapeHtml(state.shift.status)}</strong></div>`;
  const separate = openTickets().filter((ticket) => ticket.ticketId !== state.currentTicket.ticketId);
  $("ticket-tools-view").innerHTML = `
    <div class="mini-row"><span>Cuenta actual</span><strong>${cart.lines.length} productos</strong></div>
    <div class="mini-row"><span>Cuentas abiertas</span><strong>${openTickets().length}</strong></div>
    <div class="mini-row"><span>Separadas</span><strong>${separate.length}</strong></div>
  `;
  $("audit-view").innerHTML = renderRows(state.audit.slice(-6), (row) => `${row.actor}: ${row.type}`);
  if ($("main-drawer").classList.contains("is-open")) {
    $("drawer-role").textContent = state.operator.role || "Operador";
    $("drawer-name").textContent = state.operator.name || "Operador";
  }
  renderTopbarContext();
  const focusedId = document.activeElement?.id || "";
  if (activeMainView !== "pos" && !["treasury-amount", "treasury-description"].includes(focusedId)) {
    renderMainModule();
  }
}

function updateSaleActionBar(cart) {
  const hasItems = cart.lines.length > 0;
  $("tickets-action-label").textContent = hasItems ? "GUARDAR" : "TICKETS ABIERTOS";
  $("charge-action-total").textContent = moneyWithCurrency(cart.totals.total);
  $("charge-action").disabled = !hasItems;
  $("sale-action-bar").classList.toggle("has-items", hasItems);
}

function animateProductToTicket(source) {
  const target = $("ticket-mode-chip");
  if (!source || !target) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const flyer = document.createElement("div");
  flyer.className = "product-flyer";
  flyer.textContent = "+1";
  flyer.style.left = `${from.left + from.width / 2}px`;
  flyer.style.top = `${from.top + from.height / 2}px`;
  flyer.style.setProperty("--fly-x", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
  flyer.style.setProperty("--fly-y", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
  document.body.appendChild(flyer);
  setTimeout(() => flyer.remove(), 620);
}

function applyPosSettings() {
  const settings = state.posSettings || createPosSettings();
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false;
  const darkEnabled = settings.darkMode === "on" || (settings.darkMode === "system" && systemDark);
  document.body.classList.toggle("pos-dark", darkEnabled);
  document.body.classList.toggle("pos-layout-list", settings.articleLayout === "list");
}

function renderTopbarContext() {
  const isPos = activeMainView === "pos";
  const isScanner = ["barcode-scanner", "customer-barcode-scanner"].includes(activeMainView);
  const title = $("topbar-module-title");
  const ticketChip = $("ticket-mode-chip");
  const addClient = $("add-client");
  const moreWrap = document.querySelector(".topbar-more-wrap");
  const history = $("topbar-history");
  const menuButton = $("main-menu");
  const saveButton = $("topbar-save");
  document.body.classList.toggle("scanner-mode", isScanner);
  document.body.classList.toggle("topbar-save-mode", ["editar-ticket", "dividir-ticket", "crear-cliente"].includes(activeMainView));
  if (title) {
    title.hidden = isPos || isScanner;
    title.textContent = topbarTitleForView(activeMainView);
  }
  if (ticketChip) ticketChip.hidden = !(isPos || activeMainView === "barcode-scanner");
  if (addClient) addClient.hidden = !isPos;
  if (moreWrap) moreWrap.hidden = !(isPos || activeMainView === "barcode-scanner");
  if (saveButton) saveButton.hidden = !["editar-ticket", "dividir-ticket", "crear-cliente"].includes(activeMainView);
  document.querySelectorAll(".scanner-only").forEach((button) => {
    button.hidden = !isScanner;
  });
  if (history) history.hidden = activeMainView !== "turno";
  if (menuButton) {
    const hasBack = Boolean(topbarBackTarget(activeMainView));
    menuButton.classList.toggle("is-back", hasBack);
    menuButton.setAttribute("aria-label", hasBack ? "Volver" : "Abrir menu");
    menuButton.setAttribute("title", hasBack ? "Volver" : "Abrir menu");
  }
}

function topbarTitleForView(view) {
  if (view === "turno") return "Turno";
  if (view === "ticket") return "Ticket";
  if (view === "barcode-scanner") return "Escanear codigo";
  if (view === "customer-barcode-scanner") return "Escanee el codigo de barra";
  if (view === "anadir-cliente-ticket") return "Anadir cliente al ticket";
  if (view === "crear-cliente") return "Anadir cliente";
  if (view === "guardar-ticket") return "Guardar Ticket";
  if (view === "editar-ticket") return "Editar Ticket";
  if (view === "dividir-ticket") return "Dividir Ticket";
  if (view === "tickets-abiertos") return "Tickets abiertos";
  if (view === "recibos") return "Recibos";
  if (view === "articulos") return "Articulos";
  if (view === "catalogo-articulos") return "Articulos";
  if (view === "categorias") return "Categorias";
  if (view === "modificadores") return "Modificadores";
  if (view === "descuentos") return "Descuentos";
  if (view === "configuracion") return "Configuracion";
  if (view === "equipo") return "Equipo";
  if (view === "impresoras") return "Impresoras";
  if (view === "crear-impresora") return "Crear Impresora";
  if (view === "impuestos") return "Impuestos";
  if (view === "crear-impuesto") return "Crear impuestos";
  if (view === "aplicar-impuesto") return "Aplicar impuestos";
  if (view === "general") return "General";
  if (view === "tesoreria") return "Gestion de Tesoreria";
  if (view === "cerrar-turno") return "Cerrar el Turno";
  if (view === "config-turno") return "Configuracion Turno";
  if (view === "billetes-monedas") return "Billetes y Monedas";
  if (view === "usuarios-permisos") return "Usuarios y Permisos";
  if (view === "cierres") return "Historial de Cierres";
  if (String(view || "").startsWith("cierre:")) return "Detalle de Cierre";
  return "Ventas";
}

function topbarBackTarget(view) {
  if (view === "tesoreria") return "turno";
  if (view === "cerrar-turno") return "turno";
  if (view === "cierres") return "turno";
  if (view === "ticket") return "pos";
  if (view === "barcode-scanner") return "pos";
  if (view === "customer-barcode-scanner") return barcodeScanner.returnTo || "anadir-cliente-ticket";
  if (view === "anadir-cliente-ticket") return "pos";
  if (view === "crear-cliente") return "anadir-cliente-ticket";
  if (view === "guardar-ticket") return "pos";
  if (view === "editar-ticket") return "pos";
  if (view === "dividir-ticket") return "pos";
  if (view === "tickets-abiertos") return "pos";
  if (["catalogo-articulos", "categorias", "modificadores", "descuentos"].includes(view)) return "articulos";
  if (view === "equipo") return "configuracion";
  if (view === "impresoras") return "configuracion";
  if (view === "crear-impresora") return "impresoras";
  if (view === "impuestos") return "configuracion";
  if (view === "crear-impuesto") return "impuestos";
  if (view === "aplicar-impuesto") return "crear-impuesto";
  if (view === "general") return "configuracion";
  if (view === "config-turno") return "configuracion";
  if (view === "billetes-monedas") return "config-turno";
  if (view === "usuarios-permisos") return "configuracion";
  if (String(view || "").startsWith("cierre:")) return "cierres";
  return "";
}

function installNativeKeyboardGuard() {
  document.documentElement.style.background = "#f7f5ee";
  document.body?.classList?.remove("keyboard-open");
  const keyboard = window.Capacitor?.Plugins?.Keyboard;
  if (!keyboard?.addListener) return;
  keyboard.addListener("keyboardWillShow", (info) => {
    const height = Number(info?.keyboardHeight || 0);
    document.documentElement.classList.add("keyboard-open");
    document.body.classList.add("keyboard-open");
    document.documentElement.style.setProperty("--keyboard-height", `${height}px`);
  });
  keyboard.addListener("keyboardWillHide", () => {
    document.documentElement.classList.remove("keyboard-open");
    document.body.classList.remove("keyboard-open");
    document.documentElement.style.setProperty("--keyboard-height", "0px");
  });
}

function renderTables() {
  $("tables").innerHTML = tables.map((table) => {
    const active = table.tableId === state.currentTicket.tableId;
    const occupied = state.tickets.some((ticket) => ticket.status === "open" && ticket.tableId === table.tableId && ticket.ticketId !== state.currentTicket.ticketId);
    const className = ["table-btn", active ? "active" : "", occupied ? "occupied" : ""].filter(Boolean).join(" ");
    return `<button class="${className}" data-table-id="${escapeHtml(table.tableId)}">${escapeHtml(table.label)}</button>`;
  }).join("");
  document.querySelectorAll("[data-table-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const table = tables.find((row) => row.tableId === button.dataset.tableId);
      const occupied = state.tickets.some((ticket) => ticket.status === "open" && ticket.tableId === table.tableId && ticket.ticketId !== state.currentTicket.ticketId);
      if (occupied) {
        showToast("Mesa ocupada por otra cuenta abierta.");
        return;
      }
      state.currentTicket.diningOption = "dineIn";
      state.currentTicket.tableId = table.tableId;
      state.currentTicket.tableLabel = table.label;
      touchTicket(state.currentTicket);
      upsertTicket(state.currentTicket);
      audit("table_transferred", { tableId: table.tableId });
      saveAndRender(`Orden movida a ${table.label}.`);
    });
  });
}

function renderCds(cart) {
  const lines = cart.lines.map((line) => `<div class="mini-row"><span>${escapeHtml(line.name)} x ${line.qty}</span><strong>${moneyWithCurrency(line.totals.total)}</strong></div>`).join("");
  return `
    ${lines || "<div>Esperando orden...</div>"}
    <div class="mini-row"><span>Total</span><strong>${moneyWithCurrency(cart.totals.total)}</strong></div>
  `;
}

function renderRows(rows, mapper) {
  return rows.length
    ? rows.map((row) => `<div class="mini-row"><span>${escapeHtml(mapper(row))}</span></div>`).join("")
    : `<div class="mini-row"><span>Sin datos aun</span></div>`;
}

function addProduct(product) {
  const existing = state.currentTicket.cart.lines.find((line) => line.productId === product.id);
  if (existing) {
    existing.qty = round4(existing.qty + 1);
  } else {
    state.currentTicket.cart.lines.push({
      lineId: id("line"),
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: 1,
      unitPrice: product.price,
      notes: ""
    });
  }
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
}

function moveLine(fromTicket, toTicket, lineId, qty) {
  const line = fromTicket.cart.lines.find((row) => row.lineId === lineId);
  if (!line) throw new Error("Linea no encontrada.");
  const moveQty = Math.min(Number(qty || line.qty), line.qty);
  const fullMove = moveQty === line.qty;
  const movedLine = fullMove ? line : Object.assign({}, line, { lineId: id("line"), qty: moveQty });
  fromTicket.cart.lines = fromTicket.cart.lines
    .map((row) => {
      if (row.lineId !== lineId) return row;
      if (fullMove) return null;
      return Object.assign({}, row, { qty: round4(row.qty - moveQty) });
    })
    .filter(Boolean);
  toTicket.cart.lines.push(movedLine);
  touchTicket(fromTicket);
  touchTicket(toTicket);
}

function calculateCart(cart) {
  const lines = cart.lines.map((line) => {
    const subtotal = round4(line.qty * line.unitPrice);
    const itbis = round4(subtotal * ITBIS_RATE);
    const ley = cart.diningOption === "dineIn" ? round4(subtotal * LEY_RATE) : 0;
    return Object.assign({}, line, {
      totals: { subtotal, itbis, ley, total: round4(subtotal + itbis + ley) }
    });
  });
  return {
    lines,
    totals: {
      subtotal: round4(lines.reduce((sum, line) => sum + line.totals.subtotal, 0)),
      itbis: round4(lines.reduce((sum, line) => sum + line.totals.itbis, 0)),
      ley: round4(lines.reduce((sum, line) => sum + line.totals.ley, 0)),
      total: round4(lines.reduce((sum, line) => sum + line.totals.total, 0))
    }
  };
}

function createInitialState() {
  const currentTicket = createTicket({ tableId: "mesa_1", tableLabel: "Mesa 1" });
  return {
    operator: { userId: "pos_admin", name: "Administrador", role: "Admin" },
    shift: { shiftId: id("shift"), openingCash: 5000, status: "open", openedAt: now() },
    currentTicket,
    tickets: [currentTicket],
    sales: [],
    kds: [],
    printJobs: [],
    printers: [],
    printerGroups: [],
    categories: [],
    taxes: [],
    customers: [],
    posSettings: createPosSettings(),
    shiftSettings: createShiftSettings(),
    posUsers: [{ userId: "pos_admin", name: "Administrador", email: "admin@wtf.local", password: "301904", role: "Admin", permissions: posPermissionModules().map((module) => module.id), createdAt: now() }],
    treasury: [],
    shiftCloseReports: [],
    audit: []
  };
}

function createTicket({ diningOption = "dineIn", tableId = "", tableLabel = "" } = {}) {
  return {
    ticketId: id("ticket"),
    createdAt: now(),
    updatedAt: now(),
    status: "open",
    diningOption,
    tableId,
    tableLabel,
    clientName: "",
    clientId: "",
    clientCode: "",
    assignedTo: "",
    savedName: "",
    comment: "",
    savedAt: "",
    cart: { diningOption, lines: [] }
  };
}

function touchTicket(ticket) {
  ticket.updatedAt = now();
  ticket.cart.diningOption = ticket.diningOption;
}

function upsertTicket(ticket) {
  const index = state.tickets.findIndex((row) => row.ticketId === ticket.ticketId);
  if (index >= 0) state.tickets[index] = JSON.parse(JSON.stringify(ticket));
  else state.tickets.push(JSON.parse(JSON.stringify(ticket)));
}

function openTickets() {
  return state.tickets.filter((ticket) => ticket.status === "open");
}

function audit(type, payload) {
  state.audit.push({
    eventId: id("audit"),
    type,
    actor: state.operator.name,
    payload,
    createdAt: now()
  });
}

function saveAndRender(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  publishCdsSnapshot();
  render();
  if (message) showToast(message);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.currentTicket?.ticketId) return normalizeState(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createInitialState();
}

function normalizeState(saved) {
  saved.sales = Array.isArray(saved.sales) ? saved.sales : [];
  saved.kds = Array.isArray(saved.kds) ? saved.kds : [];
  saved.printJobs = Array.isArray(saved.printJobs) ? saved.printJobs : [];
  saved.printers = Array.isArray(saved.printers) ? saved.printers : [];
  saved.printerGroups = Array.isArray(saved.printerGroups) ? saved.printerGroups : [];
  saved.categories = Array.isArray(saved.categories) ? saved.categories : [];
  saved.taxes = Array.isArray(saved.taxes) ? saved.taxes : [];
  saved.posSettings = Object.assign(createPosSettings(), saved.posSettings || {});
  saved.shiftSettings = Object.assign(createShiftSettings(), saved.shiftSettings || {});
  saved.shiftSettings.denominations = Array.isArray(saved.shiftSettings.denominations) && saved.shiftSettings.denominations.length ? saved.shiftSettings.denominations : defaultDenominations();
  saved.posUsers = Array.isArray(saved.posUsers) && saved.posUsers.length
    ? saved.posUsers
    : [{ userId: "pos_admin", name: "Administrador", email: "admin@wtf.local", password: "301904", role: "Admin", permissions: posPermissionModules().map((module) => module.id), createdAt: now() }];
  saved.posUsers.forEach((user) => {
    if (normalize(user.role).includes("admin") && (!user.password || user.password === "admin")) {
      user.password = "301904";
    }
  });
  saved.treasury = Array.isArray(saved.treasury) ? saved.treasury : [];
  saved.shiftCloseReports = Array.isArray(saved.shiftCloseReports) ? saved.shiftCloseReports : [];
  saved.customers = Array.isArray(saved.customers) ? saved.customers : [];
  saved.audit = Array.isArray(saved.audit) ? saved.audit : [];
  saved.tickets = Array.isArray(saved.tickets) ? saved.tickets : [saved.currentTicket];
  saved.shift = Object.assign({ shiftId: id("shift"), openingCash: 5000, status: "open", openedAt: now(), openedBy: saved.operator?.name || "Administrador" }, saved.shift || {});
  saved.shift.openedBy = saved.shift.openedBy || saved.operator?.name || "Administrador";
  saved.currentTicket.clientName = saved.currentTicket.clientName || "";
  saved.currentTicket.clientId = saved.currentTicket.clientId || "";
  saved.currentTicket.clientCode = saved.currentTicket.clientCode || "";
  saved.currentTicket.assignedTo = saved.currentTicket.assignedTo || "";
  saved.tickets.forEach((ticket) => {
    ticket.clientName = ticket.clientName || "";
    ticket.clientId = ticket.clientId || "";
    ticket.clientCode = ticket.clientCode || "";
    ticket.assignedTo = ticket.assignedTo || "";
    ticket.savedName = ticket.savedName || "";
    ticket.comment = ticket.comment || "";
    ticket.savedAt = ticket.savedAt || "";
    ticket.cart = ticket.cart || { diningOption: ticket.diningOption || "dineIn", lines: [] };
    ticket.cart.lines = Array.isArray(ticket.cart.lines) ? ticket.cart.lines : [];
  });
  return saved;
}

function createCustomerDraft(existing = {}) {
  return Object.assign({
    customerId: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    customerCode: ""
  }, existing || {});
}

function allCustomers() {
  state.customers = Array.isArray(state.customers) ? state.customers : [];
  return state.customers;
}

function customerDisplayName(customer) {
  return customer?.name || customer?.customerCode || "Cliente sin nombre";
}

function assignCustomerToTicket(customer) {
  if (!customer) return;
  state.currentTicket.clientId = customer.customerId || "";
  state.currentTicket.clientName = customerDisplayName(customer);
  state.currentTicket.clientCode = customer.customerCode || "";
  touchTicket(state.currentTicket);
  upsertTicket(state.currentTicket);
  audit("ticket_customer_assigned", {
    ticketId: state.currentTicket.ticketId,
    customerId: customer.customerId || "",
    customerCode: customer.customerCode || ""
  });
  saveAndRender(`Cliente asignado: ${state.currentTicket.clientName}`);
  showMainModule("pos");
}

function findCustomerByScannedCode(code) {
  const compact = compactCode(code);
  return allCustomers().find((customer) => {
    const values = [customer.customerCode, customer.phone, customer.email, customer.customerId, customer.name];
    return values.some((value) => compactCode(value) === compact || normalize(value) === normalize(code));
  });
}

function renderAddClientToTicketDrawer() {
  const query = normalize(customerQuery);
  const customers = allCustomers().filter((customer) => {
    const haystack = `${customer.name || ""} ${customer.email || ""} ${customer.phone || ""} ${customer.customerCode || ""}`;
    return !query || normalize(haystack).includes(query);
  });
  const rows = customers.length
    ? customers.map((customer) => `
      <button class="customer-result-row" type="button" data-select-customer="${escapeHtml(customer.customerId)}">
        <span class="customer-avatar">${iconSvg("user-plus")}</span>
        <span>
          <strong>${escapeHtml(customerDisplayName(customer))}</strong>
          <small>${escapeHtml([customer.customerCode, customer.phone, customer.email].filter(Boolean).join(" · ") || "Sin codigo registrado")}</small>
        </span>
      </button>
    `).join("")
    : `<div class="ticket-empty">No hay clientes guardados con esa busqueda.</div>`;
  return `
    <div class="drawer-section customer-screen">
      <div class="customer-search-row">
        <span class="vector-icon">${iconSvg("search")}</span>
        <input id="customer-search" type="search" placeholder="Buscar cliente" value="${escapeHtml(customerQuery)}">
        <button id="scan-customer-code" class="icon-btn barcode-scan-btn" type="button" aria-label="Escanear codigo de cliente" title="Escanear codigo de cliente"><span class="vector-icon">${iconSvg("barcode")}</span></button>
      </div>
      <button id="new-customer" class="btn primary customer-new-button" type="button">${iconSvg("user-plus")} Anadir cliente nuevo</button>
      <div class="customer-result-list">
        ${rows}
      </div>
    </div>
  `;
}

function renderCreateCustomerDrawer() {
  const field = (idValue, label, value, type = "text") => `
    <label class="customer-field">
      <span>${label}</span>
      <input id="${idValue}" type="${type}" value="${escapeHtml(value || "")}">
    </label>
  `;
  return `
    <div class="drawer-section customer-screen customer-form-screen">
      <div class="customer-form-grid">
        ${field("customer-name", "Nombre", customerDraft.name)}
        ${field("customer-email", "Correo electronico", customerDraft.email, "email")}
        ${field("customer-phone", "Numero", customerDraft.phone, "tel")}
        ${field("customer-address", "Direccion", customerDraft.address)}
        ${field("customer-city", "Ciudad", customerDraft.city)}
        ${field("customer-province", "Provincia", customerDraft.province)}
        ${field("customer-postal", "Codigo postal", customerDraft.postalCode)}
        ${field("customer-country", "Pais", customerDraft.country)}
      </div>
      <label class="customer-field customer-code-field">
        <span>Codigo de cliente</span>
        <div class="customer-code-row">
          <input id="customer-code" type="text" value="${escapeHtml(customerDraft.customerCode || "")}">
          <button id="scan-new-customer-code" class="btn secondary" type="button"><span class="vector-icon">${iconSvg("barcode")}</span> Escanear codigo de barras</button>
        </div>
      </label>
    </div>
  `;
}

function bindCustomerActions() {
  const search = $("customer-search");
  if (search) {
    search.addEventListener("input", () => {
      customerQuery = search.value;
      renderMainModule();
      $("customer-search")?.focus();
    });
  }
  const scanCustomer = $("scan-customer-code");
  if (scanCustomer) scanCustomer.addEventListener("click", () => openBarcodeScanner("customer-assign", "anadir-cliente-ticket"));
  const newCustomer = $("new-customer");
  if (newCustomer) newCustomer.addEventListener("click", () => {
    customerDraft = createCustomerDraft();
    showMainModule("crear-cliente");
  });
  document.querySelectorAll("[data-select-customer]").forEach((button) => {
    button.addEventListener("click", () => {
      const customer = allCustomers().find((row) => row.customerId === button.dataset.selectCustomer);
      assignCustomerToTicket(customer);
    });
  });
  const scanNewCustomerCode = $("scan-new-customer-code");
  if (scanNewCustomerCode) scanNewCustomerCode.addEventListener("click", () => {
    captureCustomerDraftFromForm();
    openBarcodeScanner("customer-form", "crear-cliente");
  });
}

function captureCustomerDraftFromForm() {
  customerDraft = createCustomerDraft({
    customerId: customerDraft.customerId || "",
    name: $("customer-name")?.value?.trim() || customerDraft.name || "",
    email: $("customer-email")?.value?.trim() || customerDraft.email || "",
    phone: $("customer-phone")?.value?.trim() || customerDraft.phone || "",
    address: $("customer-address")?.value?.trim() || customerDraft.address || "",
    city: $("customer-city")?.value?.trim() || customerDraft.city || "",
    province: $("customer-province")?.value?.trim() || customerDraft.province || "",
    postalCode: $("customer-postal")?.value?.trim() || customerDraft.postalCode || "",
    country: $("customer-country")?.value?.trim() || customerDraft.country || "",
    customerCode: $("customer-code")?.value?.trim() || customerDraft.customerCode || ""
  });
}

function saveCustomerDraft() {
  captureCustomerDraftFromForm();
  if (!customerDraft.name.trim()) {
    showToast("Completa el nombre del cliente.");
    return;
  }
  const existingIndex = allCustomers().findIndex((row) => row.customerId === customerDraft.customerId);
  const savedCustomer = Object.assign(createCustomerDraft(customerDraft), {
    customerId: customerDraft.customerId || id("customer"),
    updatedAt: now(),
    createdAt: customerDraft.createdAt || now()
  });
  if (existingIndex >= 0) state.customers[existingIndex] = savedCustomer;
  else state.customers.push(savedCustomer);
  audit("customer_saved", { customerId: savedCustomer.customerId, customerCode: savedCustomer.customerCode || "" });
  assignCustomerToTicket(savedCustomer);
}

function openBarcodeScanner(mode = "product", returnTo = "pos") {
  barcodeScanner.mode = mode;
  barcodeScanner.returnTo = returnTo;
  showMainModule(mode === "product" ? "barcode-scanner" : "customer-barcode-scanner");
}

async function publishCdsSnapshot() {
  if (!state.currentTicket?.cart?.lines?.length) return;
  const cart = calculateCart(state.currentTicket.cart);
  await postHub("/api/cds/snapshot", {
    ticketId: state.currentTicket.ticketId,
    tableLabel: state.currentTicket.tableLabel || "Orden",
    status: state.currentTicket.status,
    lines: cart.lines.map((line) => ({
      name: line.name,
      qty: line.qty,
      total: line.totals.total
    })),
    totals: cart.totals,
    message: "Revise su orden antes del pago.",
    updatedAt: now()
  });
}

async function testHub() {
  const baseUrl = hubUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
    hubMonitor = response.ok
      ? { ok: true, lastOkAt: now(), lastErrorAt: hubMonitor.lastErrorAt }
      : { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return response.ok;
  } catch {
    hubMonitor = { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return false;
  }
}

async function applyPairingText(rawValue) {
  const parsed = parsePairingText(rawValue);
  if (!parsed.hubUrl) return false;
  localStorage.setItem(HUB_URL_KEY, parsed.hubUrl.replace(/\/+$/, ""));
  $("hub-url").value = parsed.hubUrl.replace(/\/+$/, "");
  const ok = await testHub();
  if (ok) await registerDevice();
  return ok;
}

function parsePairingText(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) return { hubUrl: "" };
  if (/^https?:\/\//i.test(text)) return { hubUrl: text };
  try {
    const parsed = JSON.parse(text);
    if (parsed?.hubUrl) return { hubUrl: String(parsed.hubUrl) };
  } catch {}
  try {
    const url = new URL(text);
    const hubUrl = url.searchParams.get("hub") || url.searchParams.get("hubUrl");
    if (hubUrl) return { hubUrl };
  } catch {}
  return { hubUrl: "" };
}

function renderBarcodeScannerView(mode = "product") {
  const actionText = mode === "customer" ? "Activar camara para cliente" : "Activar camara";
  return `
    <div class="barcode-scanner-screen">
      <div class="barcode-camera-stage">
        <video id="barcode-video" autoplay playsinline muted></video>
        <div class="barcode-frame" aria-hidden="true"></div>
        <div class="barcode-status" id="barcode-status">Solicitando camara...</div>
      </div>
      <button id="start-barcode-scanner" class="btn primary barcode-start-button" type="button">${escapeHtml(actionText)}</button>
    </div>
  `;
}

function bindBarcodeScannerActions() {
  const startBarcode = $("start-barcode-scanner");
  if (startBarcode) {
    startBarcode.addEventListener("click", () => startBarcodeScanner().catch(() => {
      updateBarcodeStatus("No pude abrir la camara. Revisa el permiso del dispositivo.");
    }));
    setTimeout(() => {
      if (["barcode-scanner", "customer-barcode-scanner"].includes(activeMainView) && !barcodeScanner.active) startBarcode.click();
    }, 80);
  }
  const flipBarcode = $("flip-barcode-camera");
  if (flipBarcode) flipBarcode.addEventListener("click", () => flipBarcodeScannerCamera().catch(() => {
    updateBarcodeStatus("No pude girar la camara.");
  }));
  const torchBarcode = $("toggle-barcode-torch");
  if (torchBarcode) torchBarcode.addEventListener("click", () => toggleBarcodeTorch().catch(() => {
    updateBarcodeStatus("Este dispositivo no permite activar el flash desde aqui.");
  }));
}

async function startBarcodeScanner() {
  if (!["barcode-scanner", "customer-barcode-scanner"].includes(activeMainView)) return;
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    updateBarcodeStatus("Este dispositivo no permite escanear codigos desde la camara.");
    return;
  }
  stopBarcodeScanner();
  const desiredFormats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "codabar", "itf", "qr_code"];
  const supportedFormats = typeof BarcodeDetector.getSupportedFormats === "function"
    ? await BarcodeDetector.getSupportedFormats()
    : desiredFormats;
  const formats = desiredFormats.filter((format) => supportedFormats.includes(format));
  if (!formats.length) {
    updateBarcodeStatus("Este dispositivo no reporta formatos de codigos compatibles.");
    return;
  }
  barcodeScanner.detector = new BarcodeDetector({ formats });
  barcodeScanner.stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: barcodeScanner.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });
  barcodeScanner.active = true;
  barcodeScanner.torch = false;
  barcodeScanner.lastCode = "";
  barcodeScanner.lastReadAt = 0;
  const video = $("barcode-video");
  if (!video) return;
  video.srcObject = barcodeScanner.stream;
  await video.play();
  updateBarcodeStatus("Camara lista. Coloca el codigo dentro del cuadro verde.");
  requestAnimationFrame(scanBarcodeFrame);
}

function stopBarcodeScanner() {
  barcodeScanner.active = false;
  if (barcodeScanner.stream) {
    barcodeScanner.stream.getTracks().forEach((track) => track.stop());
  }
  barcodeScanner.stream = null;
}

async function flipBarcodeScannerCamera() {
  if (!["barcode-scanner", "customer-barcode-scanner"].includes(activeMainView)) return;
  barcodeScanner.facingMode = barcodeScanner.facingMode === "environment" ? "user" : "environment";
  await startBarcodeScanner();
}

async function toggleBarcodeTorch() {
  const track = barcodeScanner.stream?.getVideoTracks?.()[0];
  if (!track) return;
  const capabilities = track.getCapabilities?.() || {};
  if (!capabilities.torch) throw new Error("Torch no disponible");
  barcodeScanner.torch = !barcodeScanner.torch;
  await track.applyConstraints({ advanced: [{ torch: barcodeScanner.torch }] });
  updateBarcodeStatus(barcodeScanner.torch ? "Flash activado." : "Flash desactivado.");
}

async function scanBarcodeFrame() {
  if (!barcodeScanner.active || !["barcode-scanner", "customer-barcode-scanner"].includes(activeMainView)) return;
  const video = $("barcode-video");
  if (!video || video.readyState < 2) {
    requestAnimationFrame(scanBarcodeFrame);
    return;
  }
  try {
    const codes = await barcodeScanner.detector.detect(video);
    const value = String(codes?.[0]?.rawValue || "").trim();
    if (value) handleScannedCode(value);
  } catch {
    updateBarcodeStatus("No pude procesar la imagen de la camara.");
  }
  requestAnimationFrame(scanBarcodeFrame);
}

function handleScannedCode(code) {
  if (barcodeScanner.mode === "customer-assign") {
    handleScannedCustomerCode(code, "assign");
    return;
  }
  if (barcodeScanner.mode === "customer-form") {
    handleScannedCustomerCode(code, "form");
    return;
  }
  handleScannedSaleCode(code);
}

function handleScannedSaleCode(code) {
  const readAt = Date.now();
  if (barcodeScanner.lastCode === code && readAt - barcodeScanner.lastReadAt < 1800) return;
  barcodeScanner.lastCode = code;
  barcodeScanner.lastReadAt = readAt;
  const product = findProductByScannedCode(code);
  if (!product) {
    updateBarcodeStatus(`Codigo no registrado: ${code}`);
    return;
  }
  addProduct(product);
  audit("barcode_product_added", { code, productId: product.id, sku: product.sku });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  publishCdsSnapshot();
  render();
  updateBarcodeStatus(`${product.name} agregado al ticket.`);
}

function handleScannedCustomerCode(code, mode) {
  const readAt = Date.now();
  if (barcodeScanner.lastCode === code && readAt - barcodeScanner.lastReadAt < 1800) return;
  barcodeScanner.lastCode = code;
  barcodeScanner.lastReadAt = readAt;
  if (mode === "form") {
    customerDraft.customerCode = code;
    stopBarcodeScanner();
    showMainModule("crear-cliente");
    showToast("Codigo de cliente agregado.");
    return;
  }
  const customer = findCustomerByScannedCode(code);
  if (!customer) {
    updateBarcodeStatus(`Cliente no registrado con este codigo: ${code}`);
    return;
  }
  stopBarcodeScanner();
  assignCustomerToTicket(customer);
}

function findProductByScannedCode(code) {
  const compact = compactCode(code);
  return products.find((product) => {
    const values = [product.sku, product.id, product.name, product.barcode, product.codigo, product.code];
    return values.some((value) => compactCode(value) === compact || normalize(value) === normalize(code));
  });
}

function compactCode(value) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function updateBarcodeStatus(message) {
  const status = $("barcode-status");
  if (status) status.textContent = message;
}

async function scanPairingQr() {
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    showToast("Este Android no permite leer QR aqui. Pega el dato del QR manualmente.");
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  const overlay = document.createElement("div");
  overlay.className = "qr-scan-overlay";
  overlay.innerHTML = `
    <div class="qr-scan-card">
      <video autoplay playsinline></video>
      <button class="btn secondary close-btn" type="button">Cerrar lector</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const video = overlay.querySelector("video");
  const close = overlay.querySelector("button");
  video.srcObject = stream;
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  let active = true;
  const stop = () => {
    active = false;
    stream.getTracks().forEach((track) => track.stop());
    overlay.remove();
  };
  close.addEventListener("click", stop);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const tick = async () => {
    if (!active) return;
    if (video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const results = await detector.detect(canvas);
      const value = results[0]?.rawValue;
      if (value) {
        $("pairing-data").value = value;
        stop();
        const ok = await applyPairingText(value);
        showToast(ok ? "QR conectado al hub." : "QR leido, pero no pude conectar al hub.");
        render();
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function postHub(path, body) {
  const baseUrl = hubUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    hubMonitor = response.ok
      ? { ok: true, lastOkAt: now(), lastErrorAt: hubMonitor.lastErrorAt }
      : { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return response.ok;
  } catch {
    hubMonitor = { ok: false, lastOkAt: hubMonitor.lastOkAt, lastErrorAt: now() };
    return false;
  }
}

async function enableKioskMode() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }
    return Boolean(document.fullscreenElement || wakeLock);
  } catch {
    return false;
  }
}

async function registerDevice(config = loadDeviceConfig("POS")) {
  return postHub("/api/devices/register", config);
}

async function heartbeatDevice() {
  const config = loadDeviceConfig("POS");
  await postHub(`/api/devices/${encodeURIComponent(config.deviceId)}/heartbeat`, config);
}

function hubUrl() {
  return String(localStorage.getItem(HUB_URL_KEY) || "").replace(/\/+$/, "");
}

function loadDeviceConfig(role) {
  try {
    const saved = JSON.parse(localStorage.getItem(DEVICE_KEY) || "null");
    if (saved?.deviceId) return Object.assign({ role }, saved, { role });
  } catch {
    localStorage.removeItem(DEVICE_KEY);
  }
  const config = {
    deviceId: id(`device_${role.toLowerCase()}`),
    name: role,
    role,
    station: role === "POS" ? "Caja" : "",
    appVersion: "0.1.0",
    registeredAt: now()
  };
  saveDeviceConfig(config);
  return config;
}

function saveDeviceConfig(config) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(config));
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  setTimeout(() => {
    $("toast").hidden = true;
  }, 3000);
}

function formatConnectionTime(value) {
  if (!value) return "Sin registro";
  return new Date(value).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateOnly(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatTimeOnly(value) {
  if (!value) return "Sin hora";
  return new Date(value).toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatShiftRange(report) {
  const openedAt = report.openedAt || report.createdAt;
  const closedAt = report.closedAt || report.createdAt;
  return `${formatDateOnly(openedAt)} - ${formatDateOnly(closedAt)} · ${formatTimeOnly(openedAt)} - ${formatTimeOnly(closedAt)}`;
}

function parseMoneyInput(value) {
  let cleaned = String(value || "").replace(/[^\d.,-]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    cleaned = cleaned.replaceAll(",", "");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    const last = parts.pop();
    cleaned = `${parts.join("")}.${last}`;
  }
  return round4(Number(cleaned || 0));
}

function formatMoneyInput(value) {
  const amount = parseMoneyInput(value);
  return moneyWithCurrency(amount);
}

function diningOptionLabel(value) {
  if (value === "takeOut") return "Para llevar";
  if (value === "delivery") return "Delivery";
  return "Salon";
}

function money(value) {
  return Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function moneyWithCurrency(value, code = shiftSettings().currency) {
  return `${currencySymbol(code)}${money(value)}`;
}

function round4(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
