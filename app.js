// Using passport.js to add cookies and sessions.

const express = require("express");
const bodyParser = require("body-parser"); 
const mongoose = require("mongoose");

// ***cookies*** using sessions and authentication using passport.
const session = require('express-session');    // The express-session npm package is a middleware for managing sessions in Express.js, a popular web application framework for Node.js. Sessions are a crucial aspect of web applications as they allow the server to keep track of a user's state and data across multiple HTTP requests.
const passport = require("passport");     //  Passport is a popular middleware for authentication in Node.js-based web applications. 
const passportLocalMongoose = require("passport-local-mongoose");  //This is what will be used to hash and salt our passwords (Encrypt) and save our users into our mongoDB database.

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

// ***cookies*** using sessions and authentication using passport.
app.use(session({                                 // What are all these parameters and what do they do?
  secret: 'Our little secret - keyboard cat',
  resave: false,
  saveUninitialized: false,
  //cookie: { secure: true }
}))

// ***cookies*** using sessions and authentication using passport.
app.use(passport.initialize());  // Initializes Passport middleware, enabling authentication setup and usage with various strategies in an Express app. After initialization, Passport can be configured with various authentication strategies such as LocalStrategy, OAuth, JWT, etc.
app.use(passport.session());   // Initializes and utilizes session support for persistent login sessions using Passport.

mongoose.connect("mongodb://localhost:27017/userDB",{useNewURLParser:true});

const userSchema= new mongoose.Schema({           //mongoose.Schema is a constructor function. Inorder to encrypt we are creating a mongoose schema.
  email: String,
  password: String,
  active: Boolean     // For allowing only "active" users to authenticate. One example I can think  of is for cases like banning users etc.
});                         // Creating schema.

// ***cookies*** using sessions and authentication using passport.
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

const userModelConstructorFunction = new mongoose.model("UserCollection", userSchema);    // Creating a model constructor function. "UserCollection" mentioned as value in brackets is the name of the collection.
// A model is a constructor function that is used to create new documents based on the defined schema. It also provides methods for querying and interacting with the MongoDB collection.

// ***cookies*** using sessions and authentication using passport.
// syntax --> passport.use(strategy);      // All strategies have a name which, by convention, corresponds to the package name according to the pattern passport-{name}.
passport.use(userModelConstructorFunction.createStrategy());    // ? // What is a strategy?  // This line of code is typically used when configuring Passport's authentication strategies, particularly with the LocalStrategy, in an Express.js application.

// ***cookies*** using sessions and authentication using passport.
passport.serializeUser(userModelConstructorFunction.serializeUser());  // ?  // configures Passport to serialize user information for storage in a session.
passport.deserializeUser(userModelConstructorFunction.deserializeUser()); // ?  // configures Passport to deserialize user information from the session.

// -----------------------------------------------------

app.get("/", function(req, res){
  res.render("home");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/secrets", function(req, res){   // Should this be post ?
  if (req.isAuthenticated()){   // Here authentication does not just refer to checking if the password entered by the user is matching the password stored in the database, it also is ensuring the the password matches the one stored in cookies session and so on...
    console.log("djikstra-1");
    res.render("secrets");
  }else{
    console.log("djikstra-2");
    res.redirect("/login");    // If not authenticated. 
  }
});

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