var connection = require('../database/index.js').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , path = require('path')
  ,  sha1 = require('sha1');
  var sql_enak = require('../database/mysql_enak.js').connection;
  var cek_login = require('./login.js').cek_login;
  var cek_login_google = require('./login.js').cek_login_google;
  var dbgeo = require("dbgeo");
  var multer = require("multer");
  var st = require('knex-postgis')(sql_enak);
  var deasync = require('deasync');
const { log } = require('async');
  path.join(__dirname, '/public/foto')
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  var regex = /^[a-zA-Z0-9\s]+$/;

  router.use(cookieParser() );
  router.use(passport.initialize());
  router.use(passport.session());
  router.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/foto/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+'-'+file.originalname)
  }
})

var upload = multer({ storage: storage })

//insertedAt-------------------------------------
router.post('/insert', upload.fields([{ name: 'foto_1', maxCount: 1 }, { name: 'foto_2', maxCount: 1 }]),async function(req, res) {

  let post = req.body

  post.insertedAt = new Date()
  post.lastUpdateAt = new Date()
 if (req.files) {
  if (req.files['foto_1']) {
    var nama_file = req.files['foto_1'][0].filename;
    post['foto_1'] = nama_file;
  }

  if (req.files['foto_2']) {
    var nama_file = req.files['foto_2'][0].filename;
    post['foto_2'] = nama_file;
  }
}
await sql_enak.insert(post).into('pengeluaran').then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
  console.log(err,'err');
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
});

router.post('/edit', upload.fields([{ name: 'foto_1', maxCount: 1 }, { name: 'foto_2', maxCount: 1 }]),async function(req, res) {
  let post = req.body
  post.lastUpdateAt = new Date()
  if (req.files) {
    if (req.files['foto_1']) {
      var nama_file = req.files['foto_1'][0].filename;
      post['foto_1'] = nama_file;
    }
  
    if (req.files['foto_2']) {
      var nama_file = req.files['foto_2'][0].filename;
      post['foto_2'] = nama_file;
    }
  }
  await sql_enak('pengeluaran').where('pengeluaran_id','=',post.pengeluaran_id).update(post).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
  console.log(err);
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})

router.get('/hapus/:id',async function(req, res) {
  await sql_enak('pengeluaran').where('pengeluaran_id','=',req.params.id).update({deletedAt:new Date}).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data[0]})
 })
 .catch(err=>{
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/list',async function(req, res) {
  let {pengeluaran_id,count,limit,offset}  = req.body
  let value = [0]
  let str =' and p.pengeluaran_id > ?'
  let a = `  *,DATE_FORMAT(p.insertedAt,'%Y-%m-%d') as insertedAt,DATE_FORMAT(p.insertedAt,'%d-%m-%Y') as insertedAt1  `
  if (count) {
    a = ' count(*) as jml '
  }
 

  if (pengeluaran_id) {
    if (regex.test(pengeluaran_id)) {
      str += ' and p.pengeluaran_id = ?'
      value.push(pengeluaran_id)
    }else{
      res.json('Error System 666')
    }

  }
  str+='  ORDER BY p.insertedAt DESC '
  if (limit) {
    str += ` limit ${limit}`
  }
  if (offset) {
    str += ` offset ${offset}`
  }
  let sql = `SELECT  ${a}  FROM pengeluaran p  WHERE ISNULL(p.deletedAt) `+str
  
  await sql_enak.raw(sql,value).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data[0]})
 })
 .catch(err=>{
  console.log(err);
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.get('/list',async function(req, res) {
  let value = [0]
  let str =' and p.pengeluaran_id > ?'
  if (req.query.pengeluaran_id) {
    if (regex.test(req.query.pengeluaran_id)) {
      str += ' and p.pengeluaran_id = ?'
      value.push(req.query.pengeluaran_id)
    }else{
      res.json('Error System 666')
    }

  }

  
  str+='  ORDER BY p.insertedAt DESC '
  if (req.query.limit) {
    str += ' limit ?'
    value.push(+req.query.limit)
  }
  if (req.query.offset) {
    str += ` offset ${req.query.offset}`
  }
  let a = `  *,DATE_FORMAT(p.insertedAt,'%Y-%m-%d %H:%i:%S') as insertedAt,DATE_FORMAT(p.insertedAt,'%d-%m-%Y') as insertedAt1  `

  let sql = `SELECT ${a}  FROM pengeluaran p    WHERE ISNULL(p.deletedAt) `+str
  
  await sql_enak.raw(sql,value).then(data=>{
    res.status(200).json({ data: data[0]})
 })
 .catch(err=>{
  console.log(err);

    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})

router.post('/chart',async function(req, res) {
  let {tahun} = req.body
  let value = []
  let label = 'M'
  let thn = new Date().getFullYear()
  let str = ` and date_format(p.insertedAt,'%Y') = ` 

  if (tahun=='-') {
    label = 'Y'
    thn = ''
    str = ''
  }else if (tahun) {
    thn = tahun
  }

  let sql = `select p.pengeluaran as y ,date_format(p.insertedAt,'%d-%m-%Y') as pada, date_format(p.insertedAt,'%${label}') as label from pengeluaran p where p.deletedAt is null ${str} ${thn} group by label  `
  
  await sql_enak.raw(sql,value).then(data=>{
    res.status(200).json({ data: data[0]})
 })
 .catch(err=>{
  console.log(err);

    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
module.exports = router;
