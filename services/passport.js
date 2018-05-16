const passport = require('passport');
const passportJWT = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const JWYStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const User = require('./../models/user');

const localOptions = { usernameField: 'email', passwordField: 'password' };
const localLogin = new LocalStrategy(localOptions, (email, password, done) => {
  return User.findOne({ email, password })
    .then(user =>
      !user
      ? done(null, false, { message: 'Incorrect email or password' })
      : done(null, user, { message: 'Logged in successfully' })
    )
    .catch(err => done(err));
});

const jwtLogin = new JWYStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'some_jwt_secret',
}, (payload, done) => {
  return User.findOneById(payload.id)
    .then(user => done(null, user))
    .catch(err => done(err));
});

passport.use(localLogin);
passport.use(jwtLogin);
