require("dotenv").config();

const express = require("express");
const app = express();
const session = require("express-session");
const MongoDBSession = require("express-mongodb-session")(session);
const bodyParser = require("body-parser");
require("dotenv").config();
const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");
const compression = require("compression");
const http = require("http").Server(app);
const io = require("socket.io");
const sharedSession = require("express-socket.io-session");

//bodyparser middleware
app.use(express.json());

const port = process.env.PORT || 3000;
const methodOverride = require("method-override");
const multer = require("multer");
const upload = multer({
  dest: "public/uploads/",
});

app.set("view engine", "ejs");

app.use(express.static("public"));
var path = require("path");
app.use(express.static(path.join(__dirname, "public")));
app.use("*/css", express.static("public/css"));
app.use("*/img", express.static(path.join(__dirname, "public/img")));
app.use("*/scripts", express.static(path.join(__dirname, "public/scripts")));

app.use(methodOverride("_method"));

//database verbinden
const {
  MongoClient,
  ServerApiVersion
} = require("mongodb");
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
app.use(session1);

// session auth
const checkLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/account/preRegister");
  }
};

const connect = mongoose.connect(uri, {
  dbName: "studsdb",
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
connect.then(
  (db) => {
    console.log("Connected Successfully to Mongodb Server");
  },
  (err) => {
    console.log(err);
  }
);

module.exports = connect;

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
//Routes:
app.get("/", checkLogin, async (req, res) => {
  res.redirect("/matchpage");
});

app.use(compression());
app.use("/", require("./routes/ufukMatchPage"));
app.use("/matchpage", require("./routes/ufukMatchPage"));

app.use("/account", require("./routes/qtLoginRegister"));

app.use("/filter", require("./routes/bartFilter"));
app.use("/nextPage", require("./routes/bartFilter"));
app.use("/theme", require("./routes/aliTheme"));
app.use("/chats", require("./routes/chatroute"));


//integrating socketio
socket = io(http);
//session
socket.use(sharedSession(session1, {
  autoSave: true
}));


//database connection
const Chat = require("./models/chatSchema");

//setup event listener
socket.on("connection", async (socket) => {
  console.log("user connected");
  console.log(socket.handshake.session.user.name);

  socket.on("disconnect", function () {
    console.log("user disconnected");
  });

  //Somebody is typing
  socket.on("typing", data => {
    socket.broadcast.emit("notifyTyping", {
      user: data.user,
      message: data.message
    });
  });

  //when somebody stops typing
  socket.on("stopTyping", () => {
    socket.broadcast.emit("notifyStopTyping");
  });

  socket.on("chat message", async function (msg) {
    console.log("message: " + msg);

    //broadcast message to everyone in port except yourself.
    socket.broadcast.emit("received", { message: msg });

    //saves chat to the database
    connect.then(async (db) => {
      const user1 = socket.handshake.session.user.name
      const user = await collectionUsers.findOne({
        name: user1
      });
      let chatMessage = new Chat({
        message: msg,
        sender: user.name,
      });

      chatMessage.chatID = user.chats;
      await chatMessage.save();
    });
  });


});

http.listen(port, '0.0.0.0', () => {
  console.log(`Server is up on port ${port}!`)
})