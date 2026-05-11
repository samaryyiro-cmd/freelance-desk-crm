const STORAGE_KEY = "freelance-desk-opportunities";
const DELETED_STORAGE_KEY = "freelance-desk-deleted-opportunities";
const SETTINGS_STORAGE_KEY = "freelance-desk-settings";

const demoOpportunities = [
  {
    id: crypto.randomUUID(),
    client: "Cafeteria Aurora",
    service: "Landing page para reservas",
    value: 520,
    status: "Prospecto",
    nextStep: "Responder dudas sobre hosting y dominio",
    dueDate: "2026-05-18"
  },
  {
    id: crypto.randomUUID(),
    client: "Fit Studio Norte",
    service: "Agenda de clases online",
    value: 780,
    status: "Negociacion",
    nextStep: "Enviar alcance dividido por fases",
    dueDate: "2026-05-22"
  },
  {
    id: crypto.randomUUID(),
    client: "Dra. Mariana Rios",
    service: "Sitio web profesional",
    value: 640,
    status: "Finalizado",
    nextStep: "Preparar wireframe inicial",
    dueDate: "2026-05-29"
  },
  {
    id: crypto.randomUUID(),
    client: "Tienda Brava",
    service: "Catalogo responsive",
    value: 430,
    status: "Prospecto",
    nextStep: "Agendar llamada de descubrimiento",
    dueDate: "2026-06-02"
  },
  {
    id: crypto.randomUUID(),
    client: "Eventos Prisma",
    service: "Panel de cotizaciones",
    value: 920,
    status: "Pausada",
    nextStep: "Esperar aprobacion de presupuesto",
    dueDate: "2026-06-08"
  }
];

const statusColumns = ["Prospecto", "Negociacion", "En proceso"];
const finalStatuses = ["Finalizado"];
const defaultSettings = {
  name: "Samary",
  role: "Freelancer digital",
  currency: "USD"
};

let opportunities = loadOpportunities();
let deletedOpportunities = loadDeletedOpportunities();
let settings = loadSettings();
let activeFilter = "all";
let activeProposalFilter = "all";
let selectedTaskProjectId = null;
let pendingConfirmAction = null;
let searchTerm = "";

const elements = {
  modal: document.querySelector("#opportunityModal"),
  taskModal: document.querySelector("#taskModal"),
  confirmModal: document.querySelector("#confirmModal"),
  form: document.querySelector("#opportunityForm"),
  settingsForm: document.querySelector("#settingsForm"),
  taskForm: document.querySelector("#taskForm"),
  taskProject: document.querySelector("#taskProject"),
  taskList: document.querySelector("#taskList"),
  newTaskInput: document.querySelector("#newTaskInput"),
  addTaskButton: document.querySelector("#addTaskButton"),
  pauseProjectButton: document.querySelector("#pauseProjectButton"),
  finishProjectButton: document.querySelector("#finishProjectButton"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmMessage: document.querySelector("#confirmMessage"),
  cancelConfirm: document.querySelector("#cancelConfirm"),
  acceptConfirm: document.querySelector("#acceptConfirm"),
  kanban: document.querySelector("#kanbanBoard"),
  clientRows: document.querySelector("#clientRows"),
  proposalCards: document.querySelector("#proposalCards"),
  revenueBreakdown: document.querySelector("#revenueBreakdown"),
  revenueBreakdownTotal: document.querySelector("#revenueBreakdownTotal"),
  deletedHistory: document.querySelector("#deletedHistory"),
  searchInput: document.querySelector("#searchInput"),
  metricRevenue: document.querySelector("#metricRevenue"),
  metricOpen: document.querySelector("#metricOpen"),
  metricCloseRate: document.querySelector("#metricCloseRate"),
  metricAverage: document.querySelector("#metricAverage"),
  nextAction: document.querySelector("#nextAction"),
  resetDemo: document.querySelector("#resetDemo"),
  clearHistory: document.querySelector("#clearHistory"),
  profileName: document.querySelector(".profile-strip strong"),
  profileRole: document.querySelector(".profile-strip span"),
  avatar: document.querySelector(".avatar")
};

function loadOpportunities() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return demoOpportunities.map(normalizeOpportunity);
  }

  try {
    return JSON.parse(saved).map(normalizeOpportunity);
  } catch {
    return demoOpportunities.map(normalizeOpportunity);
  }
}

function normalizeOpportunity(item) {
  const statusText = String(item.status).toLowerCase();
  const normalizedStatus = statusText.startsWith("env") ? "En proceso" : item.status;
  return {
    ...item,
    status: statusText.startsWith("gan") ? "Finalizado" : normalizedStatus
  };
}

function saveOpportunities() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
}

function loadDeletedOpportunities() {
  const saved = localStorage.getItem(DELETED_STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved).map(normalizeOpportunity);
  } catch {
    return [];
  }
}

function saveDeletedOpportunities() {
  localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(deletedOpportunities));
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!saved) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {
    return defaultSettings;
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: settings.currency,
    maximumFractionDigits: 0
  }).format(Number(value));
}

function render() {
  renderProfile();
  renderMetrics();
  renderKanban();
  renderTable();
  renderNextAction();
  renderProposals();
  renderRevenueBreakdown();
  renderDeletedHistory();
}

function renderMetrics() {
  const active = opportunities.filter((item) => item.status !== "Pausada");
  const revenue = active.reduce((sum, item) => sum + Number(item.value), 0);
  const open = opportunities.filter((item) => ["Prospecto", "Negociacion"].includes(item.status)).length;
  const won = opportunities.filter((item) => isFinalized(item)).length;
  const closeRate = opportunities.length ? Math.round((won / opportunities.length) * 100) : 0;
  const average = opportunities.length ? Math.round(revenue / active.length || 0) : 0;

  elements.metricRevenue.textContent = formatMoney(revenue);
  elements.metricOpen.textContent = open;
  elements.metricCloseRate.textContent = `${closeRate}%`;
  elements.metricAverage.textContent = formatMoney(average);
}

function renderProfile() {
  elements.profileName.textContent = settings.name;
  elements.profileRole.textContent = settings.role;
  elements.avatar.textContent = settings.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "FD";

  elements.settingsForm.name.value = settings.name;
  elements.settingsForm.role.value = settings.role;
  elements.settingsForm.currency.value = settings.currency;
}

function renderKanban() {
  const filtered = getFilteredOpportunities();
  const columns = statusColumns.map((status) => {
    const items = filtered
      .filter((item) => item.status === status)
      .sort(sortByDueDate);
    const visibleItems = activeFilter === "all" ? items.slice(0, 2) : items;
    const hiddenCount = items.length - visibleItems.length;

    return `
      <section class="kanban-column" aria-label="${status}">
        <div class="column-title">
          <button class="column-filter" type="button" data-column-filter="${status}">${status}</button>
          <span>${items.length}</span>
        </div>
        ${visibleItems.map(renderOpportunityCard).join("") || "<p>No hay oportunidades en este estado.</p>"}
        ${hiddenCount > 0 ? `<button class="show-more" type="button" data-column-filter="${status}">Ver ${hiddenCount} mas</button>` : ""}
      </section>
    `;
  });

  elements.kanban.innerHTML = columns.join("");
}

function renderOpportunityCard(item) {
  const nextStatus = getNextStatus(item.status);
  const canManage = !isFinalized(item);
  const canPause = canManage && item.status !== "Pausada";
  const canResume = item.status === "Pausada";
  return `
    <article class="opportunity-card">
      <strong>${escapeHtml(item.client)}</strong>
      <p>${escapeHtml(item.service)}</p>
      <div class="card-footer">
        <span class="status-pill" data-status="${item.status}">${item.status}</span>
        <span class="value">${formatMoney(Number(item.value))}</span>
      </div>
      <div class="card-actions">
        ${nextStatus ? `<button class="action-button" type="button" data-change-status="${item.id}" data-next-status="${nextStatus}">${nextStatus}</button>` : ""}
        ${canManage ? `<button class="action-button" type="button" data-manage-tasks="${item.id}">Gestionar tareas</button>` : ""}
        ${canPause ? `<button class="action-button" type="button" data-pause="${item.id}">Pausar</button>` : ""}
        ${canResume ? `<button class="action-button" type="button" data-resume="${item.id}">Retomar</button>` : ""}
        <button class="action-button danger" type="button" data-delete="${item.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderTable() {
  const rows = getFilteredOpportunities().map((item) => {
    const nextStatus = getNextStatus(item.status);
    const canManage = !isFinalized(item);
    const canPause = canManage && item.status !== "Pausada";
    const canResume = item.status === "Pausada";
    return `
    <tr>
      <td>
        <strong>${escapeHtml(item.client)}</strong>
        <small>${escapeHtml(item.nextStep)}</small>
      </td>
      <td>${escapeHtml(item.service)}</td>
      <td>${formatMoney(Number(item.value))}</td>
      <td><span class="status-pill" data-status="${item.status}">${item.status}</span></td>
      <td>${formatDate(item.dueDate)}</td>
      <td>
        <div class="row-actions">
          ${nextStatus ? `<button class="action-button" type="button" data-change-status="${item.id}" data-next-status="${nextStatus}">${nextStatus}</button>` : ""}
          ${canManage ? `<button class="action-button" type="button" data-manage-tasks="${item.id}">Gestionar</button>` : ""}
          ${canPause ? `<button class="action-button" type="button" data-pause="${item.id}">Pausar</button>` : ""}
          ${canResume ? `<button class="action-button" type="button" data-resume="${item.id}">Retomar</button>` : ""}
          <button class="action-button danger" type="button" data-delete="${item.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `;
  });

  elements.clientRows.innerHTML = rows.join("") || `
    <tr>
      <td colspan="6">No se encontraron oportunidades con ese filtro.</td>
    </tr>
  `;
}

function renderNextAction() {
  const next = [...opportunities]
    .filter((item) => !isFinalized(item) && item.status !== "Pausada")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  if (!next) {
    elements.nextAction.innerHTML = `
      <strong>Todo al dia</strong>
      <p>No hay acciones pendientes. Agrega una nueva oportunidad para continuar moviendo el pipeline.</p>
      <div class="progress-track"><div class="progress-fill" style="width: 100%"></div></div>
      <span class="status-pill" data-status="Finalizado">Pipeline limpio</span>
    `;
    return;
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(next.dueDate) - new Date()) / 86400000));
  const urgency = Math.max(18, Math.min(100, 100 - daysLeft * 8));

  elements.nextAction.innerHTML = `
    <strong>${escapeHtml(next.client)}</strong>
    <p>${escapeHtml(next.nextStep)}</p>
    <div class="progress-track" aria-label="Nivel de urgencia">
      <div class="progress-fill" style="width: ${urgency}%"></div>
    </div>
    <div class="card-footer">
      <span class="status-pill" data-status="${next.status}">${next.status}</span>
      <span class="value">${formatDate(next.dueDate)}</span>
    </div>
  `;
}

function renderTaskModal() {
  const item = opportunities.find((opportunity) => opportunity.id === selectedTaskProjectId);
  if (!item) {
    return;
  }

  elements.taskProject.innerHTML = `
    <strong>${escapeHtml(item.client)}</strong>
    <span>${escapeHtml(item.service)} · ${escapeHtml(item.status)}</span>
  `;
  elements.finishProjectButton.hidden = item.status !== "En proceso";
  elements.pauseProjectButton.hidden = isFinalized(item) || item.status === "Pausada";

  const tasks = getTasks(item);
  elements.taskList.innerHTML = tasks.map((task, index) => `
    <label class="task-item">
      <input type="checkbox" data-task-index="${index}" ${task.done ? "checked" : ""} />
      <span>${escapeHtml(task.text)}</span>
    </label>
  `).join("") || "<p>No hay tareas agregadas para este proyecto.</p>";
}

function renderProposals() {
  const proposals = opportunities.filter((item) => {
    const proposalStates = ["Prospecto", "Negociacion", "En proceso", "Finalizado"];
    const matchesProposal = proposalStates.includes(item.status);
    const matchesOnlyProposals = activeProposalFilter === "proposals" && item.status === "Prospecto";
    const matchesPending = activeProposalFilter === "pending" && ["Prospecto", "Negociacion"].includes(item.status);
    const matchesFilter = activeProposalFilter === "all" || matchesOnlyProposals || matchesPending;
    return matchesProposal && matchesFilter;
  });

  elements.proposalCards.innerHTML = proposals.map((item) => `
    <article class="proposal-card">
      <header>
        <div>
          <h3>${escapeHtml(item.client)}</h3>
          <p>${escapeHtml(item.service)}</p>
        </div>
        <span class="status-pill" data-status="${item.status}">${item.status}</span>
      </header>
      <div class="proposal-meta">
        <div>
          <span>Valor</span>
          <strong>${formatMoney(item.value)}</strong>
        </div>
        <div>
          <span>Entrega</span>
          <strong>${formatDate(item.dueDate)}</strong>
        </div>
        <div>
          <span>Tarea</span>
          <strong>${escapeHtml(item.nextStep)}</strong>
        </div>
      </div>
      <div class="row-actions">
        ${getNextStatus(item.status) ? `<button class="action-button" type="button" data-change-status="${item.id}" data-next-status="${getNextStatus(item.status)}">${getNextStatus(item.status)}</button>` : ""}
        ${!isFinalized(item) ? `<button class="action-button" type="button" data-manage-tasks="${item.id}">Gestionar tareas</button>` : ""}
        ${!isFinalized(item) && item.status !== "Pausada" ? `<button class="action-button" type="button" data-pause="${item.id}">Pausar</button>` : ""}
        ${item.status === "Pausada" ? `<button class="action-button" type="button" data-resume="${item.id}">Retomar</button>` : ""}
        <button class="action-button danger" type="button" data-delete="${item.id}">Eliminar</button>
      </div>
    </article>
  `).join("") || "<p>No hay propuestas con este filtro.</p>";
}

function renderRevenueBreakdown() {
  const active = opportunities.filter((item) => item.status !== "Pausada");
  const total = active.reduce((sum, item) => sum + Number(item.value), 0);

  elements.revenueBreakdownTotal.textContent = formatMoney(total);
  elements.revenueBreakdown.innerHTML = active.map((item) => {
    const percent = total ? Math.max(6, Math.round((Number(item.value) / total) * 100)) : 0;
    return `
      <article class="revenue-row">
        <div>
          <span>${escapeHtml(item.status)}</span>
          <strong>${escapeHtml(item.client)}</strong>
          <p>${escapeHtml(item.service)}</p>
        </div>
        <div>
          <strong>${formatMoney(item.value)}</strong>
          <div class="revenue-bar" aria-label="Participacion en ingresos">
            <div style="width: ${percent}%"></div>
          </div>
        </div>
      </article>
    `;
  }).join("") || "<p>No hay oportunidades activas para calcular ingresos.</p>";
}

function renderDeletedHistory() {
  elements.deletedHistory.innerHTML = deletedOpportunities.map((item) => `
    <article class="history-item">
      <div>
        <h3>${escapeHtml(item.client)}</h3>
        <p>${escapeHtml(item.service)} · ${formatMoney(item.value)} · Eliminada el ${formatDateTime(item.deletedAt)}</p>
      </div>
      <button class="action-button" type="button" data-restore="${item.id}">Restaurar</button>
    </article>
  `).join("") || "<p>Todavia no has eliminado oportunidades.</p>";
}

function getFilteredOpportunities() {
  return opportunities.filter((item) => {
    const matchesStatus = activeFilter === "all" || item.status === activeFilter;
    const text = `${item.client} ${item.service} ${item.status} ${item.nextStep}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });
}

function sortByDueDate(a, b) {
  return new Date(a.dueDate) - new Date(b.dueDate);
}

function getTasks(item) {
  if (Array.isArray(item.tasks)) {
    return item.tasks;
  }

  if (item.nextStep) {
    return [{ text: item.nextStep, done: false }];
  }

  return [];
}

function updateOpportunity(id, updater) {
  opportunities = opportunities.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return updater(item);
  });
  saveOpportunities();
  render();
}

function isFinalized(item) {
  return finalStatuses.includes(item.status);
}

function pauseOpportunity(id) {
  updateOpportunity(id, (item) => ({
    ...item,
    status: "Pausada",
    nextStep: "Proyecto pausado"
  }));
}

function getNextStatus(status) {
  if (status === "Prospecto") {
    return "Negociacion";
  }

  if (status === "Negociacion") {
    return "En proceso";
  }

  return "";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelector("[data-open-modal]").addEventListener("click", () => {
  elements.modal.showModal();
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => elements.modal.close());
});

document.querySelectorAll("[data-close-task-modal]").forEach((button) => {
  button.addEventListener("click", () => elements.taskModal.close());
});

document.querySelectorAll("[data-view-link]").forEach((button) => {
  button.addEventListener("click", () => {
    const viewId = button.dataset.viewLink;
    showView(viewId);

    if (button.dataset.proposalFilter) {
      activeProposalFilter = button.dataset.proposalFilter;
      syncProposalFilterButtons();
      renderProposals();
    }
  });
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    render();
  });
});

document.addEventListener("click", (event) => {
  const columnFilter = event.target.dataset.columnFilter;
  if (!columnFilter) {
    return;
  }

  activeFilter = columnFilter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === columnFilter);
  });
  render();
});

document.querySelectorAll("[data-proposal-status]").forEach((button) => {
  button.addEventListener("click", () => {
    activeProposalFilter = button.dataset.proposalStatus;
    syncProposalFilterButtons();
    renderProposals();
  });
});

elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  render();
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(elements.form);
  const taskText = data.get("nextStep");
  const status = data.get("status");
  opportunities = [
    {
      id: crypto.randomUUID(),
      client: data.get("client"),
      service: data.get("service"),
      value: Number(data.get("value")),
      status,
      nextStep: taskText,
      tasks: [{ text: taskText, done: status === "Finalizado" }],
      dueDate: data.get("dueDate")
    },
    ...opportunities
  ];
  saveOpportunities();
  elements.form.reset();
  elements.modal.close();
  render();
});

document.addEventListener("click", (event) => {
  const deleteId = event.target.dataset.delete;
  const restoreId = event.target.dataset.restore;
  const manageTasksId = event.target.dataset.manageTasks;
  const resumeId = event.target.dataset.resume;
  const pauseId = event.target.dataset.pause;
  const changeStatusId = event.target.dataset.changeStatus;
  const nextStatus = event.target.dataset.nextStatus;

  if (manageTasksId) {
    selectedTaskProjectId = manageTasksId;
    renderTaskModal();
    elements.taskModal.showModal();
  }

  if (changeStatusId && nextStatus) {
    updateOpportunity(changeStatusId, (item) => ({ ...item, status: nextStatus }));
  }

  if (deleteId) {
    const target = opportunities.find((item) => item.id === deleteId);
    if (!target) {
      return;
    }

    openConfirm({
      title: "Eliminar oportunidad",
      message: `Seguro que quieres eliminar la oportunidad de ${target.client}? Se movera al historial y podras restaurarla despues.`,
      acceptText: "Eliminar",
      onAccept: () => {
        deletedOpportunities = [{ ...target, deletedAt: new Date().toISOString() }, ...deletedOpportunities];
        opportunities = opportunities.filter((item) => item.id !== deleteId);
        saveOpportunities();
        saveDeletedOpportunities();
        render();
      }
    });
  }

  if (resumeId) {
    updateOpportunity(resumeId, (item) => ({
      ...item,
      status: "Negociacion",
      nextStep: item.nextStep === "Esperar aprobacion de presupuesto" ? "Retomar seguimiento con el cliente" : item.nextStep
    }));
  }

  if (pauseId) {
    pauseOpportunity(pauseId);
  }

  if (restoreId) {
    const target = deletedOpportunities.find((item) => item.id === restoreId);
    if (!target) {
      return;
    }

    const { deletedAt, ...restored } = target;
    opportunities = [restored, ...opportunities];
    deletedOpportunities = deletedOpportunities.filter((item) => item.id !== restoreId);
    saveOpportunities();
    saveDeletedOpportunities();
    render();
  }
});

elements.taskList.addEventListener("change", (event) => {
  if (!event.target.matches("[data-task-index]") || !selectedTaskProjectId) {
    return;
  }

  const taskIndex = Number(event.target.dataset.taskIndex);
  updateOpportunity(selectedTaskProjectId, (item) => {
    const tasks = getTasks(item).map((task, index) => {
      if (index !== taskIndex) {
        return task;
      }

      return { ...task, done: event.target.checked };
    });

    return { ...item, tasks, nextStep: getNextStepFromTasks(tasks) };
  });
  renderTaskModal();
});

elements.addTaskButton.addEventListener("click", () => {
  const text = elements.newTaskInput.value.trim();
  if (!text || !selectedTaskProjectId) {
    return;
  }

  updateOpportunity(selectedTaskProjectId, (item) => {
    const tasks = [...getTasks(item), { text, done: false }];
    return { ...item, tasks, nextStep: getNextStepFromTasks(tasks) };
  });

  elements.newTaskInput.value = "";
  renderTaskModal();
});

elements.pauseProjectButton.addEventListener("click", () => {
  if (!selectedTaskProjectId) {
    return;
  }

  pauseOpportunity(selectedTaskProjectId);
  elements.taskModal.close();
});

elements.finishProjectButton.addEventListener("click", () => {
  if (!selectedTaskProjectId) {
    return;
  }

  updateOpportunity(selectedTaskProjectId, (item) => {
    const tasks = getTasks(item).map((task) => ({ ...task, done: true }));
    return { ...item, status: "Finalizado", tasks, nextStep: "Proyecto finalizado" };
  });
  elements.taskModal.close();
});

elements.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(elements.settingsForm);
  settings = {
    name: data.get("name").trim() || defaultSettings.name,
    role: data.get("role").trim() || defaultSettings.role,
    currency: data.get("currency")
  };
  saveSettings();
  render();
});

elements.clearHistory.addEventListener("click", () => {
  if (!deletedOpportunities.length) {
    return;
  }

  openConfirm({
    title: "Limpiar historial",
    message: "Seguro que quieres limpiar todo el historial de eliminacion? Esta accion no se puede restaurar.",
    acceptText: "Limpiar",
    onAccept: () => {
      deletedOpportunities = [];
      saveDeletedOpportunities();
      renderDeletedHistory();
    }
  });
});

elements.resetDemo.addEventListener("click", () => {
  opportunities = demoOpportunities.map((item) => ({ ...item, id: crypto.randomUUID() }));
  saveOpportunities();
  render();
});

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.viewLink === viewId);
  });
}

function syncProposalFilterButtons() {
  document.querySelectorAll("[data-proposal-status]").forEach((button) => {
    button.classList.toggle("active", button.dataset.proposalStatus === activeProposalFilter);
  });
}

function getNextStepFromTasks(tasks) {
  const nextPending = tasks.find((task) => !task.done);
  return nextPending ? nextPending.text : "Todas las tareas estan hechas";
}

function openConfirm({ title, message, acceptText, onAccept }) {
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.acceptConfirm.textContent = acceptText;
  pendingConfirmAction = onAccept;
  elements.confirmModal.showModal();
}

elements.cancelConfirm.addEventListener("click", () => {
  pendingConfirmAction = null;
  elements.confirmModal.close();
});

elements.acceptConfirm.addEventListener("click", () => {
  if (pendingConfirmAction) {
    pendingConfirmAction();
  }

  pendingConfirmAction = null;
  elements.confirmModal.close();
});

render();
