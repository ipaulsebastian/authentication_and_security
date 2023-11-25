//%%%%%%%%%
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser"); 
const mongoose = require("mongoose");

const encrypt = require("mongoose-encryption");  //

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB",{useNewURLParser:true});

const userSchema= new mongoose.Schema({           //mongoose.Schema is a constructor function. Inorder to encrypt we are creating a mongoose schema.
  email: String,
  password: String
});                         // Creating schema.

//This has to be put in the ".env" file.
//const ourSecret = "Thisisourlittlesecret.";    //Encryption key.   What are API keys?

//%%%%%%%%%
// Statement showing how to use the secret inside the ".env" file.
console.log(process.env.API_KEY);       // In my opinion we should not be able to print even this.

// Statement to encrypt the database below.
userSchema.plugin(encrypt, {secret: process.env.OUR_SECRET, encryptedFields : ['password']});   // Schemas are pluggable, that is, they allow for applying pre-packaged capabilities to extend their functionality. This is a very powerful feature.

const userModelConstructorFunction = new mongoose.model("UserCollection", userSchema);    // Creating a model constructor function. "UserCollection" mentioned as value in brackets is the name of the collection.
// A model is a constructor function that is used to create new documents based on the defined schema. It also provides methods for querying and interacting with the MongoDB collection.


app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

//async function run(){

app.post("/register", async function(req, res){
  const newUserModelObject = new userModelConstructorFunction({
    email: req.body.username,
    password: req.body.password
  });

  /*
  newUser.save(function(err){
    if (err){
      console.log(err);
    }else{
      res.render("secrets");
    }
  })*/

  try {
    const savedUser = await newUserModelObject.save();
    console.log(savedUser);  //print.
    res.render("secrets");
  } catch (error) {
    console.error(error);
  }
});

app.post("/login", async function(req, res){
  const username = req.body.username;
  const password = req.body.password;

  try{
    const foundUser = await userModelConstructorFunction.findOne({ email: username });
    if (foundUser){
      if (foundUser.password===password){
        res.render("secrets");
        console.log("Success. Password is correct. Entered password : "+password +". Register password is : "+ foundUser.password);   //Here foundUser.password still gets printed as plain text here. This is still not secure.
      }else{
        console.log("Password is not correct. Entered password : "+password +". Register password is : "+ foundUser.password);   //Here foundUser.password still gets printed as plain text here. This is still not secure.
      }
    }   
  }catch (error) {
    console.error(error);
  }

  /*
  // With the below code you get the following error : "Model.findOne() no longer accepts a callback."
  userModelConstructorFunction.findOne({email:username},function(err, foundUser){
    if (err){
      console.log(err);
    }else{
      if (foundUser){
        if (foundUser.password===password){
          res.render("secrets");
        }
      }
    }
  });*/

});

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});