const express = require("express");
const port = process.env.PORT || 3000;
const app = express();
const mongoose = require("mongoose");
const db = mongoose.connection;
mongoose.connect("mongodb://localhost:27017/klack")
let users = {}

db.on("error", console.error.bind(console, "Connection Error"));
db.once("open", (err) => {
  if (err) {
    console.log(err);
    throw err;
  }
  app.listen(port, () => {
    console.log("it's working.  ish")
  });
});

// assign to a variable the model instance
app.use(express.static("./public"));
app.use(express.json());

// create an iteration of the mongoose.
let messageSchema = new mongoose.Schema({
  sender: {
    type: String,
  },
  message: {
    type: String,
  },
  timestamp: {
    type: Number,
  },
})

// create the Model
let MessageModel = mongoose.model('MessageModel', messageSchema);

// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
  var nameA = a.name.toUpperCase(); // ignore upper and lowercase
  var nameB = b.name.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

app.get("/messages", (request, response) => {
  // get the current time
  const now = Date.now();

  // consider users active if they have connected (GET or POST) in last 15 seconds
  const requireActiveSince = now - 15 * 1000;

  // update the requesting user's last access time
  users[request.query.for] = now;

  MessageModel.find(function (err, messages) {
    messages.forEach(msg => {
      if (users[msg.sender]) {
        if (users[msg.sender] < msg.timestamp) {
            users[msg.sender] = msg.timestamp
        }
      } else users[msg.sender] = msg.timestamp
    })

  // create a new list of users with a flag indicating whether they have been active recently
  // used in the translation from the list of users to the list of newest user messages
  let usersSimple = Object.keys(users).map(x => ({
    name: x,
    active: users[x] > requireActiveSince
  }));

  // sort the list of users alphabetically by name
  usersSimple.sort(userSortFn);
  userSimple = usersSimple.filter(a => a.name !== request.query.for);

    response.send({
      messages: messages.slice(-40),
      users: usersSimple
    });
  });

});

app.post("/messages", (request, response) => {
  // add a timestamp to each incoming message.
  const timestamp = Date.now();
  // create a new instance of the Message model and save it to db.
  let person = request.body.sender;
  let note = request.body.message;
  request.body.timestamp = timestamp;
  let newMessage = new MessageModel({
    sender: person,
    message: note,
    timestamp: timestamp,
  });
  // update the posting user's last access timestamp (so we know they are active)
  users[request.body.sender] = timestamp;

  newMessage.save(function (err, newMessage) {
      console.log(err)
      if (err !== null) {
        response.status(500)
        response.send("server error")
        return
      }
      response.status(201);
      response.send(newMessage);
  });

})