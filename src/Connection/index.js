const mysql = require('mysql2');
const Connection = mysql.createConnection(
    {
        host: '127.0.0.1',
        port: '3306',
        user: 'root',
        database: 'agrobit',
         password: '142536'
    }
)
module.exports = Connection