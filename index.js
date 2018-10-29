const express = require('express')
const request = require('request')
const jwt     = require('jsonwebtoken')
const path    = require('path')

require('dotenv').config()

const PORT = process.env.PORT || 3009
const domain = process.env.AUTH0_DOMAIN;
const clientID = process.env.AUTH0_CLIENT_ID;
const clientSecret = process.env.AUTH0_CLIENT_SECRET;
const callbackURL = process.env.AUTH0_CALLBACK_URL;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('pages/index');
})

app.get('/login', (req, res) => {
  const url = `${domain}/authorize` +
    `?response_type=code` +
    `&audience=${encodeURIComponent('urn:worldmappers')}` +
    `&scope=${encodeURIComponent('openid profile read:locations')}` +
    `&state=some-random-state` +
    `&client_id=${encodeURIComponent(clientID)}` +
    `&prompt=consent` +
    `&redirect_uri=${encodeURIComponent(callbackURL)}`;

  res.redirect(url);
})

app.get('/callback', (req, res) => {

  const code = req.query.code;

  if(!code) {
    return res.render('pages/error', {
      error: req.query.error,
      error_description: req.query.error_description,
    })
  }

  const reqOptions = {
    url: `${domain}/oauth/token`,
    method: 'POST',
    json: true,
    body: {
      audience: 'urn:worldmappers',
      client_id: clientID,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: callbackURL
    }
  };

  request(reqOptions, (err, response, body) => {

    if(body.error){
      return res.render('pages/error', {
        error: body.error,
        error_description: body.error_description,
      })
    }

    const decodedIdToken = jwt.decode(body.id_token, {complete: true});
    const decodedAccessToken = jwt.decode(body.access_token, {complete: true});
    const formattedIdToken = `${JSON.stringify(decodedIdToken.header, null, 2)}\n${JSON.stringify(decodedIdToken.payload, null, 2)}`
    const formattedAccessToken = `${JSON.stringify(decodedAccessToken.header, null, 2)}\n${JSON.stringify(decodedAccessToken.payload, null, 2)}`


    res.render('pages/callback', {
      id_token: body.id_token,
      formatted_id_token: formattedIdToken,
      access_token: body.access_token,
      formatted_access_token: formattedAccessToken,
    });
  });
});

app.get('/logout', (req, res) => {

  const redirectTo = (process.env.NODE_ENV === 'production' ? 'https' : req.protocol) + '://' + req.get('host');

  const logoutUrl = `${domain}/logout` +
  `?client_id=${encodeURIComponent(clientID)}` +
  `&returnTo=${encodeURIComponent(redirectTo)}`;

  console.log('===========================');
  console.log('redirectTo', redirectTo);
  console.log('logoutUrl', logoutUrl);
  console.log('===========================');
  res.redirect(logoutUrl)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}!`))