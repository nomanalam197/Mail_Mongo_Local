const mongoose = require("mongoose");
const plm = require("passport-local-mongoose");

mongoose.connect("mongodb://localhost/gmailfinaldb");
const userSchema = mongoose.Schema({
  username: String,
  name: String,
  password: String,
  profilePic: {
    type: String,
    default: "fb-placeholder-profile-image.jpg",
  },
  email: {
    type: String,
    unique: true
  },
  gender:  {
    type: String,
    default: "Other",
  },
  mobile: String,
  sendMails: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "mail"
  }],
  receivedMails: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "mail"
  }],
});

userSchema.plugin(plm);

module.exports = mongoose.model("user",userSchema);