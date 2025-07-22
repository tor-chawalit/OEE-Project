// Department mapping for display in modals and details
// Department mapping by ID (ตามฐานข้อมูลใหม่)
const DEPARTMENTS = {
  1: "Screen",
  2: "Laser",
  3: "Injection Molding",
  4: "Packing",
  5: "Packing Line",
  6: "Capping & Mixing"
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
    // แสดงงานทั้งหมดโดยไม่มีการกรอง
    return this.getAllTasks();
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
      if (Array.isArray(data)) {
        tasks = data;
        // หา max JobID
        taskIdCounter =
          tasks.reduce((max, t) => Math.max(max, t.JobID || 0), 0) + 1;
        return true;
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (e) {
      console.error("TaskManager.loadFromDB error:", e);
      showToast("โหลดข้อมูลไม่สำเร็จ: " + e.message, "danger");
    }
    return false;
  }
  static async addTask(taskData) {
    // เพิ่มงานใหม่ลง database ทันที
    try {
      const response = await fetch("tasks.php?action=add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to add task: HTTP ${response.status} ${response.statusText}\n${text}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to add task');
      }
      
      await TaskManager.loadFromDB();
      await CalendarRenderer.render();
      return result;
    } catch (error) {
      console.error('TaskManager.addTask error:', error);
      throw error;
    }
  }

  static async updateTask(task) {
    // ส่งทุก field รวม status
    try {
      // ตรวจสอบ JobID
      if (!task.JobID || task.JobID <= 0) {
        throw new Error('Invalid JobID');
      }
      
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
      
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }
      
      return result;
    } catch (e) {
      console.error("TaskManager.updateTask error:", e);
      throw e;
    }
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
      console.error("TaskManager.deleteTask error:", e);
      throw e;
    }
  }
}

// Calendar Rendering
class CalendarRenderer {
  static async render() {
    try {
      await Promise.all([HistoryManager.loadFromDB(), TaskManager.loadFromDB()]);
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "danger");
      return;
    }
    
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
    const calendarBody = document.getElementById("calendarBody");
    
    // แสดงงานทั้งหมดโดยไม่มีการกรองใดๆ
    filteredTasks.forEach((task) => {
      // ถ้ามี StartTime และ EndTime ให้แสดงตามเวลาจริง
      if (task.StartTime && task.EndTime) {
        const taskStart = new Date(task.StartTime);
        
        // ไม่ตรวจสอบช่วงเวลาเลย แสดงทุกงาน
        // คำนวณวันของสัปดาห์ (จันทร์ = 0, อาทิตย์ = 6)
        let dayIdx = taskStart.getDay() === 0 ? 6 : taskStart.getDay() - 1;
        let startHour = taskStart.getHours();
        
        // ถ้าไม่อยู่ในสัปดาห์ปัจจุบัน ให้แสดงในวันนี้เวลา 08:00
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        if (taskStart < weekStart || taskStart > weekEnd) {
          const today = new Date();
          dayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
          startHour = 8;
        }
        
        // หาเซลล์ที่จะแสดงงาน
        const cell = calendarBody.querySelector(`.calendar-cell[data-day="${dayIdx}"][data-hour="${startHour}"]`);
        
        if (cell) {
          const taskElement = this.createTaskElement(task);
          if (taskElement) {
            taskElement.style.position = "relative";
            taskElement.style.margin = "2px 0";
            taskElement.style.padding = "4px 8px";
            taskElement.style.fontSize = "0.8em";
            taskElement.style.cursor = "pointer";
            taskElement.onclick = () => ModalManager.showTaskDetail(task);
            cell.appendChild(taskElement);
            cell.classList.add("has-task");
          }
        }
      } else {
        // ถ้าไม่มีเวลา ให้แสดงในช่องเวลา 08:00 ของวันปัจจุบัน
        const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
        const cell = calendarBody.querySelector(`.calendar-cell[data-day="${todayIdx}"][data-hour="8"]`);
        
        if (cell) {
          const taskElement = this.createTaskElement(task);
          if (taskElement) {
            taskElement.style.position = "relative";
            taskElement.style.margin = "2px 0";
            taskElement.style.padding = "4px 8px";
            taskElement.style.fontSize = "0.8em";
            taskElement.style.cursor = "pointer";
            taskElement.onclick = () => ModalManager.showTaskDetail(task);
            cell.appendChild(taskElement);
            cell.classList.add("has-task");
          }
        }
      }
    });
  }

  static createTaskElement(task) {
    const taskElement = document.createElement("div");
    let status = task.Status || "planning";
    let statusClass = "";
    if (status === "planning") statusClass = "pending";
    else if (status === "in-progress") statusClass = "in-progress";
    else if (status === "completed") statusClass = "completed";
    else if (status === "cancelled") statusClass = "cancelled";
    let taskClasses = `task-item ${statusClass}`;
    taskElement.className = taskClasses;
    taskElement.textContent = `${task.LotNumber || 'Job'} - ${task.MachineName || 'Machine'}`;
    return taskElement;
  }
}

// Modal Management
class ModalManager {
  static showTaskDetail = function (task, confirmOnly = false) {
    selectedTask = task;
    document.getElementById("taskDetailTitle").textContent = `Job ID: ${task.JobID}`;
    
    let statusText = "-";
    let statusColor = "secondary";
    if (task.Status === "planning") {
      statusText = "กำลังวางแผน";
      statusColor = "secondary";
    } else if (task.Status === "in-progress") {
      statusText = "กำลังผลิต";
      statusColor = "warning";
    } else if (task.Status === "completed") {
      statusText = "เสร็จสิ้น - รอยืนยันครั้งสุดท้าย";
      statusColor = "info";
    } else if (task.Status === "cancelled") {
      statusText = "ยกเลิก";
      statusColor = "danger";
    }
    
    let detailHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p>
                      <strong>สถานะ:</strong>
                      <span class="badge bg-${statusColor}">${statusText}</span>
                    </p>
                    <p><strong>แผนก:</strong> ${task.DepartmentName || "-"}</p>
                    <p><strong>เครื่องจักร:</strong> ${task.MachineName || "-"}</p>
                    <p><strong>Lot Number:</strong> ${task.LotNumber || "-"}</p>
                    <p><strong>Planned Lot Size:</strong> ${task.PlannedLotSize || "-"}</p>
                    ${task.StartTime ? `<p><strong>เวลาเริ่ม:</strong> ${new Date(task.StartTime).toLocaleString('th-TH')}</p>` : ''}
                    ${task.EndTime ? `<p><strong>เวลาสิ้นสุด:</strong> ${new Date(task.EndTime).toLocaleString('th-TH')}</p>` : ''}
                </div>
                <div class="col-md-6">
                    <p><strong>วันที่สร้าง:</strong> ${task.CreatedAt ? new Date(task.CreatedAt).toLocaleString('th-TH') : "-"}</p>
                    <p><strong>วันที่อัปเดต:</strong> ${task.UpdatedAt ? new Date(task.UpdatedAt).toLocaleString('th-TH') : "-"}</p>
                    <p><strong>สร้างโดย:</strong> User ID ${task.CreatedByUserID || "-"}</p>
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
    if (task.Status === "completed") {
      detailHTML += `<button id="finalConfirmBtn" class="btn btn-success"><i class="bi bi-check-circle me-1"></i>ยืนยันจบงานสุดท้าย</button>`;
    } else if (task.Status === "in-progress") {
      detailHTML += `<button id="completeTaskBtn" class="btn btn-info"><i class="bi bi-check-square me-1"></i>จบงาน</button>`;
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
          if (confirm("คุณต้องการลบงานนี้ใช่หรือไม่?")) {
            try {
              await TaskManager.deleteTask(task.JobID);
              await CalendarRenderer.render();
              showToast("ลบงานสำเร็จ", "success");
              bootstrap.Modal.getInstance(
                document.getElementById("taskDetailModal")
              ).hide();
            } catch (error) {
              console.error('Delete task error:', error);
              showToast("เกิดข้อผิดพลาดในการลบงาน", "danger");
            }
          }
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
          window.location.href = `confirm-complete.html?id=${encodeURIComponent(task.JobID)}`;
        };
      }
      const completeTaskBtn = document.getElementById("completeTaskBtn");
      if (completeTaskBtn) {
        completeTaskBtn.onclick = async function (e) {
          e.preventDefault();
          if (confirm("คุณต้องการจบงานนี้ใช่หรือไม่?")) {
            try {
              const updatedTask = { ...task, Status: "completed" };
              await TaskManager.updateTask(updatedTask);
              await TaskManager.loadFromDB();
              await CalendarRenderer.render();
              showToast("จบงานสำเร็จ - รอการยืนยันครั้งสุดท้าย", "success");
              bootstrap.Modal.getInstance(
                document.getElementById("taskDetailModal")
              ).hide();
            } catch (error) {
              console.error('Complete task error:', error);
              showToast("เกิดข้อผิดพลาดในการจบงาน: " + error.message, "danger");
            }
          }
        };
      }
    }, 0);
    new bootstrap.Modal(document.getElementById("taskDetailModal")).show();
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  // ไม่ต้องล้างฟิลเตอร์เพราะไม่มีการกรองแล้ว
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
  
  // เปลี่ยนหัวข้อ modal และปุ่ม
  const modalTitle = document.querySelector("#addJobModal .modal-title");
  const submitBtn = document.querySelector("#addJobModal button[type='submit']");
  if (modalTitle) modalTitle.textContent = "แก้ไขงาน";
  if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>บันทึกการแก้ไข';
  
  // เซ็ตค่าฟิลด์ตามโครงสร้างฐานข้อมูลใหม่
  if (task.DepartmentID) {
    setField("department", task.DepartmentID.toString());
    renderMachineCheckboxes(task.DepartmentID.toString());
  }
  
  setField("lotNumber", task.LotNumber || "");
  setField("lotSize", task.PlannedLotSize || "");
  setField("status", task.Status || "planning");
  
  // เซ็ตวันที่และเวลา ถ้ามี
  if (task.StartTime) {
    const start = new Date(task.StartTime);
    setField("workDate", start.toISOString().slice(0, 10));
    setField("startHour", start.getHours().toString().padStart(2, "0"));
    setField("startMinute", start.getMinutes().toString().padStart(2, "0"));
  }
  
  if (task.EndTime) {
    const end = new Date(task.EndTime);
    setField("endHour", end.getHours().toString().padStart(2, "0"));
    setField("endMinute", end.getMinutes().toString().padStart(2, "0"));
  }
  
  // เลือกเครื่องจักรที่ถูกต้อง
  if (task.MachineID) {
    setTimeout(() => {
      const machineRadio = document.getElementById(`machine_${task.MachineID}`);
      if (machineRadio) machineRadio.checked = true;
    }, 100);
  }
  
  window.selectedEditTask = task;
}

function setupAddJobFormHandler() {
  const addJobForm = document.getElementById("addJobForm");
  if (addJobForm && !addJobForm._handlerAdded) {
    addJobForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(addJobForm);
      // Validation พื้นฐาน
      if (!formData.get("department")) {
        showToast("กรุณาเลือกแผนก", "danger");
        return;
      }
      
      if (!formData.get("lotNumber")) {
        showToast("กรุณากรอก Lot Number", "danger");
        return;
      }
      
      const LotSize = parseInt(formData.get("lotSize"), 10);
      if (isNaN(LotSize) || LotSize <= 0) {
        showToast("Lot Size ต้องมากกว่า 0", "danger");
        return;
      }
      
      // ตรวจสอบวันที่และเวลา
      const workDate = formData.get("workDate");
      const startHour = formData.get("startHour");
      const startMinute = formData.get("startMinute");
      const endHour = formData.get("endHour");
      const endMinute = formData.get("endMinute");
      
      if (!workDate || startHour === "" || startMinute === "" || endHour === "" || endMinute === "") {
        showToast("กรุณากรอกวันที่และเวลาให้ครบถ้วน", "danger");
        return;
      }
      
      // สร้าง datetime strings
      const startISO = `${workDate}T${startHour}:${startMinute}:00`;
      const endISO = `${workDate}T${endHour}:${endMinute}:00`;
      let start = new Date(startISO);
      let end = new Date(endISO);
      
      // ถ้าเวลาสิ้นสุดน้อยกว่าเวลาเริ่ม ให้เพิ่มวันถัดไป
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      
      // ตรวจสอบเครื่องจักรที่เลือก (radio button)
      const selectedMachine = document.querySelector('#machineCheckboxGroup input[type="radio"]:checked');
      if (!selectedMachine) {
        showToast("กรุณาเลือกเครื่องจักร", "danger");
        return;
      }
      
      const taskData = {
        LotNumber: formData.get("lotNumber"),
        PlannedLotSize: LotSize,
        MachineID: parseInt(selectedMachine.value, 10),
        Status: formData.get("status") || "planning",
        CreatedByUserID: 1, // ต้องแก้ไขให้ใช้ UserID จริงจาก session
        StartTime: startISO,
        EndTime: end.toISOString().substring(0, 19), // ตัด milliseconds ออก
      };
      
      if (window.selectedEditTask && window.selectedEditTask.JobID) {
        try {
          taskData.JobID = window.selectedEditTask.JobID;
          console.log("Updating task with data:", taskData);
          const result = await TaskManager.updateTask(taskData);
          console.log("Update result:", result);
          await TaskManager.loadFromDB();
          await CalendarRenderer.render();
          showToast("แก้ไขงานสำเร็จ", "success");
        } catch (error) {
          console.error('Update task error:', error);
          showToast("เกิดข้อผิดพลาดในการแก้ไขงาน: " + error.message, "danger");
          return;
        }
      } else {
        try {
          console.log("Adding new task with data:", taskData);
          const result = await TaskManager.addTask(taskData);
          console.log("Add result:", result);
          showToast("เพิ่มงานสำเร็จ", "success");
        } catch (error) {
          console.error('Add task error:', error);
          showToast("เกิดข้อผิดพลาดในการเพิ่มงาน: " + error.message, "danger");
          return;
        }
      }
      
      // ปิด modal และ reset form
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addJobModal")
      );
      if (modal) modal.hide();
      
      // รอให้ modal ปิดก่อนแล้วค่อย reset
      setTimeout(() => {
        addJobForm.reset();
        window.selectedEditTask = null;
      }, 300);
    });
    addJobForm._handlerAdded = true;
  }
}
document.addEventListener("DOMContentLoaded", setupAddJobFormHandler);

document.addEventListener("DOMContentLoaded", setupAddJobFormHandler);

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

// 3. ลบฟิลเตอร์ - ไม่ต้องการการกรอง
// function setupFilterForm() {
//   [
//     "departmentFilter",
//     "dateFilter",
//     "statusFilter",
//     "keywordFilter",
//   ].forEach((id) => {
//     document.getElementById(id)?.addEventListener("input", function () {
//       CalendarRenderer.render();
//     });
//   });
// }
// document.addEventListener("DOMContentLoaded", setupFilterForm);

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
// Machine mapping by DepartmentID (ใช้ MachineID ตามฐานข้อมูลใหม่)
const machineOptions = {
  1: [
    { id: 1, text: "UV Dryer" },
    { id: 2, text: "Screen Printer" },
    { id: 3, text: "Other Dryer" }
  ],
  2: [
    { id: 4, text: "Inkjet Printer" },
    { id: 5, text: "CO2 Laser" }
  ],
  3: [],
  4: [
    { id: 6, text: "Automatic Packing Machine" },
    { id: 7, text: "4-Head Packing Machine" },
    { id: 8, text: "2-Head Packing Machine" },
    { id: 9, text: "Automatic Capper" },
    { id: 10, text: "Capper 1" },
    { id: 11, text: "Capper 2" },
    { id: 12, text: "Button Rolling Machine" },
    { id: 13, text: "Dokkala Machine" },
    { id: 14, text: "Automatic Sachet Packing Machine" },
    { id: 15, text: "4-Line Bag Tying Machine" }
  ],
  5: [
    { id: 16, text: "Sealing Machine 1" },
    { id: 17, text: "Sealing Machine 2" },
    { id: 18, text: "Sealing Machine 3" },
    { id: 19, text: "Sealing Machine 4" },
    { id: 20, text: "Automatic Sealing Machine" }
  ],
  6: [
    { id: 21, text: "Capping Machine" },
    { id: 22, text: "Mixing Machine" }
  ]
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
      const id = `machine_${opt.id}`;
      const div = document.createElement("div");
      div.className = "form-check";
      div.innerHTML = `<input class="form-check-input" type="radio" name="machine" id="${id}" value="${opt.id}"> <label class="form-check-label" for="${id}">${opt.text}</label>`;
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
  const workDateInput = document.getElementById("workDate");
  
  if (departmentSelect && machineCheckboxGroup) {
    renderMachineCheckboxes(departmentSelect.value);
    departmentSelect.addEventListener("change", function () {
      renderMachineCheckboxes(departmentSelect.value);
    });
  }
  
  // ตั้งวันที่เริ่มต้นเป็นวันนี้
  if (workDateInput) {
    const today = new Date();
    workDateInput.value = today.toISOString().slice(0, 10);
  }
  
  const addJobModal = document.getElementById("addJobModal");
  if (addJobModal && departmentSelect) {
    addJobModal.addEventListener("show.bs.modal", function () {
      if (!departmentSelect.value) {
        departmentSelect.value = "1"; // เลือก Screen เป็นค่าเริ่มต้น
      }
      renderMachineCheckboxes(departmentSelect.value);
      
      // ตั้งวันที่เป็นวันนี้ถ้ายังไม่ได้ตั้ง
      if (workDateInput && !workDateInput.value) {
        const today = new Date();
        workDateInput.value = today.toISOString().slice(0, 10);
      }
      
      // Reset ข้อความปุ่มและหัวข้อเมื่อเป็นการเพิ่มงานใหม่
      if (!window.selectedEditTask) {
        const modalTitle = document.querySelector("#addJobModal .modal-title");
        const submitBtn = document.querySelector("#addJobModal button[type='submit']");
        if (modalTitle) modalTitle.textContent = "เพิ่มงานใหม่";
        if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>เพิ่มงาน';
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", setupDepartmentMachineEvents);

// 8. Utility: clear all filters and rerender calendar - ปิดการใช้งาน
// function clearFilters() {
//   document.getElementById("departmentFilter").value = "";
//   document.getElementById("dateFilter").value = "";
//   document.getElementById("statusFilter").value = "";
//   document.getElementById("keywordFilter").value = "";
//   CalendarRenderer.render();
// }

// เพิ่มฟังก์ชันล้างฟิลเตอร์เมื่อโหลดหน้า - ปิดการใช้งาน
// function clearAllFiltersOnLoad() {
//   // ล้างฟิลเตอร์เมื่อโหลดหน้าเพื่อแสดงงานทั้งหมด
//   document.getElementById("departmentFilter").value = "";
//   document.getElementById("dateFilter").value = "";
//   document.getElementById("statusFilter").value = "";
//   document.getElementById("keywordFilter").value = "";
// }

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

// 12. Expose clearFilters (ปิดการใช้งาน), showToast, showLoading to global (for use in HTML)
// window.clearFilters = clearFilters;
window.showToast = showToast;
window.showLoading = showLoading;

// 13. Calendar Navigation Functions
function previousWeek() {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  CalendarRenderer.render();
}

function nextWeek() {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  CalendarRenderer.render();
}

function goToToday() {
  currentWeekStart = getMonday(new Date());
  CalendarRenderer.render();
}

// Expose calendar navigation functions
window.previousWeek = previousWeek;
window.nextWeek = nextWeek;
window.goToToday = goToToday;
