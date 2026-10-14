import fs from 'node:fs';
import path from 'node:path';

const CHROME_DIR = new URL('../chrome/', import.meta.url).pathname;
const enPath = path.join(CHROME_DIR, '_locales/en/messages.json');
const zhPath = path.join(CHROME_DIR, '_locales/zh_CN/messages.json');
const thPath = path.join(CHROME_DIR, '_locales/th/messages.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

// New keys for Backup / Google Drive & Language
const newKeysEn = {
    "backupRestoreTitle": { "message": "Backup & Restore (Google Drive)" },
    "googleDriveBackup": { "message": "Backup to Google Drive" },
    "googleDriveRestore": { "message": "Restore from Google Drive" },
    "googleDriveSync": { "message": "Google Drive Cloud Backup" },
    "googleDriveConnected": { "message": "Google Drive Connected" },
    "googleDriveNotConnected": { "message": "Not connected to Google Drive" },
    "googleSignIn": { "message": "Sign in with Google" },
    "googleSignOut": { "message": "Sign out of Google" },
    "exportLocalJson": { "message": "Export JSON Backup File" },
    "importLocalJson": { "message": "Import JSON Backup File" },
    "confirmRestore": { "message": "Are you sure you want to restore this backup? Your history records and settings will be merged/restored." },
    "restoreSuccess": { "message": "Backup successfully restored!" },
    "backupSuccess": { "message": "Backup successfully saved to Google Drive!" },
    "backingUp": { "message": "Backing up..." },
    "restoring": { "message": "Restoring..." },
    "backupFileName": { "message": "Backup File Name" },
    "backupDate": { "message": "Backup Date" },
    "backupSize": { "message": "Records Count" },
    "noBackupsFound": { "message": "No backups found on Google Drive." },
    "selectBackupToRestore": { "message": "Select a backup to restore:" },
    "refreshBackups": { "message": "Refresh Backups" },
    "deleteBackup": { "message": "Delete Backup" },
    "confirmDeleteBackup": { "message": "Are you sure you want to delete this backup from Google Drive?" },
    "backupDeleted": { "message": "Backup deleted successfully." },
    "language": { "message": "Language / ภาษา" },
    "thaiLanguage": { "message": "Thai (ภาษาไทย)" },
    "trashRecovery": { "message": "Recycle Bin & Recovery" },
    "trashTitle": { "message": "History Recycle Bin" },
    "trashDesc": { "message": "Temporarily keeps deleted browsing history to prevent accidental data loss. You can restore items at any time." },
    "restoreItem": { "message": "Restore" },
    "restoreAll": { "message": "Restore All" },
    "emptyTrash": { "message": "Empty Recycle Bin" },
    "deletePermanently": { "message": "Delete Permanently" },
    "undo": { "message": "Undo" },
    "deletedMovedToTrash": { "message": "Item(s) moved to Recycle Bin." },
    "trashEmpty": { "message": "Recycle Bin is empty." },
    "confirmRestoreItem": { "message": "Restore this item back to your browsing history?" },
    "confirmRestoreAll": { "message": "Restore all deleted items back to your browsing history?" },
    "confirmEmptyTrash": { "message": "Are you sure you want to permanently delete all items in the Recycle Bin? This action cannot be undone." },
    "deletedAt": { "message": "Deleted Time" },
    "originalVisit": { "message": "Visit Time" },
    "deleteNodePrompt": { "message": "Move this history node to Recycle Bin?" },
    "deleteBranchPrompt": { "message": "This node has sub-branches. Move the entire branch to Recycle Bin?" }
};

const newKeysZh = {
    "backupRestoreTitle": { "message": "备份与恢复 (Google Drive)" },
    "googleDriveBackup": { "message": "备份至 Google Drive" },
    "googleDriveRestore": { "message": "从 Google Drive 恢复" },
    "googleDriveSync": { "message": "Google Drive 云备份" },
    "googleDriveConnected": { "message": "已连接 Google Drive" },
    "googleDriveNotConnected": { "message": "未连接 Google Drive" },
    "googleSignIn": { "message": "使用 Google 登录" },
    "googleSignOut": { "message": "退出 Google 登录" },
    "exportLocalJson": { "message": "导出本地 JSON 备份" },
    "importLocalJson": { "message": "导入本地 JSON 备份" },
    "confirmRestore": { "message": "确定要恢复此备份吗？您的浏览历史和设置将被合并恢复。" },
    "restoreSuccess": { "message": "备份恢复成功！" },
    "backupSuccess": { "message": "已成功备份到 Google Drive！" },
    "backingUp": { "message": "正在备份..." },
    "restoring": { "message": "正在恢复..." },
    "backupFileName": { "message": "备份文件名" },
    "backupDate": { "message": "备份日期" },
    "backupSize": { "message": "记录条数" },
    "noBackupsFound": { "message": "Google Drive 上未找到备份文件。" },
    "selectBackupToRestore": { "message": "选择要恢复的备份：" },
    "refreshBackups": { "message": "刷新备份列表" },
    "deleteBackup": { "message": "删除备份" },
    "confirmDeleteBackup": { "message": "确定要从 Google Drive 中删除此备份吗？" },
    "backupDeleted": { "message": "备份已成功删除。" },
    "language": { "message": "语言 / ภาษา" },
    "thaiLanguage": { "message": "泰语 (ภาษาไทย)" },
    "trashRecovery": { "message": "回收站与删除恢复" },
    "trashTitle": { "message": "历史记录回收站" },
    "trashDesc": { "message": "临时存储已删除的浏览历史，防止意外丢失。您可以随时恢复或彻底删除。" },
    "restoreItem": { "message": "恢复" },
    "restoreAll": { "message": "全部恢复" },
    "emptyTrash": { "message": "清空回收站" },
    "deletePermanently": { "message": "永久删除" },
    "undo": { "message": "撤销" },
    "deletedMovedToTrash": { "message": "已将选定项移至回收站。" },
    "trashEmpty": { "message": "回收站为空，暂无已删除的记录。" },
    "confirmRestoreItem": { "message": "确定将此记录恢复到您的浏览历史中吗？" },
    "confirmRestoreAll": { "message": "确定要将所有已删除记录恢复到浏览历史中吗？" },
    "confirmEmptyTrash": { "message": "确定要永久清空回收站中的所有项目吗？此操作无法撤销。" },
    "deletedAt": { "message": "删除时间" },
    "originalVisit": { "message": "原始访问时间" },
    "deleteNodePrompt": { "message": "将此历史节点移入回收站？" },
    "deleteBranchPrompt": { "message": "此节点包含子分支，是否将整条分支移入回收站？" }
};

for (const [k, v] of Object.entries(newKeysEn)) {
    en[k] = v;
}
for (const [k, v] of Object.entries(newKeysZh)) {
    zh[k] = v;
}

// Complete Thai translation dictionary
const thMessages = {
    "recentHistory": { "message": "ประวัติการเข้าชมล่าสุด" },
    "recentlyClosedTabs": { "message": "แท็บที่เพิ่งปิดล่าสุด" },
    "mostVisited": { "message": "เข้าชมบ่อยที่สุด" },
    "recentBookmarks": { "message": "บุ๊กมาร์กล่าสุด" },
    "pinned": { "message": "ปักหมุด" },
    "options": { "message": "การตั้งค่า" },
    "translations": { "message": "การแปลภาษา" },
    "about": { "message": "เกี่ยวกับ" },
    "mainOptions": { "message": "ตั้งค่าป๊อปอัป" },
    "styleOptions": { "message": "ตั้งค่ารูปแบบ" },
    "advanceOptions": { "message": "ตั้งค่าอื่นๆ" },
    "option1": { "message": "จำนวนรายการประวัติล่าสุด" },
    "option2": { "message": "จำนวนแท็บที่เพิ่งปิด" },
    "option2_2": { "message": "จำนวนแท็บล่าสุด" },
    "option3": { "message": "จำนวนหน้าที่เข้าชมบ่อยที่สุด" },
    "option4": { "message": "จำนวนบุ๊กมาร์กล่าสุด" },
    "option5": { "message": "ลำดับการแสดงผลในป๊อปอัป" },
    "option6": { "message": "หน้าประวัติ" },
    "option7": { "message": "รูปแบบวันที่" },
    "option8": { "message": "แสดงแถบค้นหาในป๊อปอัป" },
    "option9": { "message": "ดูตัวอย่าง" },
    "option10": { "message": "แสดง URL" },
    "option11": { "message": "แสดงเส้นคั่น" },
    "option12": { "message": "แสดงข้อมูลเพิ่มเติม" },
    "option13": { "message": "แสดงสีพื้นหลัง" },
    "option14": { "message": "ไอคอนป๊อปอัป" },
    "option15": { "message": "ความกว้างป๊อปอัป" },
    "option16": { "message": "กู้คืนรายการไปยังหน้าที่เข้าชมบ่อย" },
    "option17": { "message": "กรองโดเมนที่ไม่ต้องการแสดงจากประวัติ" },
    "option18": { "message": "การทำงานเมื่อคลิกรายการ" },
    "option181": { "message": "การทำงานเมื่อคลิกกลาง" },
    "option19": { "message": "สไตล์ป๊อปอัป" },
    "option20": { "message": "ล้างประวัติเมื่อเริ่มต้นเบราว์เซอร์" },
    "option21": { "message": "แสดงเวลาที่เข้าชม" },
    "option22": { "message": "โหมดประหยัดทรัพยากร (โหลดน้อยลง)" },
    "option22tip": { "message": "ช่วยให้การโหลดเร็วขึ้นและใช้หน่วยความจำน้อยลง" },
    "faviconService": { "message": "บริการดึงไอคอนเว็บไซต์ (Favicon)" },
    "helpFaviconService": { "message": "เลือกบริการสำหรับดาวน์โหลดไอคอน Favicon" },
    "faviconServiceChrome": { "message": "ค่าเริ่มต้นของเบราว์เซอร์" },
    "faviconServiceGoogle": { "message": "Google Favicon" },
    "faviconServiceDuckduckgo": { "message": "DuckDuckGo" },
    "faviconServiceFaviconIm": { "message": "Favicon.im" },
    "faviconServiceFaviconkit": { "message": "FaviconKit" },
    "faviconServiceFaviconsnap": { "message": "FaviconSnap" },
    "faviconServiceFallback": { "message": "บริการสำรองกรณีโหลดไม่สำเร็จ" },
    "helpFaviconServiceFallback": { "message": "URL เทมเพลตสำหรับดึง Favicon สำรอง" },
    "none": { "message": "ไม่มี" },
    "shareFaviconCache": { "message": "แชร์แคช Favicon ข้ามหน้า" },
    "helpShareFaviconCache": { "message": "ใช้แคชไอคอนร่วมกันเพื่อลดการดาวน์โหลดซ้ำ" },
    "clearFaviconCacheLabel": { "message": "ล้างแคช Favicon" },
    "clearingFaviconCacheLabel": { "message": "กำลังล้างแคช..." },
    "clearFaviconCacheDoneLabel": { "message": "ล้างแคชสำเร็จ" },
    "popupZoomLabel": { "message": "การย่อขยายป๊อปอัป" },
    "pageZoomLabel": { "message": "การย่อขยายหน้าหลัก" },
    "help1": { "message": "กำหนดจำนวนรายการประวัติล่าสุดที่ต้องการแสดง" },
    "help2": { "message": "กำหนดจำนวนแท็บที่เพิ่งปิดล่าสุดที่ต้องการแสดง" },
    "help2_2": { "message": "กำหนดจำนวนแท็บปัจจุบันที่เปิดอยู่" },
    "help3": { "message": "กำหนดจำนวนหน้าที่เข้าชมบ่อยที่สุดที่ต้องการแสดง" },
    "help4": { "message": "กำหนดจำนวนบุ๊กมาร์กล่าสุดที่ต้องการแสดง" },
    "help5": { "message": "ลากและวางเพื่อจัดลำดับหมวดหมู่ในป๊อปอัป" },
    "help6": { "message": "เปิดหน้านี้แทนหน้าประวัติเดิมของเบราว์เซอร์" },
    "help7": { "message": "เลือกรูปแบบวันที่ที่ต้องการแสดงผล" },
    "help8": { "message": "เลือกแสดงหรือไม่แสดงแถบค้นหาในป๊อปอัป" },
    "help10": { "message": "แสดง URL ใต้ชื่อหน้าเว็บ" },
    "help11": { "message": "แสดงเส้นคั่นระหว่างรายการ" },
    "help12": { "message": "แสดงข้อมูลเพิ่มเติม เช่น เวลา หรือจำนวนการเข้าชม" },
    "help13": { "message": "แสดงสีพื้นหลังเมื่อวางเมาส์เหนือรายการ" },
    "help16": { "message": "คลิกเครื่องหมายกากบาทเพื่อนำเว็บไซต์กลับเข้าสู่รายการเข้าชมบ่อย" },
    "help17": { "message": "ป้อนชื่อโดเมนที่ต้องการซ่อนจากประวัติ" },
    "help18": { "message": "เลือกสิ่งที่จะเกิดขึ้นเมื่อคลิกซ้ายที่รายการ" },
    "help181": { "message": "เลือกสิ่งที่จะเกิดขึ้นเมื่อคลิกปุ่มกลาง (ล้อเมาส์) ที่รายการ" },
    "help20": { "message": "ล้างประวัติการเข้าชมโดยอัตโนมัติเมื่อเริ่มเบราว์เซอร์ใหม่" },
    "help21": { "message": "แสดงเวลาที่เข้าชมข้างชื่อหน้าเว็บ" },
    "yes": { "message": "ใช่" },
    "no": { "message": "ไม่" },
    "visits": { "message": "ครั้ง" },
    "saveOptions": { "message": "บันทึกการตั้งค่า" },
    "saving": { "message": "กำลังบันทึก..." },
    "saved": { "message": "บันทึกเรียบร้อยแล้ว!" },
    "click1": { "message": "เปิดในแท็บปัจจุบัน" },
    "click2": { "message": "เปิดในแท็บใหม่" },
    "click3": { "message": "เปิดในแท็บใหม่ (พื้นหลัง)" },
    "click4": { "message": "เปิดในหน้าต่างใหม่" },
    "click5": { "message": "เปิดในหน้าต่างไม่ระบุตัวตน" },
    "translation1": { "message": "ช่วยแปลภาษา Tree Style History" },
    "translation2": { "message": "ขั้นตอนการส่งคำแปล:" },
    "translation3": { "message": "ดาวน์โหลดไฟล์ภาษา" },
    "translation4": { "message": "แปลข้อความเป็นภาษาของคุณ" },
    "translation5": { "message": "ส่งไฟล์ที่แปลแล้วกลับมาให้เรา" },
    "translation6": { "message": "ทีมงานจะตรวจสอบและรวมเข้าในเวอร์ชันถัดไป" },
    "translation7": { "message": "ขอขอบคุณสำหรับความช่วยเหลือในการพัฒนา!" },
    "aboutText": { "message": "Tree Style History จัดระเบียบประวัติการเข้าชมเว็บของคุณในรูปแบบแผนภูมิต้นไม้ เพื่อให้ติดตามที่มาและเส้นทางการท่องเว็บได้อย่างง่ายดาย" },
    "successfullyInstalled": { "message": "ติดตั้งส่วนขยายสำเร็จแล้ว!" },
    "whatsNew": { "message": "มีอะไรใหม่" },
    "version": { "message": "เวอร์ชัน" },
    "showAllHistory": { "message": "แสดงประวัติทั้งหมด" },
    "noResults": { "message": "ไม่พบผลลัพธ์ที่ตรงกับการค้นหา" },
    "currentHistory": { "message": "ประวัติปัจจุบัน" },
    "allHistory": { "message": "ประวัติทั้งหมด" },
    "totalHistoryItems": { "message": "จำนวนประวัติทั้งหมด" },
    "deleteItems": { "message": "ลบรายการที่เลือก" },
    "mondayLetter": { "message": "จ." },
    "tuesdayLetter": { "message": "อ." },
    "wednesdayLetter": { "message": "พ." },
    "thursdayLetter": { "message": "พฤ." },
    "fridayLetter": { "message": "ศ." },
    "saturdayLetter": { "message": "ส." },
    "sundayLetter": { "message": "อา." },
    "AM": { "message": "AM" },
    "PM": { "message": "PM" },
    "12hour": { "message": "12 ชั่วโมง" },
    "24hour": { "message": "24 ชั่วโมง" },
    "loading": { "message": "กำลังโหลด..." },
    "original": { "message": "ดั้งเดิม" },
    "classic": { "message": "คลาสสิก" },
    "pink": { "message": "ชมพู" },
    "ui1": { "message": "สไตล์ 1" },
    "ui2": { "message": "สไตล์ 2" },
    "ui3": { "message": "สไตล์ 3" },
    "ui4": { "message": "สไตล์ 4" },
    "ui5": { "message": "สไตล์ 5" },
    "ui6": { "message": "สไตล์ 6" },
    "tips": { "message": "เคล็ดลับ" },
    "tip1": { "message": "ดับเบิลคลิกเพื่อย่อหรือขยายกิ่งต้นไม้" },
    "tip2": { "message": "คลิกขวาที่รายการเพื่อดูเมนูคำสั่งเพิ่มเติม" },
    "tip3": { "message": "ใช้แถบค้นหาแบบละเอียดเพื่อหาต้นทางและปลายทาง" },
    "tip4": { "message": "สามารถกรองประวัติตามช่วงวันที่เริ่มต้นและสิ้นสุดได้" },
    "tip5": { "message": "สำรองข้อมูลไปยัง Google Drive เป็นประจำเพื่อความปลอดภัย" },
    "tip6": { "message": "ปักหมุดหน้าที่สำคัญเพื่อให้เปิดได้อย่างรวดเร็ว" },
    "optionloadrange": { "message": "ช่วงเวลาโหลดประวัติ (วัน)" },
    "optionloadrange2": { "message": "จำนวนวันต่อช่วงการโหลด" },
    "optionloadrange3": { "message": "จำนวนรายการสูงสุดต่อกิ่ง" },
    "treeOptions": { "message": "ประวัติแบบต้นไม้" },
    "treeOpen": { "message": "เปิดแบบต้นไม้" },
    "treePolicy": { "message": "นโยบายความเป็นส่วนตัว: ข้อมูลประวัติการเข้าชมทั้งหมดจะถูกเก็บไว้ในเครื่องของคุณเท่านั้น และจะไม่ถูกส่งไปยังเซิร์ฟเวอร์ภายนอกใดๆ เว้นแต่คุณเลือกที่จะส่งออกหรือสำรองข้อมูลไปยัง Google Drive ด้วยตนเอง" },
    "more": { "message": "เพิ่มเติม" },
    "searchSite": { "message": "ค้นหาชื่อหน้าหรือ URL..." },
    "plsInputUrl": { "message": "กรุณาป้อน URL" },
    "longInputUrl": { "message": "URL มีความยาวเกินไป" },
    "shortcuts": { "message": "แป้นพิมพ์ลัด" },
    "shortcutsTip": { "message": "กำหนดแป้นพิมพ์ลัดสำหรับเปิดส่วนขยาย" },
    "name": { "message": "Tree Style History" },
    "nameShort": { "message": "Tree History" },
    "linerHistory": { "message": "ประวัติแบบเรียงลำดับ" },
    "saveUpload": { "message": "บันทึกและซิงค์การตั้งค่า" },
    "downloadConfig": { "message": "ดาวน์โหลดการตั้งค่าจากคลาวด์" },
    "downloadConfig2": { "message": "นำเข้าการตั้งค่า" },
    "defaultConfig": { "message": "คืนค่าเริ่มต้น" },
    "saveFail": { "message": "บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
    "deleteCache": { "message": "ล้างแคชประวัติ" },
    "deleteCacheTip": { "message": "ลบข้อมูลแคชประวัติในเครื่องเพื่อเพิ่มพื้นที่" },
    "clickMe": { "message": "คลิกที่นี่เพื่อดำเนินการ" },
    "done": { "message": "เสร็จสิ้น" },
    "deleteList": { "message": "ล้างรายการทั้งหมด" },
    "mergeList": { "message": "รวมรายการ" },
    "filterSetting": { "message": "ตั้งค่าตัวกรอง" },
    "addItemNum": { "message": "เพิ่มจำนวนรายการ" },
    "closeHistory": { "message": "แท็บที่ปิดไปแล้ว" },
    "OpenClosedHistory": { "message": "เปิดหน้าแท็บที่ปิด" },
    "abnormalClosedTab": { "message": "แท็บที่ปิดอย่างผิดปกติ" },
    "dateConfig": { "message": "ตั้งค่าวันที่" },
    "showCalendar": { "message": "แสดงปฏิทิน" },
    "fastClosedTab": { "message": "ปิดแท็บอย่างรวดเร็ว" },
    "tidClosedTab": { "message": "รหัสแท็บที่ปิด" },
    "linerBookMark": { "message": "บุ๊กมาร์ก" },
    "OpenBookMark": { "message": "เปิดหน้าบุ๊กมาร์ก" },
    "BookMarkPath": { "message": "เส้นทางบุ๊กมาร์ก" },
    "showPopup": { "message": "หน้าต่างป๊อปอัป" },
    "showPopuptip": { "message": "เลือกหน้าที่ต้องการให้แสดงเมื่อคลิกไอคอนส่วนขยาย" },
    "orderByTitle": { "message": "เรียงตามชื่อเรื่อง" },
    "orderByTime": { "message": "เรียงตามเวลา" },
    "group": { "message": "จัดกลุ่มตามโดเมน" },
    "order": { "message": "เรียงลำดับ" },
    "UseContextMenu": { "message": "เปิดใช้เมนูคลิกขวา (Context Menu)" },
    "recentTabs": { "message": "แท็บที่เปิดอยู่ล่าสุด" },
    "deleteBookmarks": { "message": "ลบบุ๊กมาร์กที่เลือก" },
    "editBookmark": { "message": "แก้ไขบุ๊กมาร์ก" },
    "editBookmarkTitlePrompt": { "message": "แก้ไขชื่อบุ๊กมาร์ก:" },
    "editBookmarkUrlPrompt": { "message": "แก้ไข URL บุ๊กมาร์ก:" },
    "optionloadrange4": { "message": "จำนวนประวัติรวมสูงสุดในการโหลด" },
    "help22": { "message": "จำนวนวันในอดีตที่จะโหลดประวัติเมื่อเริ่มต้น" },
    "help23": { "message": "จำนวนวันที่จะโหลดเพิ่มในแต่ละครั้ง" },
    "help24": { "message": "จำนวนรายการประวัติสูงสุดในแต่ละกิ่งก้านของต้นไม้" },
    "help25": { "message": "ขีดจำกัดสูงสุดของจำนวนประวัติทั้งหมดที่จะดึงมาแสดง" },
    "searchSource": { "message": "ค้นหาต้นทาง (Origin/Source)" },
    "searchDestination": { "message": "ค้นหาปลายทาง (Destination)" },
    "advancedSearch": { "message": "ค้นหาละเอียด (Advanced Search)" },
    "clearSearch": { "message": "ล้างการค้นหา" },
    "searchStartDate": { "message": "วันเริ่มหา (Start Date)" },
    "searchEndDate": { "message": "วันที่สิ้นสุด (End Date)" },
    "searchTransition": { "message": "วิธีเปิด (Transition)" },
    "quickDateFilter": { "message": "ช่วงวันที่ด่วน" },
    "todayPreset": { "message": "วันนี้" },
    "yesterdayPreset": { "message": "เมื่อวานนี้" },
    "last7DaysPreset": { "message": "7 วันล่าสุด" },
    "last30DaysPreset": { "message": "30 วันล่าสุด" },
    "allTimePreset": { "message": "ทั้งหมด" }
};

// Merge new keys into Thai dictionary
for (const [k, v] of Object.entries(newKeysEn)) {
    if (!thMessages[k]) {
        thMessages[k] = { "message": v.message };
    }
}
thMessages["backupRestoreTitle"] = { "message": "สำรองและกู้คืนข้อมูล (Google Drive)" };
thMessages["googleDriveBackup"] = { "message": "สำรองข้อมูลไปยัง Google Drive" };
thMessages["googleDriveRestore"] = { "message": "กู้คืนข้อมูลจาก Google Drive" };
thMessages["googleDriveSync"] = { "message": "Google Drive คลาวด์สำรอง" };
thMessages["googleDriveConnected"] = { "message": "เชื่อมต่อ Google Drive แล้ว" };
thMessages["googleDriveNotConnected"] = { "message": "ยังไม่ได้เชื่อมต่อ Google Drive" };
thMessages["googleSignIn"] = { "message": "ลงชื่อเข้าใช้ด้วย Google" };
thMessages["googleSignOut"] = { "message": "ออกจากระบบ Google" };
thMessages["exportLocalJson"] = { "message": "ส่งออกไฟล์สำรอง (JSON)" };
thMessages["importLocalJson"] = { "message": "นำเข้าไฟล์สำรอง (JSON)" };
thMessages["confirmRestore"] = { "message": "ยืนยันการนำเข้าข้อมูลสำรอง? ข้อมูลประวัติการท่องเว็บและการตั้งค่าจะถูกรวมหรือกู้คืน" };
thMessages["restoreSuccess"] = { "message": "กู้คืนข้อมูลสำรองเรียบร้อยแล้ว!" };
thMessages["backupSuccess"] = { "message": "สำรองข้อมูลไปยัง Google Drive เรียบร้อยแล้ว!" };
thMessages["backingUp"] = { "message": "กำลังสำรองข้อมูล..." };
thMessages["restoring"] = { "message": "กำลังกู้คืนข้อมูล..." };
thMessages["backupFileName"] = { "message": "ชื่อไฟล์สำรอง" };
thMessages["backupDate"] = { "message": "วันที่สำรอง" };
thMessages["backupSize"] = { "message": "จำนวนรายการ" };
thMessages["noBackupsFound"] = { "message": "ไม่พบไฟล์สำรองใน Google Drive" };
thMessages["selectBackupToRestore"] = { "message": "เลือกไฟล์สำรองที่ต้องการกู้คืน:" };
thMessages["refreshBackups"] = { "message": "รีเฟรชรายการสำรอง" };
thMessages["deleteBackup"] = { "message": "ลบไฟล์สำรอง" };
thMessages["confirmDeleteBackup"] = { "message": "ต้องการลบไฟล์สำรองนี้ออกจาก Google Drive หรือไม่?" };
thMessages["backupDeleted"] = { "message": "ลบไฟล์สำรองเรียบร้อยแล้ว" };
thMessages["language"] = { "message": "ภาษา / ภาษาไทย" };
thMessages["thaiLanguage"] = { "message": "ภาษาไทย (Thai)" };
thMessages["trashRecovery"] = { "message": "ถังขยะและกู้คืนการลบ" };
thMessages["trashTitle"] = { "message": "ถังขยะประวัติที่ถูกลบ" };
thMessages["trashDesc"] = { "message": "เก็บประวัติที่ถูกลบไว้ชั่วคราวเพื่อป้องกันข้อมูลสูญหายโดยไม่ตั้งใจ คุณสามารถกู้คืนกลับมาได้ทุกเมื่อ" };
thMessages["restoreItem"] = { "message": "กู้คืน" };
thMessages["restoreAll"] = { "message": "กู้คืนทั้งหมด" };
thMessages["emptyTrash"] = { "message": "ล้างถังขยะทั้งหมด" };
thMessages["deletePermanently"] = { "message": "ลบถาวร" };
thMessages["undo"] = { "message": "เลิกทำ / กู้คืน" };
thMessages["deletedMovedToTrash"] = { "message": "ย้ายรายการที่ลบไปยังถังขยะแล้ว" };
thMessages["trashEmpty"] = { "message": "ถังขยะว่างเปล่า ไม่มีประวัติที่ถูกลบ" };
thMessages["confirmRestoreItem"] = { "message": "ต้องการกู้คืนรายการนี้กลับไปยังประวัติการท่องเว็บหรือไม่?" };
thMessages["confirmRestoreAll"] = { "message": "ต้องการกู้คืนประวัติที่ถูกลบทั้งหมดกลับไปยังประวัติการท่องเว็บหรือไม่?" };
thMessages["confirmEmptyTrash"] = { "message": "ต้องการล้างประวัติทั้งหมดในถังขยะอย่างถาวรหรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้" };
thMessages["deletedAt"] = { "message": "เวลาที่ลบ" };
thMessages["originalVisit"] = { "message": "เวลาที่เข้าชมเดิม" };
thMessages["deleteNodePrompt"] = { "message": "ต้องการย้ายรายการประวัตินี้ไปยังถังขยะหรือไม่?" };
thMessages["deleteBranchPrompt"] = { "message": "รายการนี้มีกิ่งก้านสาขาย่อย ต้องการย้ายทั้งกิ่งก้านไปยังถังขยะหรือไม่?" };

// Make sure every key in en is in thMessages and vice-versa
const enKeys = Object.keys(en);
for (const k of enKeys) {
    if (!thMessages[k]) {
        console.warn(`Missing key in thMessages: ${k}`);
        thMessages[k] = { "message": en[k].message };
    }
}

// Write en, zh, and th
fs.writeFileSync(enPath, JSON.stringify(en, null, 4) + '\n');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 4) + '\n');
fs.mkdirSync(path.dirname(thPath), { recursive: true });
fs.writeFileSync(thPath, JSON.stringify(thMessages, null, 4) + '\n');

console.log('Locale files generated successfully:');
console.log(`en keys: ${Object.keys(en).length}`);
console.log(`zh keys: ${Object.keys(zh).length}`);
console.log(`th keys: ${Object.keys(thMessages).length}`);
