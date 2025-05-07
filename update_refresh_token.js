const fs = require('fs');
const readline = require('readline');

const CONFIG_FILE = './config.json';

// Fungsi untuk memuat config dari file
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading config: ${error.message}`);
            process.exit(1);
        }
    } else {
        console.error('Configuration file not found.');
        process.exit(1);
    }
}

// Fungsi untuk menyimpan config ke file
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('Configuration successfully updated.');
    } catch (error) {
        console.error(`Failed to save config: ${error.message}`);
        process.exit(1);
    }
}

// Fungsi untuk memperbarui refreshToken dan authToken berdasarkan privateKey (userName)
function updateTokens(privateKey, newRefreshToken, newAuthToken) {
    const config = loadConfig();
    const account = config.find(account => account.privateKey === privateKey);
    
    if (account) {
        account.refreshToken = newRefreshToken;
        account.authToken = newAuthToken;
        saveConfig(config);
        console.log(`Tokens updated for user ${privateKey}.`);
    } else {
        console.error(`User ${privateKey} not found in config.`);
    }
}

// Membaca input dari terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter the user privateKey: ', (privateKey) => {
    rl.question('Enter the new refreshToken: ', (newRefreshToken) => {
        rl.question('Enter the new authToken: ', (newAuthToken) => {
            updateTokens(privateKey, newRefreshToken, newAuthToken);
            rl.close();
        });
    });
});
