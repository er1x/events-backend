var express    = require('express');
var bodyParser = require('body-parser');
var cors       = require('cors');
var qs         = require('querystring');
var moment     = require('moment');
var jwt        = require('jwt-simple');
var request    = require('request');

var config = require('./.secret.json');
var app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

function createJWT(userId) {
  var payload = {
    sub: userId,
    iat: moment().unix(),
    exp: moment().add(14, 'days').unix()
  };
  return jwt.encode(payload, config.TOKEN_SECRET);
}

// Auth route
app.get('/api/auth/twitter', function(req, res) {
  var requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  var accessTokenUrl  = 'https://api.twitter.com/oauth/access_token';
  var authenticateUrl = 'https://api.twitter.com/oauth/authenticate';

  // First request: no auth token present
  if (!req.query.oauth_token && !req.query.oauth_verifier) {
    var requestTokenOauth = {
      consumer_key: config.TWITTER_KEY,
      consumer_secret: config.TWITTER_SECRET
    };

    // Retrieve a Twitter Token and redirect to Twitter auth page
    request.post({ url: requestTokenUrl, oauth: requestTokenOauth }, function(err, response, body) {
      res.redirect(authenticateUrl + '?oauth_token=' + qs.parse(body).oauth_token);
    });
  } else { // Second request, we got an auth token
    var accessTokenOauth = {
      consumer_key: config.TWITTER_KEY,
      consumer_secret: config.TWITTER_SECRET,
      token: req.query.oauth_token,
      verifier: req.query.oauth_verifier
    };

    // Check the token against Twitter and send JWT to app
    request.post({ url: accessTokenUrl, oauth: accessTokenOauth }, function(err, response, resData) {
      // Additional info from user should be retrieved here (from a local db etc.)
      res.send({ token: createJWT(qs.parse(resData).user_id) });
    });
  }
});


app.get('/api/events', function(req, res) {

  // if not authenticated, send forbidden code
  if (!req.headers.authorization) {
    return res.sendStatus(403);
  }

  // check if token is valid
  try {
    var decoded = jwt.decode(req.headers.authorization.split(' ')[1], config.TOKEN_SECRET);
  } catch(err) {
    return res.sendStatus(403);
  }

  // If it is, send events.
  var events = [
    {
      'speaker': 'Homer Simpson',
      'title': 'Emprender en servicios web: Compuglobalhipermeganet',
      'place': 'Sala 5',
      'date': '15:00'
    },
    {
      'speaker': 'Stewie Griffin',
      'title': 'Cómo generar ingresos extra siguiendo gordos con una tuba',
      'place': 'Salón de talleres 1',
      'date': '17:00'
    },
    {
      'speaker': 'Ralph Wiggum',
      'title': '¡Corre plátano!',
      'place': 'Sala 5',
      'date': '19:00'
    }
  ];
  res.send(events);
});

app.listen(8000);
