const SHEET_NAME = "Sheet1";
const SECRET = ""; // Isi misalnya "satpolpp-secret" jika ingin pakai ?secret=satpolpp-secret

function jsonResponse(body, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify({ statusCode: statusCode || 200, ...body }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (SECRET && (!e.parameter || e.parameter.secret !== SECRET)) {
      return jsonResponse({ ok: false, error: "Secret tidak valid." }, 403);
    }

    const payload = JSON.parse((e.postData && e.postData.contents) || "{}");
    const noTiket = String(payload.noTiket || payload.id || "").trim();
    const status = String(payload.status || "").trim();
    const catatan = String(payload.catatan || "").trim();

    if (!noTiket || !status) {
      return jsonResponse({ ok: false, error: "noTiket dan status wajib diisi." }, 400);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return jsonResponse({ ok: false, error: "Sheet belum memiliki data." }, 404);
    }

    const headers = values[0].map((value) => String(value || "").trim());
    const ticketCol = headers.indexOf("NoTiket");
    const statusCol = headers.indexOf("Status");
    const responseCol = headers.indexOf("Waktu Respon");
    const laporanCol = headers.indexOf("Laporan");
    const picCol = headers.indexOf("PIC");

    if (ticketCol < 0 || statusCol < 0) {
      return jsonResponse({ ok: false, error: "Kolom NoTiket atau Status tidak ditemukan." }, 400);
    }

    let rowIndex = -1;
    for (let i = 1; i < values.length; i += 1) {
      if (String(values[i][ticketCol] || "").trim() === noTiket) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex < 0) {
      return jsonResponse({ ok: false, error: "NoTiket tidak ditemukan: " + noTiket }, 404);
    }

    sheet.getRange(rowIndex, statusCol + 1).setValue(status);
    if (responseCol >= 0) sheet.getRange(rowIndex, responseCol + 1).setValue(new Date());
    if (laporanCol >= 0 && catatan) sheet.getRange(rowIndex, laporanCol + 1).setValue(catatan);
    if (picCol >= 0 && payload.updatedBy && payload.updatedBy.nama) {
      sheet.getRange(rowIndex, picCol + 1).setValue(payload.updatedBy.nama);
    }

    return jsonResponse({
      ok: true,
      noTiket,
      status,
      row: rowIndex,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) }, 500);
  }
}
