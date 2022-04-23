const express = require('express');
const router = express.Router();
const Joi = require('@hapi/joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const userService = require('./user.service');
const app = express()
const XLSX = require('xlsx')
const puppeteer = require('puppeteer')
const multer = require('multer');
const { string } = require('@hapi/joi');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname)
})
const upload = multer({ storage: storage })

let data = []

app.set('views', 'views')
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'ejs')

// routes
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeTokenSchema, revokeToken);
router.get('/', authorize(Role.Admin), getAll);
router.get('/:id', authorize(), getById);
router.get('/:id/refresh-tokens', authorize(), getRefreshTokens);
router.post('/upload', upload.single('avatar'), uploadfile);
router.post('/We', We);
router.post('/WeAPi', WeAPi);
router.post('/Orange', Orange);
router.post('/Vodafone', Vodafone);
router.post('/Etisalat', Etisalat);

module.exports = router;
const map = {
  "2": "Cairo",
  "3": "Alexandria",
  "40": "Al Gharbya",
  "88": "Assiut",
  "97": "Aswan",
  "45": "Behira",
  "82": "Beni Souif",
  "50": "Dakahliya",
  "57": "Damietta",
  "84": "Fayoum",
  "64": "Ismalia",
  "47": "Kafr El-Sheikh",
  "95": "Luxor",
  "46": "Matroh",
  "86": "Menia",
  "48": "Menoufia",
  "68": "North Sinai",
  "66": "Port Said",
  "13": "Qaliobia",
  "96": "Quina",
  "55": "Sharkia",
  "93": "Souhag",
  "69": "South Sinai",
  "62": "Suez",
  "92": "Wadi Gadid",
  "15": "10th of Ramadan",
  "65": "Red Sea"
};
const maparr = {
  "1": "2",
  "2": "3",
  "3": "40",
  "4": "88",
  "5": "97",
  "6": "45",
  "7": "82",
  "8": "50",
  "9": "57",
  "10": "84",
  "11": "64",
  "12": "47",
  "13": "95",
  "14": "46",
  "15": "86",
  "16": "48",
  "17": "68",
  "18": "66",
  "19": "13",
  "20": "96",
  "21": "65",
  "22": "55",
  "23": "93",
  "24": "69",
  "25": "62",
  "26": "92",
  "27": "15",
};


function authenticateSchema(req, res, next) {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });
  validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
  const { username, password } = req.body;
  const ipAddress = req.ip;
  userService.authenticate({ username, password, ipAddress })
    .then(({ refreshToken, ...user }) => {
      setTokenCookie(res, refreshToken);
      res.render('index', { isdisabled: true });
      // res.json(user);
    })
    .catch(next);
}

function refreshToken(req, res, next) {
  const token = req.cookies.refreshToken;
  const ipAddress = req.ip;
  userService.refreshToken({ token, ipAddress })
    .then(({ refreshToken, ...user }) => {
      setTokenCookie(res, refreshToken);
      res.json(user);
    })
    .catch(next);
}

function revokeTokenSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().empty('')
  });
  validateRequest(req, next, schema);
}

function revokeToken(req, res, next) {
  // accept token from request body or cookie
  const token = req.body.token || req.cookies.refreshToken;
  const ipAddress = req.ip;

  if (!token) return res.status(400).json({ message: 'Token is required' });

  // users can revoke their own tokens and admins can revoke any tokens
  if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  userService.revokeToken({ token, ipAddress })
    .then(() => res.json({ message: 'Token revoked' }))
    .catch(next);
}

function getAll(req, res, next) {
  userService.getAll()
    .then(users => res.json(users))
    .catch(next);
}

function getById(req, res, next) {
  // regular users can get their own record and admins can get any record
  if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  userService.getById(req.params.id)
    .then(user => user ? res.json(user) : res.sendStatus(404))
    .catch(next);
}

function getRefreshTokens(req, res, next) {
  // users can get their own refresh tokens and admins can get any user's refresh tokens
  if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  userService.getRefreshTokens(req.params.id)
    .then(tokens => tokens ? res.json(tokens) : res.sendStatus(404))
    .catch(next);
}

// helper functions

function setTokenCookie(res, token) {
  // create http only cookie with refresh token that expires in 7 days
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
  res.cookie('refreshToken', token, cookieOptions);
}
async function uploadfile(req, res, next) {
  const workbook = XLSX.readFile(req.file.path)
  data = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1)
  console.log(data);
  res.render('index', { isdisabled: false })
}
async function Orange(req, res, next) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  console.time();
  for (let i = 0; i < data.length; i++) {
    try {
      const element = data[i].Phone;
      const Code = data[i].Code;
      console.log((String(Code).length ? '0' : '') + Code + element)

      await page.goto('https://dsl.orange.eg/ar/myaccount/pay-bill', { waitUntil: 'networkidle2' })
      await page.waitForSelector('.FormControl.FL input')
      await page.waitForSelector('#ctl00_ctl33_g_b2324828_3a1e_47b3_96a3_ff169f762c76_ctl00_btnGetUserBills')

      const ele = await Promise.race([
        page.waitForSelector('#ctl00_ctl33_g_b2324828_3a1e_47b3_96a3_ff169f762c76_ctl00_btnGetUserBills')
      ])

      console.log(await ele.evaluate(el => el.textContent))
      await page.type('.FormControl.FL input', ((String(Code).length ? '0' : '') + Code + element), { delay: 50 })
      await page.click('#ctl00_ctl33_g_b2324828_3a1e_47b3_96a3_ff169f762c76_ctl00_btnGetUserBills')

      const txt = await Promise.race([
        page.waitForSelector('.GeneralLink span'),
        page.waitForSelector('.TariffTableClasses')
      ])

      console.log(await txt.evaluate(el => el.textContent))
      data[i].statusOrange = await txt.evaluate(el => el.textContent);
      console.log(data[i].status)
    } catch {
      --i;
      continue;
    }
  }
  console.timeEnd('orange :: ');
  await convertToExcelSheet(data, 'orange');
  res.send(data);
}
async function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}
async function We(req, res, next) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  console.time();
  for (let i = 0; i < data.length; i++) {
    try {
      const element = String(data[i].Phone)
      const Code = String(data[i].Code)
      var mohafza = await getKeyByValue(maparr, Code);
      console.log(element)
      await page.goto('https://my.te.eg/anonymous/AdslPayment', { waitUntil: 'networkidle2' })

      await page.waitForSelector('.p-inputmask.p-inputtext.p-component')
      await page.waitForSelector(':nth-child(3) > .col-md-6 > .p-inputtext-sm')
      await page.waitForSelector('.p-dropdown-label')

      await page.type('.p-inputmask.p-inputtext.p-component', ' ' + element, { delay: 50 })
      await page.type(':nth-child(3) > .col-md-6 > .p-inputtext-sm', ' m@m.com', { delay: 50 })
      await page.click('.p-dropdown-label')
      console.log("code :" + mohafza)
      await page.click(':nth-child(' + mohafza + ') > .p-dropdown-item')
      // await page.select('body > app-root > div > div.p-mt-5.top-relative > app-anonymous-adsl-payment > div > p-card > div > div > div > div > form > div:nth-child(1) > div:nth-child(1) > p-dropdown > div',mohafza,{ delay: 50 });
      await page.click('.col-12 > :nth-child(2)')

      const txt = await Promise.race([
        page.waitForSelector('.p-toast-message-content'),
        page.waitForSelector('.p-field-radiobutton.mb-0.py-3')
      ])
      var result = await txt.evaluate(el => el.textContent);
      let checkError = result.includes("Subscriber information is not exist.");
      console.log(result)
      if (checkError == true) {
        data[i].statusWe = "الرقم غير متاح";
      }
      else {
        data[i].statusWe = "الرقم متاح للتعاقد ";
      }
      console.log(data[i].status)
    }
    catch {
      --i;
      continue;
    }
  }
  console.timeEnd('we :: ');
  await convertToExcelSheet(data, 'we');
  res.send(data)
}

async function Vodafone(req, res, next) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('https://extranet.vodafone.com.eg/dealer/#/login', { waitUntil: 'networkidle2' })

  await page.waitForSelector('#exampleInputEmail1')
  await page.waitForSelector('#exampleInputPassword1')
  await page.waitForSelector('#exampleInputPin1')
  await page.waitForSelector('body > app-root > app-login > div.container-fluid.login.ng-star-inserted > div > div > form > button')

  await page.type('#exampleInputEmail1', req.body.username, { delay: 50 });
  await page.type('#exampleInputPassword1', req.body.password, { delay: 50 });
  await page.type('#exampleInputPin1', req.body.code, { delay: 50 });
  await page.click('body > app-root > app-login > div.container-fluid.login.ng-star-inserted > div > div > form > button');

  await page.waitForSelector('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf_retailTabs > div > ul > li.ng-star-inserted > a');
  await page.click('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf_retailTabs > div > ul > li.ng-star-inserted > a');

  console.time();
  for (let i = 0; i < data.length; i++) {
    try {
      const element = String(data[i].Phone);
      const code = String(data[i].Code);
      console.log(code + element)

      await page.goto('https://extranet.vodafone.com.eg/dealer/#/services/adsl', { waitUntil: 'networkidle2' })

      await page.waitForSelector('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div:nth-child(1) > div > input');
      await page.waitForSelector('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div:nth-child(1) > div > div > select');
      await page.waitForSelector('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div:nth-child(2) > select');
      await page.waitForSelector('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div.btns.text-center > button.btn.next-btn.ml-2');
      await page.type('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div:nth-child(1) > div > input', element, { delay: 50 });
      await page.type('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div:nth-child(1) > div > div > select', '0' + code, { delay: 100 });
      await page.select('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div:nth-child(2) > select', 'ضوئي');
      await page.click('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.first-content.ng-star-inserted > form > div.btns.text-center > button.btn.next-btn.ml-2');

      const txt = await Promise.race([
        page.waitForSelector('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.serviceContent_halfSec > div > p', { timeout: 3000 }).catch(error => console.log('failed to wait  for the selector')),
        page.waitForSelector('body > app-root > app-dealer-engagement > app-home > div > div > div > div.vf-retailTabs_content > app-adsl > div > div > div > div > div > div.clientType.ng-star-inserted > p', { timeout: 3000 }).catch(error => console.log('failed to wait selector 2')),
      ])

      var result = await txt.evaluate(el => el.textContent);
      console.log(result)
      let checkError = result.includes("بيانات العميل");
      if (checkError == true) {
        data[i].statusVodafone = "الرقم متاح للتعاقد ";
      }
      else {
        data[i].statusVodafone = result;
      }
      console.log(data[i].status)
    }
    catch {
      --i;
      continue;
    }
  }
  console.timeEnd('vodafone :: ');
  await convertToExcelSheet(data, 'vodafone');
  res.send(data)
}

async function Etisalat(req, res, next) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('https://newextranet.etisalat.com.eg/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#username')
  await page.waitForSelector('#password')
  await page.waitForSelector('#overview > section:nth-child(1) > div > div.mdl-card__supporting-text > form > button')

  await page.type('#username', req.body.username, { delay: 50 })
  await page.type('#password', req.body.password, { delay: 50 })
  await page.click('#overview > section:nth-child(1) > div > div.mdl-card__supporting-text > form > button')

  await page.waitForSelector('#overview > section.section--centerwelcome.mdl-grid.mdl-grid--no-spacing.mdl-shadow--2dp > div')
  console.time();
  for (let i = 0; i < data.length; i++) {
    try {
      const element = String(data[i].Phone)
      const code = String(data[i].Code)

      console.log(code + element)

      await page.goto('https://newextranet.etisalat.com.eg/pages/dsl/newDslReqLandLine.dts', { waitUntil: 'networkidle2' })

      await page.waitForSelector('#landLine')
      await page.waitForSelector('#landLineType')
      await page.waitForSelector('#msisdnCheck > td')

      await page.type('#landLine', '0' + code + element, { delay: 50 })
      await page.type('#landLineType', 'MSAN', { delay: 50 })
      await page.click('#msisdnCheck > td > a');

      const txt = await Promise.race([
        page.waitForSelector('#customerBasicData > td > table > tbody > tr:nth-child(1) > td > fieldset > legend'),
        page.waitForSelector('#errorMessage')
      ])
      var result = await txt.evaluate(el => el.textContent);
      let checkError = result.includes("DSL");
      if (checkError) {
        data[i].statusEtisalat = result;
        console.log("ana hene ")
      }
      else {
        data[i].statusEtisalat = "غير متصل بخط dsl"
      }
      console.log(data[i].status)
    }
    catch {
      --i;
      continue;
    }
  }
  console.timeEnd('etisalat :: ');
  await convertToExcelSheet(data, 'etisalat');
  res.send(data)
}
async function convertToExcelSheet(data, prefix) {
  let binaryWS = XLSX.utils.json_to_sheet(data);

  // Create a new Workbook
  var wb = XLSX.utils.book_new()

  // Name your sheet
  XLSX.utils.book_append_sheet(wb, binaryWS, 'Binary values')

  // export your excel
  XLSX.writeFile(wb, prefix + '.xlsx');
}

async function WeAPi(req, res, next) {
  const browser = await puppeteer.launch({
    args: ["--enable-features=NetworkService", "--no-sandbox"],
    ignoreHTTPSErrors: true,
    headless: false
  });

  const page = await browser.newPage()

  for (let i = 0; i < data.length; i++) {
    await page.goto('https://my.te.eg/anonymous/AdslPayment', { waitUntil: 'networkidle2' })
    await page.setRequestInterception(true);
    page.once("request", interceptedRequest => {
      interceptedRequest.continue({
        method: "POST",
        postData: req.body,
        headers: req.header
      });
    });
    const response = await page.goto("https://api-my.te.eg/api/line/adsl/amount");

    console.log({
      url: response.url(),
      statusCode: response.status(),
      body: await response.text()
    });
    /* const element = String(data[i].Phone)
     const Code = String(data[i].Code)
     var mohafza = await getKeyByValue(maparr,Code);
     console.log(element)
     await page.goto('https://my.te.eg/anonymous/AdslPayment', { waitUntil: 'networkidle2' })
 
     await page.waitForSelector('.p-inputmask.p-inputtext.p-component')
     await page.waitForSelector(':nth-child(3) > .col-md-6 > .p-inputtext-sm')
     await page.waitForSelector('.p-dropdown-label')
 
     await page.type('.p-inputmask.p-inputtext.p-component', ' ' + element, { delay: 50 })
     await page.type(':nth-child(3) > .col-md-6 > .p-inputtext-sm', ' m@m.com', { delay: 50 })
     await page.click('.p-dropdown-label')
     await page.click(':nth-child(1) > .p-dropdown-item')
   // await page.select('body > app-root > div > div.p-mt-5.top-relative > app-anonymous-adsl-payment > div > p-card > div > div > div > div > form > div:nth-child(1) > div:nth-child(1) > p-dropdown > div',mohafza,{ delay: 50 });
     await page.click('.col-12 > :nth-child(2)')
 
     const txt = await Promise.race([
       page.waitForSelector('.p-toast-message-content'),
       page.waitForSelector('.p-field-radiobutton.mb-0.py-3')
     ])
     var result = await txt.evaluate(el => el.textContent);
     console.log(result)
     if (result == " Subscriber information is not exist.") {
       data[i].status = "الرقم غير متاح";
     }
     else {
       data[i].status = "الرقم متاح للتعاقد ";
     }
     console.log(data[i].status)*/
  }
  await convertToExcelSheet(data);
  res.send(data)
} 
