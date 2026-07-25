const mongoose = require("mongoose");
const { buildMongoUri } = require("./mongoUri");

async function connectDB() {
  const uri = buildMongoUri();
  try {
    await mongoose.connect(uri);
    console.log("[db] Conectado a MongoDB Atlas");
  } catch (err) {
    console.error("[db] Error de conexión:", err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
