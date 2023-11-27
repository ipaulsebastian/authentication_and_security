//%%%%%%%%%
require('dotenv').config();

//But is bcrypt hashing still secure? Because the employees can still see your page if it's set so, if the employee gets your hash and salt. Am I right?

const express = require("express");
const bodyParser = require("body-parser"); 
const mongoose = require("mongoose");

//------# const encrypt = require("mongoose-encryption");  
//------* const md5 = require('md5');

const bcrypt = require('bcrypt');
const saltRounds = 10;

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
//-----//userSchema.plugin(encrypt, {secret: process.env.OUR_SECRET, encryptedFields : ['password']});   // Schemas are pluggable, that is, they allow for applying pre-packaged capabilities to extend their functionality. This is a very powerful feature.

const userModelConstructorFunction = new mongoose.model("UserCollection", userSchema);    // Creating a model constructor function. "UserCollection" mentioned as value in brackets is the name of the collection.
// A model is a constructor function that is used to create new documents based on the defined schema. It also provides methods for querying and interacting with the MongoDB collection.


app.get("/", function(req, res){
  res.render("home");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/login", function(req, res){
  res.render("login");
});

//async function run(){}
//"await" keyword in JavaScript can only be used inside functions that are declared as "async".

app.post("/register", async function(req, res){
  //salted hashing.
  bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
    const newUserModelObject = new userModelConstructorFunction({
      email: req.body.username,
      //password: md5(req.body.password)     //Create hash using md5 npm package. Level 3 security.
      password: hash
    });
    
    // Saving the details in the database and rendering the secrets page. Not compulsory necessory for a try-catch statement here.
    try {
      const savedUser = await newUserModelObject.save();     //"await" pauses async function, waits for promise resolution, and retrieves resolved value, enhancing asynchronous code readability and flow. ----// In JavaScript, a Promise is an object representing the eventual completion or failure of an asynchronous operation, and promise resolution refers to the point in time when the asynchronous operation represented by the Promise finishes successfully. When a Promise is created, it's in a pending state. It can either be resolved (fulfilled) with a value or rejected with a reason (an error). 
      console.log(savedUser);    //print.
      res.render("secrets");     //Yes here the secrets page comes after registration. Also, this being inside try-catch statement ensures that if the document is not properly saved inside the database, it is not going to show the secrets page.
    } catch (error) {
      console.error(error);
    }
  });
});


/*
In the context of programming, "non-blocking" refers to the capability of a process or operation 
to not halt the execution of other tasks while waiting for a particular operation to complete. In 
asynchronous programming, non-blocking operations allow the program to continue executing other 
tasks while waiting for potentially time-consuming operations (such as I/O operations or network 
requests) to finish.
*/


app.post("/login", async function(req, res){
  const username = req.body.username;
  //------* const password = md5(req.body.password);      //Create hash using md5 npm package. Level 3 security.
  try{
    const foundUser = await userModelConstructorFunction.findOne({ email: username });
    if (foundUser){
      bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
        if (result==true){
          console.log("Success. Password is correct.");  
          res.render("secrets");            
        }else{
          console.log("Failure. Password is not correct.");
        }
      });

    }   
  }catch (error) {
    console.error(error);
  }
});

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});