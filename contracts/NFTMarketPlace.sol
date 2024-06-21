// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

//imports
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

//error
error NFTMarketPlace__priceMustBeAboveZero();
error NFTMarketPlace__NFTNotApproved();
error NFTMarketPlace__tokenAlreadyListed(address nftAddress, uint256 tokenId);
error NFTMarketPlace__notAOwner(address sender);
error NFTMarketPlace__notListed(address nftAddress, uint256 tokenId);
error NFTMarketPlace__notEnoughEthers(uint256 price);
error NFTMarketPlace__noAmountToWithdraw();
error NFTMarketPlace__withdrawFailed();

contract NFTMarketPlace is ReentrancyGuard {
    // Created Variables
    struct listing {
        uint256 price;
        address seller;
    }

    //events
    event itemListed(
        address indexed sender,
        address indexed nftaddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event itemBought(uint256 indexed tokenId, address indexed buyer, uint256 price);

    event itemCancelled(address indexed nftAddress, uint256 indexed tokenId);

    event itemUpdated(address indexed nftAddress, uint256 indexed tokenId, uint256 price);

    event transactionSuccessful(uint256 indexed amount);

    // Variables
    mapping(address => mapping(uint256 => listing)) private s_listings;
    mapping(address => uint256) private s_amountEarned;

    //modifiers
    modifier notListed(address nftAddress, uint256 tokenId) {
        if (s_listings[nftAddress][tokenId].price > 0) {
            revert NFTMarketPlace__tokenAlreadyListed(nftAddress, tokenId);
        }
        _;
    }
    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address sender
    ) {
        IERC721 nft = IERC721(nftAddress);
        if (nft.ownerOf(tokenId) != sender) {
            revert NFTMarketPlace__notAOwner(nft.ownerOf(tokenId));
        }
        _;
    }
    modifier isListed(address nftAddress, uint256 tokenId) {
        if (s_listings[nftAddress][tokenId].price <= 0) {
            revert NFTMarketPlace__notListed(nftAddress, tokenId);
        }
        _;
    }

    //function to List Items
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) {
            revert NFTMarketPlace__priceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NFTMarketPlace__NFTNotApproved();
        }
        s_listings[nftAddress][tokenId] = listing(price, msg.sender);
        emit itemListed(msg.sender, nftAddress, tokenId, price);
    }

    //function to Buy Items
    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable nonReentrant isListed(nftAddress, tokenId) {
        listing memory item = s_listings[nftAddress][tokenId];
        if (msg.value < item.price) {
            revert NFTMarketPlace__notEnoughEthers(item.price);
        }
        s_amountEarned[item.seller] = s_amountEarned[item.seller] + msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(item.seller, msg.sender, tokenId);
        emit itemBought(tokenId, msg.sender, item.price);
    }

    //function to cancel listing
    function cancelItem(
        address nftAddress,
        uint256 tokenId
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        delete (s_listings[nftAddress][tokenId]);
        emit itemCancelled(nftAddress, tokenId);
    }

    //function to update listing
    function updateItem(
        address nftAddress,
        uint256 tokenId,
        uint256 updatedPrice
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        s_listings[nftAddress][tokenId].price = updatedPrice;
        emit itemListed(msg.sender, nftAddress, tokenId, updatedPrice);
    }

    //function to withdraw amounts
    function withdraw() external payable nonReentrant {
        if (s_amountEarned[msg.sender] <= 0) {
            revert NFTMarketPlace__noAmountToWithdraw();
        }
        uint256 amount = s_amountEarned[msg.sender];
        s_amountEarned[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert NFTMarketPlace__withdrawFailed();
        } else {
            emit transactionSuccessful(amount);
        }
    }

    //getter functions
    function getListings(
        address nftAddress,
        uint256 tokenId
    ) public view returns (listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getAmountEarned(address seller) public view returns (uint256) {
        return s_amountEarned[seller];
    }
}
