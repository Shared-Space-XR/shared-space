var url = require("url"),
	querystring = require("querystring");
var passport = require('passport');
var fs = require('fs');
	var dbURL = 'mongodb://44.246.204.171:27017/test';
	//var dbURL = 'mongodb://127.0.0.1:27017/test';
var path = require('path'),
  express = require('express');

var { MongoClient } = require('mongodb');
const mongoClient = new MongoClient(dbURL);
let db;

var mongoose = require('mongoose');
mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true }); // connect to our database

var app = express();
var secret = 'test' + new Date().getTime().toString()

var session = require('express-session');
app.use(require("cookie-parser")(secret));
var MongoStore = require('connect-mongo');
app.use(session({
   store: new MongoStore({
      mongoUrl: dbURL
   }),
   secret: secret,
   resave: false,
   saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
var flash = require('express-flash');
app.use( flash() );

var bodyParser = require("body-parser");
var methodOverride = require("method-override");

app.use(methodOverride());
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended:false
}));
require('./passport/config/passport')(passport); // pass passport for configuration
require('./passport/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// Connect to MongoDB
mongoClient.connect().then(() => {
  db = mongoClient.db('test');
  console.log('Connected to MongoDB');
}).catch(err => console.error('MongoDB connection error:', err));


app.get("/api/dropObject"/*, isLoggedIn*/, async function(req,res){
  try {
    var query = {};
    // Only filter by userId if user is logged in
    if (req.isAuthenticated() && req.user && req.user._id) {
      query.userId = req.user._id;
    }
    const docs = await db.collection('drops')
      .find(query)
      .sort({_id: -1})
      .limit(50)
      .toArray();
    res.json({ ok: true, items: docs || [] });
  } catch(err){
    res.status(500).json({ ok: false, error: err.toString() });
  }
})

app.post("/api/dropObject", isLoggedIn, async function(req,res){
  try{
    var payload = req.body || {};
    var doc = {
      userId: req.user ? req.user._id : null,
      user: req.user ? ((req.user.local && req.user.local.email) || req.user.username || req.user.email || null) : null,
      modelIndex: payload.modelIndex,
      lat: payload.lat,
      lon: payload.lon,
      alt: payload.alt,
      floorLevel: payload.floorLevel || null,
      localPos: payload.localPos,
      quaternion: payload.quaternion,
      timestamp: payload.timestamp || Date.now(),
      createdAt: new Date(payload.timestamp || Date.now())
    };

    const result = await db.collection('drops').insertOne(doc);
    const insertedId = result.insertedId;
    console.log('Dropped object stored:', insertedId);
    res.json({ ok: true, id: insertedId });
  }catch(e){
    console.error('Drop storage error:', e);
    res.status(500).json({ ok: false, error: e.toString() });
  }
})

app.get("/getProjects", function(req,res){

})

app.use(express.static(path.join(__dirname, 'public')));
//app.listen(8080);


if (require.main === module) { app.listen(8080); }// Instead do export the app:
else{ module.exports = app; }


console.log("server running at http://localhost:8080")

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.send('noauth');
}
