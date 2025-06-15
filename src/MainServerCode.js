const CONFIG = {
  spreadsheetId: '1bGio7dHqUM5ZQ39hlU9qVY9Q-zIyE7qJctiM2I9KtqU',
  formId: '16sEFd4gZtuPkt2b0b5GNsbaTEZGNhyCX9DslqWRgkyE',
  domain: '@clases.edu.sv',
  targetHour: 14
};

function doGet() {
  console.log('Solicitud GET recibida');
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function generateFormUrl(email) {
  try {
    console.log('Generando URL para:', email);
    const cache = CacheService.getScriptCache();
    const cacheKey = `studentData_${email}`;
    let studentData = JSON.parse(cache.get(cacheKey));

    if (!studentData) {
      console.log('Buscando en spreadsheet...');
      const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
      const sheet = ss.getSheetByName('studentsList');
      const data = sheet.getDataRange().getValues();

      const header = data[0];
      const nieIndex = header.indexOf('NIE');
      const nameIndex = header.indexOf('Nombre Completo');
      const sectionIndex = header.indexOf('Sección');

      const nie = email.split('@')[0];
      console.log('Buscando NIE:', nie);

      for (let i = 1; i < data.length; i++) {
        if (data[i][nieIndex] == nie) {
          studentData = {
            email: email,
            fullName: data[i][nameIndex],
            section: data[i][sectionIndex]
          };
          cache.put(cacheKey, JSON.stringify(studentData), 300);
          console.log('Estudiante encontrado:', studentData);
          break;
        }
      }
    }

    if (!studentData) throw new Error('Estudiante no encontrado');

    const form = FormApp.openById(CONFIG.formId);
    const items = form.getItems();
    const startTime = new Date();
    let response = form.createResponse();

    //const responses = {};

    try {
    items.forEach(item => {
      const title = item.getTitle();
      if (title === 'Nombre Completo') response.withItemResponse(item.asTextItem().createResponse(studentData.fullName));
      if (title === 'Correo') response.withItemResponse(item.asTextItem().createResponse(studentData.email));
      if (title === 'Sección') response.withItemResponse(item.asListItem().createResponse(studentData.section));
      if (title === 'Hora de inicio') response.withItemResponse(item.asTimeItem().createResponse(startTime.getHours(), startTime.getMinutes()));
    });
    } catch (e) {
      console.error("se generó un error en el bucle" + e.message)
    }

    const url = response.toPrefilledUrl()
    console.log('URL generada:', url);

    return {
      url: url,
      studentData: studentData
    };
  } catch (e) {
    console.error('Error en generateFormUrl:', e.message);
    return {error: e.message};
  }
}

function registerFraudAttempt(timestamp, nie, fullName, section) {
  try {
    console.log('Registrando intento de fraude:', {timestamp, fullName, section});
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const sheet = ss.getSheetByName('fraudAttemps');
    sheet.appendRow([timestamp, nie, fullName, section]);
    return true;
  } catch (e) {
    console.error('Error registrando fraude:', e.message);
    return false;
  }
}

function recordLoginTime(email, loginTimeISO) {
  console.log(`Login recorded for ${email} at ${loginTimeISO}`);
  return {status: 'success', email: email, loginTime: loginTimeISO};
}
