const authCodeModel = require("../models/authCodeModel");

const resolvers = {
  Query: {
    //Resolver para obtener todos los authCodes
    getAuthCodes: () => authCodeModel.getAll(),
    //Resolver para obtener un authCode por su ID
    getAuthCode: (_, { id }) => authCodeModel.getById(id),
  },
  Mutation: {
    //Resolver para crear un nuevo authCode
    createAuthCode: (_, { userId, name, email }) =>
      authCodeModel.create(userId, name, email),
    //Resolver para actualizar un authCode existente
    updateAuthCode: (_, { id, userId, name, email }) =>
      authCodeModel.update(id, userId, name, email),
    //Resolver para eliminar un authCode por su ID
    deleteAuthCode: (_, { id }) => authCodeModel.remove(id),
  },
};

module.exports = resolvers;
