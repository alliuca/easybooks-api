const fs = require('fs');
const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const invoicesDirPath = './files/invoices';

app.get('/api/invoices', (req, res) => {
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

      res.status(200).send(`Invoice #${newInvoiceNumber} has ben saved correctly`);
    });
  });
});

app.listen(3030, () => console.log('Listening on port 3030'));
