// This is : Level 6 - OAuth 2.0 & How to Implement Sign In with Google.

/*
Different levels of security:

Level 5 - Using passport.js to add cookies and sessions.
Level 4 - Salting and hashing passwords.
Level 3 - Hashing paswords.
Level 2 - Database encryption and using environment variable to keep secrets safe. (Also .gitignore file.)
Level 1 - Register users with just username and password.
*/

const express = require("express");
const bodyParser = require("body-parser"); 
const mongoose = require("mongoose");
require('dotenv').config()

const session = require("express-session");    // The express-session npm package is a middleware for managing sessions in Express.js, a popular web application framework for Node.js. Sessions are a crucial aspect of web applications as they allow the server to keep track of a user's state and data across multiple HTTP requests.
const passport = require("passport");     //  Passport is a popular middleware for authentication in Node.js-based web applications. 
const passportLocalMongoose = require("passport-local-mongoose");  //This is what will be used to hash and salt our passwords (Encrypt) and save our users into our mongoDB database.
const GoogleStrategy = require("passport-google-oauth20").Strategy;  //If you put it above this line it won't work according to Angela.
const findOrCreate = require("mongoose-findorcreate");

// --------------------------------------------------

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(session({                                 // What are all these parameters and what do they do?
  secret: 'Our little secret - keyboard cat',
  resave: false,
  saveUninitialized: false,
  //cookie: { secure: true }
}))

app.use(passport.initialize());  // Initializes Passport middleware, enabling authentication setup and usage with various strategies in an Express app. After initialization, Passport can be configured with various authentication strategies such as LocalStrategy, OAuth, JWT, etc.
app.use(passport.session());   // Initializes and utilizes session support for persistent login sessions using Passport.

// --------------------------------------------------

mongoose.connect("mongodb://localhost:27017/userDB",{useNewURLParser:true});

const userSchema= new mongoose.Schema({           //mongoose.Schema is a constructor function. Inorder to encrypt we are creating a mongoose schema.
  email: String,
  password: String,
  googleId: String,
  secret: String,
  active: Boolean     // For allowing only "active" users to authenticate. One example I can think  of is for cases like banning users etc.
});                         // Creating schema.

//userSchema.plugin(passportLocalMongoose);   //This is what will be used to hash and salt our passwords and save our users into our mongoDB database.
 
userSchema.plugin(passportLocalMongoose, {
  // Set usernameUnique to false to avoid a mongodb index on the username column!
  usernameUnique: false,

  findByUsername: function(model, queryParameters) {
    // Add additional query parameter - AND condition - active: true
    queryParameters.active = true;
    return model.findOne(queryParameters);
  }
});
userSchema.plugin(findOrCreate);

const userModelConstructorFunction = new mongoose.model("UserCollection", userSchema);    // Creating a model constructor function. "UserCollection" mentioned as value in brackets is the name of the collection.
// A model is a constructor function that is used to create new documents based on the defined schema. It also provides methods for querying and interacting with the MongoDB collection.

// ----------------------------------------------------

// syntax --> passport.use(strategy);      // All strategies have a name which, by convention, corresponds to the package name according to the pattern passport-{name}.
passport.use(userModelConstructorFunction.createStrategy());    // ? // What is a strategy?  // This line of code is typically used when configuring Passport's authentication strategies, particularly with the LocalStrategy, in an Express.js application.

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

// ------------------------------------------------------

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);    // Log the profile.
  userModelConstructorFunction.findOrCreate({ googleId: profile.id }, function (err, user) {   //findOrCreate is not a mongodb function. It's something that the creators of this made up which we have to implement. So you can either write code for it or use an npm package called "mongoose-findorcreate".
    return cb(err, user);
  });
}
));

// -----------------------------------------------------

app.get("/", function(req, res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));


app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),     //Authenticate the user locally here.
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/login", function(req, res){
  res.render("login");
});

/*
// Important.
app.get("/secrets", function(req, res){   // Should this be post ?
  if (req.isAuthenticated()){   // Here authentication does not just refer to checking if the password entered by the user is matching the password stored in the database, it also is ensuring the the password matches the one stored in cookies session and so on...
    console.log("djikstra-1");
    res.render("secrets");
  }else{
    console.log("djikstra-2");
    res.redirect("/login");    // If not authenticated. 
  }
});*/

// Here we are trying to find the list of users with value in the secret field
app.get("/secrets", async (req, res) => {
  try {
    const foundUsers = await userModelConstructorFunction.find({ "secret": { $ne: null } }); // users with secret field not null.
    if (foundUsers.length > 0) {
      res.render("secrets", { usersWithSecrets: foundUsers });    // "render" function in "res.render" comes from ejs. What enables it in "res" variable is "app.set('view engine', 'ejs')" statement I guess.  
    } else {
      // Handle case when no users with secrets are found
      res.render("secrets", { usersWithSecrets: [] });            // Or handle as appropriate
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){   // authentication does not just refer to checking if the password entered by the user is matching the password stored in the database, it also is ensuring that the password matches the one stored in cookies session and so on...
    res.render("submit");
  }else{
    res.redirect("/login");     // If not authenticated. 
  }
})

app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { 
      console.log(err); 
    }else{
      res.redirect('/');
    }
  });
});

// ------------------------------------------------------------

app.post("/submit", async function(req, res){
  try{
    const submittedSecret = req.body.secret;   // secret is the name of that input field.

    console.log(req.user.id);    // Passport stores (not sure how though - I think I got it. The "app.use(passport...)" statements is what is enabling it I guess.) which user is logged in the "req" variable. You can access it using "req.user".
  
    // We are trying to save the secret submitted to the database.
    const foundUser = await userModelConstructorFunction.findById(req.user.id) //Find the document with the given user ID.
    console.log("aaa");
    if (foundUser){                        // The value of foundUser is a mongodb document not true or false.
      console.log("bbb");
      foundUser.secret = submittedSecret;  //Submitted secret assigning to the foundUser document secret variable.
      // The problem is here I think. It's not asynchronous.
      await foundUser.save();
      res.redirect("/secrets");          // After saving the document to the database, redirect the route to /secrets.
    }
  }catch(err){
    console.log(err);
  }
});

app.post("/register", function(req, res){
  userModelConstructorFunction.register({username:req.body.username, active: true}, req.body.password, function(err, user) {
    if (err) { 
      console.log(err);
      res.redirect('/register');    //redirect means re-"GET" I guess. //If any error from the user side during registraion.    // In Node.js, redirection refers to the process of directing a user's web browser from one URL to another URL. The redirect() function is commonly used in web applications to send HTTP redirect responses to the client's browser.
    }else{
      passport.authenticate ("local")(req, res, function(){
        res.redirect("/secrets");
      });
    } 
  });
});

app.post("/login", function(req, res){
  const user = new userModelConstructorFunction({
    username : req.body.username,
    password : req.body.password
  });
  req.login(user, function(error) {
    if (error) { 
      console.log(error);
    }else {
      passport.authenticate ("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

// ------------------------------------------------------------

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});