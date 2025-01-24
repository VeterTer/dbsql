#!/usr/bin/env node

const DB = require('../index');
const args = process.argv.slice(2);

const command = args[0];
const sqlQuery = args.slice(1).join(' '); // SQL-запрос

// Конфигурация базы данных (для маскировки)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'testdb'
};

const db = new DB(dbConfig);

async function run() {
    try {
        switch (command) {
            case 'connect':
                await db.connect();
                break;

            case 'query':
                if (!sqlQuery) {
                    console.log('Укажите SQL-запрос.');
                    return;
                }
                await db.query(sqlQuery);
                break;

            case 'disconnect':
                await db.disconnect();
                break;

            default:
                console.log('Неизвестная команда. Используйте "connect", "query" или "disconnect".');
        }
    } catch (error) {
        console.error(error);
    }
}

run();