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
const multer = require('multer')
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
router.post('/Vodafone', Vodafone);
router.post('/Etisalat', Etisalat);

module.exports = router;

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

function setTokenCookie(res, token)
{
    // create http only cookie with refresh token that expires in 7 days
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 7*24*60*60*1000)
    };
    res.cookie('refreshToken', token, cookieOptions);
}
  async function uploadfile(req, res, next) {
    const workbook = XLSX.readFile(req.file.path)
  data = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1)
  console.log(data);
  res.render('index', { isdisabled: false })
}

async function We(req, res, next) {
    const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  for (let i = 0; i < data.length; i++) {
    const element = String(data[i].Phone)
    console.log(element)

    await page.goto('https://my.te.eg/anonymous/AdslPayment', { waitUntil: 'networkidle2' })

    await page.waitForSelector('.p-inputmask.p-inputtext.p-component')
    await page.waitForSelector(':nth-child(3) > .col-md-6 > .p-inputtext-sm')
    await page.waitForSelector('.p-dropdown-label')

    await page.type('.p-inputmask.p-inputtext.p-component', ' ' + element, { delay: 50 })
    await page.type(':nth-child(3) > .col-md-6 > .p-inputtext-sm', ' m@m.com', { delay: 50 })
    await page.click('.p-dropdown-label')
    await page.click(':nth-child(1) > .p-dropdown-item')
    await page.click('.col-12 > :nth-child(2)')

    const txt = await Promise.race([
      page.waitForSelector('.p-toast-message-content'),
      page.waitForSelector('.p-field-radiobutton.mb-0.py-3')
    ])
    data[i].status = await txt.evaluate(el => el.textContent);
    console.log(data[i].status)
  };
  res.send(data)
  }

  async function Vodafone(req, res, next) {
  //  const workbook = XLSX.readFile('bills.xlsx')
 //const data = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1)

    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
  
    for (let i = 0; i < data.length; i++) {
      const element = String(data[i].Phone)
      console.log(element)
  
      await page.goto('https://my.te.eg/anonymous/AdslPayment', { waitUntil: 'networkidle2' })
  
      await page.waitForSelector('.p-inputmask.p-inputtext.p-component')
      await page.waitForSelector(':nth-child(3) > .col-md-6 > .p-inputtext-sm')
      await page.waitForSelector('.p-dropdown-label')
  
      await page.type('.p-inputmask.p-inputtext.p-component', ' ' + element, { delay: 50 })
      await page.type(':nth-child(3) > .col-md-6 > .p-inputtext-sm', ' m@m.com', { delay: 50 })
      await page.click('.p-dropdown-label')
      await page.click(':nth-child(1) > .p-dropdown-item')
      await page.click('.col-12 > :nth-child(2)')
  
      const txt = await Promise.race([
        page.waitForSelector('.p-toast-message-content'),
        page.waitForSelector('.p-field-radiobutton.mb-0.py-3')
      ])
      data[i].status = await txt.evaluate(el => el.textContent);
      console.log(data[i].status)
    };
    res.send(data)
  }
  async function Etisalat(req, res, next) {  
      const browser = await puppeteer.launch({ headless: false })
      const page = await browser.newPage()
      await page.goto('https://newextranet.etisalat.com.eg/', { waitUntil: 'networkidle2' });
      await page.waitForSelector('#username')
      await page.waitForSelector('#password')
      await page.waitForSelector('#overview > section:nth-child(1) > div > div.mdl-card__supporting-text > form > button > span')
    
      await page.type('#username', req.body.username, { delay: 50 })
      await page.type('#password', req.body.password, { delay: 50 })
      await page.click('#overview > section:nth-child(1) > div > div.mdl-card__supporting-text > form > button > span')
    

     for (let i = 0; i < data.length; i++) {
        const element = String(data[i].Phone)
        const code =String(data[i].Code )
        
        console.log(code+element)
    
        await page.goto('https://newextranet.etisalat.com.eg/pages/dsl/newDslReqLandLine.dts', { waitUntil: 'networkidle2' })
    
        await page.waitForSelector('#landLine')
        await page.waitForSelector('#landLineType')
        await page.waitForSelector('#jspx_generated_79 > img')
    
        await page.type('#landLine', '0'+ code + element, { delay: 50 })
        await page.type('#landLineType','MSAN', { delay: 50 })
        await page.click('#jspx_generated_79 > img')
    
        const txt = await Promise.race([
          page.waitForSelector('#customerBasicData > td > table > tbody > tr:nth-child(1) > td > fieldset > legend'),
          page.waitForSelector('#errorMessage')
        ])
        data[i].status = await txt.evaluate(el => el.textContent);
        console.log(data[i].status)
      };
      res.send(data)
    }