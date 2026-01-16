var url = require("url"),
	bcrypt = require("bcrypt-nodejs");
	querystring = require("querystring");
var User       = require('./models/user');
module.exports = function(app, passport) {

app.get('/loginStatus', function(req, res) {
  console.log (req.isAuthenticated())
  if (req.isAuthenticated())
    res.send(JSON.stringify(req.user));
  else
    res.send("0");
});

// LOGOUT ==============================
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

// LOGIN  ==============================
app.post('/tryLogin', passport.authenticate('local-login', {
    successRedirect : '/index.html', // redirect to the secure profile section
    failureRedirect : '/login.html#fail', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

// process the signup form
app.post('/tryRegister', passport.authenticate('local-signup', {
    successRedirect : '/index.html', // redirect to the secure profile section
    failureRedirect : '/login.html#failReg', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

app.get('/changepass', isLoggedIn, async function (req, res) {
var incoming = url.parse(req.url).query;
var info = querystring.parse(incoming);
   var user = req.user;
   var newpass = info.newpass;
   var oldpass = info.oldpass;
   if (user.validPassword(oldpass)){
     user.local.password = bcrypt.hashSync(newpass, bcrypt.genSaltSync(8), null);
     try {
         await user.save();
         res.send("1");
     } catch (err) {
         res.send("issue");
     }
   }
   else{
       res.send("0");
   }
});



app.get('/resetpass', async function (req, res) {
var incoming = url.parse(req.url).query;
var info = querystring.parse(incoming);
try {
    const user = await User.findOne({ 'local.email' :  info.id });
    if(user){
        user.local.password = bcrypt.hashSync(info.pass, bcrypt.genSaltSync(8), null);
        var tk = info.tk;
        const result = await db.collection('userID').findOne({id:info.id});
        if(result){
            if(result.lostPToken && result.lostPToken == tk && result.lostPTS && result.lostPTS - new Date().getTime() < 2*60*60*1000){
                await user.save();
                res.send("1");
                result.lostPToken = "";
                await db.collection("userID").updateOne({id:info.id}, {$set: result});
                // Note: Email sending commented out as transporter/mailOptions not defined
                // mailOptions.to = info.id;
                // transporter.sendMail(mailOptions, function(error, info){
                //     if(error){
                //         return console.log(error);
                //     }
                // });
            }
            else{
                res.send("0");
            }
        }
        else{
            res.send("0");
        }
    }
    else{
        res.send("0");
    }
} catch(err) {
    console.log(err);
    res.send("0");
}
});



};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
if (req.isAuthenticated())
    return next();
  res.redirect('/');
}

