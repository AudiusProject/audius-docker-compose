const axios = require('axios')
const Web3 = require('web3')
const HDWalletProvider = require('@truffle/hdwallet-provider')
const { program } = require('commander')
const BN = require('bn.js')
const audius = require('@audius/libs')

const defaultRegistryAddress = '0xd976d3b4f4e22a238c1A736b6612D22f17b6f64C'
const defaultTokenAddress = '0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998'
const splitterAddress = '0x69eaacad9c08bf3a809688395a5f2f0ccac5aa0d'
const splitterABI = require('./ERC20Splitter.json')
const ethRewardsManagerAddress = '0x5aa6B99A2B461bA8E97207740f0A689C5C39C3b0'
const ethRewardsManagerABI = require('./EthRewardsManager.json')
const { Wormhole, wormhole, signSendWait } = require('@wormhole-foundation/sdk')
const { Connection } = require('@solana/web3.js')
const solana = require('@wormhole-foundation/sdk/solana').default
const evm = require('@wormhole-foundation/sdk/evm').default

async function configureLibs(ethRegistryAddress, ethTokenAddress, ethRpcEndpoint) {
  const configuredWeb3 = await audius.Utils.configureWeb3(ethRpcEndpoint, null, false)

  const audiusLibsConfig = {
    ethWeb3Config: audius.configEthWeb3(ethTokenAddress, ethRegistryAddress, configuredWeb3, '0x0'),
    isServer: true,
  }

  const libs = new audius(audiusLibsConfig)
  await libs.init()

  return libs
}

async function getClaimsManagerContract(ethRegistryAddress, ethTokenAddress, web3) {
  const audiusLibs = await configureLibs(ethRegistryAddress, ethTokenAddress, web3.eth.currentProvider)
  await audiusLibs.ethContracts.ClaimsManagerClient.init()
  return new web3.eth.Contract(
    audiusLibs.ethContracts.ClaimsManagerClient._contract.options.jsonInterface,
    audiusLibs.ethContracts.ClaimsManagerClient._contract.options.address
  )
}

async function getDelegateManagerContract(ethRegistryAddress, ethTokenAddress, web3) {
  const audiusLibs = await configureLibs(ethRegistryAddress, ethTokenAddress, web3.eth.currentProvider)
  await audiusLibs.ethContracts.DelegateManagerClient.init()
  return new web3.eth.Contract(
    audiusLibs.ethContracts.DelegateManagerClient._contract.options.jsonInterface,
    audiusLibs.ethContracts.DelegateManagerClient._contract.options.address
  )
}

async function getEthRewardsManagerContract(ethRegistryAddress, ethTokenAddress, web3) {
  const audiusLibs = await configureLibs(ethRegistryAddress, ethTokenAddress, web3.eth.currentProvider)
  return new web3.eth.Contract(
    ethRewardsManagerABI,
    ethRewardsManagerAddress
  )
}

async function balanceOf(ethRegistryAddress, ethTokenAddress, web3, address) {
  const audiusLibs = await configureLibs(ethRegistryAddress, ethTokenAddress, web3.eth.currentProvider)
  return audiusLibs.ethContracts.AudiusTokenClient.balanceOf(address)
}

async function getSplitterContract(splitterAddress, web3) {
  return new web3.eth.Contract(
    splitterABI,
    splitterAddress
  )
}

async function getWormholeSolanaSigner(chain, feePayerSecretKey, solanaRpcEndpoint) {
  const signer = (await (
    await solana()
  ).getSigner(new Connection(solanaRpcEndpoint), feePayerSecretKey, {
    priorityFee: {
      // take the middle priority fee
      percentile: 0.5,
      // juice the base fee taken from priority fee percentile
      percentileMultiple: 2,
      // at least 1 lamport/compute unit
      min: 1,
      // at most 1000 lamport/compute unit
      max: 1000,
    },
    sendOpts: {
      skipPreflight: true,
    },
  }))
  return {
    signer,
    address: Wormhole.chainAddress(chain.chain, signer.address()),
  };
};

async function initiateRound(privateKey, { ethRegistryAddress, ethTokenAddress, ethRpcEndpoint, solanaRpcEndpoint, gas, gasPrice, transferRewardsToSolana }) {
  const web3 = new Web3(
    new HDWalletProvider({
      privateKeys: [privateKey],
      providerOrUrl: ethRpcEndpoint,
    })
  )
  web3.eth.transactionPollingTimeout = 3600
  const accountAddress = web3.eth.accounts.privateKeyToAccount(privateKey).address

  const claimsManagerContract = await getClaimsManagerContract(ethRegistryAddress, ethTokenAddress, web3)

  const lastFundedBlock = await claimsManagerContract.methods.getLastFundedBlock().call()
  const requiredBlockDiff = await claimsManagerContract.methods.getFundingRoundBlockDiff().call()

  const currentBlock = await web3.eth.getBlockNumber()
  const blockDiff = currentBlock - lastFundedBlock - 12

  console.log('\nInitiating Round\n================================\n')
  if (blockDiff > requiredBlockDiff) {
    if (gas === undefined) {
      console.log('Estimating Gas')
      gas = await claimsManagerContract.methods.initiateRound().estimateGas()
      console.log('Calculated Gas:', gas)
    }
  
    console.log('Initializing Round')
    await claimsManagerContract.methods.initiateRound().send({
      from: accountAddress,
      gas
    })
    console.log('Successfully initiated Round')
  } else {
    console.log(`Block difference of ${requiredBlockDiff} not met, ${requiredBlockDiff - blockDiff} blocks remaining`)
  }

  console.log('\nTransferring from splitter\n================================\n')
  // Transfer from the splitter to EthRewardsManager and Grants recipients
  const splitterContract = await getSplitterContract(splitterAddress, web3)
  const value = await balanceOf(ethRegistryAddress, ethTokenAddress, web3, splitterAddress)
  console.log(`Splitter holding ${value.div(new BN('1000000000000000000')).toString()} $AUDIO`)
  if (value.gt(new BN(0))) {
    console.log('Transferring from splitter to EthRewardsManager and Grants recipients')
    gas = await splitterContract.methods.transfer().estimateGas()
    await splitterContract.methods.transfer().send({
      from: accountAddress,
      gas
    })
  } else {
    console.log('No value to transfer from splitter')
  }

  if (transferRewardsToSolana) {
    const feePayerSecretKey = process.env.FEE_PAYER_SECRET_KEY

    console.log('\nTransferring from EthRewardsManager to SolanaRewardsManager\n================================\n')
    const ethRewardsManagerContract = await getEthRewardsManagerContract(ethRegistryAddress, ethTokenAddress, web3)
    const value = await balanceOf(ethRegistryAddress, ethTokenAddress, web3, ethRewardsManagerAddress)
    console.log(`EthRewardsManager holding ${value.div(new BN('1000000000000000000')).toString()} $AUDIO`)
    console.log(value.toString())
    // Check for minimum amount of $AUDIO to transfer. Sub 1 $AUDIO is possible because of wormhole dust / transfer minimums
    if (value.gt(new BN('1000000000000000000'))) {
      console.log('Transferring from EthRewardsManager to wormhole')
      const arbiterFee = 0
      const nonce = 2
      gas = await ethRewardsManagerContract.methods.transferToSolana(arbiterFee, nonce).estimateGas()
      const tx = await ethRewardsManagerContract.methods.transferToSolana(arbiterFee, nonce).send({
        from: accountAddress,
        gas
      })

      const txHash = tx.transactionHash
      console.log('Successfully transferred to wormhole, transaction:', txHash)

      console.log('Redeeming wormhole funds on Solana')
      const wh = await wormhole("Mainnet", [evm, solana])
      const sendChain = wh.getChain("Ethereum")
      const receiveChain = wh.getChain("Solana")
      const tokenBridge = await receiveChain.getTokenBridge()
      const signer = await getWormholeSolanaSigner(receiveChain, feePayerSecretKey, solanaRpcEndpoint)
      const [whm] = await sendChain.parseTransaction(txHash)

      const oneHourInMs = 3600000

      let vaa = await wh.getVaa(whm, "TokenBridge:Transfer", oneHourInMs)
      let retryCount = 0
      while (!vaa) {
        logger.warn(
          { tx: txHash, retryCount: retryCount++ },
          "No TokenBridgeTransfer VAA found, waiting and trying again..."
        );
        await new Promise((resolve) => setTimeout(resolve, 1000))
        vaa = await wh.getVaa(whm, "TokenBridge:Transfer", oneHourInMs)
      }
      const isComplete = await tokenBridge.isTransferCompleted(vaa)
      console.log(`Wormhole redemption completion status: ${isComplete}`)
      // Wait for 30 seconds to ensure the VAA is processed
      await new Promise((resolve) => setTimeout(resolve, 30_000))
      if (!isComplete) {
        const redeemTxs = tokenBridge.redeem(signer.address.address, vaa)
        const resRedeem = await signSendWait(
          receiveChain,
          redeemTxs,
          signer.signer
        )
      }
      console.log('Wormhole redemption completed')

    } else {
      console.log('No value to transfer from EthRewardsManager')
    }
  }
}

async function claimRewards(
  spOwnerWallet,
  privateKey,
  { ethRegistryAddress, ethTokenAddress, ethRpcEndpoint, gas, gasPrice }
) {
  const web3 = new Web3(
    new HDWalletProvider({
      privateKeys: [privateKey],
      providerOrUrl: ethRpcEndpoint,
    })
  )

  web3.eth.transactionPollingTimeout = 3600
  const accountAddress = web3.eth.accounts.privateKeyToAccount(privateKey).address

  const claimsManagerContract = await getClaimsManagerContract(ethRegistryAddress, ethTokenAddress, web3)
  const delegateManagerContract = await getDelegateManagerContract(ethRegistryAddress, ethTokenAddress, web3)

  const claimPending = await claimsManagerContract.methods.claimPending(spOwnerWallet).call()

  if (claimPending) {
    if (gas === undefined) {
      console.log('Estimating Gas')
      gas = await delegateManagerContract.methods.claimRewards(spOwnerWallet).estimateGas()
      console.log('Calculated Gas:', gas)

      const gasPrice = await web3.eth.getGasPrice()
      const estimatedFee = gas * gasPrice
      console.log('Estimated Fee:', web3.utils.fromWei(estimatedFee.toString(), 'ether'), 'ETH')
    }

    console.log('Claiming Rewards')
    await delegateManagerContract.methods.claimRewards(spOwnerWallet).send({
      from: accountAddress,
      gas,
      gasPrice: gasPrice ? web3.utils.toWei(gasPrice, 'gwei') : (await web3.eth.getGasPrice()),
    })
    console.log('Claimed Rewards successfully')
  } else {
    console.log('No claims pending')
  }
}

async function main() {
  program
    .command('initiate-round <privateKey>')
    .description('Initiates new round for claiming rewards')
    .requiredOption('--eth-rpc-endpoint <ethRpcEndpoint>', 'Eth RPC endpoint')
    .requiredOption('--solana-rpc-endpoint <solanaRpcEndpoint>', 'Solana RPC endpoint')
    .option('--eth-registry-address <ethRegistryAddress>', 'Registry contract address', defaultRegistryAddress)
    .option('--eth-token-address <ethTokenAddress>', 'Token contract address', defaultTokenAddress)
    .option('--gas <gas>', 'amount of gas to use')
    .option('--gas-price <gasPrice>', 'gas price in gwei')
    .option('--transfer-rewards-to-solana', 'whether to also transfer rewards to solana rewards manager on success. Requires env vars to be set.', false)
    .action(initiateRound)

  program
    .command('claim-rewards <spOwnerWallet> <privateKey>')
    .description('Claim rewards for given spOwnerWallet')
    .requiredOption('--eth-rpc-endpoint <ethRpcEndpoint>', 'Eth RPC endpoint')
    .option('--eth-registry-address <ethRegistryAddress>', 'Registry contract address', defaultRegistryAddress)
    .option('--eth-token-address <ethTokenAddress>', 'Token contract address', defaultTokenAddress)
    .option('--gas <gas>', 'ammount of gas to use')
    .option('--gas-price <gasPrice>', 'gas price in gwei')
    .action(claimRewards)

  try {
    await program.parseAsync(process.argv)
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

main()
