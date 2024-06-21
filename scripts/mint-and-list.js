const { ethers } = require("hardhat")
const PRICE =ethers.utils.parseEther("0.1")
async function mintAndList() {
    const NftMarketPlace =await ethers.getContract("NFTMarketPlace")
    const basicNft = await ethers.getContract("BasicNft")
    console.log("minting")
    const tx = await basicNft.mintNft()
    const txResponse =await tx.wait(1)
    const tokenId = txResponse.events[0].args.tokenId
    console.log("Approving NFT")
    await basicNft.approve(NftMarketPlace.address,tokenId)
    console.log("Listing Items")
    await NftMarketPlace.listItem(basicNft.address,tokenId,PRICE)

}

mintAndList()
    .then(() => {
        process.exit(0)
    })
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
