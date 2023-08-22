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
  
  // Create the Email model
  const Email = mongoose.model("Email", emailSchema);

// Define your routes
app.get("/", (req, res) => {
    res.render("home")
  });








  app.listen(PORT, () => {
    console.log(`App is up and listening on port ${PORT}`);
  });