const express = require("express");
const Raffle = require("../models/Raffle");
const Ticket = require("../models/Ticket");
const { requireAuth } = require("../middleware/auth");
const { generateUniqueSlug } = require("../utils/slug");
const { generateTicketsForRaffle } = require("../utils/generateTickets");

const router = express.Router();

// Crear una nueva rifa (queda en borrador hasta publicarla)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description, prize, prizeValue, bannerUrl, ticketCount, pricePerTicket, currency, paymentMethods, drawDate } = req.body;

    if (!title || !prize || !ticketCount || pricePerTicket == null) {
      return res.status(400).json({ error: "Título, premio, cantidad de tickets y precio son obligatorios." });
    }

    const slug = await generateUniqueSlug(title);

    const raffle = await Raffle.create({
      owner: req.userId,
      title,
      description,
      prize,
      prizeValue,
      bannerUrl,
      slug,
      ticketCount,
      pricePerTicket,
      currency,
      paymentMethods,
      drawDate,
      status: "draft",
    });

    res.status(201).json({ raffle: raffle.toPublicJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear la rifa." });
  }
});

// Listar mis rifas
router.get("/mine", requireAuth, async (req, res) => {
  const raffles = await Raffle.find({ owner: req.userId }).sort({ createdAt: -1 });
  res.json({ raffles: raffles.map((r) => r.toPublicJSON()) });
});

// Detalle de una rifa propia (incluye stats de tickets)
router.get("/mine/:id", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.id, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });

  const stats = await Ticket.aggregate([
    { $match: { raffle: raffle._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  res.json({ raffle: raffle.toPublicJSON(), stats });
});

// Editar una rifa (solo si sigue en borrador)
router.put("/mine/:id", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.id, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });
  if (raffle.status !== "draft") {
    return res.status(400).json({ error: "Solo puedes editar rifas que aún no han sido publicadas." });
  }

  const editable = ["title", "description", "prize", "prizeValue", "bannerUrl", "ticketCount", "pricePerTicket", "currency", "paymentMethods", "drawDate"];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) raffle[field] = req.body[field];
  });

  await raffle.save();
  res.json({ raffle: raffle.toPublicJSON() });
});

// Publicar: genera el talonario completo de tickets y lo hace visible al público
router.post("/mine/:id/publish", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.id, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });
  if (raffle.status !== "draft") {
    return res.status(400).json({ error: "Esta rifa ya fue publicada." });
  }

  const publicBaseUrl = process.env.PUBLIC_FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
  await generateTicketsForRaffle(raffle, publicBaseUrl);

  raffle.status = "published";
  await raffle.save();

  res.json({ raffle: raffle.toPublicJSON() });
});

// Cerrar ventas (ya no se pueden reservar más tickets, queda lista para el sorteo)
router.post("/mine/:id/close", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.id, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });
  if (raffle.status !== "published") {
    return res.status(400).json({ error: "Solo puedes cerrar una rifa publicada." });
  }
  raffle.status = "closed";
  await raffle.save();
  res.json({ raffle: raffle.toPublicJSON() });
});

// Sortear: elige un ganador aleatorio y transparente entre los tickets confirmados
router.post("/mine/:id/draw", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.id, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });
  if (raffle.status !== "closed" && raffle.status !== "published") {
    return res.status(400).json({ error: "La rifa ya fue sorteada." });
  }

  const confirmed = await Ticket.find({ raffle: raffle._id, status: "confirmed" });
  if (confirmed.length === 0) {
    return res.status(400).json({ error: "No hay tickets confirmados para sortear." });
  }

  const winnerIndex = Math.floor(Math.random() * confirmed.length);
  const winnerTicket = confirmed[winnerIndex];

  winnerTicket.status = "winner";
  await winnerTicket.save();

  raffle.status = "drawn";
  raffle.winningTicket = winnerTicket.number;
  raffle.drawnAt = new Date();
  await raffle.save();

  res.json({
    raffle: raffle.toPublicJSON(),
    winner: {
      number: winnerTicket.number,
      buyer: winnerTicket.buyer,
    },
    totalParticipantTickets: confirmed.length,
  });
});

// Eliminar una rifa (y todos sus tickets asociados)
router.delete("/mine/:id", requireAuth, async (req, res) => {
  const raffle = await Raffle.findOne({ _id: req.params.id, owner: req.userId });
  if (!raffle) return res.status(404).json({ error: "Rifa no encontrada." });

  await Ticket.deleteMany({ raffle: raffle._id });
  await raffle.deleteOne();

  res.json({ ok: true });
});

// ---- Rutas públicas (sin autenticación) ----

// Ver una rifa publicada por su slug
router.get("/public/:slug", async (req, res) => {
  const raffle = await Raffle.findOne({ slug: req.params.slug });
  if (!raffle || raffle.status === "draft") {
    return res.status(404).json({ error: "Rifa no encontrada." });
  }

  const tickets = await Ticket.find({ raffle: raffle._id })
    .select("number status")
    .sort({ number: 1 });

  res.json({ raffle: raffle.toPublicJSON(), tickets });
});

module.exports = router;
