const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

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

function getAccounts() {
  if (fs.existsSync(CONFIG)) {
    try {
      const data = fs.readFileSync(CONFIG);
      const tokensData = JSON.parse(data);
      
      if (tokensData.refreshToken) {
        accounts = [{
          refreshToken: tokensData.refreshToken,
          authToken: tokensData.authToken,
          userAgent: getRandomUserAgent() // Tetapkan User-Agent per siklus
        }];
      } else {
        accounts = Object.values(tokensData).map(account => ({
          ...account,
          userAgent: getRandomUserAgent() // Tetapkan User-Agent per siklus
        }));
      }
      consolewithTime(`Mendapatkan ${accounts.length} Akun didalam config`);
      return JSON.parse(data);
    } catch (error) {
      consolewithTime(`Error Load Token: ${error.message}`);
      process.exit(1);
    }
  } else {
    consolewithTime('Token tidak ditemukan.');
    process.exit(1);
  }
}

function saveTokens(tokens) {
  try {
    fs.writeFileSync(CONFIG, JSON.stringify(tokens, null, 2));
    consolewithTime('Tokens berhasil di update.');
  } catch (error) {
    consolewithTime(`Gagal update token: ${error.message}`);
    process.exit(1);
  }
}

function createAxiosInstance(proxyUrl) {
  return axios.create({
    httpsAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
    timeout: 30000
  });
}

async function refreshTokenHandler(accounts) {
  consolewithTime('Mencoba merefresh token...')
  const axiosInstance = createAxiosInstance(accounts.proxy);
  try {
    const response = await axiosInstance.post(REFRESH_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: accounts.refreshToken,
      },
    });

    const updatedTokens = {
      ...accounts,
      authToken: `Bearer ${response.data.access_token}`,
      refreshToken: response.data.refresh_token,
    };

    const existingTokens = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
    const index = existingTokens.findIndex(token => token.privateKey === accounts.privateKey);
    if (index !== -1) {
      existingTokens[index] = updatedTokens;
    } else {
      consolewithTime('Token dengan unique private key tidak ditemukan!');
      return false;
    }

    saveTokens(existingTokens);
    consolewithTime('Token refreshed and saved successfully.');
    return updatedTokens.authToken;
  } catch (error) {
    consolewithTime(`Failed to refresh token: ${error.message}`);
    return false;
  }
}

// GraphQL Payloads
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

async function getCurrentUser(account) {
  try {
    const response = await axios.post(REQUEST_URL, currentUserPayload, {
      headers: {
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
      }
    });

    const userName = response.data?.data?.currentUser?.name;
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
  try {
    consolewithTime(`${account.userName || 'User'} Checking Grow Available...`);
    const response = await axios.post(REQUEST_URL, getGardenPayload, {
      headers: {
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
      }
    });

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
        account.authToken = tokenRefreshed; // Perbarui authToken di objek account
        return getLoopCount(account, false);
      }
    }
    return 0;
  }
}

async function executeGrowAction(account) {
  try {
    consolewithTime(`${account.userName || 'User'} Executing Grow Action...`);
    
    const response = await axios.post(REQUEST_URL, executeGrowPayload, {
      headers: {
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
      }
    });

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

async function processAccount(account) {
  await getCurrentUser(account);
  const loopCount = await getLoopCount(account);
  
  if (loopCount > 0) {
    consolewithTime(`${account.userName || 'User'} Memulai Grow dengan semua actions...`);
    const totalResult = await executeGrowAction(account);
    
    if (totalResult !== null) {
      consolewithTime(`${account.userName || 'User'} Grow selesai. Total Value: ${totalResult}`);
    } else {
      consolewithTime(`${account.userName || 'User'} Grow gagal dilakukan`);
    }
  } else {
    consolewithTime(`${account.userName || 'User'} Tidak ada grow yang tersedia`);
  }
}

async function executeGrowActions() {
  while (true) {
    consolewithTime('Memulai grow untuk semua akun...');
    getAccounts();
    for (let account of accounts) {
      await processAccount(account);
    }

    consolewithTime('Semua akun telah terproses. Menunggu 1 jam untuk proses selanjutnya');
    await new Promise(resolve => setTimeout(resolve, 1200000));
  }
}

printBanner();
executeGrowActions();