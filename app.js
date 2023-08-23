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


////////////////Handle Manual Registration
//Handle Manual Registration and implement input validation on the register route
app.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Proceed with registration logic
    User.register(
      { username: req.body.username, email: req.body.email },
      req.body.password,
      function (err, user) {
        if (err) {
          if (err.name === 'UserExistsError') {
            return res.status(400).json({ error: 'Username or email already exists' });
          }

          console.error('Error during registration:', err);
          return res.status(500).json({ error: 'An error occurred during registration' });
        }
        
        // User registration successful, authenticate using Passport
        passport.authenticate('local')(req, res, function () {
          if (req.xhr) {
            // If the request is an AJAX request (JSON request)
            res.status(200).json({ message: 'Registration and authentication successful' });
          } else {
            // If the request is not an AJAX request (regular browser request)
            res.redirect('/dashboard'); // Replace '/dashboard' with the actual dashboard route
          }
        });
      }
    );
  }
);

//Handle manual login and implement on the login route
app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    email:req.body.email,
    password: req.body.password
  });
  
  req.login(user, function(err) {
    if (err) {
      console.log(err);
      res.redirect("/login"); // Redirect to login page on error
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/dashboard"); // Redirect to secrets page after successful login
      });
    }
  });
});


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

//Add post request to save emails
app.post('/compose', (req, res) => {
  const { recipient, subject, body } = req.body;
  // Create a new Email document and save it to the database
  const newEmail = new Email({
    sender: req.user, // Assuming req.user contains the authenticated user
    recipient,
    subject,
    body,
    scheduledAt: new Date(), // You can set a default value or adjust as needed
  });

  newEmail.save()
    .then(() => {
      // Email saved successfully
      res.redirect('/dashboard'); // Redirect to dashboard or wherever you want
    })
    .catch(err => {
      // Error saving email
      console.error('Error saving email:', err);
      res.status(500).json({ error: 'An error occurred while saving the email' });
    });
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