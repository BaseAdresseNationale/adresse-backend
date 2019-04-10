const {callbackify} = require('util')
const {Strategy} = require('passport-oauth2')
const got = require('got')

const strategy = new Strategy({
  authorizationURL: process.env.FC_SERVICE_URL + '/api/v1/authorize',
  tokenURL: process.env.FC_SERVICE_URL + '/api/v1/token',
  clientID: process.env.FC_FS_ID,
  clientSecret: process.env.FC_FS_SECRET,
  callbackURL: process.env.BACKEND_API_URL + '/publication/fc/callback',
  state: 'foobar',
  scope: ['openid', 'profile']
}, (accessToken, refreshToken, params, profile, done) => {
  profile.idToken = params.id_token
  done(null, profile)
})

strategy.authorizationParams = () => ({nonce: 'foobar'})

strategy.userProfile = callbackify(async accessToken => {
  const gotOptions = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    json: true
  }
  const result = await got(process.env.FC_SERVICE_URL + '/api/v1/userinfo?schema=openid', gotOptions)
  if (!result.body || !result.body.sub) {
    throw new Error('Profil non valide')
  }

  return {
    sub: result.body.sub,
    prenom: result.body.given_name,
    nomNaissance: result.body.family_name,
    nomMarital: result.body.preferred_username,
    sexe: result.body.gender === 'male' ? 'M' : 'F',
    dateNaissance: result.body.birthdate
  }
})

module.exports = strategy
