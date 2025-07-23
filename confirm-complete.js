// confirm-complete.js - Enhanced with Backend Integration
// =====================================================

class ConfirmCompleteManager {
    constructor() {
        this.taskData = null;
        this.taskId = null;
        this.isLoading = false;
    }

    async init() {
        try {
            // Get task ID from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            this.taskId = urlParams.get('id');
            
            if (!this.taskId) {
                this.showError('ไม่พบ ID งานที่ต้องการยืนยัน');
                return;
            }

            console.log('Loading task data for ID:', this.taskId);
            await this.loadTaskData();
            this.setupEventListeners();
            this.initializeCalculations();
            
        } catch (error) {
            console.error('Init error:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
        }
    }

    async loadTaskData() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`tasks.php?action=get_task_detail&id=${this.taskId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลงานได้');
            }

            this.taskData = result.data;
            console.log('Task data loaded:', this.taskData);
            
            // Validate task status
            if (this.taskData.Status !== 'completed') {
                throw new Error('งานนี้ยังไม่ได้ทำเสร็จ ไม่สามารถยืนยันได้');
            }

            this.populateTaskData();
            this.showForm();
            
        } catch (error) {
            console.error('Load task data error:', error);
            this.showError('ไม่สามารถโหลดข้อมูลงานได้: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    populateTaskData() {
        if (!this.taskData) return;

        // Set default times based on task schedule
        if (this.taskData.StartTime) {
            const startTime = new Date(this.taskData.StartTime);
            document.getElementById('actualStartTime').value = this.formatDateTimeLocal(startTime);
        }

        if (this.taskData.EndTime) {
            const endTime = new Date(this.taskData.EndTime);
            document.getElementById('actualEndTime').value = this.formatDateTimeLocal(endTime);
        }

        // Set total pieces from ActualOutput
        if (this.taskData.ActualOutput) {
            document.getElementById('totalPieces').value = this.taskData.ActualOutput;
        }

        // Calculate planned production time
        this.updatePlannedProductionTime();
    }

    updatePlannedProductionTime() {
        // ใช้เวลาที่ผู้ใช้ป้อนในฟิลด์แทนค่าเดิมจากฐานข้อมูล
        const startTimeInput = document.getElementById('actualStartTime')?.value;
        const endTimeInput = document.getElementById('actualEndTime')?.value;
        
        if (!startTimeInput || !endTimeInput) {
            document.getElementById('plannedProductionTime').value = 'ไม่ระบุ';
            return;
        }

        const startTime = new Date(startTimeInput);
        const endTime = new Date(endTimeInput);
        
        if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
            document.getElementById('plannedProductionTime').value = 'เวลาไม่ถูกต้อง';
            return;
        }
        
        const diffMs = endTime - startTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        // Calculate break time
        let breakMinutes = 0;
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            breakMinutes += breakTimes[checkbox.value] || 0;
        });
        
        // Planned Production Time = Total Minutes - Break Time
        const plannedProductionTime = diffMinutes - breakMinutes;
        
        document.getElementById('plannedProductionTime').value = `${Math.max(0, plannedProductionTime)} นาที`;
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('emergencyStopForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Time change events
        document.getElementById('actualStartTime')?.addEventListener('change', () => this.calculateTimes());
        document.getElementById('actualEndTime')?.addEventListener('change', () => this.calculateTimes());

        // Break time checkboxes
        document.querySelectorAll('input[name="breakTime[]"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.calculateBreakTime());
        });

        // Overtime checkbox
        document.getElementById('overtimeEnable')?.addEventListener('change', (e) => {
            const overtimeInput = document.getElementById('overtime');
            if (overtimeInput) {
                overtimeInput.disabled = !e.target.checked;
                if (!e.target.checked) {
                    overtimeInput.value = '';
                }
            }
            this.calculateTimes();
        });

        // Numeric inputs for calculations
        document.getElementById('overtime')?.addEventListener('input', () => this.calculateTimes());
        document.getElementById('downtime')?.addEventListener('input', () => this.calculateTimes());
        document.getElementById('idealRunRate')?.addEventListener('input', () => this.calculatePerformance());
        document.getElementById('totalPieces')?.addEventListener('input', () => this.calculatePerformance());
        document.getElementById('rejectPieces')?.addEventListener('input', () => this.calculateQuality());

        // Shift length checkbox
        document.getElementById('shiftLength9h')?.addEventListener('change', () => this.calculateTimes());

        // Show form footer when form is ready
        setTimeout(() => {
            document.getElementById('confirmFooter').style.display = 'block';
        }, 1000);
    }

    initializeCalculations() {
        this.calculateBreakTime();
        this.calculateTimes();
        this.calculatePerformance();
        this.calculateQuality();
    }

    calculateBreakTime() {
        let totalBreakMinutes = 0;
        const breakTimes = {
            'morning': 15,
            'lunch': 60,
            'evening': 15
        };

        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            totalBreakMinutes += breakTimes[checkbox.value] || 0;
        });

        document.getElementById('breakTotalMinutes').textContent = totalBreakMinutes;
        document.getElementById('breakTotalDisplay').style.display = totalBreakMinutes > 0 ? 'block' : 'none';

        this.calculateTimes();
    }

    calculateTimes() {
        const startTimeInput = document.getElementById('actualStartTime');
        const endTimeInput = document.getElementById('actualEndTime');
        
        if (!startTimeInput.value || !endTimeInput.value) {
            document.getElementById('operatingTime').value = '';
            document.getElementById('netRunTime').value = '';
            return;
        }

        const startTime = new Date(startTimeInput.value);
        const endTime = new Date(endTimeInput.value);
        
        if (endTime <= startTime) {
            document.getElementById('operatingTime').value = 'เวลาไม่ถูกต้อง';
            return;
        }

        // Calculate total working time
        const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));
        
        // Calculate break time
        let breakMinutes = 0;
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            breakMinutes += breakTimes[checkbox.value] || 0;
        });

        // Calculate overtime
        let overtimeMinutes = 0;
        if (document.getElementById('overtimeEnable')?.checked) {
            overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
        }

        // Calculate downtime
        const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');

        // Calculate shift available time
        const shiftMinutes = document.getElementById('shiftLength9h')?.checked ? 540 : 480;
        const availableTime = shiftMinutes + overtimeMinutes;
        
        // Calculate planned production time and operating time
        const plannedProductionTime = totalMinutes - breakMinutes;
        const operatingTime = plannedProductionTime - downtimeMinutes; // Run Time = Planned Production Time - Downtime
        
        // Update displays
        document.getElementById('operatingTime').value = `${Math.max(0, operatingTime)} นาที`;
        document.getElementById('netRunTime').value = `${Math.max(0, operatingTime)} นาที`;

        // Show shift available time if relevant
        const shiftDisplay = document.getElementById('shiftAvailableTimeDisplay');
        const shiftText = document.getElementById('shiftAvailableTimeText');
        if (shiftDisplay && shiftText) {
            shiftText.textContent = `${availableTime} นาที`;
            shiftDisplay.style.display = 'block';
        }

        // Show actual duration
        document.getElementById('actualDurationText').textContent = `${totalMinutes} นาที`;
        document.getElementById('actualDurationDisplay').style.display = 'block';

        // Update planned production time
        this.updatePlannedProductionTime();

        this.calculateOEE();
    }

    calculatePerformance() {
        const idealRate = parseFloat(document.getElementById('idealRunRate')?.value || '0');
        const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
        const netRunTimeText = document.getElementById('netRunTime')?.value || '';
        
        const netRunTimeMatch = netRunTimeText.match(/(\d+)/);
        const netRunTimeMinutes = netRunTimeMatch ? parseInt(netRunTimeMatch[1]) : 0;

        if (netRunTimeMinutes > 0 && totalPieces > 0) {
            const actualRate = totalPieces / netRunTimeMinutes;
            document.getElementById('actualRunRate').value = `${actualRate.toFixed(2)} ชิ้น/นาที`;
        } else {
            document.getElementById('actualRunRate').value = '';
        }

        this.calculateQuality();
    }

    calculateQuality() {
        const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
        const rejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
        
        const goodPieces = Math.max(0, totalPieces - rejectPieces);
        document.getElementById('goodPieces').value = goodPieces;

        this.calculateOEE();
    }

    calculateOEE() {
        try {
            // Get values
            const startTimeInput = document.getElementById('actualStartTime')?.value;
            const endTimeInput = document.getElementById('actualEndTime')?.value;
            const idealRate = parseFloat(document.getElementById('idealRunRate')?.value || '0');
            const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const rejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
            const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');

            if (!startTimeInput || !endTimeInput || idealRate <= 0 || totalPieces <= 0) {
                this.resetOEEDisplay();
                return;
            }

            // Calculate times
            const startTime = new Date(startTimeInput);
            const endTime = new Date(endTimeInput);
            const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));

            // Calculate break time
            let breakMinutes = 0;
            document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
                const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
                breakMinutes += breakTimes[checkbox.value] || 0;
            });

            // Calculate overtime
            let overtimeMinutes = 0;
            if (document.getElementById('overtimeEnable')?.checked) {
                overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
            }

            // Calculate shift time (planned production time)
            // ใช้เฉพาะเวลาจริงที่ผู้ใช้กรอก ไม่เกี่ยวข้องกับ Shift Length
            const plannedProductionTime = totalMinutes - breakMinutes;
            
            // Calculate operating time (Run Time = Planned Production Time - Downtime)
            const operatingTime = plannedProductionTime - downtimeMinutes;

            // Calculate OEE components with correct formulas
            // Availability = Operating Time / Planned Production Time
            const availability = plannedProductionTime > 0 ? (operatingTime / plannedProductionTime) * 100 : 0;
            
            // Performance = (Total Pieces / Operating Time) / Ideal Run Rate * 100
            // Or Performance = Total Pieces / (Operating Time * Ideal Run Rate) * 100
            const idealPieces = operatingTime * idealRate;
            const performance = idealPieces > 0 ? (totalPieces / idealPieces) * 100 : 0;
            
            // Quality = Good Pieces / Total Pieces * 100
            const goodPieces = totalPieces - rejectPieces;
            const quality = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0;

            // Calculate total OEE = (Availability × Performance × Quality) / 1,000,000
            const oeeTotal = (availability * performance * quality);

            // Update display
            this.updateOEEDisplay(availability, performance, quality, oeeTotal);

        } catch (error) {
            console.error('OEE calculation error:', error);
            this.resetOEEDisplay();
        }
    }

    updateOEEDisplay(availability, performance, quality, oeeTotal) {
        const formatPercent = (value) => `${Math.round(Math.max(0, Math.min(100, value)))}%`;
        
        document.getElementById('oeeAvailability').textContent = formatPercent(availability);
        document.getElementById('oeePerformance').textContent = formatPercent(performance);
        document.getElementById('oeeQuality').textContent = formatPercent(quality);
        document.getElementById('oeeTotal').textContent = formatPercent(oeeTotal);

        // Update badge colors based on values
        this.updateBadgeColor('oeeAvailability', availability);
        this.updateBadgeColor('oeePerformance', performance);
        this.updateBadgeColor('oeeQuality', quality);
        this.updateBadgeColor('oeeTotal', oeeTotal);
    }

    updateBadgeColor(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.className = element.className.replace(/bg-\w+/g, '');
        
        if (value >= 85) {
            element.classList.add('bg-success');
        } else if (value >= 70) {
            element.classList.add('bg-warning');
        } else if (value >= 40) {
            element.classList.add('bg-orange');
        } else {
            element.classList.add('bg-danger');
        }
    }

    resetOEEDisplay() {
        ['oeeAvailability', 'oeePerformance', 'oeeQuality', 'oeeTotal'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '-';
                element.className = element.className.replace(/bg-\w+/g, '') + ' bg-secondary';
            }
        });
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (this.isLoading) return;

        try {
            // Validate form
            if (!this.validateForm()) {
                return;
            }

            this.isLoading = true;
            this.showLoading(true);

            // Collect form data
            const formData = this.collectFormData();
            console.log('Submitting OEE data:', formData);

            // Submit to backend
            const response = await fetch('tasks.php?action=confirm_complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'การบันทึกข้อมูลล้มเหลว');
            }

            // Show success message
            this.showToast('บันทึกข้อมูล OEE สำเร็จ!', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Form submission error:', error);
            this.showToast('เกิดข้อผิดพลาด: ' + error.message, 'danger');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    validateForm() {
        const form = document.getElementById('emergencyStopForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            this.showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
            return false;
        }

        // Additional validation
        const startTime = new Date(document.getElementById('actualStartTime').value);
        const endTime = new Date(document.getElementById('actualEndTime').value);
        
        if (endTime <= startTime) {
            this.showToast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น', 'warning');
            return false;
        }

        const totalPieces = parseInt(document.getElementById('totalPieces').value || '0');
        const rejectPieces = parseInt(document.getElementById('rejectPieces').value || '0');
        
        if (rejectPieces > totalPieces) {
            this.showToast('จำนวนของเสียไม่สามารถมากกว่าจำนวนผลิตรวมได้', 'warning');
            return false;
        }

        return true;
    }

    collectFormData() {
        // Calculate OEE values
        const startTime = new Date(document.getElementById('actualStartTime').value);
        const endTime = new Date(document.getElementById('actualEndTime').value);
        const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));

        // Break time calculation
        let breakMinutes = 0;
        const breakTypes = [];
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            breakMinutes += breakTimes[checkbox.value] || 0;
            breakTypes.push(checkbox.value);
        });

        // Calculate overtime
        let overtimeMinutes = 0;
        if (document.getElementById('overtimeEnable')?.checked) {
            overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
        }

        const downtimeMinutes = parseInt(document.getElementById('downtime').value || '0');
        
        // Calculate shift time and operating time correctly
        // ใช้เฉพาะเวลาจริงที่ผู้ใช้กรอก ไม่เกี่ยวข้องกับ Shift Length
        const plannedProductionTime = totalMinutes - breakMinutes;
        const operatingTime = plannedProductionTime - downtimeMinutes;

        // Performance calculation
        const idealRate = parseFloat(document.getElementById('idealRunRate').value || '0');
        const totalPieces = parseInt(document.getElementById('totalPieces').value || '0');
        const rejectPieces = parseInt(document.getElementById('rejectPieces').value || '0');
        const goodPieces = totalPieces - rejectPieces;

        // OEE calculation with correct formulas
        const availability = plannedProductionTime > 0 ? (operatingTime / plannedProductionTime) * 100 : 0;
        const idealPieces = operatingTime * idealRate;
        const performance = idealPieces > 0 ? (totalPieces / idealPieces) * 100 : 0;
        const quality = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0;
        const oeeTotal = (availability * performance * quality) / 1000000;

        return {
            JobID: this.taskId,
            ActualStartTime: this.formatDateTimeSQL(startTime),
            ActualEndTime: this.formatDateTimeSQL(endTime),
            PlannedProductionTime: plannedProductionTime,
            OperatingTime: operatingTime,
            BreakTime: breakMinutes,
            BreakTypes: breakTypes.join(','),
            DownTime: downtimeMinutes,
            DownTimeDetail: document.getElementById('downtimeDetail').value || '',
            IdealRunRate: idealRate,
            TotalPieces: totalPieces,
            RejectPieces: rejectPieces,
            GoodPieces: goodPieces,
            Availability: Math.round(availability * 100) / 100,
            Performance: Math.round(performance * 100) / 100,
            Quality: Math.round(quality * 100) / 100,
            OEE: Math.round(oeeTotal * 100) / 100,
            ShiftLength9h: document.getElementById('shiftLength9h').checked,
            OvertimeEnable: document.getElementById('overtimeEnable').checked,
            OvertimeMinutes: parseInt(document.getElementById('overtime').value || '0')
        };
    }

    // Utility functions
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    formatDateTimeSQL(date) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        const form = document.getElementById('emergencyStopForm');
        
        if (loadingSection) {
            loadingSection.style.display = show ? 'block' : 'none';
        }
        
        if (form) {
            form.style.display = show ? 'none' : 'block';
        }

        // Disable form controls when loading
        const submitBtn = document.getElementById('confirmCompleteBtn');
        if (submitBtn) {
            submitBtn.disabled = show;
            if (show) {
                submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>กำลังบันทึก...';
            } else {
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>บันทึก';
            }
        }
    }

    showForm() {
        document.getElementById('emergencyStopForm').style.display = 'block';
    }

    showError(message) {
        const loadingSection = document.getElementById('loadingSection');
        if (loadingSection) {
            loadingSection.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle text-danger fs-1 mb-3"></i>
                    <h5 class="text-danger mb-3">เกิดข้อผิดพลาด</h5>
                    <p class="text-muted mb-4">${message}</p>
                    <a href="index.html" class="btn btn-primary">
                        <i class="bi bi-arrow-left me-2"></i>กลับหน้าหลัก
                    </a>
                </div>
            `;
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('mainToast');
        const toastBody = document.getElementById('mainToastBody');
        
        if (toast && toastBody) {
            toast.className = `toast align-items-center text-bg-${type} border-0`;
            toastBody.textContent = message;
            
            const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
            bsToast.show();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ConfirmCompleteManager();
    manager.init();
});
