const SPREADSHEET_ID = "1x-41yDs1h2rg9SDVbr4Z2WXFGywoMiqatV6TbcwZzew";
const TYPE_SOURCE_SHEET = "유형별 출처";
const MOCK_SOURCE_SHEET = "모의고사 소스";
const UNIT_SHEET = "단원 분류";
const BACKUP_FOLDER_ID = "1VOO_xq7neegUolm3VZrp42N26iaN_Pi6";

/**
 * 최초 1회 실행합니다.
 * 상황(C열)은 수정하지 않고 F열에 '사용됨' 체크박스만 만듭니다.
 */
function setupSheet() {
  const sheet = getSpreadsheet_().getSheetByName(TYPE_SOURCE_SHEET);
  if (!sheet) throw new Error(`'${TYPE_SOURCE_SHEET}' 시트를 찾을 수 없습니다.`);

  const lastRow = sheet.getLastRow();
  sheet.getRange("F1").setValue("사용됨");
  sheet.setColumnWidth(6, 74);

  if (lastRow >= 2) {
    const range = sheet.getRange(2, 6, lastRow - 1, 1);
    const values = range.getValues().map(([value]) => [value === true]);
    range.insertCheckboxes();
    range.setValues(values);
  }

  SpreadsheetApp.flush();
  createJsonBackup_();
}

function doGet(e) {
  try {
    const action = String(e?.parameter?.action || "data");
    if (action !== "data") {
      return json_({ ok: false, message: "지원하지 않는 요청입니다." });
    }
    return json_({ ok: true, data: getArchiveData_() });
  } catch (error) {
    return json_({ ok: false, message: error.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const body = JSON.parse(e?.postData?.contents || "{}");
    if (body.action !== "syncUsed") {
      throw new Error("지원하지 않는 요청입니다.");
    }

    const count = syncUsed_(body.changes);
    const backup = createJsonBackup_();

    return json_({
      ok: true,
      updated: count,
      backupName: backup.getName(),
    });
  } catch (error) {
    return json_({ ok: false, message: error.message });
  } finally {
    lock.releaseLock();
  }
}

function syncUsed_(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("반영할 체크 항목이 없습니다.");
  }

  const sheet = getSpreadsheet_().getSheetByName(TYPE_SOURCE_SHEET);
  const lastRow = sheet.getLastRow();
  const values = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
  const seen = new Set();

  changes.forEach((change) => {
    const rowNumber = Number(change?.rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > lastRow) {
      throw new Error(`잘못된 행 번호입니다: ${change?.rowNumber}`);
    }
    if (seen.has(rowNumber)) {
      throw new Error(`중복된 행 번호입니다: ${rowNumber}`);
    }
    seen.add(rowNumber);
    values[rowNumber - 2][0] = change.used === true;
  });

  sheet.getRange(2, 6, values.length, 1).setValues(values);
  SpreadsheetApp.flush();
  return changes.length;
}

function getArchiveData_() {
  const spreadsheet = getSpreadsheet_();
  const typeSheet = spreadsheet.getSheetByName(TYPE_SOURCE_SHEET);
  const mockSheet = spreadsheet.getSheetByName(MOCK_SOURCE_SHEET);
  const unitSheet = spreadsheet.getSheetByName(UNIT_SHEET);

  if (!typeSheet || !mockSheet || !unitSheet) {
    throw new Error("필요한 시트를 모두 찾을 수 없습니다.");
  }

  const typeValues = typeSheet
    .getRange(2, 1, Math.max(typeSheet.getLastRow() - 1, 0), 6)
    .getValues();
  const typeSources = typeValues
    .map((row, index) => ({
      rowNumber: index + 2,
      type: text_(row[0]),
      book: text_(row[1]),
      situation: text_(row[2]),
      choice: text_(row[3]),
      source: text_(row[4]),
      used: row[5] === true,
    }))
    .filter((row) => row.type && (row.situation || row.choice));

  const mockValues = mockSheet
    .getRange(2, 1, Math.max(mockSheet.getLastRow() - 1, 0), 4)
    .getValues();
  const mockSources = mockValues
    .map((row) => ({
      type: text_(row[0]),
      subtype: text_(row[1]),
      situation: text_(row[2]),
      representativeChoice: text_(row[3]),
      frequency: 1,
    }))
    .filter((row) => row.type && row.subtype);

  const unitValues = unitSheet
    .getRange(2, 1, Math.max(unitSheet.getLastRow() - 1, 0), 5)
    .getValues();
  const unitClassifications = unitValues
    .map((row) => ({
      teacher: text_(row[0]),
      majorUnit: text_(row[1]),
      middleUnit: text_(row[2]),
      smallUnit: text_(row[3]),
      course: text_(row[4]),
      type: cleanUnitType_(row[3]),
    }))
    .filter((row) => row.teacher && row.majorUnit && row.middleUnit && row.smallUnit);

  return {
    meta: {
      generatedAt: Utilities.formatDate(
        new Date(),
        "Asia/Seoul",
        "yyyy-MM-dd'T'HH:mm:ss",
      ),
      spreadsheetName: spreadsheet.getName(),
      counts: {
        typeSources: typeSources.length,
        mockSources: mockSources.length,
        unitClassifications: unitClassifications.length,
      },
    },
    typeSources,
    mockSources,
    unitClassifications,
  };
}

function createJsonBackup_() {
  const folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
  const timestamp = Utilities.formatDate(
    new Date(),
    "Asia/Seoul",
    "yyyyMMdd_HHmmss",
  );
  const blob = Utilities.newBlob(
    JSON.stringify(getArchiveData_(), null, 2),
    "application/json",
    `exam-idea_${timestamp}.json`,
  );
  return folder.createFile(blob);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function cleanUnitType_(value) {
  return text_(value)
    .replace(/^[\s★☆◆◇■□●○◎※✓✔·•*]+/g, "")
    .replace(/^\s*\d+\s*[.)\-_:]?\s*/, "")
    .trim();
}

function text_(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
