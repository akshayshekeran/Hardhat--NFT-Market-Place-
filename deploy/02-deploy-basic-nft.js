const { ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    //
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    args = []
    console.log("Deploying BasicNft contract ")
    const BasicNft = await deploy("BasicNft", {
        contract: "BasicNft",
        from: deployer,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
        log: true,
    })
    console.log("contract Deployed :", BasicNft.address)
    console.log("-----------------------------------------------------------------")

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("Verifing Contract")
        console.log(NFTMarketPlace.address)
        await verify(NFTMarketPlace.address, args)
    }
    console.log("Everything Done")
}

module.exports.tags = ["all", "basicnft"]