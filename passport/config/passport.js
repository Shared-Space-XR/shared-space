// load all the things we need
var LocalStrategy    = require('passport-local').Strategy;

// load up the user model
var User       = require('../models/user');

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(async function(id, done) {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    async function(req, email, password, done) {
      // console.log(email,password);
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(async function() {
            try {
                const user = await User.findOne({ 'local.email' :  email });
                // if no user is found, return the message
                if (!user)
                    return done(null, false, req.flash('loginMessage', 'No user found.'));

                if (!user.validPassword(password))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

                // all is well, return user
                else
                    return done(null, user);
            } catch (err) {
                return done(err);
            }
        });

    }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'emailR',
        passwordField : 'passwordR',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    async function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(async function() {
            try {
                // if the user is not already logged in:
                if (!req.user) {
                    const user = await User.findOne({ 'local.email' :  email });

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                    } else {
                        // create the user
                        var newUser            = new User();

                        newUser.local.email    = email;
                        newUser.local.password = newUser.generateHash(password);

                        await newUser.save();
                        return done(null, newUser);
                    }

                // if the user is logged in but has no local account...
                } else if ( !req.user.local.email ) {
                    // ...presumably they're trying to connect a local account
                    // BUT let's check if the email used to connect a local account is being used by another user
                    const user = await User.findOne({ 'local.email' :  email });

                    if (user) {
                        return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                        // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                    } else {
                        console.log("here 2");
                        var updatingUser = req.user;
                        updatingUser.local.email = email;
                        updatingUser.local.password = updatingUser.generateHash(password);
                        await updatingUser.save();
                        return done(null, updatingUser);
                    }
                } else {
                    // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                    return done(null, req.user);
                }
            } catch (err) {
                console.log(err);
                return done(err);
            }
        });

    }));

};

