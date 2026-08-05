const CONFIG = {
  SPREADSHEET_ID: '1c-kFELnnPr9odYEctiOOUPLDSyLSj-2Vf3ZI2xPxNHo',
  IMAGE_FOLDER_ID: '1IQohwxwwiT6-BSvVDe6WEZWu070FdYlU',
  DB_SHEET: '문항DB',
  SETTINGS_SHEET: '설정'
};

function doGet() {
  return json_({ ok: true, data: { service: 'mock-exam-manager' } });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    const action = req.action;
    const payload = req.payload || {};
    let data;
    switch (action) {
      case 'getSettings': data = getSettings_(); break;
      case 'saveSettings': data = saveSettings_(payload); break;
      case 'listRecords': data = listRecords_(); break;
      case 'saveRecord': data = saveRecord_(payload); break;
      case 'deleteRecord': data = deleteRecord_(payload.id); break;
      default: throw new Error('지원하지 않는 작업입니다: ' + action);
    }
    return json_({ ok: true, data });
  } catch (err) {
    return json_({ ok: false, message: err.message, stack: err.stack });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error(name + ' 시트를 찾을 수 없습니다.');
  return sheet;
}

function getSettings_() {
  const sh = sheet_(CONFIG.SETTINGS_SHEET);
  const last = Math.max(2, sh.getLastRow());
  const values = sh.getRange(2, 1, last - 1, 7).getDisplayValues();
  return {
    subjects: values.map(r=>r[0]).filter(Boolean),
    seasons: values.map(r=>r[1]).filter(Boolean),
    rounds: values.map(r=>r[2]).filter(Boolean),
    difficulties: values.map(r=>r[3]).filter(Boolean),
    scores: values.map(r=>r[4]).filter(Boolean),
    integratedTypes: values.map(r=>r[5]).filter(Boolean),
    biologyTypes: values.map(r=>r[6]).filter(Boolean)
  };
}

function saveSettings_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(CONFIG.SETTINGS_SHEET);
    sh.getRange('B2:C200').clearContent();
    if (payload.seasons && payload.seasons.length) {
      sh.getRange(2, 2, payload.seasons.length, 1).setValues(payload.seasons.map(v=>[v]));
    }
    if (payload.rounds && payload.rounds.length) {
      sh.getRange(2, 3, payload.rounds.length, 1).setValues(payload.rounds.map(v=>[v]));
    }
    return getSettings_();
  } finally {
    lock.releaseLock();
  }
}

function listRecords_() {
  const sh = sheet_(CONFIG.DB_SHEET);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const rows = sh.getRange(2, 1, lastRow - 1, 17).getValues();
  return rows.filter(r=>r[0]).map(rowToRecord_).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function rowToRecord_(r) {
  return {
    id:r[0], subject:r[1], season:r[2], round:r[3], number:Number(r[4]), type:r[5],
    difficulty:r[6], score:Number(r[7]), source:r[8], answer:r[9], explanationHtml:r[10],
    memo:r[11], imageFileName:r[12], imageFileId:r[13], imageUrl:r[14],
    createdAt:formatDate_(r[15]), updatedAt:formatDate_(r[16])
  };
}

function saveRecord_(record) {
  validateRecord_(record);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(CONFIG.DB_SHEET);
    const rows = sh.getLastRow() >= 2 ? sh.getRange(2,1,sh.getLastRow()-1,17).getValues() : [];
    let index = record.id ? rows.findIndex(r=>String(r[0])===String(record.id)) : -1;
    const now = new Date();
    let createdAt = now;
    let imageFileId = '';
    let imageUrl = '';
    let imageFileName = '';

    if (index >= 0) {
      createdAt = rows[index][15] || now;
      imageFileName = rows[index][12] || '';
      imageFileId = rows[index][13] || '';
      imageUrl = rows[index][14] || '';
    }

    if (record.imageDataUrl) {
      if (imageFileId) {
        try { DriveApp.getFileById(imageFileId).setTrashed(true); } catch (_) {}
      }
      const saved = saveImage_(record);
      imageFileName = saved.name;
      imageFileId = saved.id;
      imageUrl = saved.url;
    }

    if (!imageUrl) throw new Error('이미지가 없습니다.');

    const id = record.id || Utilities.getUuid();
    const row = [
      id,record.subject,record.season,record.round,Number(record.number),record.type,record.difficulty,
      Number(record.score),record.source||'',record.answer||'',sanitizeHtml_(record.explanationHtml||''),
      record.memo||'',imageFileName,imageFileId,imageUrl,createdAt,now
    ];
    if (index >= 0) sh.getRange(index+2,1,1,17).setValues([row]);
    else sh.appendRow(row);
    return rowToRecord_(row);
  } finally {
    lock.releaseLock();
  }
}

function deleteRecord_(id) {
  if (!id) throw new Error('문항 ID가 없습니다.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(CONFIG.DB_SHEET);
    const last = sh.getLastRow();
    if (last < 2) return false;
    const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
    const idx = ids.findIndex(v=>v===id);
    if (idx < 0) return false;
    const row = sh.getRange(idx+2,1,1,17).getValues()[0];
    if (row[13]) {
      try { DriveApp.getFileById(row[13]).setTrashed(true); } catch (_) {}
    }
    sh.deleteRow(idx+2);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function saveImage_(record) {
  const m = String(record.imageDataUrl).match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!m) throw new Error('올바른 이미지 데이터가 아닙니다.');
  const mime = m[1];
  const bytes = Utilities.base64Decode(m[2]);
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const safe = s => String(s).replace(/[\\/:*?"<>|]/g,'_');
  const name = `${safe(record.subject)}_${safe(record.season)}_${safe(record.round)}_${String(record.number).padStart(2,'0')}.${ext}`;
  const root = DriveApp.getFolderById(CONFIG.IMAGE_FOLDER_ID);
  const subjectFolder = getOrCreateFolder_(root, safe(record.subject));
  const seasonFolder = getOrCreateFolder_(subjectFolder, safe(record.season));
  const roundFolder = getOrCreateFolder_(seasonFolder, safe(record.round));
  const file = roundFolder.createFile(Utilities.newBlob(bytes,mime,name));
  return { id:file.getId(), name:file.getName(), url:`https://drive.google.com/uc?export=view&id=${file.getId()}` };
}

function getOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function validateRecord_(r) {
  ['subject','season','round','number','type','difficulty','score','answer'].forEach(k=>{
    if (r[k] === undefined || r[k] === null || r[k] === '') throw new Error(k + ' 값이 없습니다.');
  });
}

function sanitizeHtml_(html) {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,'')
    .replace(/\son\w+="[^"]*"/gi,'')
    .replace(/\son\w+='[^']*'/gi,'');
}

function formatDate_(value) {
  if (!value) return '';
  return value instanceof Date ? value.toISOString() : String(value);
}