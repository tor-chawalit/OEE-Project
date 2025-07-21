// ฟังก์ชันสำหรับเปิดใช้งาน Bootstrap Tooltip ทั้งหมดในหน้า
function enableAllTooltips() {
    if (window.bootstrap && typeof window.bootstrap.Tooltip === 'function') {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}
// คำนวณเวลาทำงานจริง (Actual Duration) หน่วย: นาที
function getActualDurationMinutes() {
    const start = document.getElementById('actualStartTime')?.value;
    const end = document.getElementById('actualEndTime')?.value;
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate)) return 0;
    const diffMs = endDate - startDate;
    return diffMs > 0 ? Math.round(diffMs / 60000) : 0; // 60000 ms = 1 นาที
}

// ...existing code...
// confirm.js - สำหรับ confirm-complete.html
// ------------------------------
// 1. ตรวจสอบ session
// 2. Toast utility
// 3. ฟังก์ชันดึงข้อมูลงาน, render, และยืนยันจบงาน
// 4. Main logic DOMContentLoaded

// 1. ตรวจสอบ session ด้วย AJAX ถ้ายังไม่ได้ login ให้ redirect ไปหน้า login.html
document.addEventListener('DOMContentLoaded', function () {
    fetch('login.php?action=check', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
            if (!data.loggedIn) {
                window.location.href = 'login.html';
            }
        })
        .catch(() => {
            window.location.href = 'login.html';
        });
});

// 2. Toast utility
function showToast(msg, type = "success") {
    const toast = document.getElementById("mainToast");
    const toastBody = document.getElementById("mainToastBody");
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toastBody.textContent = msg;
    const bsToast = new bootstrap.Toast(toast, { delay: 2500 });
    bsToast.show();
}
// 3. ฟังก์ชันดึงข้อมูลงาน, render, และยืนยันจบงาน
function getTaskIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}
async function fetchTaskDetail(id) {
    const res = await fetch(`tasks.php?action=get&id=${id}`);
    if (!res.ok) throw new Error('ไม่พบข้อมูลงาน');
    return await res.json();
}
function renderTaskDetail(task) {
    const statusMap = {
        'planning': { label: 'กำลังวางแผน', color: 'secondary', icon: 'bi-calendar2-week' },
        'in-progress': { label: 'กำลังดำเนินงาน', color: 'primary', icon: 'bi-play-circle' },
        'waiting-confirm': { label: 'รอยืนยันจบงาน', color: 'warning', icon: 'bi-hourglass-split' },
        'completed': { label: 'เสร็จสิ้น', color: 'success', icon: 'bi-check-circle' }
    };
    const status = statusMap[task.status] || { label: task.status || '', color: 'light', icon: 'bi-question-circle' };
    function formatDateTime(dt) {
        if (!dt) return '';
        const d = new Date(dt.replace(' ', 'T'));
        if (isNaN(d)) return dt;
        return d.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return `
    <dl class="row mb-0 text-dark">
        <dt class="col-sm-4"><i class="bi bi-card-text text-info me-1"></i>ชื่องาน</dt><dd class="col-sm-8 fw-bold text-primary-emphasis">${task.JobTitle || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-diagram-3 text-secondary me-1"></i>แผนก</dt><dd class="col-sm-8 text-dark">${task.Department || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-cpu text-secondary me-1"></i>เครื่องจักร</dt><dd class="col-sm-8 text-dark">${task.MachineType || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-clock text-success me-1"></i>เวลาเริ่ม</dt><dd class="col-sm-8 text-dark">${formatDateTime(task.StartTime) || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-clock-history text-danger me-1"></i>เวลาสิ้นสุด</dt><dd class="col-sm-8 text-dark">${formatDateTime(task.EndTime) || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-upc-scan text-secondary me-1"></i>Lot Number</dt><dd class="col-sm-8 text-dark">${task.LotNumber || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-123 text-secondary me-1"></i>Lot Size</dt><dd class="col-sm-8 text-dark">${task.LotSize || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-box-seam text-secondary me-1"></i>จำนวนผลิต</dt><dd class="col-sm-8 text-dark">${task.ProducedQuantity || ''}</dd>
        <dt class="col-sm-4"><i class="bi bi-info-circle text-secondary me-1"></i>รายละเอียด</dt><dd class="col-sm-8 text-dark">${task.Details || ''}</dd>
        <dt class="col-sm-4"><i class="${status.icon} text-${status.color} me-1"></i>สถานะ</dt>
        <dd class="col-sm-8">
            <span class="badge bg-${status.color} px-3 py-2 fs-6"><i class="${status.icon} me-1"></i>${status.label}</span>
        </dd>
    </dl>
    `;
}
async function completeTask(id, Downtime, actualStartTime, actualEndTime) {
    const goodProduct = document.getElementById('goodProduct').value;
    // Overtime logic
    const overtimeEnable = document.getElementById('overtimeEnable')?.checked;
    const overtimeValue = document.getElementById('overtime')?.value;

    if (overtimeEnable && overtimeValue && !isNaN(overtimeValue) && Number(overtimeValue) > 0) {
        payload.OvertimeEnable = true;
        payload.Overtime = Number(overtimeValue);
    } else {
        payload.OvertimeEnable = false;
        payload.Overtime = 0;
    }
    const res = await fetch('tasks.php?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('ยืนยันจบงานไม่สำเร็จ');
    return await res.json();
}
// 4. Main logic
// --- Support variable calculation for OEE display ---
function getBreaksTotal() {
    let total = 0;
    if (document.getElementById('breakMorning')?.checked) total += 15;
    if (document.getElementById('breakLunch')?.checked) total += 60;
    if (document.getElementById('breakEvening')?.checked) total += 15;
    return total;
}

function getShiftLength() {
    return document.getElementById('shiftLength9h')?.checked ? 540 : 0;
}

function getOvertime() {
    const enabled = document.getElementById('overtimeEnable')?.checked;
    const val = parseInt(document.getElementById('overtime')?.value, 10);
    return enabled && !isNaN(val) ? val : 0;
}

function updateSupportVariables() {
    // --- OEE Calculation ---
    // 1. Availability = Run Time / Planned Production Time
    // 2. Performance = (Ideal Cycle Time × Total Count) / Run Time
    // 3. Quality = Good Count / Total Count
    // 4. OEE = Availability × Performance × Quality

    // Get values (use unique variable names)
    const oeePlannedProductionTime = parseFloat(document.getElementById('plannedProductionTime')?.value) || 0;
    const oeeRunTime = parseFloat(document.getElementById('operatingTime')?.value) || 0;
    const oeeIdealCycleTime = parseFloat(document.getElementById('idealCycleTimeDisplay')?.value) || 0;
    const oeeTotalCount = parseFloat(document.getElementById('totalPieces')?.value) || 0;
    const oeeGoodCount = parseFloat(document.getElementById('goodPieces')?.value) || 0;

    // Availability
    let oeeAvailability = (oeePlannedProductionTime > 0 && oeeRunTime > 0) ? (oeeRunTime / oeePlannedProductionTime) : 0;
    // Performance
    let oeePerformance = (oeeRunTime > 0 && oeeIdealCycleTime > 0 && oeeTotalCount > 0) ? ((oeeIdealCycleTime * oeeTotalCount) / oeeRunTime) : 0;
    // Quality
    let oeeQuality = (oeeTotalCount > 0 && oeeGoodCount >= 0) ? (oeeGoodCount / oeeTotalCount) : 0;
    // OEE
    let oeeTotal = oeeAvailability * oeePerformance * oeeQuality;

    // Show as percent, 2 decimals
    function pct(val) { return (val * 100).toFixed(2) + '%'; }
    document.getElementById('oeeAvailability').textContent = oeePlannedProductionTime > 0 ? pct(oeeAvailability) : '-';
    document.getElementById('oeePerformance').textContent = (oeeRunTime > 0 && oeeIdealCycleTime > 0 && oeeTotalCount > 0) ? pct(oeePerformance) : '-';
    document.getElementById('oeeQuality').textContent = (oeeTotalCount > 0) ? pct(oeeQuality) : '-';
    document.getElementById('oeeTotal').textContent = (oeePlannedProductionTime > 0 && oeeRunTime > 0 && oeeIdealCycleTime > 0 && oeeTotalCount > 0) ? pct(oeeTotal) : '-';
    // Calculate actual duration at the top so it can be used everywhere
    const actualDuration = getActualDurationMinutes();

    // Ideal Cycle Time = 1 / Ideal Run Rate (นาที/ชิ้น)
    const rate = parseFloat(document.getElementById('idealRunRate')?.value);
    let cycleTime = '';
    if (rate > 0) {
      cycleTime = (1 / rate).toFixed(4); // แสดงทศนิยม 4 ตำแหน่ง
    } else {
      cycleTime = '';
    }
    const display = document.getElementById('idealCycleTimeDisplay');
    if (display) display.value = cycleTime;
    // Optional: set value to a hidden field for use elsewhere
    let cycleTimeField = document.getElementById('cycleTime');
    if (!cycleTimeField) {
      cycleTimeField = document.createElement('input');
      cycleTimeField.type = 'hidden';
      cycleTimeField.id = 'cycleTime';
      display?.parentNode?.appendChild(cycleTimeField);
    }
    cycleTimeField.value = cycleTime;

    // Net Run Time = Ideal Cycle Time (วินาที/ชิ้น) × Total Pieces
    const totalPiecesForNet = parseInt(document.getElementById('totalPieces')?.value, 10) || 0;
    let netRunTime = '';
    if (cycleTime && !isNaN(Number(cycleTime)) && totalPiecesForNet > 0) {
        netRunTime = (Number(cycleTime) * totalPiecesForNet).toFixed(2);
    } else {
        netRunTime = '';
    }
    const netRunTimeDisplay = document.getElementById('netRunTime');
    if (netRunTimeDisplay) netRunTimeDisplay.value = netRunTime;

    // Planned Production Time = actualEndTime (นาทีจากเที่ยงคืน) - Break Time (จาก checkbox) + Overtime (ถ้ามี)
    const breaks = getBreaksTotal();
    let plannedProductionTime = '';
    const endVal = document.getElementById('actualEndTime')?.value;
    let overtime = 0;
    const overtimeEnableChecked = document.getElementById('overtimeEnable')?.checked;
    const overtimeInputVal = document.getElementById('overtime')?.value;
    if (overtimeEnableChecked && overtimeInputVal && !isNaN(overtimeInputVal) && Number(overtimeInputVal) > 0) {
        overtime = Number(overtimeInputVal);
    }
    if (endVal) {
        const endDate = new Date(endVal);
        if (!isNaN(endDate)) {
            // คำนวณนาทีจากเที่ยงคืน
            const minutesFromMidnight = endDate.getHours() * 60 + endDate.getMinutes();
            plannedProductionTime = minutesFromMidnight - breaks + overtime;
        }
    }
    document.getElementById('plannedProductionTime').value = plannedProductionTime && plannedProductionTime > 0 ? plannedProductionTime : '';

    // Actual Duration (เวลาทำงานจริง) = actualEndTime - actualStartTime (นาที)
    const actualDurationDisplay = document.getElementById('actualDurationText');
    if (actualDurationDisplay) {
        actualDurationDisplay.textContent = actualDuration > 0 ? actualDuration + ' นาที' : '';
    }

    // Operating Time = Planned Production Time - Down Time
    const downtime = parseInt(document.getElementById('downtime')?.value, 10) || 0;
    const plannedProductionTimeVal = parseInt(document.getElementById('plannedProductionTime')?.value, 10) || 0;
    const operatingTime = plannedProductionTimeVal - downtime;
    document.getElementById('operatingTime').value = operatingTime > 0 ? operatingTime : '';

    // Good Pieces = Total Pieces - Reject Pieces
    const totalPieces = parseInt(document.getElementById('totalPieces')?.value, 10) || 0;
    const rejectPieces = parseInt(document.getElementById('rejectPieces')?.value, 10) || 0;
    const goodPieces = totalPieces - rejectPieces;
    document.getElementById('goodPieces').value = goodPieces >= 0 ? goodPieces : '';

    // Always sync overtime input enable/disable with checkbox
    const overtimeEnableElem = document.getElementById('overtimeEnable');
    const overtimeInputElem = document.getElementById('overtime');
    if (overtimeEnableElem && overtimeInputElem) {
        overtimeInputElem.disabled = !overtimeEnableElem.checked;
        if (!overtimeEnableElem.checked) overtimeInputElem.value = '';
    }
}

function setupSupportVariableListeners() {
    [
        'actualStartTime', 'actualEndTime',
        'shiftLength9h', 'overtimeEnable', 'overtime',
        'breakMorning', 'breakLunch', 'breakEvening',
        'downtime', 'totalPieces', 'rejectPieces',
        'idealRunRate'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSupportVariables);
            el.addEventListener('change', updateSupportVariables);
            // For break checkboxes, update break total display
            if (id === 'breakMorning' || id === 'breakLunch' || id === 'breakEvening') {
                el.addEventListener('input', updateBreakTotalDisplay);
                el.addEventListener('change', updateBreakTotalDisplay);
            }
        }
    });
    // Initial update
    updateBreakTotalDisplay();
}

// Show total break minutes below break checkboxes
function updateBreakTotalDisplay() {
    let total = 0;
    if (document.getElementById('breakMorning')?.checked) total += 15;
    if (document.getElementById('breakLunch')?.checked) total += 60;
    if (document.getElementById('breakEvening')?.checked) total += 15;
    const display = document.getElementById('breakTotalDisplay');
    const minutes = document.getElementById('breakTotalMinutes');
    if (display && minutes) {
        if (total > 0) {
            display.style.display = '';
            minutes.textContent = total;
        } else {
            display.style.display = 'none';
            minutes.textContent = '0';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setupSupportVariableListeners();
    updateSupportVariables();

    // เรียกใช้ฟังก์ชัน tooltip
    enableAllTooltips();

    // Enable/disable overtime input when checkbox changes
    const overtimeEnable = document.getElementById('overtimeEnable');
    const overtimeInput = document.getElementById('overtime');
    function toggleOvertimeInput() {
        if (overtimeEnable && overtimeInput) {
            overtimeInput.disabled = !overtimeEnable.checked;
            if (!overtimeEnable.checked) overtimeInput.value = '';
        }
    }
    if (overtimeEnable && overtimeInput) {
        overtimeEnable.addEventListener('change', toggleOvertimeInput);
        // Set initial state
        toggleOvertimeInput();
    }
});
// (ฟังก์ชันย่อยอื่นๆ เช่น parseThaiDateTimeLocal, showActualDuration, calcGoodProduct, event handler สามารถย้ายมาเติมได้ที่นี่)
document.addEventListener('DOMContentLoaded', async function() {
    const id = getTaskIdFromUrl();
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (!id) {
        const body = document.getElementById('taskConfirmBody');
        if (body) body.innerHTML = '<div class="alert alert-danger">ไม่พบรหัสงาน (id)</div>';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        setTimeout(() => { window.location = 'index.html'; }, 1800);
        return;
    }
    try {
        const task = await fetchTaskDetail(id);
        if (task.status !== 'waiting-confirm') {
            showToast('งานนี้ยังไม่ถูกตั้งสถานะให้รอการยืนยันจบงาน', 'danger');
            setTimeout(() => { window.location = 'index.html'; }, 1300);
            return;
        }
        const body = document.getElementById('taskConfirmBody');
        if (body) {
            body.innerHTML = renderTaskDetail(task) + body.innerHTML;
            // Re-bind listeners after innerHTML update
            setupSupportVariableListeners();
            updateSupportVariables();
            enableAllTooltips();
        }
        document.getElementById('emergencyStopForm').style.display = '';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        const loadingSection = document.getElementById('loadingSection');
        if (loadingSection) loadingSection.style.display = 'none';
        const footer = document.getElementById('confirmFooter');
        if (footer) footer.style.display = '';
        const btn = document.getElementById('confirmCompleteBtn');
        // เพิ่ม event handler สำหรับปุ่มยืนยันจบงาน (ตัวอย่างพื้นฐาน)
        if (btn) {
            btn.onclick = async function(e) {
                e.preventDefault();
                const downtime = document.getElementById('downtime')?.value || 0;
                const actualStartTime = document.getElementById('actualStartTime')?.value || null;
                const actualEndTime = document.getElementById('actualEndTime')?.value || null;
                try {
                    await completeTask(id, downtime, actualStartTime, actualEndTime);
                    const oee = calculateOEE();
                    showToast('ยืนยันจบงานสำเร็จ\nOEE: ' + oee + '%', 'success');
                    setTimeout(() => { window.location = 'index.html'; }, 1800);
                } catch (err) {
                    showToast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
                }
            }
        }
    } catch (e) {
        const body = document.getElementById('taskConfirmBody');
        if (body) body.innerHTML = `<div class='alert alert-danger'>${e.message}</div>`;
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        setTimeout(() => { window.location = 'index.html'; }, 1800);
    }
});

