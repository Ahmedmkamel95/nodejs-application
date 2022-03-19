const express = require('express')
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

app.get('/', async (req, res) => res.render('login'))

app.post('/upload', upload.single('avatar'), async (req, res) => {
  const workbook = XLSX.readFile(req.file.path)
  data = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1)
  res.render('index', { isdisabled: false })
})

app.post('/login', async (req, res) => {
  // TODO: login logic here
  res.render('index', { isdisabled: true })
})

app.post('/Orange', async (req, res) => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  for (let i = 0; i < data.length; i++) {
    const element = data[i].Phone
    console.log(element)

    await page.goto('https://dsl.orange.eg/ar/myaccount/pay-bill', { waitUntil: 'networkidle2' })
    await page.type('.FormControl.FL input', String('0' + element), { delay: 50 })
    await page.click('#ctl00_ctl33_g_b2324828_3a1e_47b3_96a3_ff169f762c76_ctl00_btnGetUserBills')

    // await page.waitForNavigation({ waitUntil: 'networkidle0' })

    const txt = await Promise.race([
      page.waitForSelector('.GeneralLink span')
    ])

    console.log(await txt.evaluate(el => el.textContent))
  }
})

app.post('/We', async (req, res) => {
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
})

app.listen(3000)
