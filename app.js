require('dotenv').config();
const dotenv=require('dotenv');
const ejs = require("ejs");
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
// const encryption = require("mongoose-encryption")  level-2
// var md5 = require("md5")   level-3
// const bcrypt = require("bcrypt");   level-4
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

// console.log(process.env.API_KEY)

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "This is my little secret",
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://anishgarg5914:6hM5dZNPWrdqf4p0@cluster0.pvmyfqh.mongodb.net/userDB", { useNewUrlParser: true })

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

// Caesar Cipher-level_2 encryption 
// userSchema.plugin(encryption, { secret: process.env.SECRET }, { encryptedFields: ["password"] });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture,
      })
    })
  })

  passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, user)
    })
  })

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-uzcf.onrender.com/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {
    res.render("home");
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.get("/secrets", async(req, res) => {
    try {
        const foundUsers = await User.find({"secret": {$ne:null}});
        if(foundUsers){
          res.render('secrets', {usersWithSecrets: foundUsers});
        }
      } catch (error) {
        console.log(error)
      }
    });

app.get("/submit", (req, res) => {
    if (req.isAuthenticated) {
        res.render("submit")
    } else {
        res.redirect("/login")
    }
})

app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.log(err)
        } else {
            res.redirect('/');

        }
    })
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    });

// app.post("/register", (req, res) => {
//     // level-3 hashing
//     // const newUser = new User({
//     //     email: req.body.username,
//     //     password: md5(req.body.password)
//     // })
//     // async function run() {
//     //     try {
//     //         await newUser.save();
//     //         res.render("secrets")
//     //     } catch (error) {
//     //         console.log(error)
//     //     }
//     // }
//     // run().catch((err) => console.log(err));

//     // level - 4 hashing and salting
//     async function run() {
//         try {
//             const hash = await bcrypt.hash(req.body.password, saltRounds)
//             const newUser = new User({
//                 email: req.body.username,
//                 password: hash
//             })
//             await newUser.save();
//             res.render("secrets")
//         } catch (error) {
//             console.log(error)
//         }
//     }
//     run().catch((err) => console.log(err));
// })

// app.post("/login", (req, res) => {
//     const username = req.body.username
//     // const password = md5(req.body.password)
//     const password = req.body.password

//     async function run() {
//         try {
//             let foundUser = await User.findOne({ "email": username });
//             // if (foundUser.password === password) {
//             // res.render("secrets")}
//             const match = await bcrypt.compare(password, foundUser.password);
//             if (match === true) {
//                 res.render("secrets")
//             } else {
//                 console.log("wrong password")
//             }
//         } catch (error) {
//             console.log(error)
//         }
//     }
//     run().catch((err) => console.log(err));
// })

app.post("/register", (req, res) => {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
})

app.post("/login", (req, res) => {
    const user = new User({
        email: req.body.username,
        password: req.body.password
    })
    req.login(user, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
})

app.post("/submit", async(req, res) => {
    const submittedSecret = req.body.secret;

    // console.log(req.user);
    try {
        const foundUser = await User.findById(req.user.id);
        if (foundUser) {
            foundUser.secret = submittedSecret;
            await foundUser.save();
            res.redirect('/secrets')
        }
    } catch (error) {
        console.log(error)
    }
})

app.listen(3000, () => {
    console.log("Server is running at port 3000");
})
