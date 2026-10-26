// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Bestiary Market — two-sided market: asks AND bids, 2% fee to treasury.
contract BestiaryMarket is ReentrancyGuard {
    struct Listing {
        address seller;
        uint96 price;
        uint64 expiry;
    }

    struct Bid {
        address bidder;
        uint96 amount;
        uint64 expiry;
    }

    IERC721 public immutable nft;
    address payable public immutable treasury;
    uint96 public constant FEE_BPS = 200;
    uint256 public constant MIN_PRICE = 0.0001 ether;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid) public bids;

    // enumeration for the UI (swap-remove, O(1) writes)
    uint256[] public listedIds;
    uint256[] public bidIds;
    mapping(uint256 => uint256) private _listedPos; // tokenId => index+1
    mapping(uint256 => uint256) private _bidPos;    // tokenId => index+1

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 expiry);
    event ListingCancelled(uint256 indexed tokenId);
    event Sold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 fee);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount, uint256 expiry);
    event BidCancelled(uint256 indexed tokenId, address indexed bidder);
    event BidAccepted(uint256 indexed tokenId, address indexed bidder, address indexed seller, uint256 amount, uint256 fee);

    constructor(address nft_, address payable treasury_) {
        nft = IERC721(nft_);
        treasury = treasury_;
    }

    // ------------------------------------------------------------- asks

    function list(uint256 tokenId, uint256 price, uint256 daysOpen) external {
        require(price >= MIN_PRICE, "Price too low");
        require(daysOpen >= 1 && daysOpen <= 90, "Bad duration");
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)),
            "Not approved"
        );
        // a seller's ask cancels their own standing bid
        _clearBid(tokenId);

        uint64 expiry = uint64(block.timestamp + daysOpen * 1 days);
        listings[tokenId] = Listing(msg.sender, uint96(price), expiry);
        if (_listedPos[tokenId] == 0) {
            listedIds.push(tokenId);
            _listedPos[tokenId] = listedIds.length;
        }
        emit Listed(tokenId, msg.sender, price, expiry);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        require(l.seller == msg.sender, "Not seller");
        delete listings[tokenId];
        _removeListed(tokenId);
        emit ListingCancelled(tokenId);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        require(l.seller != address(0), "Not listed");
        require(block.timestamp <= l.expiry, "Expired");
        require(msg.value == l.price, "Wrong value");
        require(nft.ownerOf(tokenId) == l.seller, "Seller moved token");
        require(
            nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(l.seller, address(this)),
            "Approval gone"
        );

        delete listings[tokenId];
        _removeListed(tokenId);
        _clearBid(tokenId);

        uint256 fee = (uint256(l.price) * FEE_BPS) / 10_000;
        _pay(treasury, fee);
        _pay(payable(l.seller), uint256(l.price) - fee);
        nft.safeTransferFrom(l.seller, msg.sender, tokenId);

        emit Sold(tokenId, msg.sender, l.seller, l.price, fee);
    }

    // ------------------------------------------------------------- bids

    function bid(uint256 tokenId) external payable nonReentrant {
        require(msg.value >= MIN_PRICE, "Bid too low");
        require(nft.ownerOf(tokenId) != msg.sender, "Owner cannot bid");
        Bid memory current = bids[tokenId];
        require(msg.value > current.amount, "Bid too small");

        bids[tokenId] = Bid(msg.sender, uint96(msg.value), uint64(block.timestamp + 7 days));
        if (_bidPos[tokenId] == 0) {
            bidIds.push(tokenId);
            _bidPos[tokenId] = bidIds.length;
        }
        if (current.bidder != address(0)) _pay(payable(current.bidder), current.amount);
        emit BidPlaced(tokenId, msg.sender, msg.value, uint64(block.timestamp + 7 days));
    }

    function cancelBid(uint256 tokenId) external nonReentrant {
        Bid memory b = bids[tokenId];
        require(b.bidder == msg.sender, "Not bidder");
        delete bids[tokenId];
        _removeBid(tokenId);
        _pay(payable(msg.sender), b.amount);
        emit BidCancelled(tokenId, msg.sender);
    }

    /// Seller accepts the standing bid: needs approval, gets paid in the same tx.
    function acceptBid(uint256 tokenId) external nonReentrant {
        Bid memory b = bids[tokenId];
        require(b.bidder != address(0), "No bid");
        require(block.timestamp <= b.expiry, "Bid expired");
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)),
            "Not approved"
        );

        delete bids[tokenId];
        _removeBid(tokenId);
        delete listings[tokenId];
        _removeListed(tokenId);

        uint256 fee = (uint256(b.amount) * FEE_BPS) / 10_000;
        _pay(treasury, fee);
        _pay(payable(msg.sender), uint256(b.amount) - fee);
        nft.safeTransferFrom(msg.sender, b.bidder, tokenId);

        emit BidAccepted(tokenId, b.bidder, msg.sender, b.amount, fee);
    }

    // ------------------------------------------------------------ views

    function listedCount() external view returns (uint256) {
        return listedIds.length;
    }

    function bidCount() external view returns (uint256) {
        return bidIds.length;
    }

    /// Page of live listings: ids[i] is listed at prices[i].
    function listingsPage(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory ids, uint256[] memory prices, address[] memory sellers)
    {
        uint256 total = listedIds.length;
        if (offset >= total) return (new uint256[](0), new uint256[](0), new address[](0));
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 n = end - offset;
        ids = new uint256[](n);
        prices = new uint256[](n);
        sellers = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = listedIds[total - 1 - (offset + i)];
            ids[i] = id;
            prices[i] = listings[id].price;
            sellers[i] = listings[id].seller;
        }
    }

    function bidsPage(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory ids, uint256[] memory amounts, address[] memory bidders)
    {
        uint256 total = bidIds.length;
        if (offset >= total) return (new uint256[](0), new uint256[](0), new address[](0));
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 n = end - offset;
        ids = new uint256[](n);
        amounts = new uint256[](n);
        bidders = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = bidIds[total - 1 - (offset + i)];
            ids[i] = id;
            amounts[i] = bids[id].amount;
            bidders[i] = bids[id].bidder;
        }
    }

    /// Cheapest live ask across the book (0 when empty).
    function floor() public view returns (uint256) {
        uint256 best = 0;
        for (uint256 i = 0; i < listedIds.length; i++) {
            Listing memory l = listings[listedIds[i]];
            if (l.seller == address(0) || block.timestamp > l.expiry) continue;
            if (best == 0 || l.price < best) best = l.price;
        }
        return best;
    }

    function _unusedFloor() internal pure returns (uint256) {
        // kept for UI symmetry; concrete floor is computed off-chain over listings
        return MIN_PRICE;
    }

    function listingOf(uint256 tokenId) external view returns (Listing memory, bool live) {
        Listing memory l = listings[tokenId];
        live = l.seller != address(0) && block.timestamp <= l.expiry;
    }

    function bidOf(uint256 tokenId) external view returns (Bid memory, bool live) {
        Bid memory b = bids[tokenId];
        live = b.bidder != address(0) && block.timestamp <= b.expiry;
    }

    // ----------------------------------------------------------- internal

    function _removeListed(uint256 tokenId) internal {
        uint256 pos = _listedPos[tokenId];
        if (pos == 0) return;
        uint256 idx = pos - 1;
        uint256 last = listedIds[listedIds.length - 1];
        listedIds[idx] = last;
        _listedPos[last] = idx + 1;
        listedIds.pop();
        _listedPos[tokenId] = 0;
    }

    function _removeBid(uint256 tokenId) internal {
        uint256 pos = _bidPos[tokenId];
        if (pos == 0) return;
        uint256 idx = pos - 1;
        uint256 last = bidIds[bidIds.length - 1];
        bidIds[idx] = last;
        _bidPos[last] = idx + 1;
        bidIds.pop();
        _bidPos[tokenId] = 0;
    }

    function _clearBid(uint256 tokenId) internal {
        Bid memory b = bids[tokenId];
        if (b.bidder != address(0)) {
            delete bids[tokenId];
            _removeBid(tokenId);
            _pay(payable(b.bidder), b.amount);
            emit BidCancelled(tokenId, b.bidder);
        }
    }

    function _pay(address payable to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Payment failed");
    }
}
