require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");
const session = require("express-session");
const MongoDBSession = require("express-mongodb-session")(session);
const router = express.Router();
const http = require("http").Server(app);
const io = require("socket.io");
const sharedSession = require("express-socket.io-session");


//database verbinden
const { MongoClient, ServerApiVersion } = require("mongodb");
const { addAbortSignal } = require("stream");
require("dotenv").config();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const databaseUsers = client.db("studsdb");
const collectionUsers = databaseUsers.collection("col_users");

//session store
const store = new MongoDBSession({
  uri: uri,
  collection: "col_sessions",
  databaseName: "studsdb",
});
const secret = process.env.SECRET;
const session1 = session({
  secret: secret,
  cookie: {
    maxAge: 2592000000,
  },
  resave: false,
  saveUninitialized: false,
  store: store,
});


const Chats = require("../models/chatSchema");

//integrating socketio
socket = io(http);
//session
socket.use(
  sharedSession(session1, {
    autoSave: true,
  })
);
//database connection
// const Chat = require("./models/chatSchema");

const checkChat = async (req, res, next) => {
   const chat1id = req.params.chats;
    user1 = req.session.user.email;
   const user = await collectionUsers.findOne({
    email: user1
  });
  const chatID = user.chats;
  if ( chatID == chat1id) {
    next();
  }
  else{
    res.redirect("/account");
  }
};

router.route("/:chats").get( checkChat, async (req, res) => {
  const chat1id = req.params.chats;
  console.log(chat1id);
  if (chat1id) {
    Chats.find({
      chatID: "1"
    }).then((results) => {
      console.log(results)
      res.render("chat", {
        Chats: results
      });
    });
  } else {
    res.status(404).send("Chat not found");
  }
});

module.exports = router;