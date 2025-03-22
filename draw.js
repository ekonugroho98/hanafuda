const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

function printBanner() {
    console.log("Hanafuda Bot Auto Draw")
}

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

const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';
const CONFIG = './config.json';

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
          userAgent: getRandomUserAgent() // Tetapkan User-Agent untuk akun tunggal
        }];
      } else {
        accounts = Object.values(tokensData).map(account => ({
          ...account,
          userAgent: getRandomUserAgent() // Tetapkan User-Agent untuk setiap akun
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
    timeout: 120000
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
      authToken: `Bearer ${response.data.access_token}`,  // Update auth token
      refreshToken: response.data.refresh_token,        // Update refresh token
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
          gardenRewardActionCount
        }
      }
    }`
  };

const executeGardenRewardPayload = {
    operationName: 'executeGardenRewardAction',
    query: `mutation executeGardenRewardAction($limit: Int!) {
        executeGardenRewardAction(limit: $limit) {
            data {
                cardId
                group
            }
            isNew
        }
    }`,
    variables: {
        limit: 10,
      },
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
          'Sec-Ch-Ua-Platform': getPlatformFromUserAgent(account.userAgent), // Dinamis berdasarkan User-Agent
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
      consolewithTime(`${account.userName || 'User'} Memeriksa draw yang tersedia...`);
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
          'Sec-Ch-Ua-Platform': getPlatformFromUserAgent(account.userAgent), // Dinamis berdasarkan User-Agent
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
          'User-Agent': account.userAgent
        },
      });
      consolewithTime(`Response from server: ${JSON.stringify(response.data)}`);
      const gardenRewardActionCount = response.data?.data?.getGardenForCurrentUser?.gardenStatus?.gardenRewardActionCount;
  
      if (typeof gardenRewardActionCount === 'number') {
        consolewithTime(`${account.userName || 'User'} Draw tersedia: ${gardenRewardActionCount}`);
        return gardenRewardActionCount;
      } else {
        throw new Error('Invalid gardenRewardActionCount in response');
      }
    } catch (error) {
      consolewithTime(`${account.userName || 'User'} Token Expired! Error: ${error.message}`);
      if (retryOnFailure) {
        const newAuthToken = await refreshTokenHandler(account);
        if (newAuthToken) {
          account.authToken = newAuthToken;
          return getLoopCount(account, false);
        }
      }
      return 0;
    }
  }
  async function initiateDrawAction(account) {
    try {
      consolewithTime(`${account.userName || 'User'} Initiating Draw...`);
  
      const response = await axios.post(REQUEST_URL, executeGardenRewardPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': account.authToken,
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://hanafuda.hana.network',
          'Priority': 'u=1, i',
          'Referer': 'https://hanafuda.hana.network/',
          'Sec-Ch-Ua': '"Chromium";v="134", "Not-A.Brand";v="24", "Google Chrome";v="134"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': getPlatformFromUserAgent(account.userAgent), // Dinamis berdasarkan User-Agent
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
          'User-Agent': account.userAgent
        }
      });
      const result = response.data;
      if (result.data && result.data.executeGardenRewardAction) {
        consolewithTime(`${account.userName || 'User'} Sukses membuka kartu`);
        return result.data.executeGardenRewardAction;
      } else {
        if (result.errors && result.errors.length > 0) {
          const errorMessage = result.errors[0].message;
          consolewithTime(errorMessage);
          return 0;
        }
        consolewithTime(`${account.userName || 'User'} Gagal membuka kartu`);
        return 0;
      }
    } catch (error) {
      consolewithTime(`${account.userName || 'User'} Gagal eksekusi untuk membuka kartu: ${error.message}`);
      return 0;
    }
  }

  async function processAccount(account) {
    // Pastikan nama pengguna diambil terlebih dahulu
    if (!account.userName) {
        await getCurrentUser(account);
    }
    
    const loopCount = await getLoopCount(account);
  
    if (loopCount >= 10) {
        let totalResult = 0;
        const cardsToDrawPerAction = 10;
        const totalActions = Math.floor(loopCount / cardsToDrawPerAction) + (loopCount % cardsToDrawPerAction ? 1 : 0);
        
        // Proses draw secara berurutan untuk akun ini
        for (let i = 0; i < totalActions; i++) {
            const currentActionCount = Math.min(cardsToDrawPerAction, loopCount - (i * cardsToDrawPerAction));
            consolewithTime(`${account.userName || 'User'} Memulai Membuka ${currentActionCount} kartu pada aksi ${i + 1}/${totalActions}`);
          
            const initiateResult = await initiateDrawAction(account);
            if (initiateResult) {
                totalResult += initiateResult.length || 0; // Hitung jumlah kartu yang berhasil dibuka
                consolewithTime(`${account.userName || 'User'} Sukses membuka ${currentActionCount} kartu pada aksi ${i + 1}`);
            } else {
                consolewithTime(`${account.userName || 'User'} Gagal membuka ${currentActionCount} kartu pada aksi ${i + 1}`);
                break; // Hentikan jika gagal untuk akun ini
            }
            
            // Tambahkan jeda kecil antar aksi draw untuk akun yang sama
            await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 detik jeda antar draw
        }
  
        consolewithTime(`${account.userName || 'User'} Semua draw telah selesai dilakukan. Total kartu dibuka: ${totalResult}`);
    } else {
        consolewithTime(`${account.userName || 'User'} Tidak ada draw yang tersedia (Count: ${loopCount})`);
    }
}


async function executeGardenRewardActions() {
  while (true) {
      consolewithTime('Memulai draw untuk semua akun secara berurutan...');
      getAccounts();
      for (let account of accounts) {
          consolewithTime(`Memproses akun: ${account.userName || 'Unknown User'}...`);
          await processAccount(account);
          consolewithTime(`Selesai memproses akun: ${account.userName || 'Unknown User'}`);
          // Tambahkan jeda kecil antar akun jika diperlukan
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 detik jeda antar akun
      }

      consolewithTime('Semua akun telah terproses secara berurutan. Menunggu 1 jam untuk siklus berikutnya');
      await new Promise(resolve => setTimeout(resolve, 1200000)); // Tunggu 1 jam
  }
}

printBanner();
executeGardenRewardActions();