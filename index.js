// Department mapping for display in modals and details
const DEPARTMENTS = {
  screen: "สกรีน",
  laser: "เลเซอร์",
  packaging: "บรรจุ",
  packing: "แพ็กกิ้ง",
  filtermix: "กรอง&Mix",
  production: "แผนก A",
  quality: "แผนก B",
  maintenance: "แผนก C",
  // เพิ่มเติมตามที่ใช้จริง
};

//Configuration
const CONFIG = {
  VERSION: "1.0.0",
  NAME: "Machine Control System",
  STORAGE_KEY: "tasks",
  AUTO_SAVE: true,
};

// Utility function to get Monday of a given week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Global State
let tasks = [];
let taskIdCounter = 1;
let currentWeekStart = getMonday(new Date());
let selectedTask = null;
let selectedEditTask = null; // ตัวแปรใหม่สำหรับงานที่เลือกแก้ไข

class Utils {
  static formatDateTime(date, options = {}) {
    const defaultOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    };
    return new Date(date).toLocaleDateString("th-TH", {
      ...defaultOptions,
      ...options,
    });
  }

  static formatTime(date, includeSeconds = true) {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
    };
    if (includeSeconds) options.second = "2-digit";
    return new Date(date).toLocaleTimeString("th-TH", options);
  }

  static calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    // ถ้าเวลาหรือวันที่ไม่ถูกต้อง ให้คืนค่า 0
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    // แสดงเป็น x.y ชั่วโมง (เช่น 1.5)
    return Math.round((hours + minutes / 60) * 10) / 10;
  }

  static updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) element.textContent = content;
  }
  // ปิดการใช้ localStorage
  static saveToStorage() {}
  static loadFromStorage() {
    return false;
  }
}

// =====================
// History Management (DB)
// =====================
let taskHistory = [];

class HistoryManager {
  static async loadFromDB() {
    try {
      const res = await fetch("tasks.php?action=get_history");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to load history: HTTP ${res.status} ${res.statusText}\n${text}`
        );
      }
      taskHistory = await res.json();
      return true;
    } catch (error) {
      alert("โหลดประวัติไม่สำเร็จ: " + error.message);
      console.error("HistoryManager.loadFromDB error:", error);
    }
    return false;
  }
  static async addToHistory(task) {
    try {
      const res = await fetch("tasks.php?action=archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to archive: HTTP ${res.status} ${res.statusText}\n${text}`
        );
      }
      return true;
    } catch (e) {
      alert("Archive to DB failed: " + e.message);
      console.error("HistoryManager.addToHistory error:", e);
    }
    return false;
  }
  static getAll() {
    return [...taskHistory];
  }
}

// Task Management (DB)
class TaskManager {
  static getAllTasks() {
    // คืน tasks จาก DB เท่านั้น (tempTasks ไม่ใช้แล้ว)
    return [...tasks];
  }
  static getFilteredTasks() {
    const deptFilter = document.getElementById("departmentFilter")?.value;
    const dateFilter = document.getElementById("dateFilter")?.value;
    const statusFilter = document.getElementById("statusFilter")?.value;
    const keyword = document
      .getElementById("keywordFilter")
      ?.value?.trim()
      .toLowerCase();
    return this.getAllTasks().filter((task) => {
      if (deptFilter && task.Department !== deptFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      if (dateFilter) {
        const taskDate = new Date(task.StartTime).toISOString().split("T")[0];
        if (taskDate !== dateFilter) return false;
      }
      if (keyword) {
        const title = (task.JobTitle || "").toLowerCase();
        const desc = (task.Details || "").toLowerCase();
        if (!title.includes(keyword) && !desc.includes(keyword)) return false;
      }
      return true;
    });
  }
  static async loadFromDB() {
    try {
      const res = await fetch("tasks.php?action=get_tasks");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to load tasks: HTTP ${res.status} ${res.statusText}\n${text}`
        );
      }
      const data = await res.json();
      tasks = data;
      // หา max id
      taskIdCounter =
        tasks.reduce((max, t) => Math.max(max, t.MachineID || 0), 0) + 1;
      return true;
    } catch (e) {
      alert("โหลด tasks จาก database ไม่สำเร็จ: " + e.message);
      console.error("TaskManager.loadFromDB error:", e);
    }
    return false;
  }
  static async addTask(taskData) {
    // เพิ่มงานใหม่ลง database ทันที
    await fetch("tasks.php?action=add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });
    await TaskManager.loadFromDB();
    await CalendarRenderer.render();
    return true;
  }

  static async updateTask(task) {
    // ส่งทุก field รวม status
    try {
      const res = await fetch("tasks.php?action=update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to update task: HTTP ${res.status} ${res.statusText}\n${text}`
        );
      }
      return await res.json();
    } catch (e) {
      alert("อัปเดตงานไม่สำเร็จ: " + e.message);
      console.error("TaskManager.updateTask error:", e);
    }
    return null;
  }
  static async deleteTask(taskId) {
    try {
      const res = await fetch("tasks.php?action=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to delete task: HTTP ${res.status} ${res.statusText}\n${text}`
        );
      }
      return await res.json();
    } catch (e) {
      alert("ลบงานไม่สำเร็จ: " + e.message);
      console.error("TaskManager.deleteTask error:", e);
    }
    return null;
  }
}

// Calendar Rendering
class CalendarRenderer {
  static async render() {
    await Promise.all([HistoryManager.loadFromDB(), TaskManager.loadFromDB()]);
    const calendarBody = document.getElementById("calendarBody");
    if (!calendarBody) return;
    const startHour = 0;
    const endHour = 24;
    const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    let todayIdx = -1;
    for (let d = 0; d < 7; d++) {
      const date = new Date(currentWeekStart.getTime() + d * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      if (date.getTime() === todayDate.getTime()) {
        todayIdx = d;
        break;
      }
    }
    const thead = calendarBody.parentElement.querySelector("thead tr");
    if (thead) {
      while (thead.children.length > 1) thead.removeChild(thead.lastChild);
      for (let d = 0; d < 7; d++) {
        const date = new Date(currentWeekStart.getTime() + d * 24 * 60 * 60 * 1000);
        const dayNum = date.getDate();
        const dayName = days[d];
        const th = document.createElement("th");
        th.className = "text-center";
        if (d === todayIdx) {
          th.innerHTML = `<span class="calendar-today-dot">${dayNum}</span><div style="font-size:0.85em;color:#888;">${dayName}</div>`;
        } else {
          th.innerHTML = `<span>${dayNum}</span><div style="font-size:0.85em;color:#888;">${dayName}</div>`;
        }
        thead.appendChild(th);
      }
    }
    let html = "";
    for (let hour = startHour; hour < endHour; hour++) {
      html += `<tr>`;
      html += `<th class="bg-light text-center" style="width:60px;">${hour
        .toString()
        .padStart(2, "0")}:00</th>`;
      for (let d = 0; d < 7; d++) {
        html += `<td class="calendar-cell${
          d === todayIdx ? " calendar-today" : ""
        }" data-day="${d}" data-hour="${hour}"></td>`;
      }
      html += `</tr>`;
    }
    calendarBody.innerHTML = html;
    const weekLabel = document.getElementById("calendarWeekLabel");
    if (weekLabel) {
      const start = new Date(currentWeekStart);
      const end = new Date(currentWeekStart);
      end.setDate(end.getDate() + 6);
      const monthNames = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      weekLabel.textContent =
        ` ${start.getDate()}-${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }
    this.renderTasks();
  }

  static renderTasks() {
    document.querySelectorAll(".task-item").forEach((el) => el.remove());
    document.querySelectorAll(".calendar-cell.has-task").forEach((el) => el.classList.remove("has-task"));
    const filteredTasks = TaskManager.getFilteredTasks();
    const calendarStartHour = 0;
    const calendarEndHour = 24;
    const calendarBody = document.getElementById("calendarBody");
    filteredTasks.forEach((task) => {
      const taskStart = new Date(task.StartTime);
      const taskEnd = new Date(task.EndTime);
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      if (taskEnd < weekStart || taskStart > weekEnd) return;
      let dayCursor = new Date(Math.max(taskStart, weekStart));
      dayCursor.setHours(0, 0, 0, 0);
      const lastDay = new Date(Math.min(taskEnd, weekEnd));
      lastDay.setHours(0, 0, 0, 0);
      while (dayCursor <= lastDay) {
        let dayIdx = dayCursor.getDay() === 0 ? 6 : dayCursor.getDay() - 1;
        let dayStart = new Date(dayCursor);
        let dayEnd = new Date(dayCursor);
        dayStart.setHours(calendarStartHour, 0, 0, 0);
        dayEnd.setHours(calendarEndHour, 0, 0, 0);
        if (dayCursor.toDateString() === new Date(taskStart).toDateString()) {
          dayStart = new Date(taskStart);
          if (dayStart.getHours() < calendarStartHour)
            dayStart.setHours(calendarStartHour, 0, 0, 0);
        }
        if (dayCursor.toDateString() === new Date(taskEnd).toDateString()) {
          dayEnd = new Date(taskEnd);
          if (dayEnd.getHours() > calendarEndHour)
            dayEnd.setHours(calendarEndHour, 0, 0, 0);
        }
        const startHour = dayStart.getHours();
        const endHour = dayEnd.getHours();
        let blockStart = startHour;
        let blockEnd = endHour;
        if (dayCursor.toDateString() === new Date(taskStart).toDateString())
          blockStart = taskStart.getHours();
        if (dayCursor.toDateString() === new Date(taskEnd).toDateString()) {
          if (taskEnd.getMinutes() === 0) {
            blockEnd = taskEnd.getHours();
          } else {
            blockEnd = taskEnd.getHours() + 1;
          }
        }
        blockStart = Math.max(blockStart, calendarStartHour);
        blockEnd = Math.min(blockEnd, calendarEndHour);
        if (blockStart >= blockEnd) {
          dayCursor.setDate(dayCursor.getDate() + 1);
          continue;
        }
        const cell = calendarBody.querySelector(
          `.calendar-cell[data-day="${dayIdx}"][data-hour="${blockStart}"]`
        );
        if (cell) {
          const baseTaskElement = this.createTaskElement(task);
          if (!baseTaskElement) {
            dayCursor.setDate(dayCursor.getDate() + 1);
            continue;
          }
          const durationHour = blockEnd - blockStart;
          baseTaskElement.style.position = "absolute";
          baseTaskElement.style.left = "0";
          baseTaskElement.style.right = "0";
          baseTaskElement.style.top = "0";
          baseTaskElement.style.height = `calc(${durationHour} * 48px - 2px)`;
          baseTaskElement.style.zIndex = 2;
          baseTaskElement.classList.add("task-block");
          baseTaskElement.onclick = () => ModalManager.showTaskDetail(task);
          let wrapper = document.createElement("div");
          wrapper.style.position = "relative";
          wrapper.style.height = `calc(${durationHour} * 48px)`;
          wrapper.appendChild(baseTaskElement);
          cell.appendChild(wrapper);
          cell.classList.add("has-task");
        }
        dayCursor.setDate(dayCursor.getDate() + 1);
      }
    });
  }

  static createTaskElement(task) {
    const taskElement = document.createElement("div");
    let status = task.status || (task.isTemp ? "planning" : "in-progress");
    let statusClass = "";
    if (status === "planning") statusClass = "pending";
    else if (status === "in-progress") statusClass = "in-progress";
    else if (status === "completed") statusClass = "completed";
    let taskClasses = `task-item ${statusClass} ${task.Department}`;
    taskElement.className = taskClasses;
    taskElement.textContent = task.JobTitle;
    return taskElement;
  }
}

// Modal Management
class ModalManager {
  static showTaskDetail = function (task, confirmOnly = false) {
    selectedTask = task;
    document.getElementById("taskDetailTitle").textContent = task.JobTitle;
    const startTime =
      Utils.formatDateTime(task.StartTime) +
      " " +
      Utils.formatTime(task.StartTime);
    const endTime =
      Utils.formatDateTime(task.EndTime) + " " + Utils.formatTime(task.EndTime);
    const taskDuration =
      task.duration || Utils.calculateDuration(task.StartTime, task.EndTime);
    let statusText = "-";
    let statusColor = "secondary";
    if (task.status === "planning") {
      statusText = "กำลังวางแผน";
      statusColor = "secondary";
    } else if (task.status === "in-progress") {
      statusText = "กำลังผลิต";
      statusColor = "warning";
    } else if (task.status === "waiting-confirm") {
      statusText = "รอยืนยันจบงาน";
      statusColor = "info";
    } else if (task.status === "completed") {
      statusText = "เสร็จสิ้นแล้ว";
      statusColor = "success";
    }
    let detailHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p>
                      <strong>สถานะ:</strong>
                      <span class="badge bg-${statusColor}">${statusText}</span>
                    </p>
                    <p><strong>แผนก:</strong> ${
                      DEPARTMENTS[task.Department] || task.Department
                    }</p>
                    <p><strong>เครื่องจักร:</strong> ${
                      task.MachineType ? task.MachineType : "-"
                    }</p>
                    <p><strong>Lot Number:</strong> ${
                      task.LotNumber ? task.LotNumber : "-"
                    }</p>
                    <p><strong>Lot Size:</strong> ${
                      task.LotSize ? task.LotSize : "-"
                    }</p>
                    <p><strong>ระยะเวลา:</strong> ${taskDuration} ชั่วโมง</p>
                </div>
                <div class="col-md-6">
                    <p><strong>เวลาเริ่มต้น:</strong> ${startTime}</p>
                    <p><strong>เวลาสิ้นสุด:</strong> ${endTime}</p>
                    <p><strong>จำนวนผลิต:</strong> ${
                      task.ProducedQuantity ? task.ProducedQuantity : "-"
                    } หน่วย</p>
                </div>
            </div>
        `;
    if (task.Details) {
      detailHTML += `<hr><p><strong>รายละเอียด:</strong><br>${task.Details}</p>`;
    }
    detailHTML += `<div class="mt-3 text-end gap-2 d-flex justify-content-end">`;
    detailHTML += `
            <button id="editTaskBtn" class="btn btn-warning"><i class="bi bi-pencil-square me-1"></i>แก้ไข</button>
            <button id="deleteTaskBtn" class="btn btn-danger"><i class="bi bi-x-circle me-1"></i>ยกเลิก</button>
        `;
    if (task.status === "waiting-confirm" || task.status === "in-progress") {
      detailHTML += `<button id="finalConfirmBtn" class="btn btn-success"><i class="bi bi-check-circle me-1"></i>ยืนยันจบงาน</button>`;
    } else {
      detailHTML += `<button id="confirmTaskBtn" class="btn btn-success"><i class="bi bi-check-circle me-1"></i>ยืนยันบันทึกงานนี้</button>`;
    }
    detailHTML += `</div>`;
    document.getElementById("taskDetailBody").innerHTML = detailHTML;
    setTimeout(() => {
      const editBtn = document.getElementById("editTaskBtn");
      if (editBtn) {
        editBtn.disabled = false;
        editBtn.onclick = function (e) {
          e.preventDefault();
          fillAddJobFormWithTask(task);
          bootstrap.Modal.getInstance(
            document.getElementById("taskDetailModal")
          ).hide();
          new bootstrap.Modal(document.getElementById("addJobModal")).show();
        };
      }
      const deleteBtn = document.getElementById("deleteTaskBtn");
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.onclick = async function (e) {
          e.preventDefault();
          await TaskManager.deleteTask(task.MachineID);
          await CalendarRenderer.render();
          bootstrap.Modal.getInstance(
            document.getElementById("taskDetailModal")
          ).hide();
        };
      }
      const confirmBtn = document.getElementById("confirmTaskBtn");
      if (confirmBtn) {
        confirmBtn.onclick = async function (e) {
          e.preventDefault();
          if (task.isTemp) {
            await TaskManager.confirmTaskToDB(task);
            alert("บันทึกงานสำเร็จ");
          } else {
            await confirmTaskToServer(task);
          }
          bootstrap.Modal.getInstance(
            document.getElementById("taskDetailModal")
          ).hide();
        };
      }
      const finalConfirmBtn = document.getElementById("finalConfirmBtn");
      if (finalConfirmBtn) {
        finalConfirmBtn.onclick = function (e) {
          e.preventDefault();
          window.location.href = `confirm-complete.html?id=${encodeURIComponent(task.MachineID)}`;
        };
      }
    }, 0);
    new bootstrap.Modal(document.getElementById("taskDetailModal")).show();
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  await CalendarRenderer.render();
});

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
    new bootstrap.Tooltip(el);
  });
});

window.currentWeekStart = currentWeekStart;

function fillAddJobFormWithTask(task) {
  const form = document.getElementById("addJobForm");
  if (!form || !task) return;
  // Helper to safely set value if field exists
  function setField(name, value) {
    const field = form[name];
    if (field) field.value = value;
  }
  setField("department", task.Department || "");
  setField("machine", task.MachineType || "");
  let start = new Date(task.StartTime);
  setField("workDate", start.toISOString().slice(0, 10));
  setField("startHour", start.getHours().toString().padStart(2, "0"));
  setField("startMinute", start.getMinutes().toString().padStart(2, "0"));
  let end = new Date(task.EndTime);
  setField("endHour", end.getHours().toString().padStart(2, "0"));
  setField("endMinute", end.getMinutes().toString().padStart(2, "0"));
  setField("lotNumber", task.LotNumber || "");
  setField("LotSize", task.LotSize || "");
  setField("jobTitle", task.JobTitle || "");
  setField("productionQuantity", task.ProducedQuantity || "");
  setField("description", task.Details || "");
  setField("status", task.status || "planning");
  window.selectedEditTask = task;
  if (form.jobTitle) form.jobTitle.focus();
}

function setupAddJobFormHandler() {
  const addJobForm = document.getElementById("addJobForm");
  if (addJobForm && !addJobForm._handlerAdded) {
    addJobForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(addJobForm);
      const workDate = formData.get("workDate");
      const startHour = formData.get("startHour");
      const startMinute = formData.get("startMinute");
      const endHour = formData.get("endHour");
      const endMinute = formData.get("endMinute");
      if (
        !workDate ||
        startHour === "" ||
        startMinute === "" ||
        endHour === "" ||
        endMinute === ""
      ) {
        showToast("กรุณากรอกวันที่และเวลาให้ครบถ้วน", "danger");
        return;
      }
      const startISO = `${workDate}T${startHour}:${startMinute}:00`;
      const endISO = `${workDate}T${endHour}:${endMinute}:00`;
      let start = new Date(startISO);
      let end = new Date(endISO);
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      const endStrFixed = `${end.getFullYear()}-${(end.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${end
        .getDate()
        .toString()
        .padStart(2, "0")}T${endHour}:${endMinute}:00`;
      const LotSize = parseInt(formData.get("LotSize"), 10);
      if (isNaN(LotSize) || LotSize <= 0) {
        showToast("Lot Size ต้องมากกว่า 0", "danger");
        return;
      }
      if (!formData.get("jobTitle")) {
        showToast("กรุณากรอกชื่องาน", "danger");
        return;
      }
      const prodQty = formData.get("productionQuantity");
      if (
        prodQty &&
        (isNaN(parseInt(prodQty, 10)) || parseInt(prodQty, 10) < 0)
      ) {
        showToast("จำนวนผลิตต้องเป็นตัวเลข 0 หรือมากกว่า", "danger");
        return;
      }
      const machineCheckboxes = document.querySelectorAll('#machineCheckboxGroup input[type="checkbox"]:checked');
      const selectedMachines = Array.from(machineCheckboxes).map(cb => cb.value);
      const taskData = {
        JobTitle: formData.get("jobTitle"),
        Department: formData.get("department"),
        MachineType: selectedMachines.join(", "),
        LotNumber: formData.get("lotNumber"),
        LotSize: LotSize,
        ProducedQuantity: prodQty,
        Details: formData.get("description"),
        StartTime: startISO,
        EndTime: endStrFixed,
        DurationInHours: ((end - start) / (1000 * 60 * 60)).toFixed(2),
        status: formData.get("status") || "planning",
      };
      if (window.selectedEditTask && window.selectedEditTask.MachineID) {
        taskData.MachineID = window.selectedEditTask.MachineID;
        await TaskManager.updateTask(taskData);
        await TaskManager.loadFromDB();
        await CalendarRenderer.render();
      } else {
        await TaskManager.addTask(taskData);
      }
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addJobModal")
      );
      if (modal) modal.hide();
      addJobForm.reset();
      window.selectedEditTask = null;
    });
    addJobForm._handlerAdded = true;
  }
}
document.addEventListener("DOMContentLoaded", setupAddJobFormHandler);

const origLoadFromDB = TaskManager.loadFromDB;
TaskManager.loadFromDB = async function () {
  showLoading(true);
  try {
    const result = await origLoadFromDB.apply(this, arguments);
    showLoading(false);
    return result;
  } catch (e) {
    showLoading(false);
    showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "danger");
    throw e;
  }
};
const origAddTask = TaskManager.addTask;
TaskManager.addTask = async function (taskData) {
  const result = await origAddTask.apply(this, arguments);
  showToast("เพิ่มงานสำเร็จ", "success");
  return result;
};
TaskManager.updateTask = async function (task) {
  showLoading(true);
  try {
    const res = await fetch("tasks.php?action=update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    showLoading(false);
    if (!res.ok) throw new Error("Update failed");
    showToast("แก้ไขงานสำเร็จ", "success");
    return await res.json();
  } catch (e) {
    showLoading(false);
    showToast("เกิดข้อผิดพลาดในการแก้ไข", "danger");
    throw e;
  }
};
TaskManager.deleteTask = async function (taskId) {
  showLoading(true);
  try {
    const res = await fetch("tasks.php?action=delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId }),
    });
    showLoading(false);
    if (!res.ok) throw new Error("Delete failed");
    showToast("ลบงานสำเร็จ", "success");
    return await res.json();
  } catch (e) {
    showLoading(false);
    showToast("เกิดข้อผิดพลาดในการลบ", "danger");
    throw e;
  }
};
// index.js - JavaScript logic for index.html (Machine Control System)
// ---------------------------------------------------------------
// 1. Session check and redirect if not logged in
// 2. Modal and form event handlers
// 3. Department/machine mapping and dynamic checkbox rendering
// 4. Utility: clear filters, toast, loading overlay
// ---------------------------------------------------------------

// 1. ตรวจสอบ session ด้วย AJAX ถ้ายังไม่ได้ login ให้ redirect ไปหน้า login.html
function checkSession() {
  fetch("login.php?action=check", { credentials: "same-origin" })
    .then((res) => res.json())
    .then((data) => {
      if (!data.loggedIn) {
        window.location.href = "login.html";
      }
    })
    .catch(() => {
      window.location.href = "login.html";
    });
}
document.addEventListener("DOMContentLoaded", checkSession);

// 2. เพิ่ม event ให้ปุ่ม "เพิ่มงานใหม่" เปิด modal
function setupAddTaskButton() {
  const addBtn = document.querySelector(".btn-success.btn-lg");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      const modal = new bootstrap.Modal(document.getElementById("addJobModal"));
      modal.show();
    });
  }
}
document.addEventListener("DOMContentLoaded", setupAddTaskButton);

// 3. ฟิลเตอร์ขั้นสูง: สถานะ + คำค้นหา (render calendar เมื่อเปลี่ยน filter)
function setupFilterForm() {
  [
    "departmentFilter",
    "dateFilter",
    "statusFilter",
    "keywordFilter",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", function () {
      CalendarRenderer.render();
    });
  });
}
document.addEventListener("DOMContentLoaded", setupFilterForm);

// 4. เพิ่ม confirm dialog เมื่อกดปุ่ม 'ยกเลิก' ใน modal เพิ่มงานใหม่
function setupCancelAddJobBtn() {
  const cancelBtn = document.getElementById("cancelAddJobBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm("คุณต้องการยกเลิกการเพิ่มงานใหม่ใช่หรือไม่?")) {
        const modalEl = document.getElementById("addJobModal");
        if (modalEl) {
          const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
          modal.hide();
        }
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", setupCancelAddJobBtn);

// 5. Logout button event
function setupLogoutBtn() {
  document.getElementById("logoutBtn")?.addEventListener("click", async function () {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      try {
        await fetch("logout.php", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {}
      window.location.href = "login.html";
    }
  });
}
document.addEventListener("DOMContentLoaded", setupLogoutBtn);

// 6. Mapping เครื่องจักรแต่ละแผนก และ render checkbox เครื่องจักร
const machineOptions = {
  screen: [
    { value: "uv", text: "เครื่องอบ UV" },
    { value: "screen", text: "เครื่องสกรีน" },
    { value: "hotair", text: "เครื่องอบลมร้อน" },
  ],
  laser: [
    { value: "inkjet", text: "เครื่อง Inkjet" },
    { value: "co2", text: "เครื่องเลเซอร์ CO2" },
  ],
  packaging: [
    { value: "auto", text: "เครื่องบรรจุอัตโนมัติ" },
    { value: "4head", text: "เครื่องบรรจุ 4 หัว" },
    { value: "2head", text: "เครื่องบรรจุ 2 หัว" },
    { value: "capauto", text: "เครื่องหมุนฝาอัตโนมัติ" },
    { value: "cap1", text: "เครื่องหมุนฝา 1" },
    { value: "cap2", text: "เครื่องหมุนฝา 2" },
    { value: "spray", text: "เครื่องคลิ้มหัวสเปรย์" },
    { value: "collar", text: "เครื่องตอกคอลล่า" },
    { value: "pouch", text: "เครื่องบรรจุซองอัตโนมัติ" },
    { value: "shrink", text: "เครื่องอุโมงค์ชริ้งฟิล์ม" },
  ],
  packing: [
    { value: "film1", text: "เครื่องห่อฟิล์ม 1" },
    { value: "film2", text: "เครื่องห่อฟิล์ม 2" },
    { value: "film3", text: "เครื่องห่อฟิล์ม 3" },
    { value: "film4", text: "เครื่องห่อฟิล์ม 4" },
    { value: "filmauto", text: "เครื่องห่อฟิล์มอัตโนมัติ" },
  ],
  filtermix: [
    { value: "filter", text: "เครื่องกรอง" },
    { value: "mix", text: "เครื่องผสม" },
  ],
};

/**
 * Render machine checkboxes for selected department
 * @param {string} dept - department key
 */
function renderMachineCheckboxes(dept) {
  const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
  if (!machineCheckboxGroup) return;
  machineCheckboxGroup.innerHTML = '';
  if (machineOptions[dept]) {
    machineOptions[dept].forEach(opt => {
      const id = `machine_${opt.value}`;
      const div = document.createElement("div");
      div.className = "form-check";
      div.innerHTML = `<input class="form-check-input" type="checkbox" name="machine[]" id="${id}" value="${opt.value}"> <label class="form-check-label" for="${id}">${opt.text}</label>`;
      machineCheckboxGroup.appendChild(div);
    });
  } else {
    machineCheckboxGroup.innerHTML = '<span class="text-muted">กรุณาเลือกแผนกก่อน</span>';
  }
}

// 7. Department dropdown change event and modal show event
function setupDepartmentMachineEvents() {
  const departmentSelect = document.getElementById("department");
  const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
  if (departmentSelect && machineCheckboxGroup) {
    renderMachineCheckboxes(departmentSelect.value);
    departmentSelect.addEventListener("change", function () {
      renderMachineCheckboxes(departmentSelect.value);
    });
  }
  const addJobModal = document.getElementById("addJobModal");
  if (addJobModal && departmentSelect) {
    addJobModal.addEventListener("show.bs.modal", function () {
      if (!departmentSelect.value) {
        departmentSelect.value = "screen";
      }
      renderMachineCheckboxes(departmentSelect.value);
    });
  }
}
document.addEventListener("DOMContentLoaded", setupDepartmentMachineEvents);

// 8. Utility: clear all filters and rerender calendar
function clearFilters() {
  document.getElementById("departmentFilter").value = "";
  document.getElementById("dateFilter").value = "";
  document.getElementById("statusFilter").value = "";
  document.getElementById("keywordFilter").value = "";
  CalendarRenderer.render();
}

// 9. Toast utility for showing messages
function showToast(msg, type = "success") {
  const toast = document.getElementById("mainToast");
  const toastBody = document.getElementById("mainToastBody");
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  toastBody.textContent = msg;
  const bsToast = new bootstrap.Toast(toast, { delay: 2500 });
  bsToast.show();
}

// 10. Loading overlay utility
function showLoading(show = true) {
  document.getElementById("loadingOverlay").style.display = show ? "flex" : "none";
}

// 11. Tooltip setup for all elements with data-bs-toggle="tooltip"
function setupTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
    new bootstrap.Tooltip(el);
  });
}
document.addEventListener("DOMContentLoaded", setupTooltips);

// 12. Expose clearFilters, showToast, showLoading to global (for use in HTML)
window.clearFilters = clearFilters;
window.showToast = showToast;
window.showLoading = showLoading;
