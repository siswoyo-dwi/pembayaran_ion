var connection = require('../database').connection;
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
  var cek_login = require('./login').cek_login;
  var cek_login_google = require('./login').cek_login_google;
  var dbgeo = require("dbgeo");
  var multer = require("multer");
  var st = require('knex-postgis')(sql_enak);
  var deasync = require('deasync');
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

//start-------------------------------------
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
await sql_enak.insert(post).into('paket').then(data=>{
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
  await sql_enak('paket').where('paket_id','=',post.paket_id).update(post).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.get('/hapus/:id',async function(req, res) {
  await sql_enak('paket').where('paket_id','=',req.params.id).update({deletedAt:new Date}).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data[0]})
 })
 .catch(err=>{
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/list',async function(req, res) {
  let {paket_id,count,limit,offset}  = req.body
  let value = [0]
  let str =' and p.paket_id > ?'
  let a = `  *   `
  if (count) {
    a = ' count(*) as jml '
  }
 

  if (paket_id) {
    if (regex.test(paket_id)) {
      str += ' and p.paket_id = ?'
      value.push(paket_id)
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
  let sql = `SELECT  ${a}  FROM paket p  WHERE ISNULL(p.deletedAt) `+str
  
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
  let str =' and p.paket_id > ?'
  if (req.query.paket_id) {
    if (regex.test(req.query.paket_id)) {
      str += ' and p.paket_id = ?'
      value.push(req.query.paket_id)
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
  let sql = `SELECT *  FROM paket p    WHERE ISNULL(p.deletedAt) `+str
  
  await sql_enak.raw(sql,value).then(data=>{
    res.status(200).json({ data: data[0]})
 })
 .catch(err=>{
  console.log(err);

    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/count_paket_by',async function(req, res) {
  let {by} = req.body
  let a = ''
  if (by=='hari') {
    a = `and date_format(l.start,'%Y-%m-%d') = current_date()`
  }else if (by=='bulan') {
    a= ` and date_format(l.start,'%m') =  date_format(current_date(),'%m')  `
  }else if (by=='tahun') {
    a= ` and date_format(l.start,'%Y') =  date_format(current_date(),'%Y')  `
  }
  let value = []
  let sql = `select  count(l.paket_id) as y , p.nama  as label from  log l left join paket p on p.paket_id = l.paket_id  where isnull(l.deletedAt) ${a}  group by l.paket_id  order by y desc   `
  await sql_enak.raw(sql,value).then(data=>{
    res.status(200).json({ data: data[0]})
 })
 .catch(err=>{
  console.log(err);

    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/sum_biaya_by',async function(req, res) {
  let {tahun} = req.body
  let a = ''
  if (tahun) {
    a = `and date_format(l.start,'%Y') =`+tahun
  }
  let value = []
  let sql =`select  sum(l.total_biaya) as y , date_format(l.start,'%m') as name  , date_format(l.start,'%m') as label from  log l left join paket p on p.paket_id = l.paket_id  where isnull(l.deletedAt) ${a} group by name `

  await sql_enak.raw(sql,value).then(data=>{
    res.status(200).json({ data: data[0]})
 })
 .catch(err=>{
  console.log(err);

    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
module.exports = router;
