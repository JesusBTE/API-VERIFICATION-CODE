//Importa la configuración de Firebase desde el archivo config.js
const admin = require("../config/config");

//Obtiene la instancia de Firestore
const db = admin.firestore();

//Referencia a la colección 'AuthCode' en Firestore
const authCodeCollection = db.collection("AuthCode");

//Función para crear un nuevo código de autenticación en Firestore
const create = async ({ userId, email, code }) => {
  //Valida que se proporcione el email y el código
  if (!email || !code) throw new Error("Email y código son requeridos.");

  //Construye el objeto que se va a guardar, incluyendo la fecha de creación
  const newAuthCode = { userId, email, code, createdAt: new Date() };

  //Agrega el documento a la colección de AuthCode
  const docRef = await authCodeCollection.add(newAuthCode);

  //Retorna el documento creado, incluyendo el ID generado por Firestore
  return { id: docRef.id, ...newAuthCode };
};

//Función para buscar un código de verificación por email
const findByEmail = async (email) => {
  //Valida que se proporcione el email
  if (!email) throw new Error("Email es obligatorio.");

  //Realiza una consulta en la colección buscando por el campo 'email'
  const querySnapshot = await authCodeCollection
    .where("email", "==", email)
    .limit(1)
    .get();

  //Si no se encuentra ningún documento, retorna null
  if (querySnapshot.empty) {
    console.log("No se encontró código de verificación para:", email);
    return null;
  }

  //Extrae el primer documento del resultado
  const codeDoc = querySnapshot.docs[0];

  //Retorna los datos del documento junto con su ID
  return { id: codeDoc.id, ...codeDoc.data() };
};

//Exporta las funciones para ser utilizadas en otros módulos
module.exports = { create, findByEmail };
