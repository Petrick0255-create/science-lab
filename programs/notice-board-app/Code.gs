const CONFIG = Object.freeze({
  TARGET_FOLDER_ID: '1dV1BFIkXDDwC_zMRm8XzgQqUFi28DPdZ',
  SPREADSHEET_NAME: '공지 모음 DB',
  SHEET_NAME: '공지사항',
  ATTACHMENTS_FOLDER_NAME: '공지 첨부파일',
  MAX_TOTAL_BYTES: 300 * 1024 * 1024,
  AUTHORS: ['팀장님', '실장님', '총무님'],
  HEADERS: ['ID', '등록일시', '공지일자', '작성자', '제목', '내용', '첨부파일JSON', '첨부개수', '수정일시']
});

function doGet() {
  ensureStorage_();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('공지 모음')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function setup() {
  const storage = ensureStorage_();
  return {
    spreadsheetUrl: storage.spreadsheet.getUrl(),
    folderUrl: `https://drive.google.com/drive/folders/${CONFIG.TARGET_FOLDER_ID}`
  };
}

function getInitialData() {
  const storage = ensureStorage_();
  return {
    notices: readNotices_(storage.sheet),
    authors: CONFIG.AUTHORS,
    maxTotalBytes: CONFIG.MAX_TOTAL_BYTES,
    spreadsheetUrl: storage.spreadsheet.getUrl(),
    folderUrl: `https://drive.google.com/drive/folders/${CONFIG.TARGET_FOLDER_ID}`
  };
}

function listNotices() {
  return readNotices_(ensureStorage_().sheet);
}

function startResumableUpload(fileMeta) {
  validateFileMeta_(fileMeta);
  const noticeId = validateNoticeId_(fileMeta.noticeId);
  const noticeFolder = getOrCreateNoticeFolder_(noticeId, fileMeta.noticeDate);
  const safeName = sanitizeFileName_(fileMeta.name);
  const mimeType = String(fileMeta.mimeType || 'application/octet-stream');
  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType';
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(fileMeta.size)
    },
    contentType: 'application/json; charset=UTF-8',
    payload: JSON.stringify({ name: safeName, parents: [noticeFolder.getId()] }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`업로드 준비 실패(${status}): ${response.getContentText().slice(0, 300)}`);
  }
  const headers = response.getHeaders();
  const sessionUrl = headers.Location || headers.location;
  if (!sessionUrl) throw new Error('Google Drive 업로드 주소를 받지 못했습니다.');
  return { sessionUrl, name: safeName };
}

function uploadChunk(request) {
  const sessionUrl = String(request.sessionUrl || '');
  if (!/^https:\/\/www\.googleapis\.com\/upload\/drive\//.test(sessionUrl)) {
    throw new Error('올바르지 않은 업로드 주소입니다.');
  }
  const start = Number(request.start);
  const end = Number(request.end);
  const total = Number(request.total);
  if (![start, end, total].every(Number.isSafeInteger) || start < 0 || end < start || total < 1 || end >= total) {
    throw new Error('업로드 범위가 올바르지 않습니다.');
  }
  if (total > CONFIG.MAX_TOTAL_BYTES) throw new Error('파일 용량 제한을 초과했습니다.');

  const bytes = Utilities.base64Decode(String(request.base64 || ''));
  if (bytes.length !== end - start + 1) throw new Error('전송된 파일 조각의 크기가 맞지 않습니다.');
  const response = UrlFetchApp.fetch(sessionUrl, {
    method: 'put',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      'Content-Range': `bytes ${start}-${end}/${total}`
    },
    contentType: 'application/octet-stream',
    payload: bytes,
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status === 308) return { done: false };
  if (status === 200 || status === 201) {
    const file = JSON.parse(response.getContentText());
    return {
      done: true,
      file: {
        id: file.id,
        name: file.name || request.name,
        mimeType: file.mimeType || 'application/octet-stream',
        size: total,
        url: `https://drive.google.com/file/d/${file.id}/view`
      }
    };
  }
  throw new Error(`파일 업로드 실패(${status}): ${response.getContentText().slice(0, 300)}`);
}

function saveNotice(payload) {
  const notice = validateNotice_(payload);
  const storage = ensureStorage_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (findNoticeRow_(storage.sheet, notice.id)) throw new Error('이미 저장된 공지입니다.');
    const now = new Date().toISOString();
    storage.sheet.appendRow([
      notice.id,
      now,
      notice.noticeDate,
      safeCell_(notice.author),
      safeCell_(notice.title),
      safeCell_(notice.content),
      JSON.stringify(notice.attachments),
      notice.attachments.length,
      now
    ]);
    return Object.assign({}, notice, { createdAt: now, updatedAt: now });
  } finally {
    lock.releaseLock();
  }
}

function ensureStorage_() {
  const props = PropertiesService.getScriptProperties();
  const targetFolder = DriveApp.getFolderById(CONFIG.TARGET_FOLDER_ID);
  let spreadsheet;
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  if (spreadsheetId) {
    try { spreadsheet = SpreadsheetApp.openById(spreadsheetId); } catch (error) { props.deleteProperty('SPREADSHEET_ID'); }
  }
  if (!spreadsheet) {
    const existing = targetFolder.getFilesByName(CONFIG.SPREADSHEET_NAME);
    if (existing.hasNext()) {
      spreadsheet = SpreadsheetApp.openById(existing.next().getId());
    } else {
      spreadsheet = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
      DriveApp.getFileById(spreadsheet.getId()).moveTo(targetFolder);
    }
    props.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  }

  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    const sheets = spreadsheet.getSheets();
    sheet = sheets.length === 1 && sheetIsEmpty_(sheets[0]) ? sheets[0].setName(CONFIG.SHEET_NAME) : spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  }
  initializeSheet_(sheet);
  getOrCreateChildFolder_(targetFolder, CONFIG.ATTACHMENTS_FOLDER_NAME);
  return { spreadsheet, sheet, targetFolder };
}

function initializeSheet_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== CONFIG.HEADERS[0]) {
    sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CONFIG.HEADERS.length)
    .setBackground('#18392b').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 165);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 90);
  sheet.setColumnWidth(5, 240);
  sheet.setColumnWidth(6, 520);
  sheet.setColumnWidth(7, 360);
  sheet.setColumnWidth(8, 90);
  sheet.setColumnWidth(9, 165);
}

function readNotices_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.length).getDisplayValues()
    .filter(row => row[0])
    .map(row => ({
      id: row[0], createdAt: row[1], noticeDate: row[2], author: row[3], title: row[4], content: row[5],
      attachments: parseAttachments_(row[6]), updatedAt: row[8]
    }));
}

function validateNotice_(payload) {
  const notice = payload || {};
  const id = validateNoticeId_(notice.id);
  const author = String(notice.author || '').trim();
  if (!CONFIG.AUTHORS.includes(author)) throw new Error('작성자를 선택해 주세요.');
  const noticeDate = String(notice.noticeDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(noticeDate)) throw new Error('공지 날짜가 올바르지 않습니다.');
  const content = String(notice.content || '').trim();
  if (!content) throw new Error('공지 내용을 입력해 주세요.');
  if (content.length > 20000) throw new Error('공지 내용은 20,000자까지 입력할 수 있습니다.');
  const title = String(notice.title || content.split(/\r?\n/)[0]).trim().slice(0, 150);
  const attachments = Array.isArray(notice.attachments) ? notice.attachments.map(normalizeAttachment_) : [];
  const total = attachments.reduce((sum, file) => sum + file.size, 0);
  if (total > CONFIG.MAX_TOTAL_BYTES) throw new Error('첨부파일 합계는 300MB를 넘을 수 없습니다.');
  return { id, author, noticeDate, title, content, attachments };
}

function validateFileMeta_(meta) {
  if (!meta || !meta.name) throw new Error('파일 이름이 없습니다.');
  const size = Number(meta.size);
  if (!Number.isSafeInteger(size) || size < 1 || size > CONFIG.MAX_TOTAL_BYTES) throw new Error('파일 크기가 올바르지 않습니다.');
}

function normalizeAttachment_(file) {
  const id = String(file.id || '');
  if (!/^[\w-]+$/.test(id)) throw new Error('첨부파일 정보가 올바르지 않습니다.');
  return {
    id,
    name: sanitizeFileName_(file.name),
    mimeType: String(file.mimeType || 'application/octet-stream'),
    size: Math.max(0, Number(file.size) || 0),
    url: `https://drive.google.com/file/d/${id}/view`
  };
}

function getOrCreateNoticeFolder_(noticeId, noticeDate) {
  const root = DriveApp.getFolderById(CONFIG.TARGET_FOLDER_ID);
  const attachments = getOrCreateChildFolder_(root, CONFIG.ATTACHMENTS_FOLDER_NAME);
  const prefix = /^\d{4}-\d{2}-\d{2}$/.test(String(noticeDate || '')) ? noticeDate : Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  return getOrCreateChildFolder_(attachments, `${prefix}_${noticeId}`);
}

function getOrCreateChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function findNoticeRow_(sheet, id) {
  if (sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function validateNoticeId_(id) {
  const value = String(id || '');
  if (!/^[a-f0-9-]{20,50}$/i.test(value)) throw new Error('공지 ID가 올바르지 않습니다.');
  return value;
}

function sanitizeFileName_(name) {
  const value = String(name || '파일').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  return (value || '파일').slice(0, 180);
}

function safeCell_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function parseAttachments_(value) {
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch (error) { return []; }
}

function sheetIsEmpty_(sheet) {
  return sheet.getLastRow() <= 1 && sheet.getLastColumn() <= 1 && sheet.getRange('A1').isBlank();
}
