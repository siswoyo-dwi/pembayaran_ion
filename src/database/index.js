
/*
 * GET home page.
 */
// import database

 var mysql      = require('mysql2');

module.exports.connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  port	   : '3306',
  password : '*Yukihana777*',
  database : 'pembayaran'
});