const fs = require('fs');
const express = require('express');
const busboyBodyParser = require('busboy-body-parser');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const passportService = require('./services/passport');
const invoiceTemplate = require('./files/templates/invoice.js');
const app = express();

const requireAuth = passport.authenticate('jwt', { session: false });

mongoose.connect('mongodb://127.0.0.1/easybooks');

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
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.static('./public'));

const filesDirPath = './files';
const invoicesDirPath = './files/invoices';
const uploadDirPath = './public/files/upload';
const invoicesPDFPublicPath = './public/files/invoices';

app.post('/api/login', (req, res) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
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
  fs.readdir(invoicesDirPath, (err, files) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    var output = [];
    files.map(file => {
      const data = fs.readFileSync(`${invoicesDirPath}/${file}`, 'utf8');
      output.push(JSON.parse(data));
    });
    res.status(200).send(output);
  });
});

app.get('/api/invoices/:number', (req, res) => {
  const invoiceToGet = req.params.number;
  const invoiceToGetPath = `${invoicesDirPath}/invoice-${invoiceToGet}.json`;

  if (!fs.existsSync(invoiceToGetPath))
    return res.status(200).send({ message: `Invoice #${invoiceToGet} not found` });

  const data = fs.readFileSync(invoiceToGetPath, 'utf8');
  res.status(200).send(JSON.parse(data));
});

app.get('/api/invoices/:number/pdf', (req, res) => {
  const invoiceToGet = req.params.number;
  const invoiceToGetPath = `${invoicesDirPath}/invoice-${invoiceToGet}.json`;
  const invoicePdfPath = `${invoicesPDFPublicPath}/invoice-${invoiceToGet}.pdf`;

  if (!fs.existsSync(invoiceToGetPath))
    return res.status(200).send({ message: `Invoice #${invoiceToGet} not found` });

  if (!fs.existsSync(invoicesPDFPublicPath))
    fs.mkdirSync(invoicesPDFPublicPath);

  const data = fs.readFileSync(invoiceToGetPath, 'utf8');
  const settings = fs.readFileSync(`${filesDirPath}/settings.json`, 'utf8');
  const profile = fs.readFileSync(`${filesDirPath}/profile.json`, 'utf8');

  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(invoicePdfPath));
  invoiceTemplate(doc, Object.assign({}, JSON.parse(data), JSON.parse(settings), JSON.parse(profile)));

  res.status(200).send(invoicePdfPath.replace('./public/', ''));
});

app.post('/api/invoices/:number', (req, res) => {
  const newInvoiceNumber = req.params.number;
  const newInvoicePath = `${invoicesDirPath}/invoice-${newInvoiceNumber}.json`;

  if (!fs.existsSync(invoicesDirPath)) {
    fs.mkdirSync(invoicesDirPath);
  }

  fs.readdir(invoicesDirPath, (err, files) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    const data = req.body;
    fs.writeFile(newInvoicePath, JSON.stringify(data), (err) => {
      if (err)
        return res.status(500).send({ message: `${err}` });

      res.status(200).send(`Invoice #${newInvoiceNumber} has been saved correctly`);
    });
  });
});

app.delete('/api/invoices/:number', (req, res) => {
  const invoiceToDelete = req.params.number;
  const invoiceToDeletePath = `${invoicesDirPath}/invoice-${invoiceToDelete}.json`;

  fs.unlink(invoiceToDeletePath, (err) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(`Invoice #${invoiceToDelete} has been deleted`);
  });
});

app.get('/api/settings', (req, res) => {
  fs.readFile(`${filesDirPath}/settings.json`, (err, data) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(JSON.parse(data));
  });
});

app.post('/api/settings', (req, res) => {
  const settingsPath = `${filesDirPath}/settings.json`;

  const data = req.body;
  fs.writeFile(settingsPath, JSON.stringify(data), (err) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(`Settings has been saved correctly`);
  });
});

app.get('/api/profile', (req, res) => {
  fs.readFile(`${filesDirPath}/profile.json`, (err, data) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(JSON.parse(data));
  });
});

app.post('/api/profile', (req, res) => {
  const profilePath = `${filesDirPath}/profile.json`;

  const data = req.body;
  fs.writeFile(profilePath, JSON.stringify(data), (err) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    res.status(200).send(`Profile has been saved correctly`);
  });
});

app.post('/api/upload', (req, res) => {
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

app.listen(3030, () => console.log('Listening on port 3030'));
