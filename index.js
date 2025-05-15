const { ApolloServer} = require("apollo-server");
const typeDefs = require("./schemas/typeDefs");
const resolvers = require("./controllers/userController");
const resolver = require("./controllers/authcodeController");
const dotenv = require('dotenv').config();

const server = new ApolloServer({typeDefs,resolvers, resolver});

server.listen().then(({url}) =>{
    console.log('servidor corriendo en ' + url)
});
