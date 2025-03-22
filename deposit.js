const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const Web3 = require('web3');
const { HttpsProxyAgent } = require('https-proxy-agent');

function displayBanner() {
  console.log('\x1b[34m', '██     ██ ██ ███    ██ ███████ ███    ██ ██ ██████  ');
  console.log('\x1b[34m', '██     ██ ██ ████   ██ ██      ████   ██ ██ ██   ██ ');
  console.log('\x1b[34m', '██  █  ██ ██ ██ ██  ██ ███████ ██ ██  ██ ██ ██████  ');
  console.log('\x1b[34m', '██ ███ ██ ██ ██  ██ ██      ██ ██  ██ ██ ██ ██      ');
  console.log('\x1b[34m', ' ███ ███  ██ ██   ████ ███████ ██   ████ ██ ██      ');
  console.log('\x1b[0m');
  console.log("Hanafuda Bot Auto Deposit");
  console.log("Join our Telegram channel: https://t.me/winsnip");
}

function logWithTimestamp(message) {
  const timestamp = new Date().toISOString().split('.')[0].replace('T', ' ');
  console.log(`[${timestamp}] ${message}`);
}

const RPC_ENDPOINT = "https://mainnet.base.org";
const CONTRACT_ADDRESS = "0xC5bf05cD32a14BFfb705Fb37a9d218895187376c";
const CONFIG_FILE = './config.json';
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

function createAxiosInstance(proxyUrl) {
  return axios.create({
    httpsAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
    timeout: 60000
  });
}

async function refreshAuthToken(accountData) {
  logWithTimestamp(`Attempting to refresh token for ${accountData.userName}...`);
  const axiosInstance = createAxiosInstance(accountData.proxy);
  
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
  const axiosInstance = createAxiosInstance(accountData.proxy);

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
            'Authorization': accountData.authToken
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
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } while (parseFloat(transactionFee) > MAX_FEE_THRESHOLD);

  return gasPrice;
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

    for (let i = 0; i < transactionCount; i++) {
      try {
        const nonce = await web3.eth.getTransactionCount(walletAddress, 'pending');
        const gasLimit = await contract.methods.depositETH().estimateGas({ from: walletAddress, value: amountInWei });
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
        const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

        if (!receipt.status) {
          logWithTimestamp(`Transaction ${i + 1} for ${userName} (${walletAddress}) failed on-chain with hash: ${receipt.transactionHash}`);
          i--;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        const confirmedReceipt = await web3.eth.getTransactionReceipt(receipt.transactionHash);
        if (!confirmedReceipt || !confirmedReceipt.status) {
          logWithTimestamp(`Transaction ${i + 1} for ${userName} (${walletAddress}) not confirmed or failed on-chain with hash: ${receipt.transactionHash}`);
          i--;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        logWithTimestamp(`Transaction ${i + 1} for ${userName} (${walletAddress}) successful with hash: ${receipt.transactionHash}`);
        await synchronizeTransaction(receipt.transactionHash, accountData);
      } catch (error) {
        logWithTimestamp(`Transaction ${i + 1} failed for ${userName} (${walletAddress}): ${error.message}`);
        i--;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    logWithTimestamp(`All transactions completed for ${userName} (${walletAddress}).`);
  } catch (error) {
    logWithTimestamp(`Failed to process transactions for ${userName}: ${error.message}`);
  }
}

async function processAccountsInParallel(accounts, transactionCount, depositAmount) {
  const processPromises = accounts.map(account =>
    processTransactions(account, transactionCount, depositAmount)
      .catch(error => {
        logWithTimestamp(`Error processing account ${account.userName}: ${error.message}`);
      })
  );

  await Promise.all(processPromises);
  logWithTimestamp('All accounts have been processed in parallel.');
}

// Fungsi delay baru
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
      
      logWithTimestamp(`Cycle #${cycleCount} completed. Waiting for 1 hour before next cycle (Press Ctrl+C to exit)...`);
      cycleCount++;
      await delay(60 * 60 * 1000); // Delay 1 jam
    }
  }

  await processCycle();
}

displayBanner();
initialize().catch(error => {
  logWithTimestamp(`Error in main execution: ${error.message}`);
  process.exit(1);
});