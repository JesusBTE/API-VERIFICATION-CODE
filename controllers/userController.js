const userModel = require("../models/userModel");
const authCodeModel = require("../models/authCodeModel");
const twilio = require("twilio");
const jwt = require("jsonwebtoken"); // Se importa JWT para generar tokens de sesión
require("dotenv").config();

// Configuración de Twilio

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const client = twilio(accountSid, authToken);
// Generar código de verificación de 6 dígitos
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Función para enviar mensajes con reintentos en caso de error de límite
async function sendMessageTwilio(phone, code) {
  const MAX_TRIES = 3;
  let attempts = 0;

  while (attempts < MAX_TRIES) {
    try {
      const result = await client.messages.create({
        from: fromWhatsAppNumber,
        contentSid: "HX229f5a04fd0510ce1b071852155d3e75",
        contentVariables: JSON.stringify({ 1: code }),
        to: `whatsapp:${phone}`,
      });

      console.log("Mensaje enviado correctamente. SID:", result.sid);
      return result.sid;
    } catch (error) {
      attempts++;
      console.error("Error al enviar mensaje:", error);
      if (error.code === 63038 && attempts < MAX_TRIES) {
        console.log("Reintentando el envío...");
      } else {
        throw new Error("No se pudo enviar el mensaje.");
      }
    }
  }
}
// Controlador principal de usuarios con resolvers GraphQL
const userController = {
  Query: {
    // Consulta para obtener todos los usuarios
    getUsers: async () => {
      try {
        return await userModel.getAll();
      } catch (error) {
        throw new Error("Error al obtener usuarios");
      }
    },

    // Consulta para obtener un usuario específico por su correo electrónico
    getUser: async (_, { email }) => {
      try {
        const user = await userModel.getById(email);
        if (!user) {
          throw new Error("Usuario no encontrado");
        }
        return user;
      } catch (error) {
        throw new Error("Error al obtener el usuario");
      }
    },
  },

  Mutation: {
    // Registro de un nuevo usuario
    registerUser: async (_, { email, phone, via }) => {
      try {
        console.log("Iniciando registro de usuario con datos:", {
          email,
          phone,
          via,
        });
        if (!email || !phone) {
          throw new Error("Email y teléfono son obligatorios.");
        }

        // 🔹 Validación de formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error("Formato de correo inválido.");
        }

        // 🔹 Validación de formato de número telefónico internacional (México)
        const phoneRegex = /^\+521\d{10}$/;
        if (!phoneRegex.test(phone)) {
          throw new Error("Formato del número telefónico inválido.");
        }

        // 🔹 Prevención de spam: verifica si ya se generó un código en el último minuto
        const now = Date.now();
        const existingCode = await authCodeModel.findByEmail(email);
        if (
          existingCode &&
          now - new Date(existingCode.createdAt).getTime() < 60 * 1000
        ) {
          throw new Error("Espera antes de solicitar otro código.");
        }
        let user = await authCodeModel.findByEmail(email);

        if (user) {
          throw new Error("Este correo ya está registrado. Usa otro correo.");
        }

        // Generación de código de verificación
        const code = generateVerificationCode();
        console.log("Código generado:", code);

        // Envío del código al usuario por WhatsApp usando Twilio
        console.log("Enviando mensaje por Twilio...");
        await sendMessageTwilio(phone, code);

        // Registro del usuario en la base de datos
        console.log("Guardando usuario en la base de datos...");
        const newUser = await userModel.create({ email, phone });

        if (!newUser || !newUser.id) {
          throw new Error("No se pudo generar un ID para el usuario.");
        }

        // Almacenar el código de verificación asociado al usuario
        console.log("Guardando código de verificación en la base de datos...");
        const authCode = {
          userId: newUser.id,
          email,
          code, // Se almacena como string
          createdAt: new Date(),
        };

        await authCodeModel.create(authCode);
        console.log("Código guardado correctamente:", authCode);

        return newUser;
      } catch (error) {
        console.error("Error en registerUser:", error);
        throw new Error("Error al registrar usuario.");
      }
    },

    // Verificación del código enviado al usuario
    verifyCode: async (_, { email, code }) => {
      try {
        console.log("Verificando código para:", email);

        const authCode = await authCodeModel.findByEmail(email);
        console.log("Código encontrado en BD:", authCode);

        if (!authCode) {
          console.log("Código no encontrado.");
          return null;
        }

        if (authCode.code !== code) {
          // 🔹 Ahora accede correctamente a `authCode.code`
          console.log("Código incorrecto.");
          return null;
        }

        const now = new Date();
        const codeDate = new Date(authCode.createdAt);
        const secondsSinceCode = (now - codeDate) / 1000;
        console.log("Tiempo transcurrido:", secondsSinceCode);

        if (secondsSinceCode > 300) {
          console.log("Código expirado.");
          return null;
        }

        console.log("Marcando usuario como verificado...");
        await userModel.update(email, { isVerified: true });

        const user = await userModel.getById(email);
        console.log("Usuario verificado correctamente:", user);

        return user; // 🔹 Devuelve el usuario con `isVerified: true`
      } catch (error) {
        console.error("Error en verifyCode:", error);
        return null;
      }
    },

    // Inicio de sesión del usuario
    login: async (_, { email }) => {
      try {
        console.log("Iniciando sesión para:", email);

        const user = await userModel.getById(email);
        if (!user) throw new Error("Usuario no encontrado.");

        // Verificación del estado del usuario
        if (!user.isVerified) {
          const authCode = await authCodeModel.findByEmail(email);

          if (authCode && authCode.createdAt) {
            const now = new Date();
            const timeDifference = (now - new Date(authCode.createdAt)) / 1000;

            // Prevenir envío de múltiples códigos en menos de 1 minuto
            if (timeDifference < 60) {
              throw new Error(
                "Código enviado recientemente, intenta en 1 minuto."
              );
            }
          }

          // Generar y reenviar un nuevo código si no está verificado
          const newCode = generateVerificationCode();
          await authCodeModel.update(email, {
            code: newCode,
            createdAt: new Date(),
          });

          await sendMessageTwilio(user.phone, newCode);

          throw new Error("Usuario no verificado, nuevo código enviado.");
        }

        // Generar token JWT de sesión
        const token = jwt.sign(
          { id: user.id, email: user.email },
          "clave_secreta", // Reemplazar en producción por clave segura
          { expiresIn: "1h" } // Token válido por 1 hora
        );

        console.log("Inicio de sesión exitoso.");

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          isVerified: true,
          token,
        };
      } catch (error) {
        console.error("Error en login:", error);
        return null;
      }
    },
  },
};

module.exports = userController;
