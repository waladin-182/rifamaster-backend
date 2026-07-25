const QRCode = require("qrcode");
const Ticket = require("../models/Ticket");

/**
 * Crea un ticket por cada número de 0 a ticketCount-1, con su número
 * formateado según la cantidad total (ej: 000-099 o 0000-0999) y un
 * QR único que apunta a la verificación pública del ticket.
 */
async function generateTicketsForRaffle(raffle, publicBaseUrl) {
  const digits = String(raffle.ticketCount - 1).length;
  const docs = [];

  for (let i = 0; i < raffle.ticketCount; i += 1) {
    const number = String(i).padStart(digits, "0");
    const verifyUrl = `${publicBaseUrl}/r/${raffle.slug}?ticket=${number}`;
    const qrCode = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

    docs.push({
      raffle: raffle._id,
      number,
      status: "available",
      qrCode,
    });
  }

  await Ticket.insertMany(docs);
}

module.exports = { generateTicketsForRaffle };
