// Import Project Packages
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { body, validationResult } from "express-validator";

// Import passport-local-mongoose and mongoose-findorcreate
import passportLocalMongoose from "passport-local-mongoose";
import findOrCreate from "mongoose-findorcreate";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));
app.set('view engine', "ejs");
app.use(express.urlencoded({ extended: true }));


//

// Establish connection with MongoDB
const uri = process.env.DATABASE_URL;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(error => {
        console.error('Error connecting to MongoDB:', error);
    });

const db = mongoose.connection;

db.on('connected', () => {
    console.log('Mongoose connected to ' + uri);
});

db.on('error', error => {
    console.error('Mongoose connection error:', error);
});

db.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

//Start the session using express-session
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

//Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Create the User schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    googleId: String,
  });
  
  // Add plugins to the User schema
  userSchema.plugin(passportLocalMongoose); // Adds username and password fields for local strategy
  userSchema.plugin(findOrCreate); // Adds findOrCreate method for Google OAuth
  
  // Create the User model
  const User = mongoose.model("User", userSchema);
  
  // Create the Email schema
  const emailSchema = new mongoose.Schema({
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference the User schema
    },
    recipient: String,
    subject: String,
    body: String,
    scheduledAt: Date,
  });
  
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

//Authenticate with Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/compose"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

  // Create the Email model
const Email = mongoose.model("Email", emailSchema);


//Handle Manual Registration





//Define Google authentication routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/compose', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  });

  app.get('/auth/google/schedule', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  });

  app.get('/auth/google/sent', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  });

  app.get('/auth/google/dashboard', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  });


// Define  routes
app.get("/", (req, res) => {
    res.render("register")
  });

  //Render dashboard for authenticated users
  app.get("/dashboard", function(req, res) {
    if (req.isAuthenticated()) {
      res.render("dashboard"); // Render the "dashboard" template
    } else {
      res.redirect("/login"); // Redirect to login page if user is not authenticated
    }
  });
  //Render compose page for authenticated users
  app.get("/compose", function(req, res) {
    if (req.isAuthenticated()) {
      res.render("compose"); // Render the "compose" template
    } else {
      res.redirect("/login"); // Redirect to login page if user is not authenticated
    }
  });

app.get("/login", (req, res) => {
    res.render("login")
  });

app.get("/register", (req, res) => {
    res.render("register")
  });

//Render schedule page for authenticated users
  app.get("/schedule", function(req, res) {
    if (req.isAuthenticated()) {
      res.render("schedule"); // Render the "schedule" template
    } else {
      res.redirect("/login"); // Redirect to login page if user is not authenticated
    }
  });

//Render sent page for authenticated users
  app.get("/sent", function(req, res) {
    if (req.isAuthenticated()) {
      res.render("sent"); // Render the "sent" template
    } else {
      res.redirect("/login"); // Redirect to login page if user is not authenticated
    }
  });



  app.post("/logout", function(req, res) {
    req.logout(function(err) {
      if (err) {
        console.error("Logout error:", err);
        return res.redirect("/"); // Redirect to home page in case of error
      }
      res.redirect("/");
    });
  });
  
  
  
  
  
  
  app.listen(PORT, () => {
    console.log(`App is up and listening on port ${PORT}`);
  });