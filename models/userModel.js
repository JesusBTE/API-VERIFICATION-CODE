// Importa la configuración de Firebase
const admin = require("../config/config");

// Obtiene la instancia de Firestore
const db = admin.firestore();

// Referencia a la colección 'Users' en Firestore
const usersCollection = db.collection("Users");

// Define un objeto con las operaciones relacionadas al modelo de usuario
const userModel = {
  // Crea un nuevo usuario en la base de datos
  create: async ({ email, phone }) => {
    try {
      // Define los datos del usuario, inicialmente no verificado
      const userData = { email, phone, isVerified: false };

      // Agrega el nuevo usuario a la colección (Firestore genera el ID automáticamente)
      const userRef = await usersCollection.add(userData);

      // Obtiene los datos recién creados para incluirlos en la respuesta
      const newUser = await userRef.get();

      // Devuelve un objeto con el ID generado y los datos del usuario
      return { id: userRef.id, ...newUser.data() };
    } catch (error) {
      // Manejo de errores en la creación del usuario
      console.error("Error al crear usuario en Firestore:", error);
      throw new Error("No se pudo crear el usuario.");
    }
  },

  // Busca un usuario por su email
  getById: async (email) => {
    // Realiza la consulta filtrando por el campo 'email'
    const querySnapshot = await usersCollection
      .where("email", "==", email)
      .get();

    // Si no se encuentra el usuario, devuelve null
    if (querySnapshot.empty) return null;

    // Devuelve el primer usuario encontrado con su ID
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  },

  // Actualiza los datos de un usuario identificado por su email
  update: async (email, data) => {
    // Busca el documento del usuario por su email
    const querySnapshot = await usersCollection
      .where("email", "==", email)
      .get();

    // Si no existe el usuario, devuelve null
    if (querySnapshot.empty) return null;

    // Actualiza los datos del documento encontrado
    const userDoc = querySnapshot.docs[0];
    await usersCollection.doc(userDoc.id).update(data);

    // Devuelve los datos actualizados combinando lo anterior y lo nuevo
    return { id: userDoc.id, ...userDoc.data(), ...data };
  },

  // Obtiene todos los usuarios en la colección
  getAll: async () => {
    // Recupera todos los documentos de la colección
    const snapshot = await usersCollection.get();

    // Mapea cada documento para incluir su ID junto con sus datos
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // Elimina un usuario por su email
  remove: async (email) => {
    // Busca el documento correspondiente al email
    const querySnapshot = await usersCollection
      .where("email", "==", email)
      .get();

    // Si no existe, retorna false
    if (querySnapshot.empty) return false;

    // Elimina el documento encontrado
    const userDoc = querySnapshot.docs[0];
    await usersCollection.doc(userDoc.id).delete();

    // Retorna true para indicar éxito en la eliminación
    return true;
  },
};

// Exporta el modelo para que pueda ser usado en otros módulos
module.exports = userModel;
