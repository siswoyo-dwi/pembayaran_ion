var express = require('express')
  , http = require('http')
  , path = require('path')
  , logger = require('morgan')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , static = require('serve-static')
  , errorHandler =require('errorhandler')
  , passport = require('passport')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , flash=require("connect-flash")
  , LocalStrategy = require('passport-local').Strategy;
  var cors = require('cors');

var login = require('./isine/login').router;
var peta = require('./isine/topojson');
var upload = require('./isine/upload_file');
var upload_shp = require('./isine/upload_shp');
var user = require('./isine/user');
var fn = require('./isine/ckeditor-upload-image');
var cek_login = require('./isine/login').cek_login;
var manajemen_basic = require('./isine/manajemen_basic');
var manajemen_billing = require('./isine/manajemen_billing');
var manajemen_ps = require('./isine/manajemen_ps');
var manajemen_paket = require('./isine/manajemen_paket');
var ps = require('./isine/ps');
var paket = require('./isine/paket');
var log = require('./isine/log');


var app = express();
var connection = require('./database').connection;
//var mysql2geojson = require("mysql2geojson");
var router = express.Router();
var dbgeo = require("dbgeo");
app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');
//app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');


//end dbf dan shp
// all environments
app.set('port', 5000);
app.use(cors())
//app.use(express.favicon());
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the ps (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
app.use(logger('dev'));
app.use(methodOverride());
app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser() );
app.use(session({duration: 50 * 60 * 1000,
                      activeDuration: 10 * 60 * 1000,
                       secret: 'bhagasitukeren', 
                       cookie: { maxAge : 60 * 60 * 1000 },
                       cookieName: 'session',
                       saveUninitialized: true,
                        resave: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());  
// Add headers

// development only
if ('development' == app.get('env')) {
  app.use(errorHandler());
}
 var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));  
});
var io = require('socket.io').listen(server, { log: false });
// const io = require('socket.io')(5000)

//mulai apps ----------------------------------------------------------
app.use('/autentifikasi', login);
app.use('/peta', peta);
app.use('/upload', upload);
app.use('/upload_shp', upload_shp);
app.use('/user', user);
app.use('/ps', ps);
app.use('/uploadckeditor', fn);
app.use('/manajemen_basic', manajemen_basic);
app.use('/manajemen_billing', manajemen_billing);
app.use('/manajemen_ps', manajemen_ps);
app.use('/manajemen_paket', manajemen_paket);

app.use('/paket', paket);
app.use('/log', log);


app.get('/', function (req, res) {
  var tujuan = req.flash('tujuan');
var pesan = req.flash('pesan');
var menuju = "/beranda";
	if(tujuan!=""){
		 menuju = tujuan;
	}
  else if(req.query.tujuan != undefined){
    menuju = req.query.tujuan;
  }
    res.render('content/index', {
        user: req.user, pesan: pesan, tujuan : menuju 
    });
});


app.get('/backoffice', cek_login, function (req, res) {
  res.render('content-backoffice/index');
});



app.use(function (req, res, next) {
  res.status(404).send("Halaman yang anda tuju tidak ada!")
})
  
// <!-- start socketio connection -->
// io.sockets.on('connection', function (socket) {	



// });
