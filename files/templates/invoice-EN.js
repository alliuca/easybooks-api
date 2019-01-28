module.exports = (doc, data) => {
  var page = doc.page;
  var fontSizeBody = 10;
  var fontSizeSmall = 8;
  var fontSizeTableHeading = 11;
  var paddingHorizontal = 35;
  var primaryColor = data.settings.brandColor;
  var secondaryColor = '#908c8c';

  // Add top coloured background

  doc.rect(0, 0, page.width, 120)
    .fill(primaryColor);

  // Add first info column

  doc.circle(60, 62, 20)
    .fill('white')
    .image(`${process.cwd()}/public/files/upload/logo/${data.settings.logo.file.name}`, 40, 42, { fit: [40, 40] });

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.name, 90, 40);

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.taxCode, 90, 60);

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(`VAT: ${data.vat}`, 90, 80);

  // Add second info column

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.phone, 200, 40, { width: 200, align: 'right' });

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.email, 200, 60, { width: 200, align: 'right' });

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.website, 200, 80, { width: 200, align: 'right' });

  // Add third info column

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.addressStreet, page.width - 220, 40, { width: 180, align: 'right' });

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.addressCityCountry, page.width - 220, 60, { width: 180, align: 'right' });

  doc.fontSize(fontSizeBody)
    .fillColor('white')
    .text(data.postalCode, page.width - 220, 80, { width: 180, align: 'right' });

  // Add billed to

  doc.fontSize(fontSizeBody)
    .fillColor(secondaryColor)
    .text('Billed To', 35, 150);

  doc.fontSize(fontSizeBody)
    .fillColor('black')
    .text(data.billedTo, 35, 170, { lineGap: 8 });

  // Add invoice number

  doc.fontSize(fontSizeBody)
    .fillColor(secondaryColor)
    .text('Invoice Number', 210, 150);

  doc.fontSize(fontSizeBody)
    .fillColor('black')
    .text(data.invoiceNumber, 210, 170);

  // Add date of issue

  doc.fontSize(fontSizeBody)
    .fillColor(secondaryColor)
    .text('Date of issue', 210, 208);

  doc.fontSize(fontSizeBody)
  .fillColor('black')
  .text(data.dateOfIssue, 210, 228);

  // Add total

  doc.fontSize(fontSizeBody)
    .fillColor(secondaryColor)
    .text('Invoice Total', page.width - (200 + paddingHorizontal), 150, { width: 200, align: 'right' });

  doc.fontSize(30)
    .fillColor(primaryColor)
    .text(`${data.currency.symbol} ${data.amount}`, page.width - (200 + paddingHorizontal), 170, { width: 200, align: 'right' });

  // Add items' table

  doc.moveTo(30, 290)
      .lineTo(page.width - 30, 290)
      .lineWidth(2)
      .strokeColor(primaryColor)
      .stroke();

  doc.font('Helvetica-Bold');

  doc.fontSize(fontSizeTableHeading)
    .fillColor(primaryColor)
    .text('Description', 35, 305);

  doc.fontSize(fontSizeTableHeading)
    .fillColor(primaryColor)
    .text('Hours', 440, 305, { width: 60, align: 'right' });

  doc.fontSize(fontSizeTableHeading)
    .fillColor(primaryColor)
    .text('Amount', page.width - (70 + paddingHorizontal), 305, { width: 70, align: 'right' });

  doc.font('Helvetica');

  var i = 0;
  var spacingY = 50;

  while (i < data.items.length) {

    doc.fontSize(fontSizeBody)
      .fillColor('black')
      .text(data.items[i].name, 35, 340 + (i * spacingY));

    doc.fontSize(fontSizeSmall)
      .fillColor(secondaryColor)
      .text(data.items[i].description, 35, 360 + (i * spacingY));

    doc.fontSize(fontSizeBody)
      .fillColor('black')
      .text(data.items[i].hours, 440, 340 + (i * spacingY), { width: 60, align: 'right' });

    doc.fontSize(fontSizeBody)
      .fillColor('black')
      .text(`${data.currency.symbol} ${data.items[i].amount}`, page.width - (70 + paddingHorizontal), 340 + (i * spacingY), { width: 70, align: 'right' });

    doc.moveTo(30, 375 + (i * spacingY))
        .lineTo(page.width - 30, 375 + (i * spacingY))
        .lineWidth(1)
        .strokeColor(secondaryColor)
        .stroke();

  i++;

  }

  // Add invoice terms

  doc.fontSize(fontSizeBody)
    .fillColor(secondaryColor)
    .text('Invoice Terms', 35, 515, { width: 200 });

  doc.fontSize(fontSizeBody - 1)
    .fillColor('black')
    .text(data.terms, 35, 535, { width: 200, lineGap: 3 });

  // Add optional fees

  let fees = {
    names: '',
    values: ''
  };
  data.fees.items.map(item => {
    fees.names += `${item.name}\n`;
    fees.values += `${data.currency.symbol} ${item.value}\n`;
  });

  doc.font('Helvetica-Bold');

  doc.fontSize(fontSizeTableHeading)
    .fillColor(primaryColor)
    .text(`Subtotal\n${fees.names}Total\n\nAmount Due`, 250, 515, { width: 200, align: 'right', lineGap: 12 });

  doc.font('Helvetica');

  doc.fontSize(fontSizeBody)
    .fillColor('black')
    .text(`${data.currency.symbol} ${data.subtotal}\n${fees.values}${data.currency.symbol} ${data.amount}\n\n${data.currency.symbol} ${data.amount}`, page.width - (110 + paddingHorizontal), 515, { width: 110, align: 'right', lineGap: 13.8 });

  // Add other notes (e.g. legal)

  const text = data.notes;
  const textWidth = doc.widthOfString(text);
  const textHeight = doc.heightOfString(text, { width: textWidth });

  doc.font('Helvetica-Oblique');

  doc.fontSize(fontSizeSmall)
    .fillColor('black')
    .text(text, 35, page.height - 75 - textHeight);

  doc.font('Helvetica');

  doc.end();
}
