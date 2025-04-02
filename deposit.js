const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const Web3 = require('web3');
const { HttpsProxyAgent } = require('https-proxy-agent');
const pLimit = require('p-limit');

function displayBanner() {
  console.log("Hanafuda Bot Auto Deposit");
}

function logWithTimestamp(message) {
  const timestamp = new Date().toISOString().split('.')[0].replace('T', ' ');
  console.log(`[${timestamp}] ${message}`);
}

function getPlatformFromUserAgent(userAgent) {
  if (userAgent.includes('Windows')) return '"Windows"';
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) return '"macOS"';
  if (userAgent.includes('Linux')) return '"Linux"';
  if (userAgent.includes('Android')) return '"Android"';
  return '"macOS"';
}

const RPC_ENDPOINT = "https://mainnet.base.org";
const CONTRACT_ADDRESS = "0xC5bf05cD32a14BFfb705Fb37a9d218895187376c";
const CONFIG_FILE = './config_2.json';
const GRAPHQL_ENDPOINT = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const TOKEN_REFRESH_ENDPOINT = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';
const MAX_FEE_THRESHOLD = 0.00000040;

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_ENDPOINT));

const CONTRACT_ABI = [
  {
    "constant": false,
    "inputs": [],
    "name": "depositETH",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  }
];

const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
const userInput = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let userAccounts = [];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:127.0) Gecko/20100101 Firefox/127.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0"
];

function loadAccounts() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const fileContent = fs.readFileSync(CONFIG_FILE);
      const configData = JSON.parse(fileContent);
      userAccounts = configData;
      logWithTimestamp(`Loaded ${userAccounts.length} accounts from config`);
      return configData;
    } catch (error) {
      logWithTimestamp(`Error loading config: ${error.message}`);
      process.exit(1);
    }
  } else {
    logWithTimestamp('Configuration file not found.');
    process.exit(1);
  }
}

function updateConfigFile(tokens) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(tokens, null, 2));
    logWithTimestamp('Configuration successfully updated.');
  } catch (error) {
    logWithTimestamp(`Failed to update config: ${error.message}`);
    process.exit(1);
  }
}

function createAxiosInstance(accountData) {
  return axios.create({
    httpsAgent: accountData.isActiveProxy && accountData.proxy ? new HttpsProxyAgent(accountData.proxy) : undefined,
    timeout: 60000
  });
}

async function refreshAuthToken(accountData) {
  logWithTimestamp(`Attempting to refresh token for ${accountData.userName}...`);
  const axiosInstance = createAxiosInstance(accountData);
  
  try {
    const response = await axiosInstance.post(TOKEN_REFRESH_ENDPOINT, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: accountData.refreshToken,
      },
    });

    const updatedAccountData = {
      ...accountData,
      authToken: `Bearer ${response.data.access_token}`,
      refreshToken: response.data.refresh_token,
    };

    const existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const accountIndex = existingConfig.findIndex(acc => acc.privateKey === accountData.privateKey);

    if (accountIndex !== -1) {
      existingConfig[accountIndex] = updatedAccountData;
    } else {
      logWithTimestamp('Account with matching private key not found!');
      return false;
    }

    updateConfigFile(existingConfig);
    logWithTimestamp('Token refreshed and saved successfully.');
    return updatedAccountData.authToken;
  } catch (error) {
    logWithTimestamp(`Failed to refresh token: ${error.message}`);
    return false;
  }
}

async function synchronizeTransaction(txHash, accountData) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10000;
  const axiosInstance = createAxiosInstance(accountData);

  const userAgent = accountData.currentUserAgent || USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  logWithTimestamp(`Using User-Agent for ${accountData.userName}: ${userAgent}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axiosInstance.post(
        GRAPHQL_ENDPOINT,
        {
          query: `
            mutation SyncEthereumTx($chainId: Int!, $txHash: String!) {
              syncEthereumTx(chainId: $chainId, txHash: $txHash)
            }`,
          variables: {
            chainId: 8453,
            txHash: txHash
          },
          operationName: "SyncEthereumTx"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': accountData.authToken,
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://hanafuda.hana.network',
            'Priority': 'u=1, i',
            'Referer': 'https://hanafuda.hana.network/',
            'Sec-Ch-Ua': '"Chromium";v="134", "Not-A.Brand";v="24", "Google Chrome";v="134"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': getPlatformFromUserAgent(userAgent),
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': userAgent
          }
        }
      );

      logWithTimestamp(`Raw server response for tx ${txHash}: ${JSON.stringify(response.data, null, 2)}`);

      if (response.data?.data?.syncEthereumTx) {
        logWithTimestamp(`Transaction ${txHash} successfully synchronized for ${accountData.userName}.`);
        break;
      } else if (response.data?.errors?.some(error => error.message.includes('Already registered transaction'))) {
        logWithTimestamp(`Transaction ${txHash} already registered for ${accountData.userName}. No further action needed.`);
        break;
      } else {
        throw new Error('Synchronization failed - Invalid response from server');
      }
    } catch (error) {
      logWithTimestamp(`Attempt ${attempt} - Failed to sync transaction ${txHash} for ${accountData.userName}: ${error.message}`);
      if (error.response) {
        logWithTimestamp(`Server Response - Status: ${error.response.status} ${error.response.statusText}`);
        logWithTimestamp(`Server Response - Data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        logWithTimestamp('No response received from server (network issue or timeout)');
      } else {
        logWithTimestamp(`Error during request setup: ${error.message}`);
      }

      if (attempt === MAX_RETRIES) {
        logWithTimestamp('Attempting token refresh...');
        const newToken = await refreshAuthToken(accountData);
        if (newToken) {
          accountData.authToken = newToken;
          logWithTimestamp('Token successfully refreshed...');
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          attempt--;
          continue;
        }
        logWithTimestamp('Token refresh failed...');
        break;
      }

      logWithTimestamp(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

async function waitForOptimalGasFee(gasLimit) {
  let gasPrice, transactionFee;
  do {
    gasPrice = await web3.eth.getGasPrice();
    transactionFee = web3.utils.fromWei((gasPrice * gasLimit).toString(), 'ether');

    if (parseFloat(transactionFee) > MAX_FEE_THRESHOLD) {
      logWithTimestamp(`Transaction fee: ${transactionFee} ETH, waiting for lower fee...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  } while (parseFloat(transactionFee) > MAX_FEE_THRESHOLD);

  return gasPrice;
}

async function withRetry(fn, maxRetries = 3, baseDelay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes("over rate limit") && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logWithTimestamp(`Rate limit hit, retrying in ${delay / 1000} seconds... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function processTransactions(accountData, transactionCount, amountInEther) {
  if (!accountData.isActive) {
    logWithTimestamp(`Account ${accountData.userName} is disabled. Skipping...`);
    return;
  }

  const { privateKey, userName } = accountData;

  if (!/^(0x)?[0-9a-f]{64}$/i.test(privateKey)) {
    logWithTimestamp(`Invalid private key format for ${userName}.`);
    return;
  }

  try {
    const amountInWei = web3.utils.toWei(amountInEther, 'ether');
    const wallet = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(wallet);
    const walletAddress = wallet.address;

    let allTransactionsFailedDueToFunds = true; // Track if all fail due to insufficient funds

    for (let i = 0; i < transactionCount; i++) {
      try {
        const nonce = await withRetry(() => web3.eth.getTransactionCount(walletAddress, 'pending'));
        const gasLimit = await withRetry(() => contract.methods.depositETH().estimateGas({ from: walletAddress, value: amountInWei }));
        const gasPrice = await waitForOptimalGasFee(gasLimit);

        const transaction = {
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          value: amountInWei,
          gas: gasLimit,
          gasPrice: gasPrice,
          nonce: nonce,
          data: contract.methods.depositETH().encodeABI()
        };

        const signedTransaction = await web3.eth.accounts.signTransaction(transaction, privateKey);
        const receipt = await withRetry(() => web3.eth.sendSignedTransaction(signedTransaction.rawTransaction));

        if (!receipt.status) {
          logWithTimestamp(`Transaction ${i + 1} for ${userName} (${walletAddress}) failed on-chain with hash: ${receipt.transactionHash}`);
          i--; // Retry this transaction
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const confirmedReceipt = await withRetry(() => web3.eth.getTransactionReceipt(receipt.transactionHash));
        if (!confirmedReceipt || !confirmedReceipt.status) {
          logWithTimestamp(`Transaction ${i + 1} for ${userName} (${walletAddress}) not confirmed or failed on-chain with hash: ${receipt.transactionHash}`);
          i--; // Retry this transaction
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        logWithTimestamp(`Transaction ${i + 1} for ${userName} (${walletAddress}) successful with hash: ${receipt.transactionHash}`);
        await synchronizeTransaction(receipt.transactionHash, accountData);
        allTransactionsFailedDueToFunds = false; // At least one transaction succeeded
      } catch (error) {
        if (error.message.includes("insufficient funds for gas * price + value")) {
          logWithTimestamp(`Transaction ${i + 1} failed for ${userName} (${walletAddress}): ${error.message} - Skipping this transaction`);
          continue; // Skip this transaction and move to the next one
        } else {
          logWithTimestamp(`Transaction ${i + 1} failed for ${userName} (${walletAddress}): ${error.message}`);
          i--; // Retry for other errors
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (allTransactionsFailedDueToFunds) {
      logWithTimestamp(`All transactions failed due to insufficient funds for ${userName}. Disabling account in config.`);
      const existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      const accountIndex = existingConfig.findIndex(acc => acc.privateKey === accountData.privateKey);

      if (accountIndex !== -1) {
        existingConfig[accountIndex].isActive = false;
        updateConfigFile(existingConfig);
        logWithTimestamp(`Account ${userName} marked as inactive in config.json`);
      } else {
        logWithTimestamp(`Could not find account ${userName} in config to disable`);
      }
    }

    logWithTimestamp(`All transactions completed for ${userName} (${walletAddress}).`);
  } catch (error) {
    logWithTimestamp(`Failed to process transactions for ${userName}: ${error.message}`);
  }
}

async function loadPLimit() {
  const { default: pLimit } = await import('p-limit');
  return pLimit;
}

async function processAccountsInParallel(accounts, transactionCount, depositAmount) {
  const startTime = Date.now();

  const pLimit = await loadPLimit();
  const limit = pLimit(2);

  const accountsWithUserAgent = accounts.map(account => {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    return { ...account, currentUserAgent: userAgent };
  });

  const processPromises = accountsWithUserAgent.map(account =>
    limit(() =>
      processTransactions(account, transactionCount, depositAmount)
        .catch(error => {
          logWithTimestamp(`Error processing account ${account.userName}: ${error.message}`);
        })
    )
  );

  await Promise.all(processPromises);

  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  logWithTimestamp(`All accounts have been processed with limited parallelism.`);
  logWithTimestamp(`Time taken to process all accounts: ${minutes} minutes and ${seconds} seconds (${durationMs} milliseconds).`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initialize() {
  const accounts = loadAccounts();
  
  async function processCycle() {
    userInput.question('Enter number of transactions: ', async (txCountInput) => {
      const transactionCount = parseInt(txCountInput);

      if (isNaN(transactionCount) || transactionCount <= 0) {
        logWithTimestamp('Invalid transaction count.');
        userInput.close();
        return;
      }

      userInput.question('Do you want to use the default amount of 0.0000000000001 ETH? (y/n): ', async (useDefault) => {
        let depositAmount = '0.0000000000000001';

        if (useDefault.toLowerCase() !== 'y') {
          userInput.question('Enter amount to deposit (in ETH): ', async (amountInput) => {
            const parsedAmount = parseFloat(amountInput);
            if (!isNaN(parsedAmount) && parsedAmount > 0) {
              depositAmount = amountInput;
            } else {
              logWithTimestamp('Invalid amount entered. Using default amount.');
            }
            await executeCycles(transactionCount, depositAmount);
          });
        } else {
          await executeCycles(transactionCount, depositAmount);
        }
      });
    });
  }

  async function executeCycles(transactionCount, depositAmount) {
    let cycleCount = 1;
    process.on('SIGINT', () => {
      logWithTimestamp('Process terminated by user');
      userInput.close();
      process.exit(0);
    });

    while (true) {
      logWithTimestamp(`Starting transaction cycle #${cycleCount}...`);
      await processAccountsInParallel(accounts, transactionCount, depositAmount);
      
      logWithTimestamp(`Cycle #${cycleCount} completed. Waiting for 10 minutes before next cycle (Press Ctrl+C to exit)...`);
      cycleCount++;
      await delay(10 * 60 * 1000);
    }
  }

  await processCycle();
}

displayBanner();
initialize().catch(error => {
  logWithTimestamp(`Error in main execution: ${error.message}`);
  process.exit(1);
});