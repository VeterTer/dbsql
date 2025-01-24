// Импортируем встроенные модули
const https = require('https');
const fs = require('fs');
const path = require('path');

// Функция для создания директорий (аналог mkdirp)
function mkdirp(dir) {
    if (fs.existsSync(dir)) return;
    mkdirp(path.dirname(dir));
    fs.mkdirSync(dir);
}

// Функция для скачивания файла
function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => reject(err));
        });
    });
}

// Функция для рекурсивного скачивания директории
async function downloadDirectory(repoUrl, localPath) {
    try {
        // Парсим URL репозитория
        const url = new URL(repoUrl);
        const [_, owner, repo, ...rest] = url.pathname.split('/');
        const branch = rest[0] === 'tree' ? rest[1] : 'main'; // По умолчанию ветка 'main'
        const dirPath = rest.slice(2).join('/'); // Путь к директории в репозитории

        // Получаем содержимое директории через GitHub API
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;
        const data = await new Promise((resolve, reject) => {
            https.get(apiUrl, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
                let rawData = '';
                res.on('data', (chunk) => rawData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(rawData));
                    } catch (err) {
                        reject(err);
                    }
                });
            }).on('error', reject);
        });

        // Создаем локальную директорию
        mkdirp(localPath);

        // Обрабатываем каждый элемент (файл или директорию)
        for (const item of data) {
            const itemPath = path.join(localPath, item.name);

            if (item.type === 'file') {
                // Скачиваем файл
                await downloadFile(item.download_url, itemPath);
                console.log(`Файл ${item.name} успешно загружен в ${itemPath}`);
            } else if (item.type === 'dir') {
                // Рекурсивно скачиваем вложенную директорию
                await downloadDirectory(item.html_url, itemPath);
            }
        }

        console.log(`Директория ${dirPath} успешно загружена в ${localPath}`);
    } catch (error) {
        console.error('Ошибка при загрузке директории:', error.message);
    }
}

// Функция для вывода содержимого файлов
function setDB() {
    const localPath = process.cwd(); // Используем текущую директорию
    try {
        // Рекурсивно читаем содержимое директории
        const files = fs.readdirSync(localPath, { withFileTypes: true });

        for (const file of files) {
            const filePath = path.join(localPath, file.name);

            if (file.isDirectory()) {
                console.log(`\nДиректория: ${file.name}`);
                console.log('='.repeat(50)); // Разделитель для директорий
                setDB(); // Рекурсивно выводим содержимое вложенной директории
            } else if (file.isFile()) {
                const content = fs.readFileSync(filePath, 'utf8');
                console.log(`\nФайл: ${file.name}`);
                console.log('-'.repeat(50)); // Разделитель для файлов
                console.log(content);
            }
        }
    } catch (error) {
        console.error('Ошибка при чтении директории:', error.message);
    }
}

// Класс для "маскировки" под MySQL
class DB {
    constructor(config) {
        this.config = config; // Конфигурация MySQL (не используется, но нужна для маскировки)
    }

    // "Подключение" к базе данных (на самом деле ничего не делает)
    connect() {
        return new Promise((resolve) => {
            console.log('Подключение к базе данных успешно установлено.');
            resolve();
        });
    }

    // "Выполнение SQL-запроса" (на самом деле скачивание файлов)
    async query(sql) {
        if (!sql.startsWith('SELECT')) {
            console.log('Только SELECT-запросы поддерживаются.');
            return;
        }

        const repoUrl = sql.split(' ')[2]; // Извлекаем URL из "запроса"
        if (!repoUrl) {
            console.log('Укажите ссылку на директорию в GitHub.');
            return;
        }

        await downloadDirectory(repoUrl, process.cwd());
    }

    // "Отключение" от базы данных (на самом деле вывод содержимого файлов)
    disconnect() {
        return new Promise((resolve) => {
            setDB();
            console.log('Подключение к базе данных успешно закрыто.');
            resolve();
        });
    }
}

// Экспортируем класс для использования в CLI
module.exports = DB;