const express = require("express");
const Raffle = require("../models/Raffle");
const Ticket = require("../models/Ticket");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ---- Público: un participante aparta un número ----
router.post("/public/:slug/reserve", async (req, res) => {
  try {
    const { number, name, idNumber, phone, email, paymentMethod, paymentProof } = req.body;

    if (!number || !name || !phone) {
      return res.status(400).json({ error: "Número, nombre y teléfono son obligatorios." });
    }
    if (paymentProof && !/^data:image\/(png|jpe?g|webp);base64,/.test(paymentProof)) {
      return res.status(400).json({ error: "El comprobante debe ser una imagen (png, jpg o webp)." });
    }

    const raffle = await Raffle.findOne({ slug: req.params.slug });
    if (!raffle || raffle.status !== "published") {
      return res.status(404).json({ error: "Esta rifa no está disponible para reservas." });
    }

    const ticket = await Ticket.findOne({ raffle: raffle._id, number });
    if (!ticket) return res.status(404).json({ error: "Ese número no existe en esta rifa." });
    if (ticket.status !== "available") {
      return res.status(409).json({ error: "Ese número ya fue apartado por otra persona." });
    }

    ticket.status = "reserved";
    ticket.buyer = { name, idNumber, phone, email };
    ticket.paymentMethod = paymentMethod;
    ticket.paymentProof = paymentProof || null;
    ticket.reservedAt = new Date();
    await ticket.save();

    res.status(201).json({
      ticket: {
        number: ticket.number,
        status: ticket.status,
        qrCode: ticket.qrCode,
      },
      message: "Número apartado. El organizador confirmará tu pago para asegurar tu cupo.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al apartar el ticket." });
  }
});

// ---- Público: adjuntar o reemplazar el comprobante de pago de un ticket ya reservado ----
router.post("/public/:slug/ticket/:number/proof", async (req, res) => {
  try {
    const { phone, paymentProof } = req.body;

    if (!phone || !paymentProof) {
      return res.status(400).json({ error: "Teléfono y comprobante son obligatorios." });
    }
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(paymentProof)) {
      return res.status(400).json({ error: "El comprobante debe ser una imagen (png, jpg o webp)." });
    }

    const raffle = await Raffle.findOne({ slug: req.params.slug });
    if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });

    const ticket = await Ticket.findOne({ raffle: raffle._id, number: req.params.number });
    if (!ticket) return res.status(404).json({ error: "Ticket no encontrado." });
    if (ticket.status === "available") {
      return res.status(400).json({ error: "Primero debes apartar este número." });
    }
    if (ticket.status === "winner") {
      return res.status(400).json({ error: "Este ticket ya no admite cambios." });
    }
    if (ticket.buyer?.phone !== phone) {
      return res.status(403).json({ error: "El teléfono no coincide con el de la reserva de este número." });
    }

    ticket.paymentProof = paymentProof;
    await ticket.save();

    res.json({ ok: true, message: "Comprobante recibido. El organizador lo revisará para confirmar tu pago." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al subir el comprobante." });
  }
});

// ---- Público: consultar el estado de un ticket propio ----
router.get("/public/:slug/ticket/:number", async (req, res) => {
  const raffle = await Raffle.findOne({ slug: req.params.slug });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });

  const ticket = await Ticket.findOne({ raffle: raffle._id, number: req.params.number });
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado." });

  res.json({
    ticket: {
      number: ticket.number,
      status: ticket.status,
      qrCode: ticket.qrCode,
      buyerName: ticket.buyer?.name || null,
    },
  });
});

// ---- Organizador: listar tickets de una rifa propia ----
router.get("/mine/:raffleId", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.raffleId, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });

  const filter = { raffle: raffle._id };
  if (req.query.status) filter.status = req.query.status;

  const tickets = await Ticket.find(filter).sort({ number: 1 });
  res.json({ tickets });
});

// ---- Organizador: confirmar el pago de un ticket reservado ----
router.post("/mine/:raffleId/:ticketId/confirm", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.raffleId, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });

  const ticket = await Ticket.findOne({ _id: req.params.ticketId, raffle: raffle._id });
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado." });
  if (ticket.status !== "reserved") {
    return res.status(400).json({ error: "Solo puedes confirmar tickets que estén reservados." });
  }

  ticket.status = "confirmed";
  ticket.confirmedAt = new Date();
  await ticket.save();

  res.json({ ticket });
});

// ---- Organizador: liberar un ticket (cancelar reserva o revertir confirmación) ----
router.post("/mine/:raffleId/:ticketId/release", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.raffleId, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });

  const ticket = await Ticket.findOne({ _id: req.params.ticketId, raffle: raffle._id });
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado." });
  if (ticket.status === "winner") {
    return res.status(400).json({ error: "No puedes liberar el ticket ganador." });
  }

  ticket.status = "available";
  ticket.buyer = undefined;
  ticket.paymentMethod = undefined;
  ticket.reservedAt = null;
  ticket.confirmedAt = null;
  await ticket.save();

  res.json({ ticket });
});

module.exports = router;
