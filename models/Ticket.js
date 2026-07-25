const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    raffle: { type: mongoose.Schema.Types.ObjectId, ref: "Raffle", required: true, index: true },
    number: { type: String, required: true }, // ej: "007"
    status: {
      type: String,
      enum: ["available", "reserved", "confirmed", "winner"],
      default: "available",
    },
    buyer: {
      name: { type: String, trim: true },
      idNumber: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    paymentMethod: { type: String, trim: true },
    paymentProof: { type: String, default: null }, // data URL de la imagen del comprobante subido por el participante
    qrCode: { type: String, default: null }, // data URL del QR único del ticket
    reservedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ raffle: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("Ticket", ticketSchema);
