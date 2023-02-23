var express = require('express');
var router = express.Router();
const passport = require('passport');
const userModel = require("./users");
const mailModel = require("./mails");
const localStrategy = require("passport-local");
const { populate } = require('./users');
const multer = require("multer");

passport.use(new localStrategy(userModel.authenticate()));

// for multer and multer file-type multer file types helps in to add condition that which file should be uploaded

function fileFilter (req, file,cb){
    if(file.mimetype === "image/jpg" || file.mimetype === "image/png" || file.mimetype === "image/jpeg"){

      // This callback is a so called error-first function, thus when examining the req, or file you may decide, 
      // that user uploaded something wrong, pass new Error() as first argument, and it will be returned in response.
      //  Note though, that it will raise an unhandled exception in your app. So I prefer to always pass null and
      //   handle user input in the corresponding controller.
      // cb == callback
      // cb(error, '/if-no-error-upload-file-to-this-directory');
      // https://stackoverflow.com/questions/55925522/what-is-cb-in-multer


      cb(null, true);
    }
    else{
      cb(new Error("Wrong extension"));
    }
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const filenameUnique = Date.now() + Math.floor(Math.random()*1000) +file.originalname;

    // if(file.size > 12165465)
    // cb(new Error())

    cb(null, file.fieldname + '-' + filenameUnique);
  }
})


// we had added multer-filetype middle ware in below line just to verify the middleware
const upload = multer({ storage: storage, fileFilter: fileFilter })

// https://stackoverflow.com/questions/53667206/mock-postman-request-into-axios
// --> axios in postman
router.get("/check/:username",async function(req,res){
  let user = await userModel.findOne({username: req.params.username})
  res.json({user})


  // .then(function(){})
})

// **example of axios post request

// router.get("/check/:username",async function(req,res){
//   const userData = await new userModel({
//     name: req.body.name,
//     email: req.body.email,
//   })
//   let user = await userModel.findOne({name: req.body.name})
//   res.json({user})
  
//   // async await below
//   // ** to learn async wait comare /profile and /fileupload route
// })

// router.get('/check',function (req, res) {
  // const ran = Math.random()*10000;
  // res.json({ran});
  // res.json({data: "helllo yaar"});
// });
// json= javascript Object notation

router.get('/', loggedInRedirect,function (req, res, next) {
  res.render('index');
});

router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/"
}), function (req, res, next) {
});

// to give data to mongo from form code see from passportnk file
router.post('/register', function (req, res, next) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
    gender: req.body.gender,
    number: req.body.mobile
  })

  userModel.register(userData, req.body.password)
    .then(function (reg) {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      })
    })
});

router.get('/register', function (req, res) {
  res.render("register");
});

router.get("/read/mail/:id", isLoggedIn, async function (req, res) {
  const mailmilgya = await mailModel.findOne({ _id: req.params.id })
    .populate({
      path: "sender",
    })
  mailmilgya.read = true;
  await mailmilgya.save();
  res.render("mail", { mail: mailmilgya });
  
})

router.get("/profile", isLoggedIn, function (req, res) {
  userModel
    .findOne({ username: req.session.passport.user })
    .populate({
      path: "receivedMails",
      populate: {
        path: "sender",
      }
    })
    .then(function (foundUser) {
      res.render("profile", { founduser: foundUser });
    })

})


//upload.single( name of the input whose type is file )
router.post('/fileupload', upload.single('image'), isLoggedIn,async function (req, res) {
  let loggedInUser =  await userModel.findOne({username: req.session.passport.user})  
  loggedInUser.profilePic = req.file.filename;
  await loggedInUser.save();
  res.redirect(req.headers.referer);
});


// router.post("/compose", isLoggedIn, function (req, res) {
//   userModel.findOne({ username: req.session.passport.user })
//     .then(function (loggedInUser) {
//       // in place of new mailModel we can also use mailModel.create
//       const createdmails = new mailModel({
//         sender: loggedInUser._id,
//         receiver: req.body.receivermail,
//         mailtext: req.body.mailtext
//       })

//       loggedInUser.sendMails.push(createdmails._id)
//       const updatedLoggedInUser = loggedInUser.save()
//       userModel.findOne({ email: req.body.receiveremail })
//       .then(function(receiveruser){
//         receiveruser.sendMails.push(createdmails._id)
//       const updatedreceiverUseremail = receiveruser.save()
//       res.send("check")
//       })
//     })

//    the above written code is also correct we are just using async await in place of it
//                  async await code is written below

router.post("/compose", isLoggedIn, async function (req, res) {
  // loggedinuser dhundho aur uske through mail ke schema ko data bhejo 
  // jab mail ban jae to bne mail ki id user ke mails array mein push karo
  // async,await = koi bhi aisa function jismein await use hone wala hai uss function ke async lga do

  const loggedInUser = await userModel.findOne({ username: req.session.passport.user })

  if (loggedInUser.email !== req.body.receiveremail) {
    const createdMail = await mailModel.create({
      sender: loggedInUser._id,
      receiver: req.body.receiveremail,
      mailtext: req.body.mailtext,
    })
    loggedInUser.sendMails.push(createdMail._id)
    const updatedLoggedInUser = await loggedInUser.save()

    const receiverUser = await userModel.findOne({ email: req.body.receiveremail })
    receiverUser.receivedMails.push(createdMail._id)
    const updatedreceiverUseremail = await receiverUser.save()

    res.redirect(req.headers.referer);
  }
  else {
    res.redirect(req.headers.referer);

  }
})

router.get("/deleteall",function(req,res){
  userModel.deleteMany({}).then(function(data){
      res.send("all data is deleted")
  });
})

router.get("/sent", isLoggedIn, async function (req, res) {

  //yha pein user ke sentmails wale part mein schema ke id jaa rha mailschema ka so etna saare id ko target krna mumkin nahi so populate user hota hai
  const userItSelf = await userModel
    .findOne({ username: req.session.passport.user })
    .populate({
      path: 'sendMails',
      populate: {
        path: 'sender'
      }
    })

  res.render("sent", { user: userItSelf })
})

router.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) throw err;
    res.render('index');
  })
})


//agr user login maara hua hai tab hi uss poge mein entrance milega jismein yeah middleware hai
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}


// agr user login hai to direct login page mein na bheje hai direct main page mein bhej de like profile page
function loggedInRedirect(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect("/profile");
  }
  return next();
}


module.exports = router;