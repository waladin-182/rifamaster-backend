require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth");
const raffleRoutes = require("./routes/raffles");
const ticketRoutes = require("./routes/tickets");

const app = express();

const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "8mb" })); // suficiente para una foto de comprobante en base64

app.get("/api/health", (req, res) => res.json({ ok: true, service: "rifamaster-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/raffles", raffleRoutes);
app.use("/api/tickets", ticketRoutes);

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`[server] Escuchando en el puerto ${PORT}`));
});
