require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const busboyBodyParser = require('busboy-body-parser');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const passportService = require('./services/passport');
const app = express();

const requireAuth = passport.authenticate('jwt', { session: false });

mongoose.connect(`mongodb://${process.env.MONGO_HOST}/easybooks`);

// consider moving all this in a separate thing
const User = require('./models/user');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // console.log('CONNECTED TO MONGODB');
  User.findOne({ email: 'demo@easybooks.io' }).then(user => {
    if (!user) {
      var demoUser = new User({ email: 'demo@easybooks.io', password: 'demo@easybooks.io' });
      demoUser.save();
    }
  });
});

app.use(express.json());
app.use(passport.initialize());
app.use(busboyBodyParser());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});
app.use(express.static('./public'));

const filesDirPath = './files';
const invoicesDirPath = './files/invoices';
const uploadDirPath = './public/files/upload';
const invoicesPDFPublicPath = './public/files/invoices';
const settingsFile = `${filesDirPath}/settings.json`;
const profileFile = `${filesDirPath}/profile.json`;

if (!fs.existsSync(settingsFile)) fs.writeFileSync(settingsFile, '{}');
if (!fs.existsSync(profileFile)) fs.writeFileSync(profileFile, '{}');

app.post('/api/login', (req, res) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    console.log('user', user);
    if (err || !user) {
      return res.status(200).json({
        message: 'Something went wrong',
        user: user,
      });
    }

    req.login(user, { session: false }, err => {
      if (err)
        res.send(err);
      const token = jwt.sign(user.toJSON(), 'some_jwt_secret');
      return res.json({ user, token });
    });
  })(req, res);
});

app.get('/api/invoices', requireAuth, (req, res) => {
  if (!fs.existsSync(invoicesDirPath)) {
    fs.mkdirSync(invoicesDirPath);
  }

  fs.readdir(invoicesDirPath, (err, dirs) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    var output = [];
    dirs.map(dir => {
      const files = fs.readdirSync(`${invoicesDirPath}/${dir}`);

      if (!files)
        return res.status(500).send({ message: `${err}` });

      const data = fs.readFileSync(`${invoicesDirPath}/${dir}/${files[0]}`, 'utf8');
      output.push(JSON.parse(data));
    });
    res.status(200).send(output);
  });
});

app.get('/api/invoices/:number', requireAuth, (req, res) => {
  const { number } = req.params;
  const invoiceToGetPath = `${invoicesDirPath}/${number}`;

  if (!fs.existsSync(invoiceToGetPath))
    return res.status(200).send({ message: `Invoice #${number} not found` });

  const files = fs.readdirSync(invoiceToGetPath);
  const locales = [];
  files.map(file => locales.push(file.substring(0, 2)));
  res.status(200).send(locales);
});

app.get('/api/invoices/:number/:locale', requireAuth, (req, res) => {
  const { number, locale } = req.params;
  const invoiceToGetPath = `${invoicesDirPath}/${number}/${locale.toUpperCase()}_invoice-${number}.json`;

  if (!fs.existsSync(invoiceToGetPath))
    return res.status(200).send({ message: `Invoice #${number} not found` });

  const data = fs.readFileSync(invoiceToGetPath, 'utf8');
  res.status(200).send(JSON.parse(data));
});

app.get('/api/invoices/:number/:locale/pdf', requireAuth, (req, res) => {
  const { number, locale } = req.params;
  const invoiceToGetPath = `${invoicesDirPath}/${number}/${locale.toUpperCase()}_invoice-${number}.json`;
  const invoicePdfPath = `${invoicesPDFPublicPath}/${locale.toUpperCase()}_invoice-${number}.pdf`;

  if (!fs.existsSync(invoiceToGetPath))
    return res.status(200).send({ message: `Invoice #${number} not found` });

  if (!fs.existsSync(invoicesPDFPublicPath))
    fs.mkdirSync(invoicesPDFPublicPath);

  const data = fs.readFileSync(invoiceToGetPath, 'utf8');
  const settings = fs.readFileSync(`${filesDirPath}/settings.json`, 'utf8');
  const profile = fs.readFileSync(`${filesDirPath}/profile.json`, 'utf8');

  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(invoicePdfPath));
  require(`./files/templates/invoice-${locale}.js`)(doc, Object.assign({}, JSON.parse(data), { settings: JSON.parse(settings) }, JSON.parse(profile)));

  res.status(200).send(invoicePdfPath.replace('./public/', ''));
});

app.post('/api/invoices/:number/:locale', requireAuth, (req, res) => {
  const { number, locale } = req.params;
  const newInvoiceNumberPath = `${invoicesDirPath}/${number}`;
  const newInvoicePath = `${newInvoiceNumberPath}/${locale}_invoice-${number}.json`;

  if (!fs.existsSync(newInvoiceNumberPath)) {
    fs.mkdirSync(newInvoiceNumberPath);
  }

  fs.readdir(newInvoiceNumberPath, (err, files) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    const data = req.body;
    fs.writeFile(newInvoicePath, JSON.stringify(data), (err) => {
      if (err)
        return res.status(500).send({ message: `${err}` });

      res.status(200).send(`Invoice #${number} (${locale}) has been saved correctly`);
    });
  });
});

app.delete('/api/invoices/:number/:locale', requireAuth, (req, res) => {
  const { number, locale } = req.params;
  const invoiceToDeleteNumberPath = `${invoicesDirPath}/${number}`;
  const invoiceToDeletePath = `${invoiceToDeleteNumberPath}/${locale}_invoice-${number}.json`;

  fs.unlink(invoiceToDeletePath, (err) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    const files = fs.readdirSync(`${invoiceToDeleteNumberPath}`);
    if (files && files.length === 0) {
      fs.rmdirSync(invoiceToDeleteNumberPath);
    }

    res.status(200).send(`Invoice #${number} (${locale}) has been deleted`);
  });
});

app.get('/api/settings', requireAuth, (req, res) => {
  fs.readFile(`${filesDirPath}/settings.json`, { encoding: 'utf8' }, (err, data) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(JSON.parse(data));
  });
});

app.post('/api/settings', requireAuth, (req, res) => {
  const settingsPath = `${filesDirPath}/settings.json`;

  const data = req.body;
  fs.writeFile(settingsPath, JSON.stringify(data), (err) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(`Settings has been saved correctly`);
  });
});

app.get('/api/profile', requireAuth, (req, res) => {
  fs.readFile(`${filesDirPath}/profile.json`, (err, data) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(JSON.parse(data));
  });
});

app.post('/api/profile', requireAuth, (req, res) => {
  const profilePath = `${filesDirPath}/profile.json`;

  const data = req.body;
  fs.writeFile(profilePath, JSON.stringify(data), (err) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(`Profile has been saved correctly`);
  });
});

app.post('/api/upload', requireAuth, (req, res) => {
  if (!fs.existsSync(uploadDirPath)) {
    fs.mkdirSync(uploadDirPath);
  }

  const files = req.files;
  const key = Object.keys(files)[0];

  if (!fs.existsSync(`${uploadDirPath}/${key}`)) {
    fs.mkdirSync(`${uploadDirPath}/${key}`);
  }

  const newFilePath = `${uploadDirPath}/${key}/${files[key].name}`;
  fs.writeFile(newFilePath, files[key].data, (err) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(`${newFilePath} has been saved correctly`);
  });
});

const httpServer = http.createServer(app);
httpServer.listen(process.env.HTTP_PORT, () => console.log(`Listening on port ${process.env.HTTP_PORT}`));

// Create HTTPS server on production
if (fs.existsSync('/etc/letsencrypt/live/apis.alliuca.com/')) {
  const privateKey  = fs.readFileSync('/etc/letsencrypt/live/apis.alliuca.com/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/apis.alliuca.com/fullchain.pem', 'utf8');
  const credentials = {key: privateKey, cert: certificate};
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(process.env.HTTPS_PORT, () => console.log(`Listening on port ${process.env.HTTPS_PORT}`));
}
