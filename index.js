const fs = require('fs');
const express = require('express');
const PDFDocument = require('pdfkit');
const invoiceTemplate = require('./files/templates/invoice.js');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.static('./public'));

const invoicesDirPath = './files/invoices';
const invoicesPDFPublicPath = './public/files/invoices';

app.get('/api/invoices', (req, res) => {
  fs.readdir(invoicesDirPath, (err, files) => {
    if (err)
      return res.status(500).send({ message: `${err}` });

    var output = [];
    files.filter(file => file.split('.').pop() !== 'pdf').map(file => {
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

  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(invoicePdfPath));
  invoiceTemplate(doc, JSON.parse(data));

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

app.listen(3030, () => console.log('Listening on port 3030'));