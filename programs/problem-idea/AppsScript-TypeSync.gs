const PROBLEM_IDEA_SYNC = {
  SHEET_NAME: '문항 DB',
  TOKEN_PROPERTY: 'PROBLEM_IDEA_SYNC_TOKEN',
  ID_COLUMN: 1,
  TYPE_COLUMN: 8,
  HEADER_ROWS: 1,
  MAX_EDITS: 1000
};

/**
 * 최초 한 번 실행해 웹페이지에서 사용할 16자 이상의 동기화 키를 저장합니다.
 */
function setProblemIdeaSyncToken() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '문제 아이디어 웹 동기화 키 설정',
    '영문·숫자·기호를 섞어 16자 이상의 키를 입력하세요.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const token = response.getResponseText().trim();
  if (token.length < 16) {
    ui.alert('동기화 키는 16자 이상이어야 합니다.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty(PROBLEM_IDEA_SYNC.TOKEN_PROPERTY, token);
  ui.alert('웹 동기화 키를 저장했습니다.');
}

function doPost(event) {
  try {
    const payload = JSON.parse(event && event.postData && event.postData.contents || '{}');
    verifyProblemIdeaToken_(payload.token);
    if (payload.action === 'loadTypes') return problemIdeaJson_({ok: true, data: loadProblemIdeaTypes_()});
    if (payload.action === 'syncTypes') return problemIdeaJson_(syncProblemIdeaTypes_(payload.edits || []));
    throw new Error('지원하지 않는 작업입니다.');
  } catch (error) {
    return problemIdeaJson_({ok: false, error: String(error && error.message || error)});
  }
}

function verifyProblemIdeaToken_(received) {
  const saved = PropertiesService.getScriptProperties().getProperty(PROBLEM_IDEA_SYNC.TOKEN_PROPERTY);
  if (!saved) throw new Error('Apps Script에서 setProblemIdeaSyncToken을 먼저 실행하세요.');
  if (!received || String(received) !== saved) throw new Error('동기화 키가 올바르지 않습니다.');
}

function getProblemIdeaSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROBLEM_IDEA_SYNC.SHEET_NAME);
  if (!sheet) throw new Error("'문항 DB' 시트를 찾지 못했습니다.");
  const headers = sheet.getRange(1, 1, 1, PROBLEM_IDEA_SYNC.TYPE_COLUMN).getDisplayValues()[0];
  if (headers[0] !== '문항ID' || headers[7] !== '유형') {
    throw new Error("'문항 DB'의 A열은 문항ID, H열은 유형이어야 합니다.");
  }
  return sheet;
}

function loadProblemIdeaTypes_() {
  const sheet = getProblemIdeaSheet_();
  const count = sheet.getLastRow() - PROBLEM_IDEA_SYNC.HEADER_ROWS;
  if (count <= 0) return [];
  return sheet.getRange(2, 1, count, 8).getDisplayValues()
    .filter(row => row[0])
    .map(row => ({id: String(row[0]).trim(), type: String(row[7] || '미분류').trim() || '미분류'}));
}

function syncProblemIdeaTypes_(edits) {
  if (!Array.isArray(edits)) throw new Error('수정 데이터 형식이 올바르지 않습니다.');
  if (!edits.length) return {ok: true, updatedCount: 0};
  if (edits.length > PROBLEM_IDEA_SYNC.MAX_EDITS) throw new Error('한 번에 동기화할 수 있는 문항 수를 초과했습니다.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getProblemIdeaSheet_();
    const count = sheet.getLastRow() - PROBLEM_IDEA_SYNC.HEADER_ROWS;
    const rows = sheet.getRange(2, 1, count, 8).getDisplayValues();
    const rowById = new Map();
    rows.forEach((row, index) => {
      const id = String(row[0] || '').trim();
      if (id) rowById.set(id, {row: index + 2, type: String(row[7] || '미분류').trim() || '미분류'});
    });

    const seen = new Set();
    const plans = edits.map(edit => {
      const id = String(edit.id || '').trim();
      const originalType = String(edit.originalType || '미분류').trim() || '미분류';
      const newType = String(edit.newType || '미분류').trim() || '미분류';
      if (!id || seen.has(id)) throw new Error('비어 있거나 중복된 문항ID가 포함되어 있습니다: ' + id);
      seen.add(id);
      const current = rowById.get(id);
      if (!current) throw new Error('DB에서 찾지 못한 문항입니다: ' + id);
      if (current.type !== originalType) throw new Error('다른 곳에서 먼저 유형이 수정되었습니다: ' + id + ' (현재: ' + current.type + ')');
      return {row: current.row, newType: newType};
    });

    plans.forEach(plan => sheet.getRange(plan.row, PROBLEM_IDEA_SYNC.TYPE_COLUMN).setValue(plan.newType));
    SpreadsheetApp.flush();
    return {ok: true, updatedCount: plans.length};
  } finally {
    lock.releaseLock();
  }
}

function problemIdeaJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
