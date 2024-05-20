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
await sql_enak.insert(post).into('ps').then(data=>{
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
  await sql_enak('ps').where('ps_id','=',post.ps_id).update(post).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
  console.log(err);
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/mulai',async function(req, res) {
  let post = req.body
  post.lastUpdateAt = new Date()
  post.start = new Date()
  post.end = null
  post.total_biaya = 0
  post.status = 1
  await sql_enak('ps').where('ps_id','=',post.ps_id).update(post).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
  console.log(err);
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/paket',async function(req, res) {
  let post = req.body
  let paket = await sql_enak.raw(`SELECT  *  FROM paket p  WHERE p.paket_id = `+post.paket_id)

  post.lastUpdateAt = new Date()
  post.start = new Date()
  post.end = new Date(new Date().getTime()+(paket[0][0].timer*60000))
  post.timer = paket[0][0].timer
  post.biaya = paket[0][0].biaya

  post.total_biaya = paket[0][0].biaya
  post.status = 1
  await sql_enak('ps').where('ps_id','=',post.ps_id).update(post).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
  console.log(err);
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/selesai',async function(req, res) {
  let post = req.body
  post.status = 0
  post.lastUpdateAt = new Date()
  post.end = new Date()
  let ps = await sql_enak.raw(`SELECT  *  FROM ps p  WHERE p.ps_id = `+post.ps_id)
  post.paket_id = ps[0][0].paket_id
  if (ps[0][0].paket_id==0||ps[0][0].paket_id==null) {
    post.total_biaya =Math.ceil(((new Date().getTime()- new Date(ps[0][0].start).getTime())/60000)* ps[0][0].biaya)
    post.timer = Math.ceil(((new Date().getTime()- new Date(ps[0][0].start).getTime())/60000))
}
  await sql_enak('ps').where('ps_id','=',post.ps_id).update(post).then(async data=>{
    let ps = await sql_enak.raw(`SELECT  *  FROM ps p  WHERE p.ps_id = `+post.ps_id)
    delete ps[0][0].status 
    ps[0][0].paket_id =ps[0][0].paket_id?ps[0][0].paket_id:null
    await sql_enak.insert( ps[0][0]).into('log')

    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
  console.log(err);
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/reset',async function(req, res) {
  let post = req.body
  post.lastUpdateAt = new Date()
  post.paket_id=null
  post.biaya=null
  post.total_biaya=null
  post.end=null
  post.timer=0
  post.start = null
  post.status = 0
  await sql_enak('ps').where('ps_id','=',post.ps_id).update(post).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
  console.log(err);
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.get('/hapus/:id',async function(req, res) {
  await sql_enak('ps').where('ps_id','=',req.params.id).update({deletedAt:new Date}).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data[0]})
 })
 .catch(err=>{
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.post('/list',async function(req, res) {
  let {ps_id,count,limit,offset}  = req.body
  let value = [0]
  let str =' and p.ps_id > ?'
  let a = `  *,DATE_FORMAT(p.start,'%Y-%m-%d %H:%i:%S') as start1,DATE_FORMAT(p.end,'%Y-%m-%d %H:%i:%S') as end1  `
  if (count) {
    a = ' count(*) as jml '
  }
 

  if (ps_id) {
    if (regex.test(ps_id)) {
      str += ' and p.ps_id = ?'
      value.push(ps_id)
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
  let sql = `SELECT  ${a}  FROM ps p  WHERE ISNULL(p.deletedAt) `+str
  
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
  let str =' and p.ps_id > ?'
  if (req.query.ps_id) {
    if (regex.test(req.query.ps_id)) {
      str += ' and p.ps_id = ?'
      value.push(req.query.ps_id)
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
  let a = `  *,DATE_FORMAT(p.start,'%Y-%m-%d %H:%i:%S') as start1,DATE_FORMAT(p.end,'%Y-%m-%d %H:%i:%S') as end1  `

  let sql = `SELECT ${a}  FROM ps p    WHERE ISNULL(p.deletedAt) `+str
  
  await sql_enak.raw(sql,value).then(data=>{
    res.status(200).json({ data: data[0]})
 })
 .catch(err=>{
  console.log(err);

    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.get('/list_dengan_bill',async function(req, res) {
  let value = [0]
  let str =' and p.ps_id > ?'
  if (req.query.ps_id) {
    if (regex.test(req.query.ps_id)) {
      str += ' and p.ps_id = ?'
      value.push(req.query.ps_id)
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
  let sql = `SELECT *  FROM ps p    WHERE ISNULL(p.deletedAt) `+str
  let paket =await sql_enak.raw(`SELECT *  FROM paket p  WHERE ISNULL(p.deletedAt) `)
  await sql_enak.raw(sql,value).then(data=>{
    for (let i = 0; i < data.length; i++) {
      data[i].paket = paket[0]
    }
    res.status(200).json({ data: data[0]})
 })
 .catch(err=>{
  console.log(err);

    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
module.exports = router;
