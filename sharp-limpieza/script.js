const DAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const STORAGE_KEY = "sharp_limpieza_board_v3";
const BRANCH_CONFIG_STORAGE_KEY = "sharp_limpieza_branch_config_v1";
const SYNC_DEBOUNCE_MS = 250;
const PHOTO_STORAGE_ROOT = "sharp-limpieza";
const PHOTO_INDEX_ROOT = "sharpPhotoIndex";
const PHOTO_RETENTION_DAYS = 15;
const PHOTO_UPLOAD_TIMEOUT_MS = 60000;
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_MAX_WIDTH = 1600;
const PHOTO_MIN_QUALITY = 0.55;

const DEFAULT_BRANCHES = [
  { id: "venezuela", name: "Av. Venezuela", pin: "0001", masterPin: "852347" },
];
const CLEANING_MODULES = [
  { id: "cocina", name: "Cocina" },
  { id: "servicio", name: "Servicio" },
];

// Paste here the URL of your deployed Google Apps Script web app
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUvGPTSyPC_jzlsyEgfrVaS-gxug_Z5QYyFeOuHAEQ7vcysHZ6WPAyKafBPmfTtgiYGQ/exec";
const TESSERACT_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDYnwKvcVLQ-ikk0vkQCBSC8gFtMiwuUc8",
  authDomain: "gestor-de-inventario-wtf-29056.firebaseapp.com",
  databaseURL: "https://gestor-de-inventario-wtf-29056-default-rtdb.firebaseio.com",
  projectId: "gestor-de-inventario-wtf-29056",
  storageBucket: "gestor-de-inventario-wtf-29056.firebasestorage.app",
  messagingSenderId: "863301490729",
  appId: "1:863301490729:web:f5018bd6e6489f69686438"
};

const PHOTO_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDYnwKvcVLQ-ikk0vkQCBSC8gFtMiwuUc8",
  authDomain: "gestor-de-inventario-wtf-29056.firebaseapp.com",
  projectId: "gestor-de-inventario-wtf-29056",
  storageBucket: "gestor-de-inventario-wtf-29056.firebasestorage.app",
  messagingSenderId: "863301490729",
  appId: "1:863301490729:web:f5018bd6e6489f69686438"
};

const LEGEND = {
  red:    { symbol: "🟥", label: "Debe ser cada 1 dia",             short: "Cada 1 dia",          css: "lg-red"    },
  orange: { symbol: "🟧", label: "Debe ser cada 3 dias",            short: "Cada 3 dias",          css: "lg-orange" },
  yellow: { symbol: "🟨", label: "Puede ser cada 4 dias",           short: "Cada 4 dias",          css: "lg-yellow" },
  green:  { symbol: "🟩", label: "Puede ser una semana (mas trabajo)", short: "Semanal (mas trabajo)", css: "lg-green"  },
  purple: { symbol: "🟪", label: "Puede ser una semana (+)",         short: "Semanal (+)",          css: "lg-purple" },
  none:   { symbol: "⚪", label: "Sin color definido en PDF",        short: "Sin color",            css: "lg-none"   }
};

const DEFAULT_TASK_LIBRARY_COCINA = {
  Freidora: [
    { id: "canastas",            name: "Canastas",                              color: "orange" },
    { id: "tapas",               name: "Tapas",                                 color: "red"    },
    { id: "puertas",             name: "Puertas",                               color: "red"    },
    { id: "tubo-drenaje",        name: "Tubo de Drenaje",                       color: "red"    },
    { id: "laterales",           name: "Laterales",                             color: "red"    },
    { id: "parte-atras",         name: "Parte atras",                           color: "orange" },
    { id: "filtrar-aceite",      name: "Filtrar y limpiar el aceite",           color: "orange" },
    { id: "limpieza-interior",   name: "Limpieza interior",                     color: "yellow" },
    { id: "ruedas",              name: "Ruedas",                                color: "purple" },
    { id: "planchas-laterales",  name: "Planchas laterales",                    color: "yellow" },
    { id: "tuberia",             name: "Tuberia",                               color: "yellow" },
    { id: "paredes-izq-trasera", name: "Pared izquierda y pared trasera",       color: "orange" }
  ],
  Plancha: [
    { id: "laterales",            name: "Laterales",                                    color: "red"    },
    { id: "mesa",                 name: "Mesa",                                         color: "red"    },
    { id: "patas",                name: "Patas",                                        color: "red"    },
    { id: "parte-atras",          name: "Parte atras",                                  color: "purple" },
    { id: "cuberteria-utensilios",name: "Cuberteria (Donde se ponen los utensilios)",   color: "red"    },
    { id: "pared-trasera",        name: "Pared trasera",                                color: "none"   },
    { id: "tuberia",              name: "Tuberia",                                      color: "yellow" },
    { id: "botones",              name: "Botones",                                      color: "red"    }
  ],
  Grill: [
    { id: "hornillas",            name: "Hornillas",                                    color: "red"    },
    { id: "malla",                name: "Malla",                                        color: "orange" },
    { id: "quemadores",           name: "Quemadores",                                   color: "green"  },
    { id: "carcaza",              name: "Carcaza",                                      color: "purple" },
    { id: "laterales",            name: "Laterales",                                    color: "red"    },
    { id: "parte-atras",          name: "Parte atras",                                  color: "yellow" },
    { id: "patas",                name: "Patas",                                        color: "red"    },
    { id: "plancha",              name: "Plancha",                                      color: "red"    },
    { id: "botones",              name: "Botones",                                      color: "red"    },
    { id: "tuberia",              name: "Tuberia",                                      color: "yellow" },
    { id: "mesa",                 name: "Mesa",                                         color: "red"    },
    { id: "cuberteria-utensilios",name: "Cuberteria (Donde se ponen los utensilios)",   color: "red"    }
  ],
  Estufa: [
    { id: "hornillas",  name: "Hornillas",  color: "red"    },
    { id: "quemadores", name: "Quemadores", color: "yellow" },
    { id: "plancha",    name: "Plancha",    color: "red"    },
    { id: "carcaza",    name: "Carcaza",    color: "purple" },
    { id: "mesa",       name: "Mesa",       color: "red"    },
    { id: "botones",    name: "Botones",    color: "red"    },
    { id: "tuberia",    name: "Tuberia",    color: "yellow" },
    { id: "interior",   name: "Interior",   color: "purple" }
  ],
  "Bano Maria": [
    { id: "cuerpo",         name: "Cuerpo",             color: "red"  },
    { id: "bocas",          name: "Bocas",               color: "red"  },
    { id: "cuberteria",     name: "Cuberteria",          color: "red"  },
    { id: "cheffin",        name: "Cheffin",             color: "red"  },
    { id: "botones",        name: "Botones",             color: "red"  },
    { id: "microondas",     name: "Microondas",          color: "red"  },
    { id: "mesa-microondas",name: "Mesa del microondas", color: "none" },
    { id: "mesa-pilon",     name: "Mesa de Pilon",       color: "red"  },
    { id: "pilones",        name: "Pilones",             color: "red"  },
    { id: "mano-pilon",     name: "Mano de Pilon",       color: "red"  }
  ],
  "Nevera 1": [
    { id: "nevera",          name: "Nevera",                                                    color: "yellow" },
    { id: "limpieza-interior", name: "Limpieza interior",                                      color: "purple" },
    { id: "limpieza-exterior", name: "Limpieza exterior",                                      color: "orange" },
    { id: "organizacion",    name: "Organizacion",                                             color: "red"    },
    { id: "cambio-cambros",  name: "Limpieza y cambio de cambros plasticos (Si amerita)",      color: "red"    }
  ],
  "Nevera 2": [
    { id: "nevera",          name: "Nevera",                                                    color: "yellow" },
    { id: "limpieza-interior", name: "Limpieza interior",                                      color: "purple" },
    { id: "limpieza-exterior", name: "Limpieza exterior",                                      color: "orange" },
    { id: "organizacion",    name: "Organizacion",                                             color: "red"    },
    { id: "cambio-cambros",  name: "Limpieza y cambio de cambros plasticos (Si amerita)",      color: "red"    }
  ],
  "Nevera 3": [
    { id: "nevera",          name: "Nevera",                                                    color: "yellow" },
    { id: "limpieza-interior", name: "Limpieza interior",                                      color: "purple" },
    { id: "limpieza-exterior", name: "Limpieza exterior",                                      color: "orange" },
    { id: "organizacion",    name: "Organizacion",                                             color: "red"    },
    { id: "cambio-cambros",  name: "Limpieza y cambio de cambros plasticos (Si amerita)",      color: "red"    }
  ],
  "Mesa de trabajo trasera": [
    { id: "limpieza-completa",   name: "Limpieza de mesa completa, exterior y interior",       color: "purple" },
    { id: "organizar-productos", name: "Organizar y limpiar productos colocados",              color: "red"    },
    { id: "boca-biberones",      name: "Boca de Biberones",                                   color: "red"    },
    { id: "etiquetar-cambros",   name: "Etiquetar y fechar cambros en nevera 1",              color: "yellow" }
  ],
  Zafacones: [
    { id: "todos-zafacones",  name: "Todos los Zafacones", color: "red" },
    { id: "interior-exterior",name: "Interior y exterior",  color: "red" }
  ],
  "Mesa de despacho": [
    { id: "mesa-despacho",     name: "Mesa de despacho",              color: "red"    },
    { id: "lamparas",          name: "Lamparas",                      color: "none"   },
    { id: "bebedero",          name: "Bebedero",                      color: "purple" },
    { id: "canastas-vegetales",name: "Canastas de vegetales",         color: "orange" },
    { id: "escalera",          name: "Escalera",                      color: "purple" },
    { id: "planchas-nevera2",  name: "Planchas encima de nevera 2",   color: "purple" },
    { id: "plancha-nevera3",   name: "Plancha encima de nevera 3",    color: "purple" }
  ],
  Piso: [
    { id: "cepillado-desgrasante", name: "Cepillado con jabon y Desgrasante", color: "red" }
  ]
};

function cloneDefaultTaskLibrary(moduleId) {
  if (moduleId === "servicio") return {};
  return JSON.parse(JSON.stringify(DEFAULT_TASK_LIBRARY_COCINA));
}

let TASK_LIBRARY = cloneDefaultTaskLibrary("cocina");
let TEAM_NAMES = Object.keys(TASK_LIBRARY);
const TASK_INDEX = buildTaskIndex();

const ADMIN_PIN = "852347";
let libraryRef       = null;
let firebaseDB       = null;
let pinGateSuccess   = null;
let pinGateCancel    = null;

// Branch state
let branches         = [];
let currentBranch    = null;
let currentBranchIsAdmin = false;
let currentCleaningModule = null;
let branchesConfigRef = null;
let pendingBranchLogin = null;
let branchConfigReady = false;
let usingBranchConfigFallback = false;

let _pinFailCount      = 0;   // wrong attempts since last success
let _pinLockUntil      = 0;   // timestamp ms until PIN gate is unlocked
let _pinCountdownTimer = null; // interval id for lockout countdown

// DOM refs
const collaboratorForm  = document.getElementById("collaborator-form");
const collaboratorInput = document.getElementById("collaborator-name");
const moduleSelectorOverlay = document.getElementById("module-selector");
const moduleList = document.getElementById("module-list");
const headerModuleName = document.getElementById("header-module-name");
const taskSearchInput   = document.getElementById("task-search");
const taskSearchClear   = document.getElementById("task-search-clear");
const taskSearchCount   = document.getElementById("task-search-count");
const scheduleBody      = document.getElementById("schedule-body");
const taskTeam       = document.getElementById("task-team");
const taskChecklist  = document.getElementById("task-checklist");
const taskFree       = document.getElementById("task-free");
const addTaskBtn     = document.getElementById("add-task-btn");
const clearTaskButton   = document.getElementById("clear-task");
const syncStatus        = document.getElementById("sync-status");
const branchSelect      = document.getElementById("branch-select");
const modalOverlay      = document.getElementById("cell-modal-overlay");
const modalCellLabel    = document.getElementById("modal-cell-label");
const modalCloseBtn     = document.getElementById("modal-close-btn");
const modalCancelBtn    = document.getElementById("modal-cancel-btn");
const modalTaskList     = document.getElementById("modal-task-list");

// Week nav DOM refs
const weekPrevBtn = document.getElementById("week-prev-btn");
const weekNextBtn = document.getElementById("week-next-btn");

// Realizadas panel DOM refs
const realizadasPanel    = document.getElementById("realizadas-panel");
const realizadasBtn      = document.getElementById("realizadas-btn");
const realizadasCloseBtn = document.getElementById("realizadas-close-btn");
const realizadasBackdrop = realizadasPanel.querySelector(".realizadas-backdrop");
const realizadasBody     = document.getElementById("realizadas-body");
const realizadasWeekLbl  = document.getElementById("realizadas-week-label");

// Invoice OCR DOM refs
const invoicePanel       = document.getElementById("invoice-panel");
const invoiceBtn         = document.getElementById("invoice-btn");
const invoiceBackdrop    = document.getElementById("invoice-backdrop");
const invoiceCloseBtn    = document.getElementById("invoice-close-btn");
const invoiceFileInput   = document.getElementById("invoice-file");
const invoicePreviewList = document.getElementById("invoice-preview-list");
const invoiceScanBtn     = document.getElementById("invoice-scan-btn");
const invoiceClearBtn    = document.getElementById("invoice-clear-btn");
const invoiceStatus      = document.getElementById("invoice-status");
const invoiceItemsBody   = document.getElementById("invoice-items-body");
const invoiceCount       = document.getElementById("invoice-count");
const invoiceTotal       = document.getElementById("invoice-total");
const invoiceAddRowBtn   = document.getElementById("invoice-add-row-btn");
const invoiceSendBtn     = document.getElementById("invoice-send-btn");
const invoiceRawText     = document.getElementById("invoice-raw-text");

// Photo evidence DOM refs
const photoModalOverlay  = document.getElementById("photo-modal-overlay");
const photoModalLabel    = document.getElementById("photo-modal-label");
const photoModalCloseBtn = document.getElementById("photo-modal-close-btn");
const photoCancelBtn     = document.getElementById("photo-cancel-btn");
const photoCaptureBtn    = document.getElementById("photo-capture-btn");
const photoConfirmBtn    = document.getElementById("photo-confirm-btn");
const photoRetakeBtn     = document.getElementById("photo-retake-btn");
const photoVideo         = document.getElementById("photo-video");
const photoCanvas        = document.getElementById("photo-canvas");
const photoOverlayMsg    = document.getElementById("photo-overlay-msg");
const photoStatusText    = document.getElementById("photo-status-text");
const photoViewerOverlay = document.getElementById("photo-viewer-overlay");
const photoViewerClose   = document.getElementById("photo-viewer-close");
const photoViewerImg     = document.getElementById("photo-viewer-img");
const photoViewerLink    = document.getElementById("photo-viewer-link");

const libraryModalOverlay  = document.getElementById("library-modal-overlay");
const libraryPinView       = document.getElementById("library-pin-view");
const libraryMgmtView      = document.getElementById("library-mgmt-view");
const libraryPinInput      = document.getElementById("library-pin-input");
const libraryPinError      = document.getElementById("library-pin-error");
const libraryMgmtBody      = document.getElementById("library-mgmt-body");

let currentWeekStart  = getActiveWeekMondayStr();
let isOnAutoWeek      = true;

let state = createInitialState(); // populated after branch is selected
let selectedCell = null;
let remoteBoardRef = null;
let remoteSaveTimer = null;
let isApplyingRemoteState = false;
let hasRemoteSnapshot = false;

let firebaseStorage   = null;
let firebaseStorageBucket = "";
let photoStream       = null;
let photoBlob         = null;
let photoModalResolve = null;
let pendingPhotoMeta  = null;
let photoCleanupLastRun = 0;
let invoiceFiles      = [];
let invoiceItems      = [];

renderWeekLabel();
updateModuleLabel();
initFirebaseConnection(); // loads branches, library; shows branch selector
if (moduleList) {
  moduleList.querySelectorAll("[data-cleaning-module]").forEach((btn) => {
    btn.addEventListener("click", () => selectCleaningModule(btn.getAttribute("data-cleaning-module")));
  });
}

// Auto-rollover: check every 60 s if we need to advance the week
setInterval(() => {
  if (!isOnAutoWeek) return;
  const auto = getActiveWeekMondayStr();
  if (auto !== currentWeekStart) {
    currentWeekStart = auto;
    renderWeekLabel();
    renderTable();
  }
}, 60_000);

// ── Event listeners ──────────────────────────────────────────────────

collaboratorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = collaboratorInput.value.trim();
  if (!name) { collaboratorInput.focus(); return; }
  const allowed = await requireAdmin("Agregar colaborador");
  if (!allowed) return;
  state.collaborators.push({ id: createId(), name });
  collaboratorInput.value = "";
  saveState();
  updateTeamSelectors();
  renderTable();
});

taskSearchInput.addEventListener("input", () => {
  renderTable();
});

taskSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.preventDefault();
});

taskSearchClear.addEventListener("click", () => {
  taskSearchInput.value = "";
  taskSearchInput.focus();
  renderTable();
});

scheduleBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const removeBtn = target.closest("[data-remove-collaborator]");
  if (removeBtn) {
    const cid = removeBtn.getAttribute("data-remove-collaborator");
    const collaborator = state.collaborators.find((c) => c.id === cid);
    if (!collaborator) return;
    const allowed = await requireAdmin(`Eliminar a ${collaborator.name}`);
    if (!allowed) return;
    if (!window.confirm(`¿Eliminar a ${collaborator.name} del calendario?`)) return;
    state.collaborators = state.collaborators.filter((c) => c.id !== cid);
    for (const key of Object.keys(state.tasks)) {
      if (key.startsWith(`${cid}__`) || key.includes(`__${cid}__`)) delete state.tasks[key];
    }
    if (selectedCell && selectedCell.collaboratorId === cid) closeModal();
    saveState();
    renderTable();
    return;
  }

  const cellBtn = target.closest("[data-cell]");
  if (!cellBtn) return;
  const collaboratorId = cellBtn.getAttribute("data-collaborator");
  const dayIndex = Number(cellBtn.getAttribute("data-day"));
  if (!collaboratorId || Number.isNaN(dayIndex)) return;
  selectedCell = { collaboratorId, dayIndex };
  renderTable();
  openModal();
});

taskTeam.addEventListener("change", () => {
  renderTaskChecklist(taskTeam.value);
});

taskChecklist.addEventListener("change", () => {
  syncAddForm();
});

taskFree.addEventListener("change", async () => {
  if (!selectedCell) return;
  const newChecked = taskFree.checked;
  const allowed = await requireAdmin("Marcar colaborador libre");
  if (!allowed) { taskFree.checked = !newChecked; return; }
  const key = buildCellKey(selectedCell.collaboratorId, selectedCell.dayIndex);
  if (newChecked) {
    state.tasks[key] = { free: true, items: [] };
  } else {
    delete state.tasks[key];
  }
  saveState();
  renderTable();
  renderModalTaskList();
  renderTaskChecklist(newChecked ? "" : taskTeam.value);
});

addTaskBtn.addEventListener("click", async () => {
  if (!selectedCell) return;
  const team = taskTeam.value.trim();
  if (!team) return;
  const checked = Array.from(taskChecklist.querySelectorAll("input[type='checkbox']:checked:not(:disabled)"));
  if (checked.length === 0) return;
  const allowed = await requireAdmin("Agregar tareas seleccionadas");
  if (!allowed) return;
  const key = buildCellKey(selectedCell.collaboratorId, selectedCell.dayIndex);
  if (!state.tasks[key]) state.tasks[key] = { free: false, items: [] };
  const cellData = state.tasks[key];
  if (cellData.free) return;
  for (const cb of checked) {
    const taskId = cb.value;
    if (!cellData.items.some((item) => item.team === team && item.taskId === taskId)) {
      cellData.items.push({ id: createId(), team, taskId, done: false });
    }
  }
  saveState();
  renderTable();
  renderModalTaskList();
  renderTaskChecklist(team);
});

// Event delegation para lista de tareas del modal
modalTaskList.addEventListener("change", async (event) => {
  const target = event.target;
  if (target.dataset.toggleDone !== undefined) {
    const index   = Number(target.dataset.toggleDone);
    const checked = target.checked;
    await toggleTaskDone(index, checked);
  }
});

modalTaskList.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-remove-task]");
  if (btn) {
    const allowed = await requireAdmin("Eliminar tarea");
    if (!allowed) return;
    removeTask(Number(btn.dataset.removeTask));
  }
});

clearTaskButton.addEventListener("click", async () => {
  if (!selectedCell) return;
  const allowed = await requireAdmin("Limpiar todas las tareas del día");
  if (!allowed) return;
  const key = buildCellKey(selectedCell.collaboratorId, selectedCell.dayIndex);
  delete state.tasks[key];
  taskFree.checked = false;
  saveState();
  renderTable();
  renderModalTaskList();
  renderTaskChecklist(taskTeam.value);
});

modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) closeModal();
});

// Week navigation
weekPrevBtn.addEventListener("click", async () => {
  const allowed = await requireAdmin("Semana anterior");
  if (!allowed) return;
  navigateWeek(-1);
});
weekNextBtn.addEventListener("click", async () => {
  const allowed = await requireAdmin("Semana siguiente");
  if (!allowed) return;
  navigateWeek(1);
});

document.getElementById("autofill-btn").addEventListener("click", async () => {
  if (!state.collaborators.length) { alert("Agrega al menos un colaborador antes de usar Auto-llenar."); return; }
  const allowed = await requireAdmin("Auto-llenar semana");
  if (!allowed) return;
  if (!confirm("¿Llenar toda la semana con tareas al azar? Esto reemplazará las asignaciones existentes.")) return;
  autoFillCalendar();
});

document.getElementById("clear-all-users-btn").addEventListener("click", async () => {
  if (!state.collaborators.length) { alert("No hay colaboradores registrados."); return; }
  const allowed = await requireAdmin("Eliminar todos los colaboradores");
  if (!allowed) return;
  if (!confirm(`¿Eliminar los ${state.collaborators.length} colaboradores y todas sus tareas? Esta acción no se puede deshacer.`)) return;
  state.collaborators = [];
  state.tasks = {};
  if (selectedCell) closeModal();
  saveState();
  renderTable();
});

// Realizadas panel
realizadasBtn.addEventListener("click", () => {
  renderRealizadasPanel();
  realizadasPanel.classList.remove("hidden");
});
realizadasCloseBtn.addEventListener("click", () => realizadasPanel.classList.add("hidden"));
realizadasBackdrop.addEventListener("click", () => realizadasPanel.classList.add("hidden"));

// Invoice OCR panel
initInvoiceTool();

// ── PIN gate ───────────────────────────────────────────────────────────

function initInvoiceTool() {
  const required = [
    invoicePanel, invoiceBtn, invoiceBackdrop, invoiceCloseBtn, invoiceFileInput,
    invoicePreviewList, invoiceScanBtn, invoiceClearBtn, invoiceStatus,
    invoiceItemsBody, invoiceCount, invoiceTotal, invoiceAddRowBtn,
    invoiceSendBtn, invoiceRawText
  ];
  if (required.some((item) => !item)) {
    console.warn("Invoice OCR panel is not available in this page.");
    return;
  }

  invoiceBtn.addEventListener("click", () => {
    invoicePanel.classList.remove("hidden");
  });
  invoiceCloseBtn.addEventListener("click", closeInvoicePanel);
  invoiceBackdrop.addEventListener("click", closeInvoicePanel);

  invoiceFileInput.addEventListener("change", () => {
    invoiceFiles = Array.from(invoiceFileInput.files || []).filter((file) => file.type.startsWith("image/"));
    renderInvoicePreviews();
    setInvoiceStatus(invoiceFiles.length ? `${invoiceFiles.length} imagen(es) listas para leer.` : "Esperando imagen.");
    invoiceScanBtn.disabled = invoiceFiles.length === 0;
    invoiceClearBtn.disabled = invoiceFiles.length === 0 && invoiceItems.length === 0;
  });

  invoiceScanBtn.addEventListener("click", scanInvoiceFiles);
  invoiceClearBtn.addEventListener("click", clearInvoiceTool);
  invoiceAddRowBtn.addEventListener("click", () => {
    invoiceItems.push(createInvoiceItem({ name: "", quantity: 1, unit: "", total: 0, source: "manual" }));
    renderInvoiceItems();
  });
  invoiceSendBtn.addEventListener("click", sendInvoiceItemsToSheet);

  invoiceRawText.addEventListener("input", () => {
    invoiceItems = parseInvoiceText(invoiceRawText.value);
    renderInvoiceItems();
  });

  invoiceItemsBody.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const index = Number(input.dataset.invoiceIndex);
    const field = input.dataset.invoiceField;
    if (!invoiceItems[index] || !field) return;

    if (field === "quantity" || field === "total") {
      invoiceItems[index][field] = parseReceiptNumber(input.value) || 0;
    } else {
      invoiceItems[index][field] = input.value;
    }
    renderInvoiceSummary();
  });

  invoiceItemsBody.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remove-invoice-item]");
    if (!btn) return;
    invoiceItems.splice(Number(btn.dataset.removeInvoiceItem), 1);
    renderInvoiceItems();
  });
}

function closeInvoicePanel() {
  invoicePanel.classList.add("hidden");
}

function renderInvoicePreviews() {
  if (!invoiceFiles.length) {
    invoicePreviewList.innerHTML = "";
    return;
  }

  invoicePreviewList.innerHTML = invoiceFiles.map((file) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="invoice-preview">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(file.name)}">
        <span>${escapeHtml(file.name)}</span>
      </div>
    `;
  }).join("");
}

async function scanInvoiceFiles() {
  if (!invoiceFiles.length) return;
  await loadTesseractForInvoices();
  if (!window.Tesseract || typeof Tesseract.recognize !== "function") {
    setInvoiceStatus("No se pudo cargar OCR. Revisa la conexion y vuelve a intentar.", "error");
    return;
  }

  invoiceScanBtn.disabled = true;
  invoiceSendBtn.disabled = true;
  invoiceClearBtn.disabled = true;
  invoiceRawText.value = "";
  invoiceItems = [];
  renderInvoiceItems();

  const textParts = [];
  try {
    for (let index = 0; index < invoiceFiles.length; index++) {
      const file = invoiceFiles[index];
      setInvoiceStatus(`Leyendo imagen ${index + 1} de ${invoiceFiles.length}...`, "busy");
      const result = await Tesseract.recognize(file, "eng+spa", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const percent = Math.round((m.progress || 0) * 100);
            setInvoiceStatus(`Leyendo imagen ${index + 1}: ${percent}%`, "busy");
          }
        }
      });
      textParts.push(result?.data?.text || "");
    }

    const rawText = textParts.join("\n\n--- factura ---\n\n");
    invoiceRawText.value = rawText;
    invoiceItems = parseInvoiceText(rawText);
    renderInvoiceItems();
    setInvoiceStatus(
      invoiceItems.length
        ? `Listo. Detecte ${invoiceItems.length} producto(s). Revisa antes de enviar.`
        : "No detecte productos. Puedes editar el texto leido o agregar filas manualmente.",
      invoiceItems.length ? "ready" : "error"
    );
  } catch (error) {
    console.error("Invoice OCR error", error);
    setInvoiceStatus("Error leyendo la factura. Prueba con una foto mas clara.", "error");
  } finally {
    invoiceScanBtn.disabled = invoiceFiles.length === 0;
    invoiceClearBtn.disabled = false;
  }
}

function loadTesseractForInvoices() {
  if (window.Tesseract && typeof Tesseract.recognize === "function") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const existingScript = document.querySelector(`script[src="${TESSERACT_SCRIPT_URL}"]`);
    if (existingScript) existingScript.remove();
    const script = document.createElement("script");
    script.src = TESSERACT_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => resolve();
    document.head.append(script);
  });
}

function clearInvoiceTool() {
  invoiceFiles = [];
  invoiceItems = [];
  invoiceFileInput.value = "";
  invoiceRawText.value = "";
  renderInvoicePreviews();
  renderInvoiceItems();
  setInvoiceStatus("Esperando imagen.");
  invoiceScanBtn.disabled = true;
  invoiceClearBtn.disabled = true;
}

function parseInvoiceText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(cleanReceiptLine)
    .filter(Boolean);
  const items = [];
  let pendingQty = null;
  let pendingProduct = null;

  for (const line of lines) {
    if (shouldSkipReceiptLine(line)) continue;

    const qtyPrice = parseQuantityPriceLine(line);
    if (qtyPrice) {
      if (pendingProduct && !pendingProduct.total) {
        pendingProduct.quantity = qtyPrice.quantity || pendingProduct.quantity;
        pendingProduct.unitPrice = qtyPrice.unitPrice;
        continue;
      }
      pendingQty = qtyPrice;
      continue;
    }

    if (pendingProduct && !hasLetters(line)) {
      const total = extractLastAmount(line);
      if (total !== null) {
        items.push(createInvoiceItem({ ...pendingProduct, total }));
        pendingProduct = null;
        pendingQty = null;
      }
      continue;
    }

    const parsed = parseProductLine(line, pendingQty);
    if (!parsed) continue;

    if (parsed.total !== null) {
      items.push(createInvoiceItem(parsed));
      pendingProduct = null;
      pendingQty = null;
    } else {
      pendingProduct = parsed;
    }
  }

  if (pendingProduct) items.push(createInvoiceItem(pendingProduct));
  return mergeInvoiceItems(items);
}

function parseProductLine(line, pendingQty) {
  if (!hasLetters(line)) return null;
  const amountMatches = line.match(/\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d)|\d+[.,]\d{2}(?!\d)/g) || [];
  const total = amountMatches.length ? parseReceiptNumber(amountMatches[amountMatches.length - 1]) : null;
  const inlineQty = parseInlineQuantity(line);
  const unit = extractReceiptUnit(line);
  let name = line
    .replace(/\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d)|\d+[.,]\d{2}(?!\d)/g, "")
    .replace(/^\d{3,14}\s+/, "")
    .replace(/\b\d{3,14}\b/g, "")
    .replace(/\b(?:LB|UND|UN|KG|G|OZ|PAQ|PZA)\b/gi, "")
    .replace(/\d+(?:[.,]\d+)?\s*[xX]\s*\d+(?:[.,]\d+)?/g, "")
    .replace(/\s+/g, " ")
    .trim();

  name = name.replace(/^[^a-zA-Z]+|[^a-zA-Z0-9. ]+$/g, "").trim();
  if (!name || shouldSkipReceiptLine(name)) return null;

  return {
    name,
    quantity: inlineQty?.quantity || pendingQty?.quantity || 1,
    unit: unit || "",
    unitPrice: inlineQty?.unitPrice || pendingQty?.unitPrice || 0,
    total,
    source: line
  };
}

function parseQuantityPriceLine(line) {
  const match = line.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|X)?\s+(\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  return {
    quantity: parseReceiptNumber(match[1]) || 1,
    unitPrice: parseReceiptNumber(match[2]) || 0
  };
}

function parseInlineQuantity(line) {
  const match = line.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return {
    quantity: parseReceiptNumber(match[1]) || 1,
    unitPrice: parseReceiptNumber(match[2]) || 0
  };
}

function extractReceiptUnit(line) {
  const match = line.match(/\b(LB|UND|UN|KG|G|OZ|PAQ|PZA)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function extractLastAmount(line) {
  const matches = line.match(/\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d)|\d+[.,]\d{2}(?!\d)/g) || [];
  if (!matches.length) return null;
  return parseReceiptNumber(matches[matches.length - 1]);
}

function cleanReceiptLine(line) {
  return String(line || "")
    .replace(/[|_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldSkipReceiptLine(line) {
  const normalized = normalizeText(line);
  if (!normalized) return true;
  const skipWords = [
    "subtotal", "total", "itbis", "visa", "cardnet", "metodo pago", "monto pago",
    "factura", "credito fiscal", "electronico", "descripcion", "valor", "rnc",
    "grupo ramos", "wtf", "ahorro", "puntos", "articulos", "descuento", "plan cero",
    "copia cliente", "aprobacion", "membresia", "cajero", "le atendio", "valido hasta"
  ];
  if (skipWords.some((word) => normalized.includes(word))) return true;
  if (/^-+$/.test(line)) return true;
  if (/^\d{8,}$/.test(normalized.replace(/\s/g, ""))) return true;
  return false;
}

function hasLetters(value) {
  return /[a-zA-Z]/.test(String(value || ""));
}

function parseReceiptNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") && raw.includes(".")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(",", ".");
  const number = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function createInvoiceItem(value) {
  return {
    id: createId(),
    name: String(value.name || "").trim(),
    quantity: Number(value.quantity) || 1,
    unit: String(value.unit || "").trim(),
    unitPrice: Number(value.unitPrice) || 0,
    total: Number(value.total) || 0,
    source: String(value.source || "")
  };
}

function mergeInvoiceItems(items) {
  const byName = new Map();
  for (const item of items) {
    if (!item.name) continue;
    const key = normalizeText(item.name);
    const current = byName.get(key);
    if (!current) {
      byName.set(key, item);
      continue;
    }
    current.quantity += item.quantity || 0;
    current.total += item.total || 0;
    if (!current.unit && item.unit) current.unit = item.unit;
    if (!current.unitPrice && item.unitPrice) current.unitPrice = item.unitPrice;
  }
  return Array.from(byName.values());
}

function renderInvoiceItems() {
  if (!invoiceItems.length) {
    invoiceItemsBody.innerHTML = '<tr><td colspan="5" class="invoice-empty">No hay productos detectados.</td></tr>';
    renderInvoiceSummary();
    return;
  }

  invoiceItemsBody.innerHTML = invoiceItems.map((item, index) => `
    <tr>
      <td><input type="text" value="${escapeHtml(item.name)}" data-invoice-index="${index}" data-invoice-field="name" placeholder="Producto"></td>
      <td><input type="text" value="${escapeHtml(formatEditableNumber(item.quantity))}" data-invoice-index="${index}" data-invoice-field="quantity" inputmode="decimal"></td>
      <td><input type="text" value="${escapeHtml(item.unit)}" data-invoice-index="${index}" data-invoice-field="unit" placeholder="UND"></td>
      <td><input type="text" value="${escapeHtml(formatEditableNumber(item.total))}" data-invoice-index="${index}" data-invoice-field="total" inputmode="decimal"></td>
      <td><button type="button" class="invoice-row-remove" data-remove-invoice-item="${index}" title="Eliminar">x</button></td>
    </tr>
  `).join("");
  renderInvoiceSummary();
}

function renderInvoiceSummary() {
  const validItems = invoiceItems.filter((item) => item.name.trim());
  const total = validItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  invoiceCount.textContent = String(validItems.length);
  invoiceTotal.textContent = formatCurrency(total);
  invoiceSendBtn.disabled = validItems.length === 0;
  invoiceClearBtn.disabled = invoiceFiles.length === 0 && invoiceItems.length === 0;
}

async function sendInvoiceItemsToSheet() {
  const validItems = invoiceItems.filter((item) => item.name.trim());
  if (!validItems.length) return;
  if (!APPS_SCRIPT_URL) {
    setInvoiceStatus("No hay URL de Apps Script configurada.", "error");
    return;
  }

  invoiceSendBtn.disabled = true;
  setInvoiceStatus("Enviando productos a la hoja...", "busy");
  try {
    const payload = {
      action: "saveInvoiceProducts",
      branchId: currentBranch?.id || "",
      branchName: currentBranch?.name || "",
      cleaningModule: getCleaningModuleId(),
      cleaningModuleName: getCleaningModuleName(),
      createdAt: new Date().toISOString(),
      rawText: invoiceRawText.value,
      items: validItems.map((item) => ({
        product: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.total
      }))
    };
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (result.ok === false) throw new Error(result.message || "Apps Script rechazo el envio.");
    setInvoiceStatus("Productos enviados a la hoja.", "ready");
  } catch (error) {
    console.error("Invoice sheet send error", error);
    setInvoiceStatus("No pude enviar a la hoja. Revisa que el Apps Script acepte action=saveInvoiceProducts.", "error");
  } finally {
    invoiceSendBtn.disabled = validItems.length === 0;
  }
}

function setInvoiceStatus(message, stateName = "ready") {
  invoiceStatus.textContent = message;
  invoiceStatus.dataset.state = stateName;
}

function formatCurrency(value) {
  return `RD$${(Number(value) || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatEditableNumber(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(3)));
}

// Core: shows the PIN gate and returns a Promise<boolean>.
// No storage anywhere — fresh PIN required every call.
function requestActionPin(description) {
  const overlay = document.getElementById("pin-gate-overlay");
  if (!overlay.classList.contains("hidden")) return Promise.resolve(false);

  return new Promise((resolve) => {
    pinGateSuccess = () => resolve(true);
    pinGateCancel  = () => resolve(false);
    document.getElementById("pin-gate-title").textContent = description || "Acción protegida";
    document.getElementById("pin-gate-desc").textContent  = "Ingresa el código de acceso para continuar.";
    document.getElementById("pin-gate-input").value       = "";
    document.getElementById("pin-gate-error").classList.add("hidden");
    updatePinDots(0);
    overlay.classList.remove("hidden");
    if (Date.now() < _pinLockUntil) {
      showPinLockdown();
    } else {
      setTimeout(() => document.getElementById("pin-gate-input").focus(), 80);
    }
  });
}

// Thin async wrapper — await it and check the return value.
// No state stored anywhere; fresh PIN required on every call.
async function requireAdmin(description) {
  if (currentBranchIsAdmin) return true;
  return requestActionPin(description);
}

function closePinGate() {
  window.clearInterval(_pinCountdownTimer);
  _pinCountdownTimer = null;
  document.getElementById("pin-gate-overlay").classList.add("hidden");
  document.getElementById("pin-gate-input").disabled = false;
  updatePinDots(0);
  if (pinGateCancel) { pinGateCancel(); }
  pinGateSuccess = null;
  pinGateCancel  = null;
}

function confirmPinGate() {
  if (Date.now() < _pinLockUntil) { showPinLockdown(); return; }

  const input   = document.getElementById("pin-gate-input");
  const errorEl = document.getElementById("pin-gate-error");

  if (input.value.length < 6) {
    errorEl.textContent = "El código debe tener exactamente 6 dígitos.";
    errorEl.classList.remove("hidden");
    shakePinInput();
    return;
  }

  // Usar el masterPin de la sucursal actual si existe, si no usar el ADMIN_PIN global por compatibilidad
  const currentMasterPin = currentBranch && currentBranch.masterPin ? currentBranch.masterPin : ADMIN_PIN;
  
  if (input.value === currentMasterPin) {
    _pinFailCount = 0;
    window.clearInterval(_pinCountdownTimer);
    _pinCountdownTimer = null;
    document.getElementById("pin-gate-overlay").classList.add("hidden");
    document.getElementById("pin-gate-input").disabled = false;
    updatePinDots(0);
    const cb = pinGateSuccess;
    pinGateSuccess = null;
    pinGateCancel  = null;
    if (cb) cb();
  } else {
    _pinFailCount++;
    input.value = "";
    updatePinDots(0);
    input.focus();
    if (_pinFailCount >= 3) {
      _pinLockUntil = Date.now() + 30_000;
      _pinFailCount = 0;
      showPinLockdown();
    } else {
      const left = 3 - _pinFailCount;
      errorEl.textContent = `Código incorrecto. ${left} intento${left !== 1 ? "s" : ""} restante${left !== 1 ? "s" : ""}.`;
      errorEl.classList.remove("hidden");
      shakePinInput();
    }
  }
}

function shakePinInput() {
  const input = document.getElementById("pin-gate-input");
  input.classList.add("pin-error-shake");
  setTimeout(() => input.classList.remove("pin-error-shake"), 400);
}

function updatePinDots(length) {
  document.querySelectorAll("#pin-gate-dots span").forEach((dot, i) => {
    dot.classList.toggle("dot-filled", i < length);
  });
}

function showPinLockdown() {
  const input   = document.getElementById("pin-gate-input");
  const errorEl = document.getElementById("pin-gate-error");
  input.disabled = true;
  input.value    = "";
  updatePinDots(0);
  window.clearInterval(_pinCountdownTimer);
  _pinCountdownTimer = setInterval(() => {
    const secs = Math.ceil((_pinLockUntil - Date.now()) / 1000);
    if (secs <= 0) {
      window.clearInterval(_pinCountdownTimer);
      _pinCountdownTimer = null;
      input.disabled = false;
      errorEl.classList.add("hidden");
      input.focus();
      return;
    }
    errorEl.textContent = `Demasiados intentos fallidos. Espera ${secs}s.`;
    errorEl.classList.remove("hidden");
  }, 500);
}

document.getElementById("pin-gate-confirm-btn").addEventListener("click", confirmPinGate);
document.getElementById("pin-gate-close-btn").addEventListener("click", closePinGate);
document.getElementById("pin-gate-cancel-btn").addEventListener("click", closePinGate);
document.getElementById("pin-gate-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("pin-gate-overlay")) closePinGate();
});
document.getElementById("pin-gate-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmPinGate();
});
document.getElementById("pin-gate-input").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
  updatePinDots(e.target.value.length);
  if (e.target.value.length === 6) confirmPinGate();
});

// ── Library Modal ──────────────────────────────────────────────────────

document.getElementById("library-btn").addEventListener("click", async () => {
  const allowed = await requireAdmin("Acceder a Gestión de Tareas");
  if (!allowed) return;
  libraryModalOverlay.classList.remove("hidden");
  libraryPinView.classList.add("hidden");
  libraryMgmtView.classList.remove("hidden");
  renderLibraryMgmt();
});
document.getElementById("library-pin-close-btn").addEventListener("click", closeLibraryModal);
document.getElementById("library-pin-cancel-btn").addEventListener("click", closeLibraryModal);
document.getElementById("library-mgmt-close-btn").addEventListener("click", closeLibraryModal);
document.getElementById("library-mgmt-cancel-btn").addEventListener("click", closeLibraryModal);
document.getElementById("library-add-team-btn").addEventListener("click", () => {
  const form = document.getElementById("lib-new-team-form");
  form.classList.add("visible");
  document.getElementById("lib-new-team-input").focus();
});

// ── Branch system event listeners ─────────────────────────────────────

document.getElementById("branch-switch-btn").addEventListener("click", () => {
  renderBranchList();
  showBranchSelector();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  if (!currentBranch) return;
  if (confirm("¿Cerrar sesión y volver a seleccionar sucursal?")) {
    logoutBranch();
  }
});

branchSelect.addEventListener("change", () => {
  const branchId = branchSelect.value;
  if (!branchId) {
    syncBranchSelect();
    showBranchSelector();
    return;
  }
  if (currentBranch && branchId === currentBranch.id) return;
  const branch = branches.find((b) => b.id === branchId);
  if (branch) openBranchPinModal(branch);
  syncBranchSelect();
});

const branchSettingsBtn = document.getElementById("branch-settings-btn");
if (branchSettingsBtn) branchSettingsBtn.addEventListener("click", openBranchSettings);
document.getElementById("branch-selector-close-btn").addEventListener("click", () => {
  if (currentBranch) hideBranchSelector();
});

document.getElementById("branch-pin-confirm-btn").addEventListener("click", confirmBranchPin);
document.getElementById("branch-pin-cancel-btn").addEventListener("click", closeBranchPinModal);
document.getElementById("branch-pin-close-btn").addEventListener("click", closeBranchPinModal);
document.getElementById("branch-pin-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmBranchPin();
});

document.getElementById("branch-settings-close-btn").addEventListener("click", closeBranchSettings);
document.getElementById("branch-settings-done-btn").addEventListener("click", closeBranchSettings);
document.getElementById("branch-settings-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("branch-settings-overlay")) closeBranchSettings();
});
document.getElementById("branch-add-new-btn").addEventListener("click", async () => {
  const name = prompt("Nombre de la nueva sucursal:");
  if (!name || !name.trim()) return;
  const pin = prompt("Contraseña para esta sucursal:");
  if (pin === null) return;
  const trimmedPin = pin.trim();
  if (!trimmedPin) { alert("La contraseña no puede estar vacía."); return; }
  const masterPin = prompt("Contraseña master (6 dígitos) para esta sucursal (dejar vacío para usar la global):");
  if (masterPin !== null && masterPin.trim() && masterPin.trim().length !== 6) {
    alert("La contraseña master debe tener exactamente 6 dígitos."); return;
  }
  const id = slugifyBranchName(name) || `branch-${Date.now()}`;
  if (branches.some((b) => b.id === id)) { alert("Ya existe una sucursal con nombre similar."); return; }
  const allowed = await requireAdmin("Crear nueva sucursal");
  if (!allowed) return;
  branches.push({ id, name: name.trim(), pin: trimmedPin, masterPin: masterPin.trim() || ADMIN_PIN });
  saveBranchConfig();
  renderBranchSettings();
  renderBranchList();
});

function closeLibraryModal() {
  libraryModalOverlay.classList.add("hidden");
  libraryPinView.classList.add("hidden");
  libraryMgmtView.classList.add("hidden");
  libraryPinInput.value = "";
  libraryPinError.classList.add("hidden");
}

function renderLibraryMgmt() {
  const teams = Object.keys(TASK_LIBRARY);
  libraryMgmtBody.innerHTML = `
    <div id="lib-new-team-form" class="lib-new-team-form">
      <input type="text" id="lib-new-team-input" placeholder="Nombre del equipo" maxlength="50">
      <div class="lib-form-actions">
        <button type="button" id="lib-save-team-btn">Guardar equipo</button>
        <button type="button" id="lib-cancel-team-btn" class="secondary">Cancelar</button>
      </div>
    </div>
    ${teams.map(renderLibTeamSection).join("")}
  `;

  document.getElementById("lib-cancel-team-btn").addEventListener("click", () => {
    document.getElementById("lib-new-team-form").classList.remove("visible");
    document.getElementById("lib-new-team-input").value = "";
  });

  document.getElementById("lib-save-team-btn").addEventListener("click", async () => {
    const input = document.getElementById("lib-new-team-input");
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    if (TASK_LIBRARY[name]) { alert("Ya existe un equipo con ese nombre."); return; }
    const allowed = await requireAdmin("Agregar nuevo equipo");
    if (!allowed) return;
    TASK_LIBRARY[name] = [];
    saveLibraryToFirebase();
    rebuildLibraryDerived();
    renderLibraryMgmt();
  });

  libraryMgmtBody.querySelectorAll(".lib-delete-team").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const team = btn.dataset.team;
      const allowed = await requireAdmin(`Eliminar equipo "${team}"`);
      if (!allowed) return;
      if (!confirm(`¿Eliminar el equipo "${team}" y todas sus tareas? Esta acción no se puede deshacer.`)) return;
      delete TASK_LIBRARY[team];
      saveLibraryToFirebase();
      rebuildLibraryDerived();
      renderLibraryMgmt();
    });
  });

  libraryMgmtBody.querySelectorAll(".lib-delete-task").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { team, taskId } = btn.dataset;
      if (!TASK_LIBRARY[team]) return;
      const allowed = await requireAdmin("Eliminar tarea de biblioteca");
      if (!allowed) return;
      TASK_LIBRARY[team] = TASK_LIBRARY[team].filter((t) => t.id !== taskId);
      saveLibraryToFirebase();
      rebuildLibraryDerived();
      renderLibraryMgmt();
    });
  });

  libraryMgmtBody.querySelectorAll(".lib-show-add-task").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".lib-tasks").querySelector(".lib-add-task-form");
      form.classList.add("visible");
      btn.style.display = "none";
      form.querySelector(".lib-task-name-input").focus();
    });
  });

  libraryMgmtBody.querySelectorAll(".lib-cancel-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".lib-add-task-form");
      form.classList.remove("visible");
      const showBtn = form.closest(".lib-tasks").querySelector(".lib-show-add-task");
      if (showBtn) showBtn.style.display = "";
    });
  });

  libraryMgmtBody.querySelectorAll(".lib-save-task-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const form = btn.closest(".lib-add-task-form");
      const nameInput = form.querySelector(".lib-task-name-input");
      const colorSelect = form.querySelector(".lib-color-select");
      const name = nameInput.value.trim();
      const color = colorSelect.value;
      const team = btn.dataset.team;
      if (!name) { nameInput.focus(); return; }
      const id = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `task-${Date.now()}`;
      if (!TASK_LIBRARY[team]) TASK_LIBRARY[team] = [];
      if (TASK_LIBRARY[team].some((t) => t.id === id)) {
        alert("Ya existe una tarea similar. Usa un nombre diferente."); return;
      }
      const allowed = await requireAdmin("Guardar tarea");
      if (!allowed) return;
      TASK_LIBRARY[team].push({ id, name, color });
      saveLibraryToFirebase();
      rebuildLibraryDerived();
      renderLibraryMgmt();
    });
  });
}

function renderLibTeamSection(team) {
  const tasks = TASK_LIBRARY[team] || [];
  const colorOpts = Object.entries(LEGEND)
    .map(([k, v]) => `<option value="${k}">${v.symbol} ${v.short}</option>`)
    .join("");
  return `
    <div class="lib-team-section">
      <div class="lib-team-header">
        <span class="lib-team-name">${escapeHtml(team)}</span>
        <button type="button" class="lib-delete-team" data-team="${escapeHtml(team)}">🗑 Eliminar equipo</button>
      </div>
      <div class="lib-tasks">
        ${tasks.map((task) => {
          const leg = LEGEND[task.color] || LEGEND.none;
          return `
            <div class="lib-task-row">
              <span>${leg.symbol}</span>
              <span class="lib-task-name">${escapeHtml(task.name)}</span>
              <span class="lib-task-freq">${escapeHtml(leg.short)}</span>
              <button type="button" class="lib-delete-task" data-team="${escapeHtml(team)}" data-task-id="${escapeHtml(task.id)}">✕</button>
            </div>`;
        }).join("")}
        <div class="lib-add-task-form">
          <input type="text" class="lib-task-name-input" placeholder="Nombre de la tarea" maxlength="60">
          <select class="lib-color-select">${colorOpts}</select>
          <div class="lib-form-actions">
            <button type="button" class="lib-save-task-btn" data-team="${escapeHtml(team)}">Guardar tarea</button>
            <button type="button" class="lib-cancel-task-btn secondary">Cancelar</button>
          </div>
        </div>
        <button type="button" class="lib-show-add-task" data-team="${escapeHtml(team)}">+ Agregar tarea</button>
      </div>
    </div>`;
}

function rebuildLibraryDerived() {
  TEAM_NAMES = Object.keys(TASK_LIBRARY);
  TASK_INDEX.clear();
  for (const [team, tasks] of Object.entries(TASK_LIBRARY)) {
    for (const task of tasks) TASK_INDEX.set(`${team}__${task.id}`, task);
  }
  updateTeamSelectors();
}

function getLibraryPathForModule() {
  return getCleaningModuleId() === "servicio" ? "library_servicio" : "library_cocina";
}

function saveLibraryToFirebase() {
  if (!libraryRef) return;
  libraryRef.set(JSON.stringify(TASK_LIBRARY))
    .catch((err) => console.error("Error guardando biblioteca:", err));
}

function initLibrarySync() {
  if (libraryRef) {
    libraryRef.off();
    libraryRef = null;
  }
  TASK_LIBRARY = cloneDefaultTaskLibrary(getCleaningModuleId());
  rebuildLibraryDerived();
  renderTable();
  if (!firebaseDB || !currentCleaningModule) return;
  libraryRef = firebaseDB.ref(getLibraryPathForModule());
  libraryRef.on("value", async (snap) => {
    const json = snap.val();
    if (!json) {
      if (getCleaningModuleId() === "cocina") {
        try {
          const legacySnap = await firebaseDB.ref("library").get();
          const legacyJson = legacySnap.val();
          if (legacyJson) {
            TASK_LIBRARY = JSON.parse(legacyJson);
            saveLibraryToFirebase();
            rebuildLibraryDerived();
            renderTable();
            if (!modalOverlay.classList.contains("hidden")) renderTaskChecklist(taskTeam.value);
            if (!libraryMgmtView.classList.contains("hidden")) renderLibraryMgmt();
            return;
          }
        } catch (_) {}
      }
      saveLibraryToFirebase();
      return;
    }
    try {
      TASK_LIBRARY = JSON.parse(json) || {};
      rebuildLibraryDerived();
      if (modalOverlay.classList.contains("hidden")) {
        renderTable();
      }
      if (!modalOverlay.classList.contains("hidden")) {
        renderTaskChecklist(taskTeam.value);
      }
      if (!libraryMgmtView.classList.contains("hidden")) {
        renderLibraryMgmt();
      }
    } catch (_) {}
  });
}

// ── Modal ─────────────────────────────────────────────────────────────

function openModal() {
  if (!selectedCell) return;
  const collaborator = state.collaborators.find((c) => c.id === selectedCell.collaboratorId);
  if (!collaborator) return;

  modalCellLabel.textContent = `${collaborator.name} — ${DAYS[selectedCell.dayIndex]}`;

  const key = buildCellKey(selectedCell.collaboratorId, selectedCell.dayIndex);
  const cellData = state.tasks[key];
  taskFree.checked = Boolean(cellData && cellData.free);

  taskTeam.value = "";
  renderTaskChecklist("");

  renderModalTaskList();
  syncAddForm();
  modalOverlay.classList.remove("hidden");
  taskTeam.focus();
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  selectedCell = null;
  renderTable();
}

// ── Evidencia fotográfica ──────────────────────────────────

async function openPhotoModal(taskLabel, team, taskName) {
  pendingPhotoMeta = team && taskName ? { team, taskName } : null;
  photoBlob    = null;
  photoCanvas.classList.remove("visible");
  photoVideo.style.display      = "";
  photoOverlayMsg.textContent   = "";
  photoOverlayMsg.className     = "photo-overlay-msg";
  photoModalLabel.textContent   = taskLabel;
  photoStatusText.textContent   = "Iniciando cámara trasera...";
  photoCaptureBtn.disabled      = true;
  photoCaptureBtn.style.display = "";
  photoConfirmBtn.style.display = "none";
  photoRetakeBtn.style.display  = "none";
  photoCancelBtn.style.display  = "";
  photoModalOverlay.classList.remove("hidden");

  try {
    photoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } }
    });
    photoVideo.srcObject = photoStream;
    await new Promise((resolve, reject) => {
      photoVideo.onloadedmetadata = resolve;
      setTimeout(() => reject(new Error("timeout")), 8000);
    });
    photoVideo.play();
    photoStatusText.textContent = "Apunta la cámara a la tarea y toma la foto.";
    photoCaptureBtn.disabled    = false;
  } catch (_) {
    photoStatusText.textContent = "No se pudo abrir la cámara. Cierra (✕) para cancelar.";
  }

  return new Promise((resolve) => { photoModalResolve = resolve; });
}

photoCaptureBtn.addEventListener("click", () => {
  const sourceWidth = photoVideo.videoWidth || 1280;
  const sourceHeight = photoVideo.videoHeight || 960;
  const w = Math.min(PHOTO_MAX_WIDTH, sourceWidth);
  const h = Math.round(w * (sourceHeight / sourceWidth)) || 450;
  photoCanvas.width  = w;
  photoCanvas.height = h;
  photoCanvas.getContext("2d").drawImage(photoVideo, 0, 0, sourceWidth, sourceHeight, 0, 0, w, h);

  photoCanvas.toBlob((blob) => {
    photoBlob = blob;
    photoCanvas.classList.add("visible");
    photoVideo.style.display      = "none";
    photoOverlayMsg.textContent   = "¿Usar esta foto?";
    photoOverlayMsg.className     = "photo-overlay-msg";
    photoStatusText.textContent   = "Confirma la foto o tómala de nuevo.";
    photoCaptureBtn.style.display = "none";
    photoConfirmBtn.style.display = "";
    photoRetakeBtn.style.display  = "";
    photoConfirmBtn.disabled      = false;
    photoRetakeBtn.disabled       = false;
  }, "image/jpeg", 0.82);
});

photoRetakeBtn.addEventListener("click", () => {
  photoBlob    = null;
  photoCanvas.classList.remove("visible");
  photoVideo.style.display      = "";
  photoOverlayMsg.textContent   = "";
  photoStatusText.textContent   = "Apunta la cámara a la tarea realizada y toma la foto.";
  photoCaptureBtn.style.display = "";
  photoConfirmBtn.style.display = "none";
  photoRetakeBtn.style.display  = "none";
});

photoConfirmBtn.addEventListener("click", async () => {
  if (!photoBlob) return;
  photoConfirmBtn.disabled    = true;
  photoRetakeBtn.disabled     = true;
  photoStatusText.textContent = "Comprimiendo foto...";

  try {
    const compressedBlob = await compressPhotoCanvasToJpeg(photoCanvas);
    photoStatusText.textContent = `Subiendo foto (${formatBytes(compressedBlob.size)})...`;
    const photoEvidence = await uploadPhotoEvidenceToFirebase(compressedBlob);
    photoOverlayMsg.textContent = "Foto guardada";
    photoOverlayMsg.className   = "photo-overlay-msg success";
    photoStatusText.textContent = "Evidencia guardada. Tarea marcada como realizada.";
    setTimeout(() => closePhotoModal(photoEvidence), 800);
  } catch (err) {
    console.warn("Firebase Storage upload failed:", err && err.message ? err.message : err);
    photoOverlayMsg.textContent = "No se pudo subir";
    photoOverlayMsg.className   = "photo-overlay-msg error";
    photoStatusText.textContent = err && err.message ? err.message : "Firebase Storage no pudo guardar la foto.";
    photoConfirmBtn.disabled    = false;
    photoRetakeBtn.disabled     = false;
  }
});
photoModalCloseBtn.addEventListener("click", () => closePhotoModal(null));
photoCancelBtn.addEventListener("click", () => closePhotoModal(null));
if (photoViewerClose) photoViewerClose.addEventListener("click", closePhotoViewer);
if (photoViewerOverlay) {
  photoViewerOverlay.addEventListener("click", (event) => {
    if (event.target === photoViewerOverlay) closePhotoViewer();
  });
}
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-photo-viewer-src]");
  if (!trigger) return;
  event.preventDefault();
  openPhotoViewer(trigger.getAttribute("data-photo-viewer-src"));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && photoViewerOverlay && !photoViewerOverlay.classList.contains("hidden")) {
    closePhotoViewer();
  }
});

function closePhotoModal(photoUrl) {
  if (photoStream) {
    photoStream.getTracks().forEach((t) => t.stop());
    photoStream = null;
  }
  photoVideo.srcObject = null;
  photoCanvas.classList.remove("visible");
  photoVideo.style.display = "";
  photoModalOverlay.classList.add("hidden");
  if (photoModalResolve) {
    photoModalResolve(photoUrl);
    photoModalResolve = null;
  }
}

function openPhotoViewer(url) {
  if (!photoViewerOverlay || !photoViewerImg || !photoViewerLink || !isSafeUrl(url)) return;
  photoViewerImg.src = url;
  photoViewerLink.href = url;
  photoViewerOverlay.classList.remove("hidden");
}

function closePhotoViewer() {
  if (!photoViewerOverlay || !photoViewerImg || !photoViewerLink) return;
  photoViewerOverlay.classList.add("hidden");
  photoViewerImg.removeAttribute("src");
  photoViewerLink.href = "#";
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo preparar la foto en JPG."));
    }, "image/jpeg", quality);
  });
}

async function compressPhotoCanvasToJpeg(sourceCanvas) {
  const work = document.createElement("canvas");
  const sourceWidth = sourceCanvas.width || PHOTO_MAX_WIDTH;
  const sourceHeight = sourceCanvas.height || Math.round(PHOTO_MAX_WIDTH * 0.75);
  const ratio = Math.min(1, PHOTO_MAX_WIDTH / sourceWidth);
  work.width = Math.max(1, Math.round(sourceWidth * ratio));
  work.height = Math.max(1, Math.round(sourceHeight * ratio));
  work.getContext("2d").drawImage(sourceCanvas, 0, 0, work.width, work.height);

  let quality = 0.82;
  let blob = await canvasToJpegBlob(work, quality);
  while (blob.size > PHOTO_MAX_BYTES && quality > PHOTO_MIN_QUALITY) {
    quality = Math.max(PHOTO_MIN_QUALITY, Number((quality - 0.08).toFixed(2)));
    blob = await canvasToJpegBlob(work, quality);
  }
  if (blob.size > PHOTO_MAX_BYTES && work.width > 900) {
    const ratio2 = Math.sqrt(PHOTO_MAX_BYTES / blob.size) * 0.95;
    const resized = document.createElement("canvas");
    resized.width = Math.max(900, Math.round(work.width * ratio2));
    resized.height = Math.max(1, Math.round(work.height * (resized.width / work.width)));
    resized.getContext("2d").drawImage(work, 0, 0, resized.width, resized.height);
    blob = await canvasToJpegBlob(resized, PHOTO_MIN_QUALITY);
  }
  return new Blob([blob], { type: "image/jpeg" });
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadPhotoEvidenceToFirebase(blob) {
  if (!firebaseStorage) throw new Error("Firebase Storage no esta disponible.");
  if (!selectedCell || !currentBranch) throw new Error("No se encontro la tarea activa para guardar la foto.");
  const completedAt = new Date();
  const dateKey = getLocalDateKey(completedAt);
  const moduleId = getCleaningModuleId();
  const collaborator = state.collaborators.find((c) => c.id === selectedCell.collaboratorId);
  const collabName = collaborator ? collaborator.name : "Desconocido";
  const meta = pendingPhotoMeta || {};
  const dayName = DAYS[selectedCell.dayIndex] || "";
  const fileBase = [
    currentBranch.id,
    dayName,
    collabName,
    meta.team || "tarea",
    meta.taskName || photoModalLabel.textContent,
    Date.now()
  ].map(slugifyBranchName).filter(Boolean).join("-");
  const storagePath = `${PHOTO_STORAGE_ROOT}/${moduleId}/${dateKey}/${fileBase || createId()}.jpg`;
  const storageRef = firebaseStorage.ref(storagePath);
  const uploadTask = storageRef.put(blob, {
    contentType: "image/jpeg",
    customMetadata: {
      moduleId,
      moduleName: getCleaningModuleName(),
      branchId: currentBranch.id || "",
      branchName: currentBranch.name || "",
      weekStart: currentWeekStart,
      dayName,
      collaborator: collabName,
      team: meta.team || "",
      taskName: meta.taskName || ""
    }
  });
  await withTimeout(uploadTask, PHOTO_UPLOAD_TIMEOUT_MS, "La subida a Firebase Storage tardó demasiado.");
  const url = await withTimeout(storageRef.getDownloadURL(), 10000, "No se pudo obtener el enlace de la foto.");
  const record = {
    url,
    storagePath,
    storageBucket: firebaseStorageBucket,
    moduleId,
    moduleName: getCleaningModuleName(),
    dateKey,
    branchId: currentBranch.id || "",
    branchName: currentBranch.name || "",
    weekStart: currentWeekStart,
    dayIndex: selectedCell.dayIndex,
    dayName,
    collaboratorId: selectedCell.collaboratorId,
    collaboratorName: collabName,
    team: meta.team || "",
    taskName: meta.taskName || photoModalLabel.textContent || "",
    completedAt: completedAt.toISOString()
  };
  if (firebaseDB) {
    await firebaseDB.ref(`${PHOTO_INDEX_ROOT}/${moduleId}/${dateKey}`).push({
      ...record,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).catch((err) => console.warn("No se pudo indexar la foto:", err && err.message ? err.message : err));
  }
  runPhotoRetentionCleanup();
  return { ...record, source: "firebase-storage" };
}

function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return getLocalDateKey(new Date());
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message || "Tiempo de espera agotado.")), ms))
  ]);
}

function getPhotoStorageConfig() {
  return PHOTO_FIREBASE_CONFIG;
}

function getPhotoRetentionCutoffKey() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PHOTO_RETENTION_DAYS);
  return getLocalDateKey(cutoff);
}

async function runPhotoRetentionCleanup(options = {}) {
  if (!firebaseDB) return;
  const now = Date.now();
  if (!options.force && now - photoCleanupLastRun < 6 * 60 * 60 * 1000) return;
  photoCleanupLastRun = now;
  const cutoffKey = getPhotoRetentionCutoffKey();
  try {
    for (const moduleInfo of CLEANING_MODULES) {
      const moduleId = moduleInfo.id;
      const moduleRef = firebaseDB.ref(`${PHOTO_INDEX_ROOT}/${moduleId}`);
      const snap = await moduleRef.once("value");
      const byDate = snap.val() || {};
      for (const dateKey of Object.keys(byDate)) {
        if (dateKey >= cutoffKey) continue;
        const records = byDate[dateKey] || {};
        if (firebaseStorage) {
          await Promise.all(Object.values(records).map((record) => {
            if (!record || !record.storagePath) return Promise.resolve();
            return firebaseStorage.ref(record.storagePath).delete().catch((err) => {
              if (err && err.code !== "storage/object-not-found") {
                console.warn("No se pudo borrar foto antigua:", err.message || err);
              }
            });
          }));
        }
        await moduleRef.child(dateKey).remove().catch((err) => console.warn("No se pudo limpiar índice antiguo:", err.message || err));
      }
    }
  } catch (err) {
    console.warn("Limpieza de fotos antiguas falló:", err && err.message ? err.message : err);
  }
}

function pruneExpiredPhotoEvidenceInState() {
  const cutoff = Date.now() - PHOTO_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const cellData of Object.values(state.tasks || {})) {
    if (!cellData || !Array.isArray(cellData.items)) continue;
    for (const item of cellData.items) {
      if (!item || !item.evidencePhotoUrl || !item.completedAt) continue;
      const completed = new Date(item.completedAt).getTime();
      if (!Number.isNaN(completed) && completed < cutoff) {
        delete item.evidencePhotoUrl;
        delete item.evidenceStoragePath;
        delete item.evidenceStorageModule;
        delete item.evidenceDate;
        delete item.evidenceSource;
        changed = true;
      }
    }
  }
  return changed;
}

function renderModalTaskList() {
  if (!selectedCell) return;
  const key = buildCellKey(selectedCell.collaboratorId, selectedCell.dayIndex);
  const cellData = state.tasks[key];
  const isFree = Boolean(cellData && cellData.free);
  const items = (!isFree && cellData && Array.isArray(cellData.items)) ? cellData.items : [];

  if (items.length === 0) {
    modalTaskList.innerHTML = '<p class="modal-no-tasks">Sin tareas asignadas. Agrega una abajo.</p>';
    return;
  }

  modalTaskList.innerHTML = items.map((item, index) => {
    const meta = resolveTaskMeta(item);
    const doneClass = item.done ? "done" : "";
    const thumbHtml = item.done && isSafeUrl(item.evidencePhotoUrl)
      ? `<button type="button" class="photo-thumb-link" data-photo-viewer-src="${escapeHtml(item.evidencePhotoUrl)}" title="Ver evidencia fotografica">
           <img src="${escapeHtml(item.evidencePhotoUrl)}" class="task-evidence-thumb" alt="Evidencia" loading="lazy">
         </button>`
      : "";
    const lockBadge = item.done
      ? `<span class="task-done-badge" title="Tarea realizada — no puede desmarcarse">🔒 Realizada</span>`
      : "";
    return `
      <div class="modal-task-item ${doneClass}">
        <label class="modal-task-check ${item.done ? "task-check-locked" : ""}">
          <input type="checkbox" ${item.done ? "checked disabled" : ""} data-toggle-done="${index}">
          <span>${meta.legend.symbol} <strong>${escapeHtml(meta.taskName)}</strong> — ${escapeHtml(meta.team)}</span>
        </label>
        ${lockBadge}
        ${thumbHtml}
        ${item.done ? "" : `<button type="button" class="modal-task-remove" data-remove-task="${index}" title="Eliminar">✕</button>`}
      </div>
    `;
  }).join("");
}

async function toggleTaskDone(index, done) {
  if (!selectedCell) return;

  const key = buildCellKey(selectedCell.collaboratorId, selectedCell.dayIndex);
  const cellData = state.tasks[key];
  if (!cellData || !Array.isArray(cellData.items) || !cellData.items[index]) return;

  // Una vez marcada, no puede desmarcarse
  if (!done && cellData.items[index].done) {
    const cb = modalTaskList.querySelector(`[data-toggle-done="${index}"]`);
    if (cb) cb.checked = true;
    return;
  }

  if (!done) {
    cellData.items[index].done = false;
    delete cellData.items[index].completedAt;
    delete cellData.items[index].evidencePhotoUrl;
    delete cellData.items[index].evidenceStoragePath;
    delete cellData.items[index].evidenceStorageModule;
    delete cellData.items[index].evidenceDate;
    delete cellData.items[index].evidenceSource;
    saveState();
    renderTable();
    renderModalTaskList();
    return;
  }

  // ── Foto de evidencia REQUERIDA antes de marcar ──
  const capturedCollabId  = selectedCell.collaboratorId;
  const capturedDayIndex  = selectedCell.dayIndex;
  const capturedWeekStart = currentWeekStart; // capture before async photo modal
  const meta  = resolveTaskMeta(cellData.items[index]);
  const label = `${meta.taskName} · ${DAYS[capturedDayIndex]}`;
  const photoEvidence = await openPhotoModal(label, meta.team, meta.taskName);

  // If user closed without photo (✕), leave task undone
  if (!photoEvidence) {
    const cb = modalTaskList.querySelector(`[data-toggle-done="${index}"]`);
    if (cb) cb.checked = false;
    return;
  }

  const k  = `${capturedWeekStart}__${capturedCollabId}__${capturedDayIndex}`;
  const cd = state.tasks[k];
  if (!cd?.items?.[index]) return;
  const photoUrl = typeof photoEvidence === "string" ? photoEvidence : photoEvidence.url;
  cd.items[index].done             = true;
  cd.items[index].completedAt      = new Date().toISOString();
  cd.items[index].evidencePhotoUrl = photoUrl;
  if (photoEvidence && typeof photoEvidence === "object") {
    cd.items[index].evidenceSource = photoEvidence.source || "";
    cd.items[index].evidenceStoragePath = photoEvidence.storagePath || "";
    cd.items[index].evidenceStorageModule = photoEvidence.moduleId || getCleaningModuleId();
    cd.items[index].evidenceDate = photoEvidence.dateKey || getLocalDateKey(new Date());
  }
  saveState();
  renderTable();
  if (selectedCell?.collaboratorId === capturedCollabId &&
      selectedCell?.dayIndex === capturedDayIndex) {
    renderModalTaskList();
  }
}

function removeTask(index) {
  if (!selectedCell) return;
  const key = buildCellKey(selectedCell.collaboratorId, selectedCell.dayIndex);
  const cellData = state.tasks[key];
  if (!cellData || !Array.isArray(cellData.items)) return;
  if (cellData.items[index]?.done) return; // locked — cannot remove completed tasks
  cellData.items.splice(index, 1);
  if (cellData.items.length === 0) {
    delete state.tasks[key];
  }
  saveState();
  renderTable();
  renderModalTaskList();
}

function syncAddForm() {
  const isFree = taskFree.checked;
  taskTeam.disabled = isFree;
  const hasChecked = taskChecklist.querySelectorAll("input[type='checkbox']:checked:not(:disabled)").length > 0;
  addTaskBtn.disabled = isFree || !taskTeam.value || !hasChecked;
}

function renderTaskChecklist(team) {
  if (!team || !hasTeam(team)) {
    taskChecklist.innerHTML = '<p class="checklist-empty">Selecciona un equipo primero.</p>';
    syncAddForm();
    return;
  }

  const tasks = TASK_LIBRARY[team] || [];
  taskChecklist.innerHTML = tasks.map((task) => {
    const legend = LEGEND[task.color] || LEGEND.none;
    const assignee = getTaskAssignee(team, task.id);
    const assignedClass = assignee ? "checklist-item-assigned" : "";
    const disabledAttr = assignee ? "disabled checked" : "";
    const assigneeLabel = assignee
      ? `<span class="checklist-assignee">${escapeHtml(assignee)}</span>`
      : "";
    return `
      <label class="checklist-item ${assignedClass}">
        <input type="checkbox" value="${task.id}" ${disabledAttr}>
        <span>${legend.symbol}</span>
        <span class="checklist-name">${escapeHtml(task.name)}</span>
        ${assigneeLabel}
        <span class="checklist-freq">${escapeHtml(legend.short)}</span>
      </label>`;
  }).join("");

  syncAddForm();
}

function isTaskAssigned(team, taskId) {
  return getTaskAssignee(team, taskId) !== null;
}

// Returns how many consecutive days a task's color blocks after assignment.
// red=1 (daily), orange=3, yellow=4, green/purple=7 (whole week).
function getBlockDays(color) {
  if (color === "red")    return 1;
  if (color === "orange") return 3;
  if (color === "yellow") return 4;
  if (color === "green" || color === "purple") return 7;
  return 1;
}

function getTaskAssignee(team, taskId) {
  if (!selectedCell) return null;
  const { dayIndex } = selectedCell;
  const task      = findTask(team, taskId);
  const blockDays = getBlockDays(task ? task.color : "none");
  const isWeekly  = blockDays >= 7;

  for (const collaborator of state.collaborators) {
    for (let d = 0; d <= 6; d++) {
      const key      = buildCellKey(collaborator.id, d);
      const cellData = state.tasks[key];
      if (!cellData || !Array.isArray(cellData.items)) continue;
      if (!cellData.items.some((item) => item.team === team && item.taskId === taskId)) continue;
      const blocked = isWeekly || (dayIndex >= d && dayIndex < d + blockDays);
      if (!blocked) continue;
      return d === dayIndex
        ? collaborator.name
        : `${collaborator.name} (${DAYS[d]})`;
    }
  }
  return null;
}

// ── State ─────────────────────────────────────────────────────────────

function createInitialState() {
  return { collaborators: [], tasks: {} };
}

function getCleaningModuleId() {
  return currentCleaningModule && currentCleaningModule.id ? currentCleaningModule.id : "cocina";
}

function getCleaningModuleName() {
  return currentCleaningModule && currentCleaningModule.name ? currentCleaningModule.name : "Cocina";
}

function updateModuleLabel() {
  if (headerModuleName) headerModuleName.textContent = getCleaningModuleName();
}

function getBoardStorageKey() {
  return currentBranch ? `${STORAGE_KEY}_${currentBranch.id}_${getCleaningModuleId()}` : null;
}

function loadState() {
  const key = getBoardStorageKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

function saveState(options = {}) {
  const key = getBoardStorageKey();
  if (key) localStorage.setItem(key, JSON.stringify(state));
  if (!options.localOnly && !isApplyingRemoteState && currentBranch) queueRemoteSave();
}

function normalizeState(parsed) {
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.collaborators)) return null;

  const collaborators = parsed.collaborators
    .filter((c) => c && typeof c.id === "string" && typeof c.name === "string")
    .map((c) => ({ id: c.id, name: c.name.trim() }))
    .filter((c) => c.name.length > 0);

  const sourceTasks = parsed.tasks && typeof parsed.tasks === "object" ? parsed.tasks : {};
  const tasks = {};
  const activeWeek = getActiveWeekMondayStr();

  for (const [key, value] of Object.entries(sourceTasks)) {
    if (!value || typeof value !== "object") continue;

    // Detect key format: old = "collabId__dayIndex" (2 parts), new = "week__collabId__dayIndex" (3 parts)
    const parts = key.split("__");
    const targetKey = parts.length === 2 ? `${activeWeek}__${key}` : key;

    // Formato nuevo: tiene array items
    if (Array.isArray(value.items)) {
      if (value.free) {
        tasks[targetKey] = { free: true, items: [] };
      } else {
        const items = value.items.map(normalizeTaskItem).filter(Boolean);
        if (items.length > 0) tasks[targetKey] = { free: false, items };
      }
      continue;
    }

    // Formato antiguo: { free } o { team, taskId, done }
    if (value.free) {
      tasks[targetKey] = { free: true, items: [] };
      continue;
    }
    const item = normalizeTaskItem(value);
    if (item) tasks[targetKey] = { free: false, items: [item] };
  }

  return { collaborators, tasks };
}

function normalizeTaskItem(value) {
  if (!value || typeof value !== "object") return null;
  const done = Boolean(value.done);
  const team = typeof value.team === "string" ? value.team.trim() : "";
  let taskId = typeof value.taskId === "string" ? value.taskId.trim() : "";
  const text = typeof value.text === "string" ? value.text.trim() : "";
  const colorKey = typeof value.colorKey === "string" ? value.colorKey.trim() : "";
  const id = typeof value.id === "string" ? value.id : createId();

  if (!taskId && team && text) taskId = findTaskIdByText(team, text);

  const completedAt      = typeof value.completedAt === "string" ? value.completedAt : undefined;
  const evidencePhotoUrl = typeof value.evidencePhotoUrl === "string" ? value.evidencePhotoUrl : undefined;
  const evidenceStoragePath = typeof value.evidenceStoragePath === "string" ? value.evidenceStoragePath : undefined;
  const evidenceStorageModule = typeof value.evidenceStorageModule === "string" ? value.evidenceStorageModule : undefined;
  const evidenceDate = typeof value.evidenceDate === "string" ? value.evidenceDate : undefined;
  const evidenceSource = typeof value.evidenceSource === "string" ? value.evidenceSource : undefined;
  const extra = {
    ...(completedAt ? { completedAt } : {}),
    ...(evidencePhotoUrl ? { evidencePhotoUrl } : {}),
    ...(evidenceStoragePath ? { evidenceStoragePath } : {}),
    ...(evidenceStorageModule ? { evidenceStorageModule } : {}),
    ...(evidenceDate ? { evidenceDate } : {}),
    ...(evidenceSource ? { evidenceSource } : {})
  };

  // Keep item if it has a taskId, even if not yet found in TASK_LIBRARY
  // (library may load after board state; resolveTaskMeta handles missing tasks gracefully)
  if (taskId) return { id, team, taskId, done, ...extra };
  if (text) return { id, team, taskId: "", text, colorKey: LEGEND[colorKey] ? colorKey : "none", done, ...extra };
  return null;
}

// ── Firebase sync & branch system ────────────────────────────────────

function initFirebaseConnection() {
  if (!window.firebase || typeof firebase.initializeApp !== "function" || typeof firebase.database !== "function") {
    setSyncStatus("Modo local", "offline");
    branches = loadBranchConfigFromLocal();
    showBranchSelector();
    renderBranchList();
    return;
  }
  try {
    const app = firebase.apps && firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    const database = firebase.database(app);
    firebaseDB = database;

    if (typeof firebase.storage === "function") {
      try {
        const photoConfig = getPhotoStorageConfig();
        const photoAppName = "wtf-photo-storage";
        const photoApp = photoConfig.projectId === FIREBASE_CONFIG.projectId
          ? app
          : (firebase.apps.find((item) => item.name === photoAppName) || firebase.initializeApp(photoConfig, photoAppName));
        firebaseStorage = firebase.storage(photoApp);
        firebaseStorageBucket = photoConfig.storageBucket || "";
      } catch (err) {
        firebaseStorage = null;
        firebaseStorageBucket = "";
        console.warn("No se pudo inicializar Firebase Storage para fotos:", err && err.message ? err.message : err);
      }
    }
    runPhotoRetentionCleanup();

    setSyncStatus("Conectando...", "busy");

    database.ref(".info/connected").on("value", (snap) => {
      if (currentBranch) {
        setSyncStatus(
          snap.val() === true ? (hasRemoteSnapshot ? "Sincronizado" : "Conectado") : "Sin conexion",
          snap.val() === true ? "online" : "offline"
        );
      }
    });

    initBranchConfigSync();
    window.setTimeout(() => {
      if (branchConfigReady || branches.length > 0) return;
      usingBranchConfigFallback = true;
      branches = loadBranchConfigFromLocal();
      setSyncStatus("Modo local", "offline");
      renderBranchList();
      showBranchSelector();
    }, 5000);
  } catch (err) {
    console.error("Firebase init error", err);
    setSyncStatus("Modo local", "offline");
    branches = loadBranchConfigFromLocal();
    showBranchSelector();
    renderBranchList();
  }
}

function initBranchConfigSync() {
  if (!firebaseDB) return;
  branchesConfigRef = firebaseDB.ref("branchConfig");
  branchesConfigRef.on("value", (snap) => {
    branchConfigReady = true;
    usingBranchConfigFallback = false;
    const json = snap.val();
    if (json) {
      try { branches = normalizeBranchConfig(JSON.parse(json)); } catch (_) { branches = loadBranchConfigFromLocal(); }
    } else {
      branches = loadBranchConfigFromLocal();
      branchesConfigRef.set(JSON.stringify(branches)).catch(console.error);
    }
    persistBranchConfigLocal();
    renderBranchList();
    syncBranchSelect();
    if (currentBranch) {
      const updated = branches.find((b) => b.id === currentBranch.id);
      if (updated) {
        currentBranch = updated;
        document.getElementById("header-branch-name").textContent = currentBranch.name;
        updateBranchSelectorClose();
        syncBranchSelect();
        if (!remoteBoardRef && firebaseDB) connectBoardSync(currentBranch.id);
      } else {
        currentBranch = null;
        currentBranchIsAdmin = false;
        if (remoteBoardRef) { remoteBoardRef.off(); remoteBoardRef = null; }
        document.getElementById("header-branch-name").textContent = "—";
        state = createInitialState();
        selectedCell = null;
        syncBranchSelect();
        renderTable();
        showBranchSelector();
      }
    }
  });
  if (!currentBranch) showBranchSelector();
}

function showBranchSelector() {
  if (!currentCleaningModule) {
    showModuleSelector();
    return;
  }
  updateBranchSelectorClose();
  document.getElementById("branch-selector").classList.remove("hidden");
}

function hideBranchSelector() {
  document.getElementById("branch-selector").classList.add("hidden");
}

function showModuleSelector() {
  if (moduleSelectorOverlay) moduleSelectorOverlay.classList.remove("hidden");
}

function hideModuleSelector() {
  if (moduleSelectorOverlay) moduleSelectorOverlay.classList.add("hidden");
}

function selectCleaningModule(moduleId) {
  const found = CLEANING_MODULES.find((item) => item.id === moduleId) || CLEANING_MODULES[0];
  currentCleaningModule = found;
  updateModuleLabel();
  hideModuleSelector();
  initLibrarySync();
  state = currentBranch ? loadState() || createInitialState() : createInitialState();
  if (pruneExpiredPhotoEvidenceInState()) saveState({ localOnly: true });
  selectedCell = null;
  updateTeamSelectors();
  renderTable();
  renderRealizadasPanel();
  if (currentBranch) {
    if (firebaseDB && !usingBranchConfigFallback) connectBoardSync(currentBranch.id);
    else setSyncStatus("Modo local", "offline");
  } else {
    showBranchSelector();
  }
}

function renderBranchList() {
  const list = document.getElementById("branch-list");
  syncBranchSelect();
  updateBranchSelectorClose();
  if (!branches.length) {
    list.innerHTML = '<p class="branch-loading">Sin sucursales configuradas.</p>';
    return;
  }
  list.innerHTML = branches.map((branch) => `
    <button type="button" class="branch-card ${currentBranch && currentBranch.id === branch.id ? "is-current" : ""}" data-branch-id="${escapeHtml(branch.id)}">
      <span class="branch-card-name">${escapeHtml(branch.name)}</span>
      <span class="branch-card-status">${currentBranch && currentBranch.id === branch.id ? "Actual" : "›"}</span>
    </button>
  `).join("");
  list.querySelectorAll(".branch-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const branch = branches.find((b) => b.id === btn.getAttribute("data-branch-id"));
      if (!branch) return;
      if (currentBranch && currentBranch.id === branch.id) {
        hideBranchSelector();
        return;
      }
      openBranchPinModal(branch);
    });
  });
}

function syncBranchSelect() {
  if (!branchSelect) return;
  const currentValue = currentBranch ? currentBranch.id : "";
  const placeholder = branches.length ? "Seleccionar sucursal" : "Sin sucursales";
  setSelectOptions(
    branchSelect,
    [{ value: "", label: placeholder }, ...branches.map((branch) => ({ value: branch.id, label: branch.name }))],
    currentValue
  );
  branchSelect.disabled = branches.length === 0;
}

function updateBranchSelectorClose() {
  const closeBtn = document.getElementById("branch-selector-close-btn");
  if (!closeBtn) return;
  closeBtn.classList.toggle("hidden", !currentBranch);
  closeBtn.textContent = currentBranch ? `Continuar en ${currentBranch.name}` : "Continuar";
}

function openBranchPinModal(branch) {
  pendingBranchLogin = branch;
  document.getElementById("branch-pin-name").textContent = branch.name;
  document.getElementById("branch-pin-input").value = "";
  document.getElementById("branch-pin-error").classList.add("hidden");
  document.getElementById("branch-pin-overlay").classList.remove("hidden");
  setTimeout(() => document.getElementById("branch-pin-input").focus(), 80);
}

function closeBranchPinModal() {
  document.getElementById("branch-pin-overlay").classList.add("hidden");
  pendingBranchLogin = null;
}

function confirmBranchPin() {
  const input = document.getElementById("branch-pin-input");
  if (!pendingBranchLogin) return;
  const currentMasterPin = pendingBranchLogin.masterPin || ADMIN_PIN;
  const isBranchUser = input.value === pendingBranchLogin.pin;
  const isBranchAdmin = input.value === currentMasterPin;

  if (isBranchUser || isBranchAdmin) {
    const branch = pendingBranchLogin;
    closeBranchPinModal();
    enterBranch(branch, { isAdmin: isBranchAdmin });
  } else {
    document.getElementById("branch-pin-error").classList.remove("hidden");
    input.value = "";
    input.focus();
  }
}

function logoutBranch() {
  // Desconectar sincronización Firebase
  if (remoteBoardRef) {
    remoteBoardRef.off();
    remoteBoardRef = null;
  }
  
  // Limpiar estado local
  currentBranch = null;
  currentBranchIsAdmin = false;
  currentCleaningModule = null;
  state = createInitialState();
  hasRemoteSnapshot = false;
  
  // Limpiar localStorage del estado del tablero
  const key = getBoardStorageKey();
  if (key) localStorage.removeItem(key);
  
  // Actualizar UI
  document.getElementById("header-branch-name").textContent = "—";
  updateModuleLabel();
  setSyncStatus("Selecciona sucursal...", "busy");
  syncBranchSelect();
  updateBranchSelectorClose();
  
  // Mostrar selector de sucursales
  showModuleSelector();
  renderBranchList();
}

function enterBranch(branch, options = {}) {
  currentBranch = branch;
  currentBranchIsAdmin = Boolean(options.isAdmin);
  document.getElementById("header-branch-name").textContent = branch.name;
  hideBranchSelector();
  state = loadState() || createInitialState();
  if (pruneExpiredPhotoEvidenceInState()) saveState({ localOnly: true });
  syncBranchSelect();
  renderBranchList();
  updateTeamSelectors();
  renderTable();
  if (firebaseDB && !usingBranchConfigFallback) {
    connectBoardSync(branch.id);
  } else {
    setSyncStatus("Modo local", "offline");
  }
}

function connectBoardSync(branchId) {
  if (remoteBoardRef) { remoteBoardRef.off(); remoteBoardRef = null; }
  hasRemoteSnapshot = false;
  remoteBoardRef = firebaseDB.ref(`boards/${branchId}_${getCleaningModuleId()}`);
  setSyncStatus("Conectando...", "busy");
  remoteBoardRef.on("value", (snap) => {
    hasRemoteSnapshot = true;
    const raw = snap.val();
    if (raw === null) {
      setSyncStatus("Subiendo datos iniciales...", "busy");
      queueRemoteSave({ immediate: true });
      return;
    }
    const remoteState = parseRemoteState(raw);
    if (!remoteState) {
      console.warn("No se pudo interpretar el estado remoto:", raw);
      setSyncStatus("Error de formato", "error");
      return;
    }
    isApplyingRemoteState = true;
    state = remoteState;
    const prunedEvidence = pruneExpiredPhotoEvidenceInState();
    saveState({ localOnly: true });
    isApplyingRemoteState = false;
    if (prunedEvidence) queueRemoteSave({ immediate: true });
    updateTeamSelectors();
    renderTable();
    setSyncStatus("Sincronizado", "online");
  }, (err) => {
    console.error("Firebase sync error", err);
    setSyncStatus("Error de sincronizacion", "error");
  });
}

async function openBranchSettings() {
  const allowed = await requireAdmin("Administrar sucursales");
  if (!allowed) return;
  document.getElementById("branch-settings-overlay").classList.remove("hidden");
  renderBranchSettings();
}

function closeBranchSettings() {
  document.getElementById("branch-settings-overlay").classList.add("hidden");
}

function renderBranchSettings() {
  const body = document.getElementById("branch-settings-body");
  if (!branches.length) {
    body.innerHTML = '<p style="color:#888;text-align:center;padding:1rem;">Sin sucursales.</p>';
    return;
  }
  body.innerHTML = branches.map((branch) => `
    <div class="branch-edit-item">
      <div class="branch-edit-header">
        <strong class="branch-edit-title">${escapeHtml(branch.name)}</strong>
        <button type="button" class="branch-delete-btn" data-branch-id="${escapeHtml(branch.id)}">🗑</button>
      </div>
      <div class="branch-edit-form">
        <input type="text" class="branch-edit-input branch-name-input" placeholder="Nombre" value="${escapeHtml(branch.name)}" maxlength="40">
        <input type="text" class="branch-edit-input branch-pin-input-field" placeholder="Contraseña de acceso" value="${escapeHtml(branch.pin)}" maxlength="20">
        <input type="text" class="branch-edit-input branch-master-pin-input" placeholder="Contraseña master (6 dígitos)" value="${escapeHtml(branch.masterPin || "")}" maxlength="6">
        <button type="button" class="branch-save-btn" data-branch-id="${escapeHtml(branch.id)}">Guardar</button>
      </div>
    </div>
  `).join("");

  body.querySelectorAll(".branch-save-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest(".branch-edit-item");
      const newName = item.querySelector(".branch-name-input").value.trim();
      const newPin  = item.querySelector(".branch-pin-input-field").value.trim();
      const newMasterPin = item.querySelector(".branch-master-pin-input").value.trim();
      if (!newName || !newPin) { alert("Nombre y contraseña de acceso son requeridos."); return; }
      if (newMasterPin && newMasterPin.length !== 6) { alert("La contraseña master debe tener exactamente 6 dígitos."); return; }
      const branch = branches.find((b) => b.id === btn.getAttribute("data-branch-id"));
      if (!branch) return;
      const allowed = await requireAdmin(`Cambiar datos de sucursal "${branch.name}"`);
      if (!allowed) return;
      branch.name = newName;
      branch.pin  = newPin;
      branch.masterPin = newMasterPin || ADMIN_PIN; // Usar el masterPin nuevo o el global por defecto
      saveBranchConfig();
      renderBranchSettings();
      renderBranchList();
    });
  });

  body.querySelectorAll(".branch-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const branch = branches.find((b) => b.id === btn.getAttribute("data-branch-id"));
      if (!branch) return;
      const allowed = await requireAdmin(`Eliminar sucursal "${branch.name}"`);
      if (!allowed) return;
      if (!confirm(`¿Eliminar la sucursal "${branch.name}"? Esta acción no se puede deshacer.`)) return;
      branches = branches.filter((b) => b.id !== branch.id);
      saveBranchConfig();
      renderBranchSettings();
      renderBranchList();
    });
  });
}

function saveBranchConfig() {
  branches = normalizeBranchConfig(branches);
  if (currentBranch) {
    const updated = branches.find((branch) => branch.id === currentBranch.id);
    if (updated) {
      currentBranch = updated;
      document.getElementById("header-branch-name").textContent = currentBranch.name;
    } else {
      currentBranch = null;
      currentBranchIsAdmin = false;
      if (remoteBoardRef) { remoteBoardRef.off(); remoteBoardRef = null; }
      document.getElementById("header-branch-name").textContent = "—";
      state = createInitialState();
      selectedCell = null;
      renderTable();
      showBranchSelector();
    }
  }
  persistBranchConfigLocal();
  syncBranchSelect();
  updateBranchSelectorClose();
  if (branchesConfigRef) branchesConfigRef.set(JSON.stringify(branches)).catch(console.error);
}

function loadBranchConfigFromLocal() {
  try {
    const raw = localStorage.getItem(BRANCH_CONFIG_STORAGE_KEY);
    if (!raw) return normalizeBranchConfig(DEFAULT_BRANCHES);
    return normalizeBranchConfig(JSON.parse(raw));
  } catch (_) {
    return normalizeBranchConfig(DEFAULT_BRANCHES);
  }
}

function persistBranchConfigLocal() {
  try {
    // No guardar PINs en localStorage por seguridad - solo guardar nombres e IDs
    const branchesWithoutPins = branches.map(b => ({ id: b.id, name: b.name }));
    localStorage.setItem(BRANCH_CONFIG_STORAGE_KEY, JSON.stringify(branchesWithoutPins));
  } catch (_) {}
}

function normalizeBranchConfig(value) {
  const fixed = DEFAULT_BRANCHES[0];
  const source = Array.isArray(value) ? value : DEFAULT_BRANCHES;
  const remoteVenezuela = source.find((branch) => branch && typeof branch === "object" && String(branch.id || "").trim() === fixed.id) || {};
  return [{
    id: fixed.id,
    name: fixed.name,
    pin: typeof remoteVenezuela.pin === "string" && remoteVenezuela.pin.trim() ? remoteVenezuela.pin.trim() : fixed.pin,
    masterPin: typeof remoteVenezuela.masterPin === "string" && remoteVenezuela.masterPin.trim() ? remoteVenezuela.masterPin.trim() : fixed.masterPin
  }];
}

function slugifyBranchName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseRemoteState(value) {
  try {
    if (!value) return null;
    if (typeof value === "string") return normalizeState(JSON.parse(value));
    if (typeof value.stateJson === "string") return normalizeState(JSON.parse(value.stateJson));
    return normalizeState(value);
  } catch (_) {
    return null;
  }
}

function queueRemoteSave(options = {}) {
  if (!remoteBoardRef) return;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(() => {
    setSyncStatus("Guardando...", "busy");
    remoteBoardRef.set({
      stateJson: JSON.stringify(state),
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => setSyncStatus("Sincronizado", "online"))
      .catch((err) => { console.error("Firebase save error", err); setSyncStatus("Error al guardar", "error"); });
  }, options.immediate ? 0 : SYNC_DEBOUNCE_MS);
}

function setSyncStatus(message, stateName) {
  if (!syncStatus) return;
  syncStatus.textContent = message;
  syncStatus.dataset.state = stateName || "busy";
}

// ── Render ────────────────────────────────────────────────────────────

function renderTable() {
  const searchQuery = getTaskSearchQuery();
  let searchHitCount = 0;

  if (state.collaborators.length === 0) {
    scheduleBody.innerHTML = `
      <tr>
        <td class="row-name" colspan="${DAYS.length + 1}" style="padding:1rem;text-align:center;color:#7a8677;">
          No hay colaboradores. Agrega uno para iniciar.
        </td>
      </tr>`;
    renderTaskSearchStatus(searchQuery, 0);
    return;
  }

  scheduleBody.innerHTML = state.collaborators.map((collaborator) => {
    const dayCells = DAYS.map((_, dayIndex) => {
      const key = buildCellKey(collaborator.id, dayIndex);
      const cellData = state.tasks[key];
      const isFree = Boolean(cellData && cellData.free);
      const items = (!isFree && cellData && Array.isArray(cellData.items)) ? cellData.items : [];
      const isSelected = Boolean(
        selectedCell &&
        selectedCell.collaboratorId === collaborator.id &&
        selectedCell.dayIndex === dayIndex
      );

      let statusClass = "";
      if (isFree) {
        statusClass = "free";
      } else if (items.length > 0) {
        statusClass = items.every((i) => i.done) ? "done" : "pending";
      }

      const weekendClass = dayIndex >= 5 ? "weekend" : "";
      const selectedClass = isSelected ? "selected" : "";
      let cellHasSearchMatch = false;

      let cellContent = "";
      if (isFree) {
        cellContent = `<span class="free-label">FREE</span>`;
      } else if (items.length > 0) {
        cellContent = items.map((item) => {
          const meta = resolveTaskMeta(item);
          const chipDone = item.done ? "chip-done" : "";
          const isSearchHit = taskMatchesSearch(meta, searchQuery);
          if (isSearchHit) {
            cellHasSearchMatch = true;
            searchHitCount++;
          }
          const searchClass = isSearchHit ? "search-hit" : "";
          return `<span class="task-chip ${chipDone} ${searchClass}">${meta.legend.symbol} ${escapeHtml(meta.taskName)} · ${escapeHtml(meta.team)}</span>`;
        }).join("");
      } else {
        cellContent = `<span class="task-empty">+ Asignar tarea</span>`;
      }

      const titleParts = isFree
        ? ["FREE - colaborador libre"]
        : items.length > 0
        ? items.map((i) => { const m = resolveTaskMeta(i); return `${m.team}: ${m.taskName}`; })
        : ["Sin tarea"];

      return `
        <td class="task-cell ${weekendClass}" data-day-label="${escapeHtml(DAYS[dayIndex])}">
          <button
            type="button"
            class="cell-btn ${statusClass} ${selectedClass} ${cellHasSearchMatch ? "search-match" : ""}"
            data-cell="1"
            data-collaborator="${collaborator.id}"
            data-day="${dayIndex}"
            title="${escapeHtml(titleParts.join(" | "))}"
          >${cellContent}</button>
        </td>`;
    }).join("");

    return `
      <tr>
        <td class="row-name">
          <div class="name-wrap">
            <span>${escapeHtml(collaborator.name)}</span>
            <button type="button" class="remove-btn"
              data-remove-collaborator="${collaborator.id}"
              title="Eliminar colaborador"
              aria-label="Eliminar colaborador ${escapeHtml(collaborator.name)}">x</button>
          </div>
        </td>
        ${dayCells}
      </tr>`;
  }).join("");

  renderTaskSearchStatus(searchQuery, searchHitCount);
}

// ── Selectors ─────────────────────────────────────────────────────────

function updateTeamSelectors() {
  const teams = collectTeamsFromState();
  setSelectOptions(
    taskTeam,
    [{ value: "", label: "Seleccionar equipo" }, ...teams.map((t) => ({ value: t, label: t }))],
    taskTeam.value
  );
}


function collectTeamsFromState() {
  const known = new Set(TEAM_NAMES);
  const extra = [];
  for (const cellData of Object.values(state.tasks)) {
    if (!cellData || !Array.isArray(cellData.items)) continue;
    for (const item of cellData.items) {
      if (typeof item.team === "string" && item.team && !known.has(item.team)) {
        known.add(item.team);
        extra.push(item.team);
      }
    }
  }
  return [...TEAM_NAMES, ...extra];
}

function setSelectOptions(el, options, currentValue) {
  const selected = options.some((o) => o.value === currentValue) ? currentValue : options[0].value;
  el.innerHTML = "";
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    el.append(opt);
  }
  el.value = selected;
}

function getTaskSearchQuery() {
  return normalizeText(taskSearchInput?.value || "");
}

function taskMatchesSearch(meta, query) {
  if (!query) return false;
  const searchable = normalizeText(`${meta.taskName} ${meta.team}`);
  return query.split(" ").filter(Boolean).every((part) => searchable.includes(part));
}

function renderTaskSearchStatus(query, count) {
  if (!taskSearchClear || !taskSearchCount) return;
  taskSearchClear.classList.toggle("hidden", !query);
  taskSearchCount.textContent = query
    ? `${count} coincidencia${count === 1 ? "" : "s"}`
    : "";
  taskSearchCount.dataset.state = query && count === 0 ? "empty" : "ready";
}

// ── Helpers ───────────────────────────────────────────────────────────

function resolveTaskMeta(item) {
  const team = item.team && item.team.trim() ? item.team.trim() : "Sin equipo";
  const task = findTask(team, item.taskId);
  if (task) return { team, taskName: task.name, legend: LEGEND[task.color] || LEGEND.none };
  const fallback = item.text && item.text.trim() ? item.text.trim() : "Tarea sin catalogo";
  const colorKey = LEGEND[item.colorKey] ? item.colorKey : "none";
  return { team, taskName: fallback, legend: LEGEND[colorKey] };
}

function findTask(team, taskId) {
  if (!team || !taskId) return null;
  return TASK_INDEX.get(`${team}__${taskId}`) || null;
}

function findTaskIdByText(team, text) {
  if (!hasTeam(team) || !text) return "";
  const target = normalizeText(text);
  if (!target) return "";
  for (const task of TASK_LIBRARY[team]) {
    const candidate = normalizeText(task.name);
    if (candidate === target || candidate.includes(target) || target.includes(candidate)) return task.id;
  }
  return "";
}

function normalizeText(value) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function hasTeam(team) {
  return Object.prototype.hasOwnProperty.call(TASK_LIBRARY, team);
}

function buildTaskIndex() {
  const map = new Map();
  for (const [team, tasks] of Object.entries(TASK_LIBRARY)) {
    for (const task of tasks) map.set(`${team}__${task.id}`, task);
  }
  return map;
}

function buildCellKey(collaboratorId, dayIndex) {
  return `${currentWeekStart}__${collaboratorId}__${dayIndex}`;
}

function trimText(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function createId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function resolveTaskFrequencyInterval(task) {
  const legend = LEGEND[task && task.color] || LEGEND.none;
  const rawText = `${task && task.frequency ? task.frequency : ""} ${legend.short || ""} ${legend.label || ""}`;
  const normalized = normalizeText(rawText);
  const match = normalized.match(/cada\s+(\d+)\s+dia/);
  if (match) {
    const parsed = Number(match[1]);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  if (normalized.includes("seman")) return 7;
  if (task && task.color === "red") return 1;
  if (task && task.color === "orange") return 3;
  if (task && task.color === "yellow") return 4;
  return 7;
}

function buildTaskDaysForWeek(task) {
  const interval = resolveTaskFrequencyInterval(task);
  if (interval <= 1) return [0, 1, 2, 3, 4, 5, 6];
  if (interval >= 7) return [Math.floor(Math.random() * 7)];
  const startOffset = Math.floor(Math.random() * Math.min(interval, 7));
  const days = [];
  for (let day = startOffset; day < 7; day += interval) {
    days.push(day);
  }
  return days.length ? days : [Math.floor(Math.random() * 7)];
}

function pickCollaboratorForAutoFill(dayIndex, dayLoads, weekLoads) {
  let bestDayLoad = Infinity;
  let bestWeekLoad = Infinity;
  let candidates = [];
  for (let index = 0; index < dayLoads.length; index++) {
    const currentDayLoad = dayLoads[index][dayIndex];
    const currentWeekLoad = weekLoads[index];
    if (currentDayLoad < bestDayLoad || currentDayLoad === bestDayLoad && currentWeekLoad < bestWeekLoad) {
      bestDayLoad = currentDayLoad;
      bestWeekLoad = currentWeekLoad;
      candidates = [index];
      continue;
    }
    if (currentDayLoad === bestDayLoad && currentWeekLoad === bestWeekLoad) {
      candidates.push(index);
    }
  }
  if (!candidates.length) return 0;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function autoFillCalendar() {
  const allTasks = [];
  for (const [team, tasks] of Object.entries(TASK_LIBRARY)) {
    for (const task of tasks) {
      allTasks.push({ team, taskId: task.id, color: task.color || "none", frequency: task.frequency || "" });
    }
  }
  if (allTasks.length === 0) {
    alert("La biblioteca estÃ¡ vacÃ­a. Agrega tareas antes de usar Auto-llenar.");
    return;
  }
  const collabs = state.collaborators;
  const numCollabs = collabs.length;
  if (numCollabs === 0) {
    alert("Agrega colaboradores antes de usar Auto-llenar.");
    return;
  }
  for (const key of Object.keys(state.tasks)) {
    if (key.startsWith(`${currentWeekStart}__`)) delete state.tasks[key];
  }
  const dayPools = Array.from({ length: 7 }, () => []);
  for (const task of allTasks) {
    for (const dayIndex of buildTaskDaysForWeek(task)) {
      dayPools[dayIndex].push(task);
    }
  }
  const dayLoads = Array.from({ length: numCollabs }, () => Array(7).fill(0));
  const weekLoads = Array(numCollabs).fill(0);
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const usedPerDay = new Set();
    for (const task of shuffleArray(dayPools[dayIndex])) {
      const uid = `${task.team}__${task.taskId}`;
      if (usedPerDay.has(uid)) continue;
      usedPerDay.add(uid);
      const collaboratorIndex = pickCollaboratorForAutoFill(dayIndex, dayLoads, weekLoads);
      const key = buildCellKey(collabs[collaboratorIndex].id, dayIndex);
      if (!state.tasks[key]) state.tasks[key] = { free: false, items: [] };
      state.tasks[key].items.push({ id: createId(), team: task.team, taskId: task.taskId, done: false });
      dayLoads[collaboratorIndex][dayIndex] += 1;
      weekLoads[collaboratorIndex] += 1;
    }
  }
  saveState();
  renderTable();
  if (selectedCell) closeModal();
}

// Returns "YYYY-MM-DD" of the active week's Monday.
// If today is Sunday at or after 05:00, the active week is next week.
function getActiveWeekMondayStr() {
  const now  = new Date();
  const day  = now.getDay(); // 0 = Sunday
  const isLateNightSunday = day === 0 && now.getHours() >= 5;
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + (isLateNightSunday ? 7 : 0));
  monday.setHours(0, 0, 0, 0);
  return mondayToStr(monday);
}

function mondayToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function strToMonday(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function navigateWeek(delta) {
  const monday = strToMonday(currentWeekStart);
  monday.setDate(monday.getDate() + delta * 7);
  currentWeekStart = mondayToStr(monday);
  isOnAutoWeek = currentWeekStart === getActiveWeekMondayStr();
  renderWeekLabel();
  renderTable();
}

function renderWeekLabel() {
  const monday = strToMonday(currentWeekStart);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };
  const el = document.getElementById("week-range");
  if (el) el.textContent = `Del ${fmt(monday)} Hasta ${fmt(sunday)}`;
}

function getWeekFolderLabel() {
  const monday = strToMonday(currentWeekStart);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

function renderRealizadasPanel() {
  const monday = strToMonday(currentWeekStart);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };
  if (realizadasWeekLbl) realizadasWeekLbl.textContent = `${fmt(monday)} – ${fmt(sunday)}`;

  const groups = [];
  for (const collab of state.collaborators) {
    const doneTasks = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const key = buildCellKey(collab.id, dayIndex);
      const cellData = state.tasks[key];
      if (!cellData || !Array.isArray(cellData.items)) continue;
      for (const item of cellData.items) {
        if (!item.done) continue;
        doneTasks.push({ item, dayIndex, meta: resolveTaskMeta(item) });
      }
    }
    doneTasks.sort((a, b) => getCompletedTime(b.item) - getCompletedTime(a.item));
    if (doneTasks.length > 0) groups.push({ collab, doneTasks, lastDoneAt: getCompletedTime(doneTasks[0].item) });
  }
  groups.sort((a, b) => b.lastDoneAt - a.lastDoneAt);

  if (groups.length === 0) {
    realizadasBody.innerHTML = '<p class="realizadas-empty">No hay tareas realizadas esta semana.</p>';
    return;
  }

  realizadasBody.innerHTML = groups.map(({ collab, doneTasks }) => {
    const rows = doneTasks.map(({ item, dayIndex, meta }) => {
      const timeStr = item.completedAt
        ? new Date(item.completedAt).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
        : "";
      const thumbHtml = isSafeUrl(item.evidencePhotoUrl)
        ? `<button type="button" class="photo-thumb-link" data-photo-viewer-src="${escapeHtml(item.evidencePhotoUrl)}" title="Ver foto">
             <img src="${escapeHtml(item.evidencePhotoUrl)}" class="realizadas-thumb" alt="Evidencia" loading="lazy">
           </button>`
        : `<span class="realizadas-no-photo">Sin foto</span>`;
      return `
        <div class="realizadas-row">
          <div class="realizadas-row-info">
            <span class="realizadas-day">${escapeHtml(DAYS[dayIndex])}</span>
            <span class="realizadas-task">${meta.legend.symbol} ${escapeHtml(meta.taskName)} &middot; ${escapeHtml(meta.team)}</span>
            ${timeStr ? `<span class="realizadas-time">${escapeHtml(timeStr)}</span>` : ""}
          </div>
          ${thumbHtml}
        </div>`;
    }).join("");
    return `
      <div class="realizadas-group">
        <div class="realizadas-collab-name">${escapeHtml(collab.name)}</div>
        ${rows}
      </div>`;
  }).join("");
}

function getCompletedTime(item) {
  const value = item && item.completedAt ? new Date(item.completedAt).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function isSafeUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.trimStart().toLowerCase();
  return lower.startsWith("https://") || /^data:image\/(jpeg|png|webp);base64,/.test(lower);
}
