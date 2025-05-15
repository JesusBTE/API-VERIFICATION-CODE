const { gql } = require("apollo-server");
//const gql = require("apollo-server").gql

const typeDefs = gql`
  """
  Representa a un usuario dentro del sistema
  """
  type Query {
    getUsers: [User]
    getUser(email: String!): User
  }

  type User {
    id: ID!
    email: String!
    phone: String!
    isVerified: Boolean!
    token: String!
  }

  type Mutation {
    registerUser(email: String!, phone: String!, via: String!): User
    verifyCode(email: String!, code: String!): User
    login(email: String!): User
  }
`;

module.exports = typeDefs;
