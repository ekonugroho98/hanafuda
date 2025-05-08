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

function printBanner() {
  console.log("Hanafuda Bot Auto Grow");
}

function consolewithTime(word) {
  const now = new Date().toISOString().split('.')[0].replace('T', ' ');
  console.log(`[${now}] ${word}`);
}

function getRandomUserAgent() {
  const randomIndex = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[randomIndex];
}

function getPlatformFromUserAgent(userAgent) {
  if (userAgent.includes('Windows')) return '"Windows"';
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) return '"macOS"';
  if (userAgent.includes('Linux')) return '"Linux"';
  if (userAgent.includes('Android')) return '"Android"';
  return '"macOS"';
}

const CONFIG = './config.json';
const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';

let accounts = [];

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG)) {
      const data = fs.readFileSync(CONFIG, 'utf-8');
      const tokensData = JSON.parse(data);
      
      if (tokensData.refreshToken) {
        accounts = [{
          refreshToken: tokensData.refreshToken,
          authToken: tokensData.authToken,
          userAgent: getRandomUserAgent(),
          proxy: tokensData.proxy,
          proxy2: tokensData.proxy2 // Tambahkan proxy cadangan
        }];
      } else {
        accounts = Object.values(tokensData).map(account => ({
          ...account,
          userAgent: getRandomUserAgent(),
          proxy: account.proxy,
          proxy2: account.proxy2 // Tambahkan proxy cadangan
        }));
      }

      consolewithTime(`Mendapatkan ${accounts.length} Akun didalam config`);
    } else {
      consolewithTime('Token tidak ditemukan.');
      process.exit(1);
    }
  } catch (error) {
    consolewithTime(`Error Load Token: ${error.message}`);
    process.exit(1);
  }
}

// Inisiasi pertama kali
loadConfig();

// Monitor perubahan config.json
chokidar.watch(CONFIG).on('change', () => {
  consolewithTime('Config file changed, reloading...');
  loadConfig();
});


function saveTokens(tokens) {
  try {
    fs.writeFileSync(CONFIG, JSON.stringify(tokens, null, 2));
    consolewithTime('Tokens berhasil di update.');
  } catch (error) {
    consolewithTime(`Gagal update token: ${error.message}`);
    process.exit(1);
  }
}

function createAxiosInstance(proxyUrl, proxy2Url) {
  return {
    primary: axios.create({
      httpsAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
      timeout: 30000
    }),
    secondary: proxy2Url ? axios.create({
      httpsAgent: new HttpsProxyAgent(proxy2Url),
      timeout: 30000
    }) : null
  };
}

const TELEGRAM_BOT_TOKEN = '7987739259:AAG8BBMC8O2p1mLOTT_aQOd8yRPyqVPNX1A';
const TELEGRAM_CHAT_ID = '1433257992';
const TELEGRAM_BOT_TOKEN_POINT = '7027009649:AAGGeiyg_GDiFNu5ttx0ddNDNXVF2Jnj7NY';

async function sendTelegramMessage(message, token) {
  try {
    // Langsung kirim tanpa menggunakan proxy
    await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      },
      {
        timeout: 30000, // Tambahkan timeout jika diperlukan
      }
    );
    consolewithTime('Notifikasi berhasil dikirim ke Telegram.');
  } catch (error) {
    consolewithTime(`Gagal mengirim notifikasi ke Telegram: ${error.message}`);
  }
}


async function refreshTokenHandler(account) {
  consolewithTime(`Mencoba merefresh token untuk ${account.userName || 'Unknown'}...`);
  const axiosInstances = createAxiosInstance(account.proxy, account.proxy2);

  try {
    const response = await axiosInstances.primary.post(REFRESH_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      },
    });

    const existingTokens = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
    const index = existingTokens.findIndex(token => token.privateKey === account.privateKey);

    if (index !== -1) {
      // ✅ Hanya update authToken
      existingTokens[index].authToken = `Bearer ${response.data.access_token}`;
      saveTokens(existingTokens);
      consolewithTime(`AuthToken diperbarui untuk ${account.userName || 'Unknown'}`);
      return existingTokens[index].authToken;
    } else {
      consolewithTime('Akun tidak ditemukan dalam config!');
      return false;
    }

  } catch (error) {
    consolewithTime(`Gagal refresh token untuk ${account.userName || 'Unknown'}: ${error.message}`);

    // ❗ Khusus jika gagal dengan status 400, nonaktifkan akun
    if (error.response?.status === 400) {
      const existingTokens = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
      const index = existingTokens.findIndex(token => token.privateKey === account.privateKey);
      if (index !== -1) {
        existingTokens[index].isActive = false;
        saveTokens(existingTokens);
        consolewithTime(`Akun ${account.userName || 'Unknown'} di-nonaktifkan (isActive = false)`);
      }
    }

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
  const axiosInstances = createAxiosInstance(account.proxy, account.proxy2);
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

async function processAccount(account) {
  if (account.isActive === false) {
    consolewithTime(`Akun ${account.userName || 'Unknown'} dilewati karena isActive: false`);
    return;
  }

  account.userName = await getCurrentUser(account);
  const loopCount = await getLoopCount(account);
  
  if (loopCount > 0) {
    consolewithTime(`${account.userName || 'User'} Memulai Grow dengan semua actions...`);
    const totalResult = await executeGrowAction(account);
    
    if (totalResult !== null) {
      successfulGrows++; // Tambah counter hanya jika grow berhasil
      consolewithTime(`${account.userName || 'User'} Grow selesai. Total Value: ${totalResult}`);
      
      const userStatus = await getCurrentUserStatus(account);
      if (userStatus) {
        // saveUserStatusToFile(account.userName, userStatus, totalResult);
      }
    } else {
      consolewithTime(`${account.userName || 'User'} Grow gagal dilakukan`);
      failedAccounts.push(account.userName || 'Unknown'); // Tambahkan username ke daftar gagal
    }
  } else {
    consolewithTime(`${account.userName || 'User'} Tidak ada grow yang tersedia`);
    failedAccounts.push(account.userName || 'Unknown'); // Anggap gagal jika tidak ada grow tersedia
  }
}

async function executeGrowActions() {
  while (true) {
    successfulGrows = 0; // Reset counter di awal setiap siklus
    failedAccounts = []; // Reset daftar akun gagal di awal setiap siklus
    consolewithTime('Memulai grow untuk semua akun...');
    loadConfig();
    if (accounts.length === 0) {
      consolewithTime('Tidak ada akun aktif yang tersedia untuk diproses.');
    } else {
      const activeAccounts = accounts.filter(account => account.isActive !== false);
      
      if (activeAccounts.length === 0) {
        consolewithTime('Tidak ada akun dengan isActive: true yang tersedia untuk diproses.');
      } else {
        for (let account of activeAccounts) {
          await processAccount(account);
        }
        consolewithTime('Semua akun aktif telah terproses.');
        
        const timestamp = new Date().toISOString().split('.')[0].replace('T', ' ');
        let totalMessage = `[${timestamp}] Cycle Summary\n` +
                          `Total Accounts Processed: ${activeAccounts.length}\n` +
                          `Total Grow Success: ${successfulGrows}\n` +
                          `Success Rate: ${activeAccounts.length > 0 ? ((successfulGrows / activeAccounts.length) * 100).toFixed(2) : 0}%\n`;
        
        if (failedAccounts.length > 0) {
          totalMessage += `Failed Accounts: ${failedAccounts.join(', ')}\n`;
        } else {
          totalMessage += `Failed Accounts: None\n`;
        }
        
        await sendTelegramMessage(totalMessage, TELEGRAM_BOT_TOKEN_POINT);
        consolewithTime(`Cycle completed. Total Grow Success: ${successfulGrows}/${activeAccounts.length}`);
      }
    }

    consolewithTime('Menunggu 1 jam untuk proses selanjutnya...');
    await new Promise(resolve => setTimeout(resolve, 1800000));
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
  const timestamp = new Date().toISOString().split('.')[0].replace('T', ' ');
  
  const formattedTotalPoint = status.totalPoint.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  let content = `[${timestamp}] Total Points = ${formattedTotalPoint}, Deposit Count = ${status.depositCount}`;
  if (status.address) {
    content += `, Address = ${status.address}`;
  }
  content += '\n';

  const telegramMessage = `[${timestamp}] ${userName || 'User'} - Grow Success\n` +
                        `Total Grow: ${totalResult}\n` +
                        `Total Points: ${formattedTotalPoint}\n` +
                        `Deposit Count: ${status.depositCount}`;
  
  await sendTelegramMessage(telegramMessage, TELEGRAM_BOT_TOKEN_POINT);

  try {
    fs.appendFileSync(fileName, content);
    consolewithTime(`Status ${userName || 'User'} berhasil disimpan ke ${fileName}`);
  } catch (error) {
    consolewithTime(`Gagal menyimpan status: ${error.message}`);
  }
}

async function makeRequestWithProxyFallback(url, payload, account, axiosInstances) {
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
    consolewithTime(`Request gagal dengan proxy utama: ${error.message}`);
    
    if (axiosInstances.secondary) {
      consolewithTime('Mencoba dengan proxy cadangan...');
      try {
        return await axiosInstances.secondary.post(url, payload, { headers });
      } catch (error2) {
        consolewithTime(`Request gagal dengan proxy cadangan: ${error2.message}`);
        throw error2;
      }
    }
    throw error;
  }
}

async function getCurrentUser(account) {
  const axiosInstances = createAxiosInstance(account.proxy, account.proxy2);
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

async function getLoopCount(account, retryOnFailure = true) {
  const axiosInstances = createAxiosInstance(account.proxy, account.proxy2);
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
  const axiosInstances = createAxiosInstance(account.proxy, account.proxy2);
  try {
    consolewithTime(`${account.userName || 'User'} Executing Grow Action...`);
    const response = await makeRequestWithProxyFallback(REQUEST_URL, executeGrowPayload, account, axiosInstances);
    
    const result = response.data?.data?.executeGrowAction;
    if (result) {
      consolewithTime(`${account.userName || 'User'} Grow Success - Total Value: ${result.totalValue}, Multiply Rate: ${result.multiplyRate}`);
      return result.totalValue;
    } else {
      consolewithTime(`${account.userName || 'User'} Grow Failed`);
      return null;
    }
  } catch (error) {
    consolewithTime(`${account.userName || 'User'} Error executing grow: ${error.message}`);
    return null;
  }
}

async function getCurrentUserStatus(account) {
  const axiosInstances = createAxiosInstance(account.proxy, account.proxy2);
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