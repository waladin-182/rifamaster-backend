/**
 * Construye el URI de conexión a MongoDB Atlas.
 * Soporta dos formas de configurar el .env:
 *
 * 1) Una sola variable con el URI completo ya armado:
 *    MONGO_URI=mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net/rifamaster
 *
 * 2) Variables separadas (evita el error clásico de copiar
 *    "<db_password>" literal desde el panel de Atlas):
 *    MONGO_USER=usuario
 *    MONGO_PASSWORD=claveReal
 *    MONGO_CLUSTER=cluster0.xxxxx.mongodb.net
 *    MONGO_DB=rifamaster
 */
function buildMongoUri() {
  const fullUri = process.env.MONGO_URI;

  if (fullUri && !fullUri.includes("<db_password>") && !fullUri.includes("<password>")) {
    return fullUri;
  }

  const { MONGO_USER, MONGO_PASSWORD, MONGO_CLUSTER, MONGO_DB } = process.env;

  if (!MONGO_USER || !MONGO_PASSWORD || !MONGO_CLUSTER) {
    throw new Error(
      "Config de MongoDB incompleta. Define MONGO_URI (sin <db_password>) " +
      "o bien MONGO_USER, MONGO_PASSWORD y MONGO_CLUSTER en el .env"
    );
  }

  const user = encodeURIComponent(MONGO_USER);
  const pass = encodeURIComponent(MONGO_PASSWORD);
  const db = MONGO_DB || "rifamaster";

  return `mongodb+srv://${user}:${pass}@${MONGO_CLUSTER}/${db}?retryWrites=true&w=majority`;
}

module.exports = { buildMongoUri };
