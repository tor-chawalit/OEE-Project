# Confirm Complete System Integration Guide

## ภาพรวมระบบ

ระบบ Confirm Complete ได้รับการปรับปรุงให้สามารถทำงานร่วมกับ Backend และฐานข้อมูลโครงสร้างใหม่ได้อย่างสมบูรณ์

## โครงสร้างไฟล์ใหม่

```
confirm-complete.html     - หน้าเว็บสำหรับยืนยันจบงาน
confirm-complete.js       - JavaScript ใหม่ที่เชื่อมต่อกับ Backend
tasks.php                 - เพิ่ม endpoints ใหม่สำหรับ OEE
database/
  add_production_logs.sql - Script สร้างตาราง JobProductionLogs
```

## ฐานข้อมูลใหม่

### ตาราง JobProductionLogs
เก็บข้อมูล OEE และรายละเอียดการผลิต:

- `LogID` - Primary key
- `JobID` - Foreign key เชื่อมกับตาราง Jobs
- `ActualStartTime/ActualEndTime` - เวลาทำงานจริง
- `PlannedProductionTime/OperatingTime` - เวลาการผลิต (นาที)
- `BreakTime/DownTime` - เวลาพักและเวลาหยุด
- `IdealRunRate/TotalPieces/RejectPieces/GoodPieces` - ข้อมูลการผลิต
- `OEE_Availability/OEE_Performance/OEE_Quality/OEE_Total` - ค่า OEE

### View vw_JobsWithOEE
ดึงข้อมูลงานพร้อม OEE ในรูปแบบที่พร้อมใช้งาน

## API Endpoints ใหม่

### GET /tasks.php?action=get_task_detail&id={jobId}
ดึงข้อมูลงานสำหรับหน้า confirm-complete

**Response:**
```json
{
  "success": true,
  "data": {
    "JobID": 1,
    "JobName": "งานทดสอบ",
    "Status": "completed",
    "ActualOutput": 500,
    "StartTime": "2025-07-23T08:00:00",
    "EndTime": "2025-07-23T17:00:00",
    "MachineName": "เครื่องสกรีน",
    "DepartmentName": "สกรีน"
  }
}
```

### POST /tasks.php?action=confirm_complete
บันทึกข้อมูล OEE และยืนยันจบงาน

**Request Body:**
```json
{
  "JobID": 1,
  "ActualStartTime": "2025-07-23 08:00:00",
  "ActualEndTime": "2025-07-23 17:00:00",
  "PlannedProductionTime": 480,
  "OperatingTime": 420,
  "BreakTime": 60,
  "BreakTypes": "morning,lunch",
  "DownTime": 30,
  "DownTimeDetail": "ซ่อมเครื่อง",
  "IdealRunRate": 10.5,
  "TotalPieces": 500,
  "RejectPieces": 5,
  "GoodPieces": 495,
  "Availability": 87.5,
  "Performance": 95.2,
  "Quality": 99.0,
  "OEE": 82.5,
  "ShiftLength9h": true,
  "OvertimeEnable": false,
  "OvertimeMinutes": 0
}
```

## คุณสมบัติใหม่

### 1. การโหลดข้อมูลอัตโนมัติ
- ดึงข้อมูลงานจาก URL parameter (`?id=123`)
- ตรวจสอบสถานะงานต้องเป็น 'completed'
- แสดงข้อมูลเบื้องต้นจากฐานข้อมูล

### 2. การคำนวณ OEE แบบเรียลไทม์
- **Availability** = (Operating Time / Planned Production Time) × 100
- **Performance** = (Total Pieces / Ideal Pieces) × 100
- **Quality** = (Good Pieces / Total Pieces) × 100
- **OEE** = (Availability × Performance × Quality) / 10000

### 3. การจัดการ Break Time และ Overtime
- Break Time: เช้า (15 นาที), เที่ยง (60 นาที), เย็น (15 นาที)
- Shift Length: 8 ชั่วโมง หรือ 9 ชั่วโมง
- Overtime: เพิ่มเวลาทำงานเพิ่มเติม

### 4. การแสดงผลแบบไดนามิก
- สี badge เปลี่ยนตาม OEE value:
  - เขียว (≥85%): ดีเยี่ยม
  - เหลือง (70-84%): ดี
  - ส้ม (40-69%): พอใช้
  - แดง (<40%): ต้องปรับปรุง

### 5. การ Validation ข้อมูล
- ตรวจสอบเวลาเริ่ม-สิ้นสุด
- ตรวจสอบจำนวนของเสียไม่เกินของรวม
- ตรวจสอบข้อมูลจำเป็นครบถ้วน

## วิธีการติดตั้ง

### 1. อัปเดตฐานข้อมูล
```sql
-- รันไฟล์ database/add_production_logs.sql
```

### 2. อัปเดตไฟล์
- ใช้ `confirm-complete.js` แทน `confirm.js`
- ตรวจสอบว่า `tasks.php` มี endpoints ใหม่
- ตรวจสอบ `confirm-complete.html` โหลด navigation component

### 3. ทดสอบระบบ
1. สร้างงานใหม่และเปลี่ยนสถานะเป็น 'completed'
2. เข้าหน้า `confirm-complete.html?id={jobId}`
3. กรอกข้อมูล OEE และบันทึก
4. ตรวจสอบข้อมูลในตาราง JobProductionLogs

## การใช้งาน

### 1. Navigation
- ระบบใช้ Navigation Component ที่มีการจัดการ session
- ตรวจสอบสิทธิ์การเข้าถึงอัตโนมัติ

### 2. กระบวนการ Confirm Complete
1. **เลือกงาน**: จากหน้า index กดปุ่ม "Confirm Product" ในงานที่สถานะ 'completed'
2. **ตั้งค่ากะและโอที**: เลือก shift length และ overtime
3. **กรอก Availability**: เวลาเริ่ม-สิ้นสุดจริง, break time, downtime
4. **กรอก Performance**: ideal run rate, total pieces
5. **กรอก Quality**: reject pieces
6. **ตรวจสอบ OEE**: ระบบคำนวณอัตโนมัติ
7. **บันทึก**: ข้อมูลจะถูกบันทึกในฐานข้อมูลและสถานะงานเปลี่ยนเป็น 'confirmed'

### 3. การแสดงผล
- แสดงผล OEE เป็นเปาเซ็นต์พร้อมสีที่บ่งบอกประสิทธิภาพ
- แสดงรายละเอียดการคำนวณแต่ละส่วน
- Toast notification เมื่อบันทึกสำเร็จ

## การแก้ไขปัญหา

### 1. ไม่สามารถโหลดข้อมูลงาน
- ตรวจสอบ Job ID ใน URL
- ตรวจสอบสถานะงานต้องเป็น 'completed'
- ตรวจสอบการเชื่อมต่อฐานข้อมูล

### 2. การคำนวณ OEE ไม่ถูกต้อง
- ตรวจสอบข้อมูล input ทั้งหมด
- ตรวจสอบเวลาเริ่ม-สิ้นสุด
- ตรวจสอบค่า ideal run rate

### 3. ไม่สามารถบันทึกข้อมูล
- ตรวจสอบการ validation ของฟอร์ม
- ตรวจสอบ JavaScript console สำหรับ error
- ตรวจสอบ PHP error log

## การขยายระบบ

### 1. เพิ่มรายงาน OEE
- สร้างหน้ารายงานที่ใช้ view vw_JobsWithOEE
- เพิ่มกราฟแสดงแนวโน้ม OEE

### 2. เพิ่มการแจ้งเตือน
- แจ้งเตือนเมื่อ OEE ต่ำกว่าเกณฑ์
- ส่ง email รายงานประจำวัน

### 3. เพิ่มการวิเคราะห์
- วิเคราะห์สาเหตุ downtime
- เปรียบเทียบประสิทธิภาพระหว่างเครื่องจักร

## การบำรุงรักษา

### 1. การสำรองข้อมูล
- สำรองตาราง JobProductionLogs เป็นประจำ
- เก็บ log การเปลี่ยนแปลงข้อมูล OEE

### 2. การตรวจสอบประสิทธิภาพ
- ตรวจสอบ index ในฐานข้อมูล
- ติดตาม query performance

### 3. การอัปเดต
- ตรวจสอบความเข้ากันได้ของ browser
- อัปเดต Bootstrap และ JavaScript libraries
