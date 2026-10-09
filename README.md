# Aircraft Status Squadron 602

หน้าเว็บสถานภาพอากาศยานฝูงบิน 602 ข้อมูลที่กรอกจะบันทึกลง Google Sheet ผ่าน Google Apps Script

```
index.html               หน้าเว็บ (เปิดผ่าน GitHub Pages)
config.js                ใส่ URL ของ Apps Script Web App
apps-script/Code.gs      โค้ดฝั่ง Google Sheet (รับ-ส่งข้อมูล)
apps-script/appsscript.json  ไฟล์ตั้งค่าของ Apps Script
```

## การทำงาน

- เปิดหน้าเว็บ: ดึงข้อมูลล่าสุดจาก Google Sheet
- กด SAVE: เขียนข้อมูลทั้งตารางลง Sheet
- กด CANCEL: ย้อนกลับไปข้อมูลที่ SAVE ล่าสุด (ไม่ได้ติดต่อ Sheet)
- กด "โหลดข้อมูลล่าสุด": ดึงข้อมูลจาก Sheet ใหม่ ใช้เมื่อมีคนอื่นบันทึกไปแล้ว
- ถ้า Sheet ยังว่าง หน้าเว็บจะแสดงข้อมูลตั้งต้นจากไฟล์ AC STATUS 261002 1031Z กด SAVE ครั้งแรกเพื่อบันทึกลง Sheet

ใน Google Sheet จะมี 2 แท็บที่สร้างขึ้นเองตอน SAVE ครั้งแรก:

| แท็บ | เนื้อหา |
|---|---|
| STATUS | ตารางปัจจุบัน 1 แถวต่อ 1 รายการข้อขัดข้อง เขียนทับทุกครั้งที่ SAVE |
| HISTORY | ประวัติการบันทึก 1 แถวต่อการ SAVE 1 ครั้ง เก็บทั้งตารางเป็น JSON (500 ครั้งล่าสุด) |

แท็บอื่นในไฟล์ (เช่น Sheet1) จะไม่ถูกแตะ

ถ้าแก้ข้อมูลในแท็บ STATUS โดยตรง หน้าเว็บจะเห็นค่าที่แก้เมื่อโหลดใหม่ แต่ต้องคงรูปแบบเดิมไว้ คือแถวของเครื่องเดียวกันอยู่ติดกัน และวันที่เป็นวันที่หรือข้อความ dd/mm/yyyy

ถ้ามีคน 2 คนแก้พร้อมกัน คนที่กด SAVE ทีหลังจะได้ข้อความแจ้งว่ามีข้อมูลใหม่กว่า และต้องกด "โหลดข้อมูลล่าสุด" ก่อน ระบบจะไม่เขียนทับข้อมูลของอีกคน

---

## ขั้นตอนติดตั้ง

### 1. ติดตั้ง Apps Script ใน Google Sheet

1. เปิด Google Sheet ที่จะเก็บข้อมูล
2. เมนู **Extensions > Apps Script**
3. ลบโค้ดเดิมในไฟล์ `Code.gs` แล้ววางโค้ดจาก `apps-script/Code.gs` ทั้งไฟล์
4. ตั้งค่าไฟล์ `appsscript.json`
   - กดรูปเฟือง **Project Settings** แล้วติ๊ก **Show "appsscript.json" manifest file in editor**
   - กลับไปหน้า Editor เปิด `appsscript.json` แล้ววางเนื้อหาจาก `apps-script/appsscript.json`
5. กด **Save** (รูปแผ่นดิสก์)

ถ้าจะใช้ Google Sheet ไฟล์อื่น ให้แก้ `SHEET_ID` บรรทัดบนสุดของ `Code.gs` เป็น ID ของไฟล์นั้น (ส่วนที่อยู่ระหว่าง `/d/` กับ `/edit` ใน URL)

### 2. ตั้งรหัสเข้าใช้งาน

1. ใน Apps Script กด **Project Settings**
2. เลื่อนลงไปที่ **Script Properties** แล้วกด **Add script property**
3. Property: `ACCESS_KEY` Value: รหัสที่ต้องการ (เช่น รหัสที่แจ้งเฉพาะคนในฝูง)
4. กด **Save script properties**

หน้าเว็บจะถามรหัสนี้ครั้งแรกที่เปิด แล้วจำไว้ในเบราว์เซอร์เครื่องนั้น

### 3. Deploy เป็น Web App

1. กด **Deploy > New deployment**
2. กดรูปเฟืองข้าง Select type แล้วเลือก **Web app**
3. ตั้งค่า
   - Execute as: **Me**
   - Who has access: **Anyone**
4. กด **Deploy** แล้วกดอนุญาตสิทธิ์ (Authorize access) ด้วยบัญชี Google ที่เป็นเจ้าของ Sheet
   - ถ้าขึ้นหน้า "Google hasn't verified this app" ให้กด **Advanced > Go to ... (unsafe)** เพราะเป็นสคริปต์ของคุณเอง
5. คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

### 4. ใส่ URL ใน config.js

เปิด `config.js` แล้วแทนที่ `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE` ด้วย URL ที่คัดลอกมา

```js
window.AC_STATUS_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycb.../exec'
};
```

### 5. ขึ้น GitHub Pages

1. Push ไฟล์ทั้งหมดขึ้น repository `rtaf602/temporary-ac-status` ที่ branch `main`
2. ไปที่ **Settings > Pages**
3. Source: **Deploy from a branch** · Branch: **main** · Folder: **/ (root)** แล้วกด Save
4. รอประมาณ 1-2 นาที หน้าเว็บจะอยู่ที่ `https://rtaf602.github.io/temporary-ac-status/`

### 6. ทดสอบ

1. เปิดหน้าเว็บ ใส่รหัสเข้าใช้งาน
2. ตรวจว่าตารางขึ้นข้อมูล แล้วกด SAVE
3. เปิด Google Sheet ตรวจว่ามีแท็บ STATUS และ HISTORY ขึ้นมา

---

## เมื่อแก้โค้ด Apps Script ภายหลัง

ต้อง Deploy ใหม่ทุกครั้งที่แก้ `Code.gs` ไม่อย่างนั้นหน้าเว็บจะยังใช้โค้ดเก่า

**Deploy > Manage deployments >** กดรูปดินสอที่ deployment เดิม **> Version: New version > Deploy**

วิธีนี้ URL จะคงเดิม ไม่ต้องแก้ `config.js` (ถ้ากด New deployment จะได้ URL ใหม่)

## ความปลอดภัย

- ถ้า repository เป็น Public หน้าเว็บบน GitHub Pages จะเปิดได้ทุกคนที่มีลิงก์ และ URL ใน `config.js` ก็มองเห็นได้
- ข้อมูลใน Sheet ป้องกันด้วย `ACCESS_KEY` เท่านั้น ผู้ที่ไม่มีรหัสจะอ่านและบันทึกไม่ได้ ควรตั้งรหัสที่เดายาก และเปลี่ยนรหัสใน Script Properties เมื่อมีคนย้ายออก
- นี่เป็นการป้องกันขั้นพื้นฐาน ไม่ใช่ระบบยืนยันตัวตนรายบุคคล ไม่ควรใช้กับข้อมูลชั้นความลับ
- อย่าแชร์ Google Sheet แบบ "Anyone with the link" เพราะจะข้ามรหัสเข้าใช้งานไปได้
