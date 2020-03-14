const countries = require("i18n-iso-countries");

module.exports = {
  formatDate: (locale, dateUTC) => {
    var locale = locale === "EN" ? "en-GB" : locale;
    var dateFormat = new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    return dateFormat.format(new Date(dateUTC));
  },

  formatCurrency: (currency, value) => {
    var locale = locale === "EN" ? "en-GB" : locale;
    var numberFormat = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0
    });

    return numberFormat.format(value);
  },

  getCountryName: (code, locale) => {
    return countries.getName(code, locale);
  }
};
