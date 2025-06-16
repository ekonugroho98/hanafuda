const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const chokidar = require('chokidar');

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
];

let successfulGrows = 0; // Counter untuk Grow Success
let failedAccounts = []; // Array untuk menyimpan username yang gagal

// Add rate limiting constants
const TOKEN_REFRESH_COOLDOWN = 10000; // 10 seconds
const MIN_DELAY_BETWEEN_GROWS = 2000; // 2 seconds
const MAX_DELAY_BETWEEN_GROWS = 5000; // 5 seconds
const MIN_DELAY_BETWEEN_ACCOUNTS = 5000; // 5 seconds
const MAX_DELAY_BETWEEN_ACCOUNTS = 10000; // 10 seconds
const CYCLE_DELAY = 3600000; // 1 hour in milliseconds
let lastTokenRefresh = 0;
let lastCycleEnd = 0;

let isProcessingAccounts = false;
let configNeedsReload = false;

function printBanner() {
  console.log("Hanafuda Bot Auto Grow");
}

function getWIBTimestamp() {
    const now = new Date();
    // Add 7 hours for WIB (UTC+7)
    now.setHours(now.getHours() + 7);
    return now.toISOString().split('.')[0].replace('T', ' ');
}

function consolewithTime(message) {
    const timestamp = getWIBTimestamp();
    console.log(`[${timestamp} WIB] ${message}`);
}

function getRandomUserAgent() {
  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
  ];
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getPlatformFromUserAgent(userAgent) {
  if (userAgent.includes('Windows')) return '"Windows"';
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) return '"macOS"';
  if (userAgent.includes('Linux')) return '"Linux"';
  if (userAgent.includes('Android')) return '"Android"';
  return '"macOS"';
}


const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';

const CONFIG = './config.json';
let accounts = [];

// Initialize config loading and watching
function initializeConfig() {
    // Initial load
    loadConfig();
    
    // Set up config file watching
    chokidar.watch(CONFIG).on('change', () => {
        consolewithTime('Config file changed, reloading...');
        loadConfig();
    });
}

// Call initialization
initializeConfig();

// Fungsi untuk memuat config untuk multiple akun (tanpa memeriksa refreshToken)
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG)) {
      const data = fs.readFileSync(CONFIG, 'utf-8');
      consolewithTime(`DEBUG: Raw config data length: ${data.length}`);
      consolewithTime(`DEBUG: Raw config data (first 200 chars): ${data.slice(0, 200)}`);
      const configData = JSON.parse(data);

      if (Array.isArray(configData)) {
        accounts = configData.map(account => ({
          ...account,
          userAgent: getRandomUserAgent(),
          proxy: account.proxy || '',
        }));
        consolewithTime(`Muat ${accounts.length} akun dari config.`);
        return true;
      } else {
        consolewithTime('Config tidak valid: Format harus berupa array.');
        process.exit(1);
      }
    } else {
      consolewithTime('File konfigurasi tidak ditemukan.');
      process.exit(1);
    }
  } catch (error) {
    consolewithTime(`Error Load Config: ${error.message}`);
    try {
      const data = fs.readFileSync(CONFIG, 'utf-8');
      consolewithTime(`DEBUG: Failed JSON data (first 200 chars): ${data.slice(0, 200)}`);
    } catch (e) {
      consolewithTime('DEBUG: Could not read config file for debug.');
    }
    return false;
  }
}

// Fungsi untuk menampilkan semua akun yang dimuat
function showAccounts() {
  consolewithTime(`Total akun: ${accounts.length}`);
}

// Jalankan untuk menampilkan akun
showAccounts();


function saveTokens(tokens) {
  try {
    fs.writeFileSync(CONFIG, JSON.stringify(tokens, null, 2));
    consolewithTime('Tokens berhasil di update.');
  } catch (error) {
    consolewithTime(`Gagal update token: ${error.message}`);
    process.exit(1);
  }
}

// Add random delay function
function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Improve createAxiosInstance with better timeout and retry logic
function createAxiosInstance(proxyUrl) {
    return {
        primary: axios.create({
            httpsAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
            timeout: 60000, // Increased timeout to 60 seconds
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 500; // Accept all status codes less than 500
            }
        })
    };
}

const TELEGRAM_CHAT_ID = '1433257992';
const TELEGRAM_BOT_TOKEN_POINT = '7027009649:AAGGeiyg_GDiFNu5ttx0ddNDNXVF2Jnj7NY';

async function sendTelegramMessage(message, token) {
  try {
    consolewithTime(`Attempting to send Telegram message with token: ${token.substring(0, 10)}...`);
    const response = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 30000,
      }
    );
    
    if (response.data && response.data.ok) {
      consolewithTime('Telegram message sent successfully');
    } else {
      consolewithTime(`Telegram API returned unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    consolewithTime(`Failed to send Telegram message: ${error.message}`);
    if (error.response) {
      consolewithTime(`Telegram API error response: ${JSON.stringify(error.response.data)}`);
    }
  }
}


// Improve refreshTokenHandler with rate limiting and better error handling
async function refreshTokenHandler(account) {
    const now = Date.now();
    if (now - lastTokenRefresh < TOKEN_REFRESH_COOLDOWN) {
        const waitTime = TOKEN_REFRESH_COOLDOWN - (now - lastTokenRefresh);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastTokenRefresh = Date.now();

    consolewithTime(`Mencoba merefresh token untuk ${account.userName || 'Unknown'}...`);
    const axiosInstances = createAxiosInstance(account.proxy);

    try {
        // Validate refresh token
        if (!account.refreshToken) {
            consolewithTime(`Error: No refresh token found for ${account.userName || 'Unknown'}`);
            return false;
        }

        consolewithTime(`DEBUG: Using refresh token: ${account.refreshToken.substring(0, 20)}...`);
        
        const response = await axiosInstances.primary.post(REFRESH_URL, null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: account.refreshToken,
            },
        });

        // Log full response for debugging
        consolewithTime(`DEBUG: Refresh token response status: ${response.status}`);
        consolewithTime(`DEBUG: Refresh token response data: ${JSON.stringify(response.data)}`);

        // Validate response
        if (!response.data || !response.data.access_token) {
            consolewithTime(`Error: Invalid response from refresh token request for ${account.userName || 'Unknown'}`);
            consolewithTime(`Error details: ${JSON.stringify(response.data)}`);
            return false;
        }

        const existingTokens = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
        const index = existingTokens.findIndex(token => token.privateKey === account.privateKey);

        if (index !== -1) {
            existingTokens[index].authToken = `Bearer ${response.data.access_token}`;
            saveTokens(existingTokens);
            consolewithTime(`AuthToken diperbarui untuk ${account.userName || 'Unknown'}`);
            
            // Verify the new token works
            try {
                const testResponse = await makeRequestWithProxyFallback(REQUEST_URL, currentUserPayload, existingTokens[index], axiosInstances);
                if (testResponse.data?.data?.currentUser) {
                    consolewithTime(`Token verification successful for ${account.userName || 'Unknown'}`);
                    return existingTokens[index].authToken;
                } else {
                    consolewithTime(`Token verification failed for ${account.userName || 'Unknown'}`);
                    consolewithTime(`Verification response: ${JSON.stringify(testResponse.data)}`);
                    return false;
                }
            } catch (error) {
                consolewithTime(`Token verification error for ${account.userName || 'Unknown'}: ${error.message}`);
                if (error.response) {
                    consolewithTime(`Verification error response: ${JSON.stringify(error.response.data)}`);
                }
                return false;
            }
        } else {
            consolewithTime('Akun tidak ditemukan dalam config!');
            return false;
        }

    } catch (error) {
        consolewithTime(`Gagal refresh token untuk ${account.userName || 'Unknown'}: ${error.message}`);
        
        // Log detailed error information
        if (error.response) {
            consolewithTime(`Error response status: ${error.response.status}`);
            consolewithTime(`Error response data: ${JSON.stringify(error.response.data)}`);
        }
        if (error.request) {
            // Safely log request error without circular reference
            consolewithTime(`Error request details: ${error.message}`);
        }

        if (error.response?.status === 429) { // Rate limit
            consolewithTime(`Rate limit hit for ${account.userName}, waiting 15 minutes...`);
            await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));
            return refreshTokenHandler(account);
        }

        if (error.response?.status === 403) { // Possible ban
            consolewithTime(`Possible ban detected for ${account.userName}, marking as inactive`);
            const existingTokens = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
            const index = existingTokens.findIndex(token => token.privateKey === account.privateKey);
            if (index !== -1) {
                existingTokens[index].isActive = false;
                saveTokens(existingTokens);
            }
            return { deactivated: true, reason: 'Account banned (403 error)' };
        }

        if (error.response?.status === 400) {
            consolewithTime(`Invalid refresh token for ${account.userName}, marking as inactive`);
            const existingTokens = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
            const index = existingTokens.findIndex(token => token.privateKey === account.privateKey);
            if (index !== -1) {
                existingTokens[index].isActive = false;
                saveTokens(existingTokens);
            }
            return { deactivated: true, reason: 'Invalid refresh token (400 error)' };
        }

        // For other errors (like 502), just return false and continue with next account
        consolewithTime(`Continuing with next account after error for ${account.userName}`);
        return false;
    }
}


const getGardenPayload = {
  operationName: "GetGardenForCurrentUser",
  query: `query GetGardenForCurrentUser {
    getGardenForCurrentUser {
      gardenStatus {
        growActionCount
      }
    }
  }`
};

const executeGrowPayload = {
  query: `mutation ExecuteGrowAction($withAll: Boolean) {
    executeGrowAction(withAll: $withAll) {
      baseValue
      leveragedValue
      totalValue
      multiplyRate
    }
  }`,
  variables: { withAll: true },
  operationName: "ExecuteGrowAction"
};

const currentUserPayload = {
  operationName: "CurrentUser",
  query: `query CurrentUser {
    currentUser {
      id
      name
      inviter {
        id
      }
    }
  }`
};

const currentUserStatusPayload = {
  operationName: "CurrentUserStatus",
  query: `query CurrentUserStatus {
    currentUser {
      depositCount
      totalPoint
      evmAddress {
        userId
        address
      }
      inviter {
        id
        name
      }
    }
  }`
};

async function getCurrentUser(account) {
  const axiosInstances = createAxiosInstance(account.proxy);
  try {
    const response = await makeRequestWithProxyFallback(REQUEST_URL, currentUserPayload, account, axiosInstances);
    const userName = account.userName || response.data?.data?.currentUser?.name;
    if (userName) {
      return userName;
    } else {
      throw new Error('User name not found in response');
    }
  } catch (error) {
    consolewithTime(`Error fetching current user data: ${error.message}`);
    return null;
  }
}

// Improve processAccount with better delays and error handling
async function processAccount(account) {
    if (account.isActive === false) {
        consolewithTime(`Akun ${account.userName || 'Unknown'} dilewati karena isActive: false`);
        return { success: false, deactivated: true, reason: 'Account was initially inactive' };
    }

    if (!account.userName) {
        await getCurrentUser(account);
    }

    const loopCount = await getLoopCount(account);
    consolewithTime(`DEBUG - Loop count for ${account.userName}: ${loopCount}`);
    
    if (loopCount > 0) {
        consolewithTime(`${account.userName || 'User'} Memulai grow...`);
        const result = await executeGrowAction(account);
        consolewithTime(`DEBUG - Grow result for ${account.userName}:`, result);
        
        if (result) {
            consolewithTime(`${account.userName || 'User'} Grow berhasil!`);
            const status = await getCurrentUserStatus(account);
            await saveUserStatusToFile(account.userName, status, result);
            return { success: true, points: result };
        } else {
            failedAccounts.push(account.userName);
            consolewithTime(`${account.userName || 'User'} Grow gagal! Total gagal: ${failedAccounts.length}`);
            const status = await getCurrentUserStatus(account);
            await saveUserStatusToFile(account.userName, status, null);
            return { success: false, points: 0 };
        }
        
    } else {
        consolewithTime(`${account.userName || 'User'} Tidak ada grow yang tersedia (Count: ${loopCount})`);
        return { success: false, points: 0 };
    }
}

// Improve executeGrowActions with better account handling and delays
async function executeGrowActions() {
    while (true) {
        const cycleStartTime = Date.now();
        consolewithTime('Memulai grow untuk semua akun secara berurutan...');
        loadConfig();
        
        const activeAccounts = accounts.filter(account => account.isActive !== false);
        let totalSuccessPoints = 0;
        let totalFailedPoints = 0;
        let failedAccountsWithPoints = [];
        let successfulAccountsWithPoints = [];
        let deactivatedAccounts = [];
        let accountStatuses = [];
        
        consolewithTime(`Total akun aktif: ${activeAccounts.length}`);
        
        if (activeAccounts.length === 0) {
            consolewithTime('Tidak ada akun dengan isActive: true yang tersedia untuk diproses.');
        } else {
            for (let account of activeAccounts) {
                consolewithTime(`Memproses akun: ${account.userName || 'Unknown User'}...`);
                const result = await processAccount(account);
                
                consolewithTime(`DEBUG - Result for ${account.userName}:`, result);
                
                if (result && result.success) {
                    successfulGrows++;
                    totalSuccessPoints += result.points || 0;
                    successfulAccountsWithPoints.push({
                        username: account.userName,
                        points: result.points || 0
                    });
                    consolewithTime(`DEBUG - Success for ${account.userName}: ${result.points} points`);
                } else if (result && result.deactivated) {
                    deactivatedAccounts.push({
                        username: account.userName,
                        reason: result.reason || 'Account deactivated during process'
                    });
                    consolewithTime(`DEBUG - Account deactivated during process: ${account.userName} - ${result.reason}`);
                } else {
                    failedAccounts.push(account.userName);
                    totalFailedPoints += result?.points || 0;
                    failedAccountsWithPoints.push({
                        username: account.userName,
                        points: result?.points || 0
                    });
                    consolewithTime(`DEBUG - Failed for ${account.userName}: ${result?.points || 0} points`);
                }
                
                // Get and store account status
                const status = await getCurrentUserStatus(account);
                if (status) {
                    accountStatuses.push({
                        username: account.userName,
                        totalPoints: status.totalPoint,
                        depositCount: status.depositCount,
                        address: status.address
                    });
                }
                
                consolewithTime(`Selesai memproses akun: ${account.userName || 'Unknown User'}`);
                
                // Add random delay between accounts
                await new Promise(resolve => setTimeout(resolve, getRandomDelay(MIN_DELAY_BETWEEN_ACCOUNTS, MAX_DELAY_BETWEEN_ACCOUNTS)));
            }
            
            // Prepare detailed summary with WIB timestamp
            const timestamp = getWIBTimestamp();
            const summary = `🌱 Grow Summary Report (${timestamp} WIB) 🌱\n\n` +
                          `📊 Overall Statistics:\n` +
                          `✅ Successful Grows: ${successfulGrows}\n` +
                          `💰 Total Points Earned: ${totalSuccessPoints.toLocaleString()}\n` +
                          `❌ Failed Grows: ${failedAccounts.length}\n` +
                          `💔 Total Points Lost: ${totalFailedPoints.toLocaleString()}\n\n` +
                          
                          `📈 Successful Accounts:\n${successfulAccountsWithPoints.map(acc => 
                            `- ${acc.username}: ${acc.points.toLocaleString()} points`
                          ).join('\n')}\n\n` +
                          
                          `📉 Failed Accounts:\n${failedAccountsWithPoints.map(acc => 
                            `- ${acc.username}: ${acc.points.toLocaleString()} points`
                          ).join('\n')}\n\n` +
                          
                          `🚫 Deactivated Accounts:\n${deactivatedAccounts.map(acc => 
                            `- ${acc.username}: ${acc.reason}`
                          ).join('\n')}\n\n` +
                          
                          `📋 Account Status Summary:\n${accountStatuses.map(status => 
                            `- 🌟 ${status.username}:\n` +
                            `  • Total Points: ${status.totalPoints ? status.totalPoints.toLocaleString() : 'N/A'}\n` +
                            `  • Deposit Count: ${status.depositCount || 'N/A'}`
                          ).join('\n')}\n\n` +
                          
                          `⏱️ Cycle Duration: ${Math.floor((Date.now() - cycleStartTime)/1000)} seconds`;
            
            await sendTelegramMessage(summary, TELEGRAM_BOT_TOKEN_POINT);
        }
        
        const cycleEndTime = Date.now();
        const cycleDuration = cycleEndTime - cycleStartTime;
        lastCycleEnd = cycleEndTime;
        
        // Calculate remaining time to maintain 1-hour cycle
        const remainingTime = Math.max(0, CYCLE_DELAY - cycleDuration);
        
        consolewithTime(`Siklus selesai dalam ${Math.floor(cycleDuration/1000)} detik`);
        consolewithTime(`Menunggu ${Math.floor(remainingTime/1000)} detik untuk siklus berikutnya`);
        
        successfulGrows = 0;
        failedAccounts = [];
        
        await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
}

async function saveUserStatusToFile(userName, status, totalResult) {
  const folderName = 'user_status';
  
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
    consolewithTime(`Folder ${folderName} telah dibuat`);
  }

  const safeUserName = (userName || 'unknown_user').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${folderName}/${safeUserName}_status.txt`;
  const timestamp = getWIBTimestamp();
  
  const formattedTotalPoint = status.totalPoint ? status.totalPoint.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : 'N/A';
  
  let content = `[${timestamp} WIB] Total Points = ${formattedTotalPoint}, Deposit Count = ${status.depositCount || 'N/A'}`;
  if (status.address) {
    content += `, Address = ${status.address}`;
  }
  content += '\n';

  try {
    fs.appendFileSync(fileName, content);
    consolewithTime(`Status ${userName || 'User'} berhasil disimpan ke ${fileName}`);
  } catch (error) {
    consolewithTime(`Gagal menyimpan status: ${error.message}`);
  }
}

// Improve makeRequestWithProxyFallback with exponential backoff
async function makeRequestWithProxyFallback(url, payload, account, axiosInstances, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://hanafuda.hana.network',
        'Priority': 'u=1, i',
        'Referer': 'https://hanafuda.hana.network/',
        'Sec-Ch-Ua': '"Chromium";v="134", "Not-A.Brand";v="24", "Google Chrome";v="134"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': getPlatformFromUserAgent(account.userAgent),
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': account.userAgent
    };

    try {
        return await axiosInstances.primary.post(url, payload, { headers });
    } catch (error) {
        if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            consolewithTime(`Request failed, retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequestWithProxyFallback(url, payload, account, axiosInstances, retryCount + 1);
        }
        throw error;
    }
}

async function getLoopCount(account, retryOnFailure = true) {
  const axiosInstances = createAxiosInstance(account.proxy);
  try {
    consolewithTime(`${account.userName || 'User'} Checking Grow Available...`);
    const response = await makeRequestWithProxyFallback(REQUEST_URL, getGardenPayload, account, axiosInstances);

    const growActionCount = response.data?.data?.getGardenForCurrentUser?.gardenStatus?.growActionCount;
    consolewithTime(`${account.userName || 'User'} Test data Grow: ${growActionCount}`);
    if (typeof growActionCount === 'number') {
      consolewithTime(`${account.userName || 'User'} Grow Available: ${growActionCount}`);
      return growActionCount;
    } else {
      throw new Error('growActionCount not found in response');
    }
  } catch (error) {
    consolewithTime(`${account.userName || 'User'} Token Expired!`);
    if (retryOnFailure) {
      const tokenRefreshed = await refreshTokenHandler(account);
      if (tokenRefreshed) {
        account.authToken = tokenRefreshed;
        return getLoopCount(account, false);
      }
    }
    return 0;
  }
}

async function executeGrowAction(account) {
    const axiosInstances = createAxiosInstance(account.proxy);
    try {
        consolewithTime(`${account.userName || 'User'} Executing Grow Action...`);
        const response = await makeRequestWithProxyFallback(REQUEST_URL, executeGrowPayload, account, axiosInstances);
        
        const result = response.data?.data?.executeGrowAction;
        consolewithTime(`DEBUG - Raw grow response for ${account.userName}:`, result);
        
        if (result) {
            consolewithTime(`${account.userName || 'User'} Grow Success - Total Value: ${result.totalValue}, Multiply Rate: ${result.multiplyRate}`);
            return result.totalValue;
        } else {
            consolewithTime(`${account.userName || 'User'} Grow Failed - No result data`);
            return null;
        }
    } catch (error) {
        consolewithTime(`${account.userName || 'User'} Error executing grow: ${error.message}`);
        return null;
    }
}

async function getCurrentUserStatus(account) {
  const axiosInstances = createAxiosInstance(account.proxy);
  try {
    const response = await makeRequestWithProxyFallback(REQUEST_URL, currentUserStatusPayload, account, axiosInstances);
    
    const userData = response.data?.data?.currentUser;
    if (userData) {
      consolewithTime(`${account.userName || 'User'} Status - Total Points: ${userData.totalPoint}, Deposit Count: ${userData.depositCount}`);
      return {
        totalPoint: userData.totalPoint,
        depositCount: userData.depositCount,
        address: userData.evmAddress?.address
      };
    } else {
      throw new Error('User status not found in response');
    }
  } catch (error) {
    consolewithTime(`${account.userName || 'User'} Error fetching status: ${error.message}`);
    return null;
  }
}

printBanner();
executeGrowActions();