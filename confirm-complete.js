// confirm-complete.js - Enhanced with Backend Integration
// =====================================================

/**
 * คลาสหลักสำหรับจัดการหน้ายืนยันจบงาน
 * รับผิดชอบการโหลดข้อมูล คำนวณ OEE และส่งข้อมูลไปยัง backend
 */
class ConfirmCompleteManager {
    constructor() {
        this.taskData = null;      // ข้อมูลงานที่โหลดจากฐานข้อมูล
        this.taskId = null;        // ID ของงานที่ต้องการยืนยัน
        this.isLoading = false;    // สถานะการโหลดข้อมูล
    }

    /**
     * ฟังก์ชันเริ่มต้นของระบบ
     * - ดึง task ID จาก URL parameter
     * - โหลดข้อมูลงาน
     * - ตั้งค่า event listeners
     * - เริ่มการคำนวณเบื้องต้น
     */
    async init() {
        try {
            // ดึง task ID จาก URL parameter (?id=123)
            const urlParams = new URLSearchParams(window.location.search);
            this.taskId = urlParams.get('id');
            
            // ตรวจสอบว่ามี ID หรือไม่
            if (!this.taskId) {
                this.showError('ไม่พบ ID งานที่ต้องการยืนยัน');
                return;
            }

            console.log('Loading task data for ID:', this.taskId);
            
            // โหลดข้อมูลงาน ตั้งค่า listeners และเริ่มคำนวณ
            await this.loadTaskData();
            this.setupEventListeners();
            this.initializeCalculations();
            
        } catch (error) {
            console.error('Init error:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
        }
    }

    /**
     * ฟังก์ชันโหลดข้อมูลงานจาก backend
     * - ส่ง request ไปยัง tasks.php?action=get_task_detail
     * - ตรวจสอบ response และ error handling
     * - เก็บข้อมูลไว้ใน this.taskData
     * - เรียกฟังก์ชันแสดงผลข้อมูล
     */
    async loadTaskData() {
        try {
            // แสดง loading spinner
            this.showLoading(true);
            
            // ส่ง request ไปยัง backend เพื่อดึงข้อมูลงาน
            const response = await fetch(`tasks.php?action=get_task_detail&id=${this.taskId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // แปลง response เป็น JSON และตรวจสอบผลลัพธ์
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลงานได้');
            }

            // เก็บข้อมูลงานและแสดงใน console สำหรับ debug
            this.taskData = result.data;
            console.log('Task data loaded:', this.taskData);
            
            // ตรวจสอบสถานะงาน (ปิดไว้ชั่วคราวเพื่อทดสอบ)
            // if (this.taskData.Status !== 'completed') {
            //     throw new Error('งานนี้ยังไม่ได้ทำเสร็จ ไม่สามารถยืนยันได้');
            // }

            // แสดงข้อมูลในฟอร์มและแสดงฟอร์ม
            this.populateTaskData();
            this.showForm();
            
        } catch (error) {
            console.error('Load task data error:', error);
            this.showError('ไม่สามารถโหลดข้อมูลงานได้: ' + error.message);
        } finally {
            // ซ่อน loading spinner เสมอ
            this.showLoading(false);
        }
    }

    /**
     * ฟังก์ชันแสดงข้อมูลงานในฟอร์ม
     * - นำข้อมูลจาก this.taskData มาแสดงในฟิลด์ต่างๆ
     * - ตั้งค่าเวลาเริ่มต้นและสิ้นสุดจากข้อมูลงาน
     * - ตั้งค่าจำนวนผลิตจาก ActualOutput
     */
    populateTaskData() {
        if (!this.taskData) return;

        // ตั้งค่าเวลาเริ่มต้นจากข้อมูลงาน (StartTime)
        if (this.taskData.StartTime) {
            const startTime = new Date(this.taskData.StartTime);
            document.getElementById('actualStartTime').value = this.formatDateTimeLocal(startTime);
        }

        // ตั้งค่าเวลาสิ้นสุดจากข้อมูลงาน (EndTime)
        if (this.taskData.EndTime) {
            const endTime = new Date(this.taskData.EndTime);
            document.getElementById('actualEndTime').value = this.formatDateTimeLocal(endTime);
        }

        // ตั้งค่าจำนวนผลิตรวมจาก ActualOutput
        if (this.taskData.ActualOutput) {
            document.getElementById('totalPieces').value = this.taskData.ActualOutput;
        }

        // ตั้งค่า ideal run rate จากข้อมูลเครื่องจักร (ถ้ามี)
        // if (this.taskData.DefaultIdealRunRate) {
        //     document.getElementById('idealRunRate').value = this.taskData.DefaultIdealRunRate;
        // }

        // คำนวณเวลาผลิตตามแผนใหม่
        this.updatePlannedProductionTime();
    }

    /**
     * ฟังก์ชันคำนวณและแสดงเวลาผลิตตามแผน (Planned Production Time)
     * - คำนวณจากเวลาเริ่มต้นถึงเวลาสิ้นสุด
     * - หักเวลาพักที่เลือกไว้
     * - แสดงผลลัพธ์ในฟิลด์ plannedProductionTime
     */
    updatePlannedProductionTime() {
        // อ่านค่าเวลาจากฟิลด์ input
        const startTimeInput = document.getElementById('actualStartTime')?.value;
        const endTimeInput = document.getElementById('actualEndTime')?.value;
        
        // ตรวจสอบว่ามีข้อมูลเวลาหรือไม่
        if (!startTimeInput || !endTimeInput) {
            document.getElementById('plannedProductionTime').value = 'ไม่ระบุ';
            return;
        }

        // แปลงเป็น Date object และตรวจสอบความถูกต้อง
        const startTime = new Date(startTimeInput);
        const endTime = new Date(endTimeInput);
        
        if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
            document.getElementById('plannedProductionTime').value = 'เวลาไม่ถูกต้อง';
            return;
        }
        
        // คำนวณระยะเวลารวม (นาที)
        const diffMs = endTime - startTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        // คำนวณเวลาพักรวม
        let breakMinutes = 0;
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            breakMinutes += breakTimes[checkbox.value] || 0;
        });
        
        // เวลาผลิตตามแผน = เวลารวม - เวลาพัก
        const plannedProductionTime = diffMinutes - breakMinutes;
        
        // แสดงผลลัพธ์ (ป้องกันค่าติดลบ)
        document.getElementById('plannedProductionTime').value = `${Math.max(0, plannedProductionTime)} นาที`;
    }

    /**
     * ฟังก์ชันตั้งค่า Event Listeners สำหรับฟอร์มและ input ต่างๆ
     * - Form submission
     * - การเปลี่ยนแปลงเวลา
     * - การเลือกเวลาพัก
     * - การเปิด/ปิดโอที
     * - การป้อนตัวเลขต่างๆ
     */
    setupEventListeners() {
        // ตั้งค่า listener สำหรับการส่งฟอร์ม
        const form = document.getElementById('emergencyStopForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // ตั้งค่า listener สำหรับการเปลี่ยนแปลงเวลา (จะคำนวณใหม่ทุกครั้ง)
        document.getElementById('actualStartTime')?.addEventListener('change', () => this.calculateTimes());
        document.getElementById('actualEndTime')?.addEventListener('change', () => this.calculateTimes());

        // ตั้งค่า listener สำหรับ checkbox เวลาพัก
        document.querySelectorAll('input[name="breakTime[]"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.calculateBreakTime());
        });

        // ตั้งค่า listener สำหรับ checkbox โอที (เปิด/ปิดฟิลด์ overtime)
        document.getElementById('overtimeEnable')?.addEventListener('change', (e) => {
            const overtimeInput = document.getElementById('overtime');
            if (overtimeInput) {
                overtimeInput.disabled = !e.target.checked;  // เปิด/ปิดฟิลด์ตามการเลือก
                if (!e.target.checked) {
                    overtimeInput.value = '';  // ลบค่าเมื่อปิด
                }
            }
            this.calculateTimes();  // คำนวณใหม่
        });

        // ตั้งค่า listener สำหรับฟิลด์ตัวเลขที่ส่งผลต่อการคำนวณ
        document.getElementById('overtime')?.addEventListener('input', () => this.calculateTimes());
        document.getElementById('downtime')?.addEventListener('input', () => this.calculateTimes());
        document.getElementById('idealRunRate')?.addEventListener('input', () => this.calculatePerformance());
        document.getElementById('totalPieces')?.addEventListener('input', () => this.calculatePerformance());
        document.getElementById('rejectPieces')?.addEventListener('input', () => this.calculateQuality());

        // ตั้งค่า listener สำหรับ checkbox ความยาวกะ (8 ชั่วโมง 08:00-18:00)
        document.getElementById('shiftLength8h')?.addEventListener('change', () => this.calculateTimes());

        // แสดงปุ่มส่งฟอร์มหลังจากโหลดเสร็จ (delay เล็กน้อย)
        setTimeout(() => {
            document.getElementById('confirmFooter').style.display = 'block';
        }, 1000);
    }

    /**
     * ฟังก์ชันเริ่มต้นการคำนวณทั้งหมด
     * เรียกใช้หลังจากโหลดข้อมูลเสร็จเพื่อคำนวณค่าเริ่มต้น
     */
    initializeCalculations() {
        this.calculateBreakTime();     // คำนวณเวลาพัก
        this.calculateTimes();         // คำนวณเวลาต่างๆ
        this.calculatePerformance();   // คำนวณ Performance
        this.calculateQuality();       // คำนวณ Quality
    }

    /**
     * ฟังก์ชันคำนวณเวลาพักรวม
     * - รวมเวลาพักจาก checkbox ที่เลือกไว้
     * - แสดงผลรวมเวลาพัก
     * - เรียกคำนวณเวลาอื่นๆ ใหม่
     */
    calculateBreakTime() {
        let totalBreakMinutes = 0;
        
        // กำหนดเวลาพักแต่ละช่วง (นาที)
        const breakTimes = {
            'morning': 15,   // พักเช้า 15 นาที
            'lunch': 60,     // พักกลางวัน 60 นาที  
            'evening': 15    // พักเย็น 15 นาที
        };

        // นับเวลาพักจาก checkbox ที่ถูกเลือก
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            totalBreakMinutes += breakTimes[checkbox.value] || 0;
        });

        // แสดงผลรวมเวลาพัก
        document.getElementById('breakTotalMinutes').textContent = totalBreakMinutes;
        
        // แสดง/ซ่อน alert ของเวลาพักรวม
        document.getElementById('breakTotalDisplay').style.display = totalBreakMinutes > 0 ? 'block' : 'none';

        // คำนวณเวลาอื่นๆ ใหม่
        this.calculateTimes();
    }

    /**
     * ฟังก์ชันคำนวณเวลาต่างๆ ที่ใช้ในการคำนวณ OEE
     * - เวลาทำงานรวม (Total Minutes)
     * - เวลาพัก (Break Minutes) 
     * - เวลาโอที (Overtime Minutes)
     * - เวลา downtime
     * - เวลาผลิตตามแผน (Planned Production Time)
     * - เวลาเดินเครื่องจริง (Operating Time/Run Time)
     */
    calculateTimes() {
        // อ่านค่าเวลาจากฟิลด์
        const startTimeInput = document.getElementById('actualStartTime');
        const endTimeInput = document.getElementById('actualEndTime');
        
        // ตรวจสอบว่ามีข้อมูลเวลาหรือไม่
        if (!startTimeInput.value || !endTimeInput.value) {
            document.getElementById('operatingTime').value = '';
            document.getElementById('netRunTime').value = '';
            return;
        }

        // แปลงเป็น Date object และตรวจสอบความถูกต้อง
        const startTime = new Date(startTimeInput.value);
        const endTime = new Date(endTimeInput.value);
        
        if (endTime <= startTime) {
            document.getElementById('operatingTime').value = 'เวลาไม่ถูกต้อง';
            return;
        }

        // คำนวณเวลาทำงานรวม (นาที)
        const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));
        
        // คำนวณเวลาพักรวม
        let breakMinutes = 0;
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            breakMinutes += breakTimes[checkbox.value] || 0;
        });

        // คำนวณเวลาโอที
        let overtimeMinutes = 0;
        if (document.getElementById('overtimeEnable')?.checked) {
            overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
        }

        // คำนวณเวลา downtime
        const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');

        // คำนวณเวลาผลิตตามแผนและเวลาเดินเครื่องจริง
        const plannedProductionTime = totalMinutes - breakMinutes;              // เวลาผลิตตามแผน
        const operatingTime = plannedProductionTime - downtimeMinutes;          // เวลาเดินเครื่องจริง (Run Time)
        
        // แสดงผลลัพธ์ในฟิลด์ต่างๆ
        document.getElementById('operatingTime').value = `${Math.max(0, operatingTime)} นาที`;
        document.getElementById('netRunTime').value = `${Math.max(0, operatingTime)} นาที`;

        // แสดงเวลากะที่มี (สำหรับข้อมูล) - กะ 8 ชั่วโมง (08:00-18:00)
        const shiftMinutes = document.getElementById('shiftLength8h')?.checked ? 480 : 0;  // 8 ชั่วโมง (08:00-18:00)
        const availableTime = shiftMinutes + overtimeMinutes;
        
        const shiftDisplay = document.getElementById('shiftAvailableTimeDisplay');
        const shiftText = document.getElementById('shiftAvailableTimeText');
        if (shiftDisplay && shiftText) {
            shiftText.textContent = `${availableTime} นาที`;
            shiftDisplay.style.display = 'block';
        }

        // แสดงระยะเวลาทำงานจริง
        document.getElementById('actualDurationText').textContent = `${totalMinutes} นาที`;
        document.getElementById('actualDurationDisplay').style.display = 'block';

        // อัปเดตเวลาผลิตตามแผน
        this.updatePlannedProductionTime();

        // คำนวณ OEE ใหม่
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

    /**ฃ
     * ฟังก์ชันคำนวณค่า OEE (Overall Equipment Effectiveness)
     * 
     * สูตรการคำนวณ OEE:
     * OEE = Availability × Performance × Quality (หารด้วย 10,000 เพื่อให้เป็นเปอร์เซ็นต์)
     * 
     * โดยที่:
     * - Availability = (Operating Time / Planned Production Time) × 100
     * - Performance = (Actual Rate / Ideal Rate) × 100  
     * - Quality = (Good Pieces / Total Pieces) × 100
     * 
     * คำอธิบายเพิ่มเติม:
     * - Operating Time = Planned Production Time - Downtime
     * - Actual Rate = Total Pieces / Operating Time (ชิ้น/นาที)
     * - Good Pieces = Total Pieces - Reject Pieces
     */
    calculateOEE() {
        try {
            // อ่านค่าจากฟิลด์ต่างๆ
            const startTimeInput = document.getElementById('actualStartTime')?.value;
            const endTimeInput = document.getElementById('actualEndTime')?.value;
            const idealRate = parseFloat(document.getElementById('idealRunRate')?.value || '0');
            const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const rejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
            const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');

            // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ
            if (!startTimeInput || !endTimeInput || idealRate <= 0 || totalPieces <= 0) {
                this.resetOEEDisplay();
                return;
            }

            // คำนวณเวลาต่างๆ
            const startTime = new Date(startTimeInput);
            const endTime = new Date(endTimeInput);
            const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));

            // คำนวณเวลาพักรวม
            let breakMinutes = 0;
            document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
                const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
                breakMinutes += breakTimes[checkbox.value] || 0;
            });

            // คำนวณเวลาโอที
            let overtimeMinutes = 0;
            if (document.getElementById('overtimeEnable')?.checked) {
                overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
            }

            // คำนวณเวลาผลิตตามแผน (ใช้เวลาจริงที่ผู้ใช้กรอก ไม่เกี่ยวข้องกับ Shift Length)
            const plannedProductionTime = totalMinutes - breakMinutes;
            
            // คำนวณเวลาเดินเครื่องจริง (Operating Time = Planned Production Time - Downtime)
            const operatingTime = plannedProductionTime - downtimeMinutes;

            // คำนวณองค์ประกอบของ OEE ด้วยสูตรที่ถูกต้อง
            // Availability = Operating Time / Planned Production Time × 100
            const availability = plannedProductionTime > 0 ? (operatingTime / plannedProductionTime) * 100 : 0;
            
            // Performance = (Total Pieces / Operating Time) / Ideal Rate × 100
            const actualRate = operatingTime > 0 ? (totalPieces / operatingTime) : 0;
            const performance = idealRate > 0 ? (actualRate / idealRate) * 100 : 0;
            
            // Quality = Good Pieces / Total Pieces × 100
            const goodPieces = totalPieces - rejectPieces;
            const quality = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0;

            // คำนวณ OEE รวม = (Availability × Performance × Quality) / 10,000
            const oeeTotal = (availability * performance * quality) / 10000;

            // อัปเดตการแสดงผล
            this.updateOEEDisplay(availability, performance, quality, oeeTotal);

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการคำนวณ OEE:', error);
            this.resetOEEDisplay();
        }
    }

    /**
     * ฟังก์ชันอัปเดตการแสดงผลค่า OEE
     * 
     * @param {number} availability - ค่า Availability (%)
     * @param {number} performance - ค่า Performance (%)
     * @param {number} quality - ค่า Quality (%)
     * @param {number} oeeTotal - ค่า OEE รวม (%)
     */
    updateOEEDisplay(availability, performance, quality, oeeTotal) {
        // ฟังก์ชันจัดรูปแบบเปอร์เซ็นต์ (จำกัดค่าระหว่าง 0-100%)
        const formatPercent = (value) => `${Math.round(Math.max(0, Math.min(100, value)))}%`;
        
        // อัปเดตข้อความแสดงผล
        document.getElementById('oeeAvailability').textContent = formatPercent(availability);
        document.getElementById('oeePerformance').textContent = formatPercent(performance);
        document.getElementById('oeeQuality').textContent = formatPercent(quality);
        document.getElementById('oeeTotal').textContent = formatPercent(oeeTotal);

        // อัปเดตสีของ badge ตามค่าที่ได้
        this.updateBadgeColor('oeeAvailability', availability);
        this.updateBadgeColor('oeePerformance', performance);
        this.updateBadgeColor('oeeQuality', quality);
        this.updateBadgeColor('oeeTotal', oeeTotal);
    }

    /**
     * ฟังก์ชันอัปเดตสีของ badge ตามค่าเปอร์เซ็นต์
     * 
     * @param {string} elementId - ID ของ element ที่ต้องการเปลี่ยนสี
     * @param {number} value - ค่าเปอร์เซ็นต์ที่ใช้ในการกำหนดสี
     * 
     * เกณฑ์การให้สี:
     * - เขียว (success): >= 85%
     * - เหลือง (warning): 70-84%
     * - ส้ม (orange): 40-69%
     * - แดง (danger): < 40%
     */
    updateBadgeColor(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // ลบคลาสสีเก่าออก
        element.className = element.className.replace(/bg-\w+/g, '');
        
        // เพิ่มคลาสสีใหม่ตามค่าที่ได้
        if (value >= 85) {
            element.classList.add('bg-success');      // เขียว - ดีมาก
        } else if (value >= 70) {
            element.classList.add('bg-warning');      // เหลือง - ปานกลาง
        } else if (value >= 40) {
            element.classList.add('bg-orange');       // ส้ม - ต้องปรับปรุง
        } else {
            element.classList.add('bg-danger');       // แดง - ต้องแก้ไขด่วน
        }
    }

    /**
     * ฟังก์ชันรีเซ็ตการแสดงผล OEE เป็นค่าเริ่มต้น
     * - แสดงเครื่องหมาย "-" แทนค่า
     * - เปลี่ยนสีเป็นสีเทา (secondary)
     */
    resetOEEDisplay() {
        ['oeeAvailability', 'oeePerformance', 'oeeQuality', 'oeeTotal'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '-';
                element.className = element.className.replace(/bg-\w+/g, '') + ' bg-secondary';
            }
        });
    }

    /**
     * ฟังก์ชันจัดการการส่งฟอร์ม
     * - ตรวจสอบความถูกต้องของข้อมูล
     * - รวบรวมข้อมูลจากฟอร์ม
     * - ส่งข้อมูลไปยัง API
     * - แสดงผลลัพธ์การส่งข้อมูล
     * 
     * @param {Event} event - event object จากการส่งฟอร์ม
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        
        // ป้องกันการส่งซ้ำขณะกำลังประมวลผล
        if (this.isLoading) return;

        try {
            // ตรวจสอบความถูกต้องของฟอร์ม
            if (!this.validateForm()) {
                return;
            }

            this.isLoading = true;
            this.showLoading(true);

            // รวบรวมข้อมูลจากฟอร์ม
            const formData = this.collectFormData();
            console.log('กำลังส่งข้อมูล OEE:', formData);

            // ส่งข้อมูลไปยัง backend API
            const response = await fetch('tasks.php?action=confirm_complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            // ตรวจสอบสถานะการตอบกลับ
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'การบันทึกข้อมูลล้มเหลว');
            }

            // แสดงข้อความสำเร็จ
            this.showToast('บันทึกข้อมูล OEE สำเร็จ!', 'success');
            
            // เปลี่ยนหน้าหลังจากหน่วงเวลาเล็กน้อย
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการส่งฟอร์ม:', error);
            this.showToast('เกิดข้อผิดพลาด: ' + error.message, 'danger');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * ฟังก์ชันตรวจสอบความถูกต้องของข้อมูลในฟอร์ม
     * 
     * @returns {boolean} true หากข้อมูลถูกต้อง, false หากมีข้อผิดพลาด
     */
    validateForm() {
        const form = document.getElementById('emergencyStopForm');
        
        // ตรวจสอบ HTML5 validation
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            this.showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
            return false;
        }

        // ตรวจสอบเวลาเริ่มต้นและสิ้นสุด
        const startTime = new Date(document.getElementById('actualStartTime').value);
        const endTime = new Date(document.getElementById('actualEndTime').value);
        
        if (endTime <= startTime) {
            this.showToast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น', 'warning');
            return false;
        }

        // ตรวจสอบจำนวนผลิตและของเสีย
        const totalPieces = parseInt(document.getElementById('totalPieces').value || '0');
        const rejectPieces = parseInt(document.getElementById('rejectPieces').value || '0');
        
        if (rejectPieces > totalPieces) {
            this.showToast('จำนวนของเสียไม่สามารถมากกว่าจำนวนผลิตรวมได้', 'warning');
            return false;
        }

        return true;
    }

    /**
     * ฟังก์ชันรวบรวมข้อมูลจากฟอร์มเพื่อส่งไปยัง API
     * 
     * @returns {Object} ข้อมูลฟอร์มที่จัดระเบียบแล้ว
     */
    collectFormData() {
        // คำนวณค่า OEE ก่อนรวบรวมข้อมูล
        const startTime = new Date(document.getElementById('actualStartTime').value);
        const endTime = new Date(document.getElementById('actualEndTime').value);
        const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));

        // Break time calculation - แยกเป็น 3 ช่วง
        let breakMorning = 0;
        let breakLunch = 0;
        let breakEvening = 0;
        
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            if (checkbox.value === 'morning') breakMorning = breakTimes[checkbox.value];
            if (checkbox.value === 'lunch') breakLunch = breakTimes[checkbox.value];
            if (checkbox.value === 'evening') breakEvening = breakTimes[checkbox.value];
        });

        const totalBreakMinutes = breakMorning + breakLunch + breakEvening;

        // Calculate overtime
        let overtimeMinutes = 0;
        if (document.getElementById('overtimeEnable')?.checked) {
            overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
        }

        const downtimeMinutes = parseInt(document.getElementById('downtime').value || '0');
        
        // Calculate shift hours and planned production time - กะ 8 ชั่วโมง (08:00-18:00)
        const shiftHours = document.getElementById('shiftLength8h')?.checked ? 8.0 : 0;  // 8 ชั่วโมง ถ้าเลือก
        const plannedProductionMinutes = totalMinutes - totalBreakMinutes;
        const runTimeMinutes = plannedProductionMinutes - downtimeMinutes;

        // Performance calculation
        const idealRunRateUsed = parseFloat(document.getElementById('idealRunRate').value || '0');
        const totalPieces = parseInt(document.getElementById('totalPieces').value || '0');
        const rejectPieces = parseInt(document.getElementById('rejectPieces').value || '0');
        const goodPieces = totalPieces - rejectPieces;

        // OEE calculation with correct formulas
        const availability = plannedProductionMinutes > 0 ? (runTimeMinutes / plannedProductionMinutes) * 100 : 0;
        
        // Performance = (Total Count / Run Time) / Ideal Run Rate × 100
        const actualRate = runTimeMinutes > 0 ? (totalPieces / runTimeMinutes) : 0;
        const performance = idealRunRateUsed > 0 ? (actualRate / idealRunRateUsed) * 100 : 0;
        
        const quality = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0;
        const oeeTotal = (availability * performance * quality) / 10000;

        return {
            JobID: this.taskId,
            ActualStartTime: this.formatDateTimeSQL(startTime),
            ActualEndTime: this.formatDateTimeSQL(endTime),
            ShiftHours: shiftHours,
            OvertimeMinutes: overtimeMinutes,
            TookBreakMorning: breakMorning,
            TookBreakLunch: breakLunch,
            TookBreakEvening: breakEvening,
            IdealRunRateUsed: idealRunRateUsed,
            TotalPieces: totalPieces,
            RejectPieces: rejectPieces,
            TotalDowntimeMinutes: downtimeMinutes,
            PlannedProductionMinutes: plannedProductionMinutes,
            RunTimeMinutes: runTimeMinutes,
             GoodPieces: goodPieces,
            OEE_Availability: Math.round(availability * 100) / 100,
            OEE_Performance: Math.round(performance * 100) / 100,
            OEE_Quality: Math.round(quality * 100) / 100,
            OEE_Total: Math.round(oeeTotal * 100) / 100,
            ConfirmedByUserID: 1 // ค่าเริ่มต้น - ควรใช้ session หรือ user login
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
    /**
     * ฟังก์ชันสำหรับยืนยันงานที่เสร็จสิ้นแล้ว (เพื่อใช้กับ TaskManager)
     * เมื่อเรียกใช้ฟังก์ชันนี้ งานจะหายไปจากปฏิทิน
     * @param {number} taskId - ID ของงานที่ต้องการยืนยัน
     * @returns {Promise<boolean>} - true หากยืนยันสำเร็จ
     */
    static async confirmTaskCompletion(taskId) {
        try {
            // ส่งข้อมูลไปยัง backend API เพื่อยืนยันงาน
            const response = await fetch('tasks.php?action=confirm_complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    JobID: taskId,
                    // ใช้ข้อมูลเริ่มต้นสำหรับการยืนยันจาก TaskManager - กะ 8 ชั่วโมง (08:00-18:00)
                    ActualStartTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    ActualEndTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    ShiftHours: 8.0,  // 8 ชั่วโมง (08:00-18:00)
                    OvertimeMinutes: 0,
                    TookBreakMorning: 0,
                    TookBreakLunch: 60,
                    TookBreakEvening: 0,
                    IdealRunRateUsed: 0,
                    TotalPieces: 0,
                    RejectPieces: 0,
                    TotalDowntimeMinutes: 0,
                    PlannedProductionMinutes: 0,
                    RunTimeMinutes: 0,
                    GoodPieces: 0,
                    OEE_Availability: 0,
                    OEE_Performance: 0,
                    OEE_Quality: 0,
                    OEE_Total: 0,
                    ConfirmedByUserID: 1
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'การยืนยันงานล้มเหลว');
            }

            console.log(`Task ${taskId} confirmed successfully`);
            return true;

        } catch (error) {
            console.error('Error confirming task:', error);
            return false;
        }
    }
}

/**
 * ฟังก์ชันสำหรับยืนยันงานที่เสร็จสิ้นแล้ว (Global function สำหรับใช้กับ TaskManager)
 * เมื่อเรียกใช้ฟังก์ชันนี้ งานจะหายไปจากปฏิทิน
 * @param {number} taskId - ID ของงานที่ต้องการยืนยัน
 * @returns {Promise<boolean>} - true หากยืนยันสำเร็จ
 */
async function confirmTaskCompletion(taskId) {
    return await ConfirmCompleteManager.confirmTaskCompletion(taskId);
}

/**
 * ฟังก์ชันตั้งค่าปุ่มยืนยันสำหรับใช้ในหน้าอื่น
 * เพื่อความสะดวกในการ integrate กับหน้าอื่นๆ
 */
function setupConfirmButton() {
    // ดึง task ID จาก URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    
    if (!taskId) {
        console.error('No task ID found in URL');
        return;
    }
    
    // หาปุ่มยืนยัน
    const confirmButton = document.getElementById('confirmCompleteBtn');
    
    if (confirmButton) {
        confirmButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // แสดง loading หรือ disable ปุ่ม
            confirmButton.disabled = true;
            confirmButton.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>กำลังยืนยัน...';
            
            try {
                // ยืนยันงาน
                const success = await confirmTaskCompletion(parseInt(taskId));
                
                if (success) {
                    // แสดงข้อความสำเร็จ
                    alert('ยืนยันงานสำเร็จ! งานจะหายไปจากปฏิทิน');
                    
                    // redirect กลับไปหน้าหลัก
                    window.location.href = 'index.html';
                } else {
                    // แสดงข้อความผิดพลาด
                    alert('เกิดข้อผิดพลาดในการยืนยันงาน');
                    
                    // เปิดปุ่มกลับมา
                    confirmButton.disabled = false;
                    confirmButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>ยืนยันเสร็จสิ้น';
                }
            } catch (error) {
                console.error('Confirm error:', error);
                alert('เกิดข้อผิดพลาดในการยืนยันงาน: ' + error.message);
                
                // เปิดปุ่มกลับมา
                confirmButton.disabled = false;
                confirmButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>ยืนยันเสร็จสิ้น';
            }
        });
    }
}

// Export functions for global use
window.confirmTaskCompletion = confirmTaskCompletion;
window.setupConfirmButton = setupConfirmButton;
window.ConfirmCompleteManager = ConfirmCompleteManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ConfirmCompleteManager();
    manager.init();
});
