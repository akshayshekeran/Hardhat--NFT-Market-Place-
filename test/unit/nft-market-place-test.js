const { ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarketPlace", function () {
          let NftMarketPlace, basicnft, deployer, player, market, provider
          const PRICE = ethers.utils.parseEther("0.1")
          const tokenId = 0

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              player = (await getNamedAccounts()).player
              await deployments.fixture(["all"])
              NftMarketPlace = await ethers.getContract("NFTMarketPlace")
              basicnft = await ethers.getContract("BasicNft")
              market = await ethers.getContract("NFTMarketPlace", player)
              await basicnft.mintNft()
              await basicnft.approve(NftMarketPlace.address, tokenId)
              provider = ethers.provider
          })
          describe("ListItem function", function () {
              it("emits an event after listing an item", async function () {
                  expect(
                      await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  ).to.emit("itemListed")
              })
              it("lists and can be bought", async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  const address = await basicnft.address
                  const price = (
                      await NftMarketPlace.getListings(address, tokenId)
                  ).price.toString()
                  const seller = (await NftMarketPlace.getListings(address, tokenId))
                      .seller
                  assert.equal(price, PRICE)
                  assert.equal(seller, deployer)
              })
              it("Not listed Modifier", async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  const error = `NFTMarketPlace__tokenAlreadyListed("${basicnft.address}", ${tokenId})`
                  await expect(
                      NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  ).to.be.revertedWith(error)
              })
              it("Is owner modifier", async () => {
                  const error = `NFTMarketPlace__notAOwner("${deployer}")`
                  await expect(
                      market.listItem(basicnft.address, tokenId, PRICE)
                  ).to.be.revertedWith(error)
              })

              it("Price Must Be Above Zero", async () => {
                  const error = `NFTMarketPlace__priceMustBeAboveZero()`
                  await expect(
                      NftMarketPlace.listItem(basicnft.address, tokenId, 0)
                  ).to.be.revertedWith(error)
              })
              it("needs approvals to list item", async function () {
                  await basicnft.approve(ethers.constants.AddressZero, tokenId)
                  await expect(
                      NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  ).to.be.revertedWith("NFTMarketPlace__NFTNotApproved()")
              })
          })
          describe("Buy Items", function () {
              it("Is listed Modifier", async () => {
                  const error = `NFTMarketPlace__notListed("${basicnft.address}", ${tokenId})`
                  await expect(
                      NftMarketPlace.buyItem(basicnft.address, tokenId)
                  ).to.be.revertedWith(error)
              })
              it("Not Enough Ether", async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  const error = `NFTMarketPlace__notEnoughEthers(${PRICE})`
                  await expect(
                      market.buyItem(basicnft.address, tokenId)
                  ).to.be.revertedWith(error)
              })
              it("transfers the nft to the buyer and updates internal proceeds record", async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  const before = (
                      await NftMarketPlace.getAmountEarned(deployer)
                  ).toString()
                  market.buyItem(basicnft.address, tokenId, { value: PRICE })
                  const after = (
                      await NftMarketPlace.getAmountEarned(deployer)
                  ).toString()
                  await assert.equal((after - before), PRICE.toString())

                  const owner = await basicnft.ownerOf(tokenId)
                  await assert.equal(owner, player)
              })
              it("emits an event after Buying an item", async function () {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  expect(
                      await market.buyItem(basicnft.address, tokenId, {
                          value: PRICE,
                      })
                  ).to.emit("itemBought")
              })
              it("Deleted in listing", async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
                  await NftMarketPlace.buyItem(basicnft.address, tokenId, {
                      value: PRICE,
                  })
                  const list = await NftMarketPlace.getListings(basicnft.address, tokenId)
                  assert.equal(list.price.toString(), "0")
                  assert.equal(list.seller, "0x0000000000000000000000000000000000000000")
              })
          })
          describe("Cancel Items", function () {
              beforeEach(async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
              })
              it("emits an event after cancelling an item", async function () {
                  expect(
                      await NftMarketPlace.cancelItem(basicnft.address, tokenId)
                  ).to.emit("itemCancelled")
              })
              it("Deleted in listing", async () => {
                  await NftMarketPlace.cancelItem(basicnft.address, tokenId)
                  const list = await NftMarketPlace.getListings(basicnft.address, tokenId)
                  assert.equal(list.price.toString(), "0")
                  assert.equal(list.seller, "0x0000000000000000000000000000000000000000")
              })
          })
          describe("Update Items", function () {
              const updatedPrice = ethers.utils.parseEther("0.2")
              beforeEach(async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
              })
              it("emits an event after Updating an item", async function () {
                  expect(
                      await NftMarketPlace.updateItem(
                          basicnft.address,
                          tokenId,
                          updatedPrice
                      )
                  ).to.emit("itemUpdated")
              })
              it("Update listing", async () => {
                  await NftMarketPlace.updateItem(basicnft.address, tokenId, updatedPrice)
                  const list = await NftMarketPlace.getListings(basicnft.address, tokenId)
                  assert.equal(list.price.toString(), updatedPrice)
              })
          })
          describe("Withdraw Amount", function () {
              beforeEach(async () => {
                  await NftMarketPlace.listItem(basicnft.address, tokenId, PRICE)
              })
              it("emits an event after withdrawing", async function () {
                  await market.buyItem(basicnft.address, tokenId, {
                      value: PRICE,
                  })
                  expect(await NftMarketPlace.withdraw()).to.emit("transactionSuccessful")
              })
              it("reverting when there is no amount", async function () {
                  const error = `NFTMarketPlace__noAmountToWithdraw()`
                  await expect(NftMarketPlace.withdraw()).to.revertedWith(error)
              })
              it("Update amount Earned", async () => {
                  await market.buyItem(basicnft.address, tokenId, {
                      value: PRICE,
                  })
                  await NftMarketPlace.withdraw()
                  const withdrawAmount = (
                      await NftMarketPlace.getAmountEarned(deployer)
                  ).toString()
                  assert.equal(withdrawAmount, "0")
              })
              it("Amount Transfer Perfectly", async () => {
                  await market.buyItem(basicnft.address, tokenId, {
                      value: PRICE,
                  })
                  const deployerProceedsBefore = await NftMarketPlace.getAmountEarned(
                      deployer
                  )
                  const deployerBalanceBefore = await provider.getBalance(deployer)
                  const txResponse = await NftMarketPlace.withdraw()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await provider.getBalance(deployer)

                  assert.equal(
                      deployerBalanceAfter.add(gasCost).toString(),
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
