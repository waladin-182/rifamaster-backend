const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["nequi", "daviplata", "bancolombia", "efectivo", "otro"], required: true },
    label: { type: String, trim: true },
    numberOrAccount: { type: String, trim: true },
    holderName: { type: String, trim: true },
  },
  { _id: false }
);

const raffleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    prize: { type: String, required: true, trim: true },
    prizeValue: { type: Number, default: 0 },
    bannerUrl: { type: String, trim: true, default: "" },
    slug: { type: String, required: true, unique: true, index: true },
    ticketCount: { type: Number, required: true, min: 10, max: 10000 }, // ej: 100, 1000
    pricePerTicket: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "COP" },
    paymentMethods: { type: [paymentMethodSchema], default: [] },
    drawDate: { type: Date },
    status: {
      type: String,
      enum: ["draft", "published", "closed", "drawn"],
      default: "draft",
    },
    winningTicket: { type: String, default: null },
    drawnAt: { type: Date, default: null },
  },
  { timestamps: true }
);

raffleSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    prize: this.prize,
    prizeValue: this.prizeValue,
    bannerUrl: this.bannerUrl,
    slug: this.slug,
    ticketCount: this.ticketCount,
    pricePerTicket: this.pricePerTicket,
    currency: this.currency,
    paymentMethods: this.paymentMethods,
    drawDate: this.drawDate,
    status: this.status,
    winningTicket: this.winningTicket,
    drawnAt: this.drawnAt,
  };
};

module.exports = mongoose.model("Raffle", raffleSchema);
