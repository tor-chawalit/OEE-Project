// Department mapping for display in modals and details
// Department mapping by ID (ตามฐานข้อมูลใหม่)
const DEPARTMENTS = {
  1: "สกรีน",
  2: "เลเซอร์",
  3: "ล้างบรรจุภัณฑ์",
  4: "บรรจุ",
  5: "แพ็กกิ้ง",
  6: "กรอง&Mix"
};

//Configuration
const CONFIG = {
  VERSION: "1.0.0",
  NAME: "Machine Control System",
  STORAGE_KEY: "tasks",
  AUTO_SAVE: true,
};

// Multi-step Form Management
class FormStepManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    // ตรวจสอบให้แน่ใจว่า DOM โหลดเสร็จแล้ว
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
    
    this.initialized = true;
  }

  setupEventListeners() {
    console.log('Setting up FormStepManager event listeners...');
    
    // ค้นหาปุ่มต่างๆ
    const nextBtn = document.getElementById('nextStepBtn');
    const prevBtn = document.getElementById('prevStepBtn');
    const submitBtn = document.getElementById('submitJobBtn'); // Changed to correct ID

    console.log('Next button:', nextBtn);
    console.log('Prev button:', prevBtn);
    console.log('Submit button:', submitBtn);

    // Setup next button
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Next button clicked, current step:', this.currentStep);
        this.nextStep();
      });
      console.log('Next button event listener added');
    } else {
      console.error('Next button not found!');
    }

    // Setup previous button  
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Previous button clicked, current step:', this.currentStep);
        this.prevStep();
      });
      console.log('Previous button event listener added');
    } else {
      console.log('Previous button not found (OK for step 1)');
    }

    // Setup submit button
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Submit button clicked');
        // Validate last step before submit
        if (this.validateStep(this.currentStep)) {
          // Trigger form submit
          const form = document.getElementById('addJobForm');
          if (form) {
            form.dispatchEvent(new Event('submit'));
          }
        }
      });
      console.log('Submit button event listener added');
    } else {
      console.log('Submit button not found (OK if not on last step)');
    }
    
    // Duration calculation
    this.setupDurationCalculation();
    
    // Real-time updates
    this.setupRealTimeUpdates();

    // Initialize display
    this.updateStepDisplay();
    console.log('FormStepManager initialization complete');
  }

  nextStep() {
    console.log(`Attempting to go to next step. Current: ${this.currentStep}, Total: ${this.totalSteps}`);
    
    if (this.validateStep(this.currentStep)) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        console.log(`Moving to step ${this.currentStep}`);
        this.updateStepDisplay();
      } else {
        console.log('Already at last step');
      }
    } else {
      console.log('Validation failed for current step');
    }
  }

  prevStep() {
    console.log(`Attempting to go to previous step. Current: ${this.currentStep}`);
    
    if (this.currentStep > 1) {
      this.currentStep--;
      console.log(`Moving to step ${this.currentStep}`);
      this.updateStepDisplay();
    } else {
      console.log('Already at first step');
    }
  }

  updateStepDisplay() {
    console.log(`Updating step display for step ${this.currentStep}`);
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
      const stepNum = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNum < this.currentStep) {
        step.classList.add('completed');
        console.log(`Step indicator ${stepNum} marked as completed`);
      } else if (stepNum === this.currentStep) {
        step.classList.add('active');
        console.log(`Step indicator ${stepNum} marked as active`);
      }
    });

    // Update progress line
    const progressLine = document.querySelector('.progress-line');
    if (progressLine) {
      progressLine.className = `progress-line step-${this.currentStep}`;
      console.log(`Progress line updated to step-${this.currentStep}`);
    }

    // Update form steps - Use display instead of class
    document.querySelectorAll('.form-step').forEach((step, index) => {
      const stepNum = index + 1;
      if (stepNum === this.currentStep) {
        step.style.display = 'block';
        console.log(`Form step ${stepNum} shown`);
      } else {
        step.style.display = 'none';
        console.log(`Form step ${stepNum} hidden`);
      }
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const submitBtn = document.getElementById('submitJobBtn'); // Changed from 'submitBtn'

    console.log('Navigation buttons:', { prevBtn, nextBtn, submitBtn });

    if (prevBtn) {
      prevBtn.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
      console.log(`Previous button ${this.currentStep > 1 ? 'shown' : 'hidden'}`);
    }

    if (this.currentStep === this.totalSteps) {
      if (nextBtn) {
        nextBtn.style.display = 'none';
        console.log('Next button hidden (last step)');
      }
      if (submitBtn) {
        submitBtn.style.display = 'inline-block';
        console.log('Submit button shown (last step)');
      }
    } else {
      if (nextBtn) {
        nextBtn.style.display = 'inline-block';
        console.log('Next button shown');
      }
      if (submitBtn) {
        submitBtn.style.display = 'none';
        console.log('Submit button hidden');
      }
    }
  }

  validateStep(step) {
    console.log(`Validating step ${step}`);
    
    const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    if (!currentStepElement) {
      console.log(`Step element not found for step ${step}, assuming valid`);
      return true; // ถ้าไม่มี step element ให้ถือว่าผ่าน
    }

    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;

    console.log(`Found ${requiredFields.length} required fields in step ${step}`);

    requiredFields.forEach((field, index) => {
      const fieldValue = field.value ? field.value.trim() : '';
      console.log(`Field ${index + 1} (${field.name || field.id}): "${fieldValue}"`);
      
      if (!fieldValue) {
        field.classList.add('is-invalid');
        isValid = false;
        console.log(`Field ${field.name || field.id} is invalid`);
      } else {
        field.classList.remove('is-invalid');
      }
    });

    // Special validation for each step
    if (step === 1) {
      // Validate department and machine selection
      const departmentSelect = document.getElementById('department');
      const selectedMachine = document.querySelector('#machineCheckboxGroup input[type="radio"]:checked');
      
      console.log('Department selected:', departmentSelect ? departmentSelect.value : 'none');
      console.log('Machine selected:', selectedMachine ? selectedMachine.value : 'none');
      
      if (!departmentSelect || !departmentSelect.value) {
        isValid = false;
        console.log('Department validation failed');
        if (departmentSelect) departmentSelect.classList.add('is-invalid');
      }
      
      if (!selectedMachine) {
        showToast('กรุณาเลือกเครื่องจักร', 'warning');
        isValid = false;
        console.log('Machine validation failed');
      }
    }

    if (step === 2) {
      // Validate job details
      const jobName = document.getElementById('jobName');
      const lotNumber = document.getElementById('lotNumber');
      const lotSize = document.getElementById('lotSize');
      
      if (jobName && !jobName.value.trim()) {
        jobName.classList.add('is-invalid');
        isValid = false;
      }
      
      if (lotNumber && !lotNumber.value.trim()) {
        lotNumber.classList.add('is-invalid');
        isValid = false;
      }
      
      if (lotSize && (!lotSize.value || parseInt(lotSize.value) <= 0)) {
        lotSize.classList.add('is-invalid');
        isValid = false;
      }
    }

    if (step === 3) {
      // Validate time settings
      const workDate = document.getElementById('workDate');
      const startHour = document.getElementById('startHour');
      const startMinute = document.getElementById('startMinute');
      const endHour = document.getElementById('endHour');
      const endMinute = document.getElementById('endMinute');
      
      const timeFields = [workDate, startHour, startMinute, endHour, endMinute];
      timeFields.forEach(field => {
        if (field && !field.value) {
          field.classList.add('is-invalid');
          isValid = false;
        }
      });
    }

    if (!isValid) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
    }

    console.log(`Step ${step} validation result:`, isValid);
    return isValid;
  }

  setupDurationCalculation() {
    const startHour = document.getElementById('startHour');
    const startMinute = document.getElementById('startMinute');
    const endHour = document.getElementById('endHour');
    const endMinute = document.getElementById('endMinute');
    const durationDisplay = document.getElementById('durationDisplay');

    const calculateDuration = () => {
      if (startHour.value && startMinute.value && endHour.value && endMinute.value) {
        const startTime = new Date();
        startTime.setHours(parseInt(startHour.value), parseInt(startMinute.value), 0, 0);
        
        const endTime = new Date();
        endTime.setHours(parseInt(endHour.value), parseInt(endMinute.value), 0, 0);
        
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
        
        const diffMs = endTime - startTime;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (durationDisplay) {
          durationDisplay.textContent = `${hours} ชั่วโมง ${minutes} นาที`;
        }
      }
    };

    [startHour, startMinute, endHour, endMinute].forEach(element => {
      if (element) {
        element.addEventListener('change', calculateDuration);
      }
    });
  }

  setupRealTimeUpdates() {
    // Update current date time
    const updateDateTime = () => {
      const now = new Date();
      const dateTimeElement = document.getElementById('currentDateTime');
      if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleString('th-TH', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',  
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    };

    updateDateTime();
    setInterval(updateDateTime, 30000); // Update every 30 seconds
    
    // Update status counts
    this.updateStatusCounts();
  }

  updateStatusCounts() {
    const tasks = TaskManager.getAllTasks();
    const counts = {
      planning: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0
    };

    tasks.forEach(task => {
      if (counts.hasOwnProperty(task.Status)) {
        counts[task.Status]++;
      }
    });

    // Update count displays
    const planningCountEl = document.getElementById('planningCount');
    const inProgressCountEl = document.getElementById('inProgressCount');
    const completedCountEl = document.getElementById('completedCount');  
    const cancelledCountEl = document.getElementById('cancelledCount');

    if (planningCountEl) planningCountEl.textContent = counts.planning;
    if (inProgressCountEl) inProgressCountEl.textContent = counts['in-progress'];
    if (completedCountEl) completedCountEl.textContent = counts.completed;
    if (cancelledCountEl) cancelledCountEl.textContent = counts.cancelled;
  }

  reset() {
    this.currentStep = 1;
    this.updateStepDisplay();
  }
}

// Initialize form step manager
let formStepManager;
document.addEventListener('DOMContentLoaded', () => {
  formStepManager = new FormStepManager();
  formStepManager.init(); // เพิ่มการเรียก init()
});

// Enhanced Machine Selection Rendering
function renderMachineCheckboxes(dept) {
  const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
  if (!machineCheckboxGroup) return;
  
  machineCheckboxGroup.innerHTML = '';
  
  if (machineOptions[dept] && machineOptions[dept].length > 0) {
    machineOptions[dept].forEach(opt => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'machine-option';
      optionDiv.innerHTML = `
        <input type="radio" id="machine${opt.id}" name="machine" value="${opt.id}" required>
        <label for="machine${opt.id}" class="mb-0 flex-grow-1">${opt.text}</label>
      `;
      
      optionDiv.addEventListener('click', function() {
        const radio = optionDiv.querySelector('input[type="radio"]');
        radio.checked = true;
        
        // Update visual selection
        document.querySelectorAll('.machine-option').forEach(el => {
          el.classList.remove('selected');
        });
        optionDiv.classList.add('selected');
      });
      
      machineCheckboxGroup.appendChild(optionDiv);
    });
  } else {
    machineCheckboxGroup.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
        <p class="mb-0">ไม่มีเครื่องจักรในแผนกนี้</p>
      </div>
    `;
  }
}

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
    
    // Update status counts after rendering
    if (formStepManager) {
      formStepManager.updateStatusCounts();
    }
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
    taskElement.textContent = `${task.JobName || task.LotNumber || 'Job'} - ${task.MachineName || 'Machine'}`;
    return taskElement;
  }
}

// Modal Management
class ModalManager {
  static showTaskDetail = function (task, confirmOnly = false) {
    selectedTask = task;
    document.getElementById("taskDetailTitle").textContent = `งาน: ${task.JobName || task.LotNumber || `Job ID: ${task.JobID}`}`;
    
    let statusText = "-";
    let statusColor = "secondary";
    if (task.Status === "planning") {
      statusText = "กำลังวางแผน";
      statusColor = "primary";
    } else if (task.Status === "in-progress") {
      statusText = "กำลังดำเนินงาน";
      statusColor = "warning";
    } else if (task.Status === "completed") {
      statusText = "เสร็จสิ้น";
      statusColor = "success";
    } else if (task.Status === "cancelled") {
      statusText = "ยกเลิก";
      statusColor = "danger";
    }
    
    let detailHTML = `
      <div class="row g-4">
        <!-- Job Information Section -->
        <div class="col-md-6">
          <div class="task-detail-section">
            <h6><i class="bi bi-info-circle-fill me-2"></i>ข้อมูลงาน</h6>
            <div class="detail-item">
              <span class="detail-label">สถานะ:</span>
              <span class="detail-value">
                <span class="badge bg-${statusColor} fs-6">${statusText}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ชื่องาน:</span>
              <span class="detail-value fw-bold">${task.JobName || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Lot Number:</span>
              <span class="detail-value"><code>${task.LotNumber || "-"}</code></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">แผนก:</span>
              <span class="detail-value">${task.DepartmentName || "-"}</span>  
            </div>
            <div class="detail-item">
              <span class="detail-label">เครื่องจักร:</span>
              <span class="detail-value">${task.MachineName || "-"}</span>
            </div>
          </div>
        </div>
        
        <!-- Production Information Section -->
        <div class="col-md-6">
          <div class="task-detail-section">
            <h6><i class="bi bi-graph-up me-2"></i>ข้อมูลการผลิต</h6>
            <div class="detail-item">
              <span class="detail-label">Lot Size:</span>
              <span class="detail-value">
                <span class="badge bg-info text-dark">${task.PlannedLotSize || "0"} ชิ้น</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">เป้าหมายผลิต:</span>
              <span class="detail-value">
                <span class="badge bg-success">${task.ActualOutput || "0"} ชิ้น</span>
              </span>
            </div>
            ${task.StartTime ? `
            <div class="detail-item">
              <span class="detail-label">เวลาเริ่ม:</span>
              <span class="detail-value">
                <i class="bi bi-play-circle me-1"></i>
                ${new Date(task.StartTime).toLocaleString('th-TH')}
              </span>
            </div>` : ''}
            ${task.EndTime ? `
            <div class="detail-item">
              <span class="detail-label">เวลาสิ้นสุด:</span>
              <span class="detail-value">
                <i class="bi bi-stop-circle me-1"></i>
                ${new Date(task.EndTime).toLocaleString('th-TH')}
              </span>
            </div>` : ''}
            ${task.StartTime && task.EndTime ? `
            <div class="detail-item">
              <span class="detail-label">ระยะเวลา:</span>
              <span class="detail-value">
                <i class="bi bi-stopwatch me-1"></i>
                ${Utils.calculateDuration(task.StartTime, task.EndTime)} ชั่วโมง
              </span>
            </div>` : ''}
          </div>
        </div>
        
        <!-- System Information Section -->
        <div class="col-12">
          <div class="task-detail-section">
            <h6><i class="bi bi-gear-fill me-2"></i>ข้อมูลระบบ</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">วันที่สร้าง:</span>
                  <span class="detail-value">
                    ${task.CreatedAt ? new Date(task.CreatedAt).toLocaleString('th-TH') : "-"}
                  </span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">สร้างโดย:</span>
                  <span class="detail-value">User ID ${task.CreatedByUserID || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (task.Details && task.Details.trim()) {
      detailHTML += `
        <div class="row mt-3">
          <div class="col-12">
            <div class="task-detail-section">
              <h6><i class="bi bi-journal-text me-2"></i>รายละเอียดเพิ่มเติม</h6>
              <div class="bg-white p-3 rounded border">
                <p class="mb-0">${task.Details}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    detailHTML += `
      <div class="row mt-4">
        <div class="col-12">
          <div class="d-flex justify-content-end gap-2">
            <button id="editTaskBtn" class="btn btn-warning btn-lg">
              <i class="bi bi-pencil-square me-2"></i>แก้ไขงาน
            </button>
            <button id="deleteTaskBtn" class="btn btn-danger btn-lg">
              <i class="bi bi-trash me-2"></i>ลบงาน
            </button>
    `;

    if (task.Status === "completed") {
      detailHTML += `
        <button id="viewOEEBtn" class="btn btn-info btn-lg">
          <i class="bi bi-graph-up-arrow me-2"></i>Confirm Product
        </button>
      `;
    } else if (task.Status === "in-progress") {
      detailHTML += `
        <button id="completeTaskBtn" class="btn btn-success btn-lg">
          <i class="bi bi-check-circle me-2"></i>เสร็จสิ้นงาน
        </button>
      `;
    }

    detailHTML += `
          </div>
        </div>
      </div>
    `;
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
      
      // Handler for viewOEEBtn (Confirm Product button)
      const viewOEEBtn = document.getElementById("viewOEEBtn");
      if (viewOEEBtn) {
        viewOEEBtn.onclick = function (e) {
          e.preventDefault();
          window.location.href = `confirm-complete.html?id=${encodeURIComponent(task.JobID)}`;
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
  
  setField("jobName", task.JobName || "");
  setField("lotNumber", task.LotNumber || "");
  setField("lotSize", task.PlannedLotSize || "");
  setField("actualOutput", task.ActualOutput || "");
  setField("details", task.Details || "");
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
        JobName: formData.get("jobName") || "",
        LotNumber: formData.get("lotNumber"),
        PlannedLotSize: LotSize,
        ActualOutput: parseInt(formData.get("actualOutput") || "0", 10),
        MachineID: parseInt(selectedMachine.value, 10),
        DepartmentID: parseInt(formData.get("department"), 10),
        Status: formData.get("status") || "planning",
        Details: formData.get("details") || "",
        CreatedByUserID: 1,
        StartTime: startISO,
        EndTime: end.toISOString().substring(0, 19),
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

// Machine control system - JavaScript logic for index.html
// ---------------------------------------------------------------
// Enhanced form handling, task management, and calendar rendering
// Uses NavigationManager component for navigation functionality
// ---------------------------------------------------------------

// Session checking is now handled by NavigationManager
// No legacy session checking needed

// Add task button is handled by existing modal setup
// No additional setup needed

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

// Logout functionality is now handled by NavigationManager
// No legacy logout handling needed

// 6. Mapping เครื่องจักรแต่ละแผนก และ render checkbox เครื่องจักร
// Machine mapping by DepartmentID (ใช้ MachineID ตามฐานข้อมูลใหม่)
const machineOptions = {
  1: [
    { id: 1, text: "เครื่องอบ UV" },
    { id: 2, text: "เครื่องสกรีน" },
    { id: 3, text: "เครื่องอบลมร้อน" }
  ],
  2: [
    { id: 4, text: "เครื่อง Inkjet" },
    { id: 5, text: "เครื่องเลเซอร์ CO2" }
  ],
  3: [],
  4: [
    { id: 6, text: "เครื่องบรรจุอัตโนมัติ" },
    { id: 7, text: "เครื่องบรรจุ 4 หัว" },
    { id: 8, text: "เครื่องบรรจุ 2 หัว" },
    { id: 9, text: "เครื่องหมุนฝาอัตโนมัติ" },
    { id: 10, text: "เครื่องหมุนฝา 1" },
    { id: 11, text: "เครื่องหมุนฝา 2" },
    { id: 12, text: "เครื่องคลิ้มหัวสเปรย์" },
    { id: 13, text: "เครื่องตอกคอลล่า" },
    { id: 14, text: "เครื่องบรรจุซองอัตโนมัติ" },
    { id: 15, text: "เครื่องอุโมงค์ชริ้งฟิล์ม" }
  ],
  5: [
    { id: 16, text: "เครื่องห่อฟิล์ม 1" },
    { id: 17, text: "เครื่องห่อฟิล์ม 2" },
    { id: 18, text: "เครื่องห่อฟิล์ม 3" },
    { id: 19, text: "เครื่องห่อฟิล์ม 4" },
    { id: 20, text: "เครื่องห่อฟิล์มอัตโนมัติ" }
  ],
  6: [
    { id: 21, text: "เครื่องกรอง" },
    { id: 22, text: "เครื่องผสม" }
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
      console.log('Modal is opening, resetting form step manager...');
      
      // Reset form step manager
      if (formStepManager) {
        formStepManager.reset();
      }
      
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
