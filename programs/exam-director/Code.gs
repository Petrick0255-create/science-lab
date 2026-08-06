var SPREADSHEET_ID = '1LvDHhARksHVu4j2FWTR_YuGDlVJcnTZFS2UeBlbSt08';
var IMAGE_FOLDER_ID = '1IQohwxwwiT6-BSvVDe6WEZWu070FdYlU';
var SHEETS = { master: '문제 마스터', seasons: '시즌 설정', types: '유형 목록', backup: '백업', settings: '설정' };
var MASTER_HEADERS = ['문제 ID','과목','연도','시즌','회','번호','유형','세부 유형','난이도','배점','출처','정답','해설 HTML','해설 텍스트','메모','이미지 파일 ID','이미지 파일명','이미지 링크','생성일','수정일'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('모의고사 관리')
    .addItem('초기 설정 확인', 'setupMockExamManager')
    .addItem('동기화 키 설정', 'setSyncKey')
    .addSeparator()
    .addItem('현재 데이터 백업', 'backupNow')
    .addToUi();
}

function setupMockExamManager() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureMasterSheet_(ss);
  ensureSheet_(ss, SHEETS.seasons, ['과목','시즌','회차 수','문항 수','사용 여부','정렬']);
  ensureSheet_(ss, SHEETS.types, ['과목','유형','정렬']);
  ensureSheet_(ss, SHEETS.backup, ['백업 ID','백업 일시','구간','전체 구간','JSON 조각']);
  ensureSheet_(ss, SHEETS.settings, ['설정 키','값','설명']);
  SpreadsheetApp.getUi().alert('필수 시트를 확인했습니다. 다음으로 “동기화 키 설정”을 실행하세요.');
}

function setSyncKey() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('동기화 키 설정', '웹페이지에 입력할 키를 정하세요. 8자 이상을 권장합니다.', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var key = response.getResponseText().trim();
  if (key.length < 4) return ui.alert('키는 4자 이상 입력하세요.');
  PropertiesService.getScriptProperties().setProperty('SYNC_KEY', key);
  writeSetting_('SYNC_KEY', '설정됨', '실제 키는 Script Properties에만 저장됩니다.');
  ui.alert('동기화 키가 저장되었습니다. 웹페이지 연결 설정에 같은 키를 입력하세요.');
}

function doGet(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || 'load');
    checkKey_(e && e.parameter && e.parameter.key);
    if (action === 'ping') return json_({ ok: true, message: 'connected', version: 2 });
    if (action === 'load') return json_(loadPayload_());
    return json_({ ok: false, message: '지원하지 않는 요청입니다.' });
  } catch (err) {
    return json_({ ok: false, message: err.message || String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var p = (e && e.parameter) || {};
    checkKey_(p.key);
    if (p.action !== 'sync') throw new Error('지원하지 않는 요청입니다.');
    var payload = JSON.parse(p.payload || '{}');
    validatePayload_(payload);
    backupNow_('자동 동기화 전 백업');
    var oldQuestions = readQuestions_();
    var updated = applyImages_(payload.questions || [], payload.imageDrafts || {}, oldQuestions);
    writeQuestions_(updated);
    writeSeasons_(payload.seasons || []);
    if (payload.detailTypes) writeTypes_(payload.detailTypes);
    trashRemovedImages_(oldQuestions, updated);
    var syncedAt = new Date().toISOString();
    writeSetting_('LAST_SYNC_AT', syncedAt, '최근 웹페이지 동기화 시각');
    return json_({ ok: true, questions: updated, syncedAt: syncedAt });
  } catch (err) {
    return json_({ ok: false, message: err.message || String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function checkKey_(provided) {
  var expected = PropertiesService.getScriptProperties().getProperty('SYNC_KEY');
  if (!expected) throw new Error('먼저 시트의 모의고사 관리 메뉴에서 동기화 키를 설정하세요.');
  if (String(provided || '') !== expected) throw new Error('동기화 키가 올바르지 않습니다.');
}

function loadPayload_() {
  return {
    ok: true,
    questions: readQuestions_(),
    seasons: readSeasons_(),
    types: readTypes_(),
    detailTypes: readTypes_(),
    syncedAt: new Date().toISOString()
  };
}

function validatePayload_(p) {
  if (!p || !Array.isArray(p.questions) || !Array.isArray(p.seasons)) throw new Error('동기화 데이터 형식이 올바르지 않습니다.');
  if (p.questions.length > 5000) throw new Error('한 번에 저장할 수 있는 문제 수를 초과했습니다.');
}

function applyImages_(questions, drafts, oldQuestions) {
  var folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  var oldMap = {};
  oldQuestions.forEach(function(q) { oldMap[q.id] = q; });
  return questions.map(function(q) {
    var old = oldMap[q.id] || {};
    var draft = drafts[q.id];
    q.imageFileId = q.imageFileId || old.imageFileId || '';
    q.imageFileName = q.imageFileName || old.imageFileName || '';
    q.imageUrl = q.imageUrl || old.imageUrl || '';
    if (draft && draft.dataUrl) {
      if (q.imageFileId) {
        try { DriveApp.getFileById(q.imageFileId).setTrashed(true); } catch (ignore) {}
      }
      var parts = String(draft.dataUrl).split(',');
      var mime = (parts[0].match(/data:([^;]+)/) || [null, 'image/webp'])[1];
      var bytes = Utilities.base64Decode(parts[1]);
      var extension = mime.indexOf('png') > -1 ? 'png' : mime.indexOf('jpeg') > -1 ? 'jpg' : 'webp';
      var name = safeFilename_([q.year || new Date().getFullYear(), q.subject, q.season, q.round + '회', pad2_(q.number) + '번'].join('-')) + '.' + extension;
      var file = folder.createFile(Utilities.newBlob(bytes, mime, name));
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (ignore2) {}
      q.imageFileId = file.getId();
      q.imageFileName = file.getName();
      q.imageUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
    }
    q.updatedAt = q.updatedAt || new Date().toISOString();
    q.createdAt = q.createdAt || q.updatedAt;
    return q;
  });
}

function trashRemovedImages_(oldQuestions, newQuestions) {
  var keep = {};
  newQuestions.forEach(function(q) { if (q.imageFileId) keep[q.imageFileId] = true; });
  oldQuestions.forEach(function(q) {
    if (q.imageFileId && !keep[q.imageFileId]) {
      try { DriveApp.getFileById(q.imageFileId).setTrashed(true); } catch (ignore) {}
    }
  });
}

function readQuestions_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ensureMasterSheet_(ss);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getRange(2, 1, sh.getLastRow() - 1, MASTER_HEADERS.length).getDisplayValues();
  return values.filter(function(r) { return r[0] && r[0].indexOf('(웹페이지') !== 0; }).map(function(r) {
    return { id:r[0],subject:r[1],year:String(r[2] || new Date().getFullYear()),season:r[3],round:Number(r[4]),number:Number(r[5]),type:r[6],detailType:r[7],difficulty:r[8],score:Number(r[9]),source:r[10],answer:r[11],explanationHtml:r[12],explanationText:r[13],memo:r[14],imageFileId:r[15],imageFileName:r[16],imageUrl:r[17],createdAt:toIso_(r[18]),updatedAt:toIso_(r[19]) };
  });
}

function writeQuestions_(questions) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ensureMasterSheet_(ss);
  var rows = questions.map(function(q) { return [q.id,q.subject,String(q.year || new Date().getFullYear()),q.season,q.round,q.number,q.type,q.detailType||'',q.difficulty,q.score,safeCell_(q.source),safeCell_(q.answer),safeCell_(q.explanationHtml),safeCell_(q.explanationText),safeCell_(q.memo),q.imageFileId,q.imageFileName,q.imageUrl,q.createdAt,q.updatedAt]; });
  clearBody_(sh, MASTER_HEADERS.length);
  if (rows.length) sh.getRange(2,1,rows.length,MASTER_HEADERS.length).setValues(rows);
  styleDataSheet_(sh, MASTER_HEADERS.length);
}

function readSeasons_() {
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.seasons);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,6).getValues().filter(function(r){return r[0]&&r[1];}).map(function(r){return{subject:String(r[0]),name:String(r[1]),roundCount:Number(r[2])||8,questionCount:Number(r[3])||25,active:r[4]!==false&&String(r[4]).toUpperCase()!=='FALSE',order:Number(r[5])||0};});
}

function writeSeasons_(seasons) {
  var sh = ensureSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), SHEETS.seasons, ['과목','시즌','회차 수','문항 수','사용 여부','정렬']);
  clearBody_(sh,6);
  if (seasons.length) sh.getRange(2,1,seasons.length,6).setValues(seasons.map(function(s){return[s.subject,s.name,Number(s.roundCount)||8,Number(s.questionCount)||25,s.active!==false,Number(s.order)||0];}));
  styleDataSheet_(sh,6);
}

function readTypes_() {
  var result = {'통합과학':[],'생명과학':[]};
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.types);
  if (!sh || sh.getLastRow() < 2) return result;
  sh.getRange(2,1,sh.getLastRow()-1,3).getValues().filter(function(r){return r[0]&&r[1];}).sort(function(a,b){return Number(a[2])-Number(b[2]);}).forEach(function(r){if(!result[r[0]])result[r[0]]=[];result[r[0]].push(String(r[1]));});
  return result;
}

function writeTypes_(types) {
  var sh = ensureSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), SHEETS.types, ['과목','유형','정렬']);
  var rows=[];Object.keys(types).forEach(function(subject){(types[subject]||[]).forEach(function(type,i){rows.push([subject,type,i+1]);});});
  clearBody_(sh,3);if(rows.length)sh.getRange(2,1,rows.length,3).setValues(rows);styleDataSheet_(sh,3);
}

function backupNow() { backupNow_('수동 백업'); SpreadsheetApp.getUi().alert('현재 데이터를 백업했습니다.'); }
function backupNow_(label) {
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ensureSheet_(ss,SHEETS.backup,['백업 ID','백업 일시','구간','전체 구간','JSON 조각']);
  var json=JSON.stringify({label:label,questions:readQuestions_(),seasons:readSeasons_(),detailTypes:readTypes_()});
  var size=45000,chunks=[];for(var i=0;i<json.length;i+=size)chunks.push(json.slice(i,i+size));
  var id='BK-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd-HHmmss');
  var rows=chunks.map(function(chunk,index){return[id,new Date(),index+1,chunks.length,chunk];});
  if(rows.length)sh.getRange(sh.getLastRow()+1,1,rows.length,5).setValues(rows);
}

function ensureSheet_(ss,name,headers) {
  var sh=ss.getSheetByName(name)||ss.insertSheet(name);
  var current=sh.getRange(1,1,1,headers.length).getValues()[0];
  if(current.join('|')!==headers.join('|'))sh.getRange(1,1,1,headers.length).setValues([headers]);
  styleDataSheet_(sh,headers.length);return sh;
}
function ensureMasterSheet_(ss) {
  var sh=ss.getSheetByName(SHEETS.master)||ss.insertSheet(SHEETS.master);
  var first=String(sh.getRange(1,1).getValue()||'');
  var third=String(sh.getRange(1,3).getValue()||'');
  if(first==='문제 ID'&&third!=='연도') {
    sh.insertColumnBefore(3);
    if(sh.getLastRow()>1)sh.getRange(2,3,sh.getLastRow()-1,1).setValues(Array(sh.getLastRow()-1).fill([String(new Date().getFullYear())]));
  }
  if(first==='문제 ID'&&String(sh.getRange(1,7).getValue()||'')==='유형'&&String(sh.getRange(1,8).getValue()||'')!=='세부 유형') {
    sh.insertColumnAfter(7);
  }
  sh.getRange(1,1,1,MASTER_HEADERS.length).setValues([MASTER_HEADERS]);
  styleDataSheet_(sh,MASTER_HEADERS.length);
  return sh;
}
function styleDataSheet_(sh,cols) { sh.setFrozenRows(1);sh.getRange(1,1,1,cols).setBackground('#17233D').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');sh.getRange(1,1,Math.max(1,sh.getLastRow()),cols).setVerticalAlignment('top').setWrap(true); }
function clearBody_(sh,cols) { if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,Math.max(cols,sh.getLastColumn())).clearContent(); }
function writeSetting_(key,value,description) { var sh=ensureSheet_(SpreadsheetApp.openById(SPREADSHEET_ID),SHEETS.settings,['설정 키','값','설명']),values=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,3).getValues():[],row=-1;for(var i=0;i<values.length;i++)if(values[i][0]===key)row=i+2;if(row<0)row=sh.getLastRow()+1;sh.getRange(row,1,1,3).setValues([[key,value,description]]); }
function safeCell_(v) { var s=String(v||'');return /^[=+@]/.test(s)?"'"+s:s; }
function safeFilename_(s) { return String(s).replace(/[\\/:*?"<>|#%{}~]/g,'_').replace(/\s+/g,' ').trim().slice(0,120); }
function pad2_(n) { return ('0'+Number(n)).slice(-2); }
function toIso_(v) { if(!v)return'';var d=new Date(v);return isNaN(d.getTime())?String(v):d.toISOString(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
