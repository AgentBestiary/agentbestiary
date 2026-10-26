// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

interface IAgentRegistry {
    function balanceOf(address wallet) external view returns (uint256);
    function handleOf(address wallet) external view returns (string memory);
}

/// @title Agent Bestiary — .ai-gated specimens with fully on-chain SVG art.
contract AgentBestiary is ERC721Enumerable, ERC2981, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 5000;
    uint256 public constant MAX_PER_WALLET = 5;
    uint256 public constant FREE_QUOTA = 1000;

    uint256 public immutable price;
    uint256 public immutable revealBlock;
    bytes32 public immutable commitment;
    address payable public immutable treasury;
    IAgentRegistry public immutable registry;

    uint256 public totalMinted;
    uint256 public freeMinted;
    bytes32 public seed;

    mapping(address => uint256) public mintedBy;
    mapping(uint256 => string) internal _handle;

    event Minted(address indexed minter, uint256 indexed tokenId, uint256 paid, string handle);
    event Revealed(bytes32 seed, bool usedBlockhash);

    constructor(
        address registry_,
        address payable treasury_,
        uint256 price_,
        uint256 revealBlock_,
        bytes32 commitment_
    ) ERC721("Agent Bestiary", "BEAST") {
        registry = IAgentRegistry(registry_);
        treasury = treasury_;
        price = price_;
        revealBlock = revealBlock_;
        commitment = commitment_;
        _setDefaultRoyalty(treasury_, 250);
    }

    // ---------------------------------------------------------------- mint

    function quote(address wallet) public view returns (uint256) {
        if (mintedBy[wallet] >= MAX_PER_WALLET) return type(uint256).max;
        if (freeMinted < FREE_QUOTA && mintedBy[wallet] == 0) return 0;
        return price;
    }

    function hasAgentId(address wallet) public view returns (bool) {
        try registry.balanceOf(wallet) returns (uint256 b) {
            return b > 0;
        } catch {
            return false;
        }
    }

    function mint() external payable nonReentrant returns (uint256 tokenId) {
        require(hasAgentId(msg.sender), "No Agent ID");
        require(totalMinted < MAX_SUPPLY, "Sold out");
        require(mintedBy[msg.sender] < MAX_PER_WALLET, "Wallet limit");

        uint256 cost = quote(msg.sender);
        require(msg.value >= cost, "Underpaid");

        if (cost == 0) {
            freeMinted += 1;
        } else {
            (bool toTreasury, ) = treasury.call{value: cost}("");
            require(toTreasury, "Treasury transfer failed");
        }
        if (msg.value > cost) {
            (bool refund, ) = msg.sender.call{value: msg.value - cost}("");
            require(refund, "Refund failed");
        }

        tokenId = ++totalMinted;
        mintedBy[msg.sender] += 1;
        string memory h = registry.handleOf(msg.sender);
        _handle[tokenId] = h;

        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId, cost, h);
    }

    // -------------------------------------------------------------- reveal

    /// Anyone holding the secret can reveal once the target block passed.
    /// If blockhash(revealBlock) already expired (returns 0) the seed falls back
    /// to the secret alone — reported in the event instead of failing silently.
    function reveal(bytes32 secret) external {
        require(seed == bytes32(0), "Already revealed");
        require(block.number > revealBlock, "Too early");
        require(keccak256(abi.encodePacked(secret)) == commitment, "Bad secret");
        bytes32 bh = blockhash(revealBlock);
        seed = keccak256(abi.encodePacked(bh, secret));
        emit Revealed(seed, bh != bytes32(0));
    }

    function revealed() public view returns (bool) {
        return seed != bytes32(0);
    }

    // -------------------------------------------------------------- traits

    function _roll(uint256 tokenId, uint8 slot, uint8 mod) internal view returns (uint8) {
        if (seed == bytes32(0)) return 0;
        return uint8(uint256(keccak256(abi.encodePacked(seed, tokenId, slot))) % mod);
    }

    string[4] internal SPECIES = ["pengu", "moth", "squid", "gecko"];
    string[5] internal EYES = ["dot", "visor", "sleepy", "laser", "monocle"];
    string[5] internal HEAD = ["none", "mohawk", "horns", "antenna", "crown"];
    string[4] internal EXTRA = ["none", "halo", "scarf", "orb"];
    string[5] internal BG = ["void", "dusk", "acid", "ember", "mint"];

    function traits(uint256 tokenId)
        public
        view
        returns (uint8 species, uint8 eyes, uint8 head, uint8 extra, uint8 bg)
    {
        require(tokenId > 0 && tokenId <= totalMinted, "No token");
        species = _roll(tokenId, 1, 4);
        eyes = _roll(tokenId, 2, 5);
        head = _roll(tokenId, 3, 5);
        extra = _roll(tokenId, 4, 4);
        bg = _roll(tokenId, 5, 5);
    }

    function tierOf(uint256 tokenId) public view returns (string memory) {
        require(revealed(), "Sealed");
        (uint8 s, uint8 e, uint8 h, uint8 x, uint8 b) = traits(tokenId);
        uint8 rare;
        if (s == 3) rare++;
        if (e >= 3) rare++;
        if (h >= 3) rare++;
        if (x >= 2) rare++;
        if (b >= 3) rare++;
        if (rare >= 5) return "Legendary";
        if (rare == 4) return "Epic";
        if (rare == 3) return "Rare";
        if (rare == 2) return "Uncommon";
        return "Common";
    }

    function _tierColor(uint256 tokenId) internal view returns (string memory) {
        if (!revealed()) return "#5b6478";
        bytes32 t = keccak256(bytes(tierOf(tokenId)));
        if (t == keccak256("Legendary")) return "#ffd166";
        if (t == keccak256("Epic")) return "#c39bff";
        if (t == keccak256("Rare")) return "#7c9bff";
        if (t == keccak256("Uncommon")) return "#5ce1e6";
        return "#8b95a7";
    }

    // ----------------------------------------------------------------- art
    // Style "Void Specimen": dark spotlight, metallic body, ghost serial,
    // crop marks, tier accent. All pixels come from chain state.

    function _bodySvg(uint8 species) internal pure returns (string memory) {
        if (species == 1) {
            return string.concat(
                '<ellipse cx="512" cy="556" rx="174" ry="196" fill="url(#metal)" stroke="#0a0e18" stroke-width="6"/>',
                '<path d="M360 468 q-188 -70 -214 94 q118 74 214 8 z" fill="url(#metal)" opacity="0.92" stroke="#0a0e18" stroke-width="5"/>',
                '<path d="M664 468 q188 -70 214 94 q-118 74 -214 8 z" fill="url(#metal)" opacity="0.92" stroke="#0a0e18" stroke-width="5"/>',
                '<path d="M432 360 q-28 -72 4 -98 q32 44 28 98" fill="none" stroke="#9aa8c2" stroke-width="7"/>',
                '<path d="M592 360 q28 -72 -4 -98 q-32 44 -28 98" fill="none" stroke="#9aa8c2" stroke-width="7"/>'
            );
        }
        if (species == 2) {
            return string.concat(
                '<path d="M512 300 c92 0 128 96 128 190 c0 96 -58 148 -128 148 c-70 0 -128 -52 -128 -148 c0 -94 36 -190 128 -190 z" fill="url(#metal)" stroke="#0a0e18" stroke-width="6"/>',
                '<path d="M420 640 q-56 66 -34 132 q34 -54 62 -96 z" fill="url(#metal)" opacity="0.85" stroke="#0a0e18" stroke-width="4"/>',
                '<path d="M604 640 q56 66 34 132 q-34 -54 -62 -96 z" fill="url(#metal)" opacity="0.85" stroke="#0a0e18" stroke-width="4"/>',
                '<path d="M470 660 q-18 74 6 122" fill="none" stroke="#9aa8c2" stroke-width="6"/>',
                '<path d="M554 660 q18 74 -6 122" fill="none" stroke="#9aa8c2" stroke-width="6"/>'
            );
        }
        if (species == 3) {
            return string.concat(
                '<path d="M320 616 q-24 -172 192 -172 q216 0 192 172 q-20 96 -192 96 q-172 0 -192 -96 z" fill="url(#metal)" stroke="#0a0e18" stroke-width="6"/>',
                '<path d="M704 656 q96 26 88 118 q-30 -60 -96 -78" fill="url(#metal)" opacity="0.9" stroke="#0a0e18" stroke-width="4"/>',
                '<ellipse cx="368" cy="744" rx="52" ry="18" fill="url(#metal)" stroke="#0a0e18" stroke-width="4"/>',
                '<ellipse cx="656" cy="744" rx="52" ry="18" fill="url(#metal)" stroke="#0a0e18" stroke-width="4"/>'
            );
        }
        return string.concat(
            '<path d="M512 236 c132 0 208 108 208 248 c0 158 -92 268 -208 268 c-116 0 -208 -110 -208 -268 c0 -140 76 -248 208 -248 z" fill="url(#metal)" stroke="#0a0e18" stroke-width="6"/>',
            '<path d="M512 312 c84 0 132 84 132 188 c0 118 -60 192 -132 192 c-72 0 -132 -74 -132 -192 c0 -104 48 -188 132 -188 z" fill="#ffffff" opacity="0.10"/>',
            '<path d="M324 430 q-54 112 -8 220 q40 -94 76 -146 z" fill="url(#metal)" opacity="0.9" stroke="#0a0e18" stroke-width="4"/>',
            '<path d="M700 430 q54 112 8 220 q-40 -94 -76 -146 z" fill="url(#metal)" opacity="0.9" stroke="#0a0e18" stroke-width="4"/>',
            '<path d="M386 744 q-48 10 -60 34 q62 16 106 -8 z" fill="url(#metal)" stroke="#0a0e18" stroke-width="3"/>',
            '<path d="M638 744 q48 10 60 34 q-62 16 -106 -8 z" fill="url(#metal)" stroke="#0a0e18" stroke-width="3"/>'
        );
    }

    function _eyesSvg(uint8 e, string memory accent) internal pure returns (string memory) {
        if (e == 1) {
            return string.concat(
                '<rect x="398" y="452" width="228" height="46" rx="23" fill="#0a0e18"/>',
                '<rect x="420" y="466" width="80" height="14" rx="7" fill="', accent, '" filter="url(#glow)"/>'
            );
        }
        if (e == 2) {
            return string.concat(
                '<path d="M404 462 q30 26 62 0" stroke="#0a0e18" stroke-width="12" fill="none" stroke-linecap="round"/>',
                '<path d="M558 462 q30 26 62 0" stroke="#0a0e18" stroke-width="12" fill="none" stroke-linecap="round"/>'
            );
        }
        if (e == 3) {
            return string.concat(
                '<circle cx="432" cy="470" r="24" fill="', accent, '" filter="url(#glow)"/>',
                '<circle cx="592" cy="470" r="24" fill="', accent, '" filter="url(#glow)"/>',
                '<circle cx="432" cy="470" r="8" fill="#ffffff"/><circle cx="592" cy="470" r="8" fill="#ffffff"/>'
            );
        }
        if (e == 4) {
            return string.concat(
                '<circle cx="432" cy="470" r="34" fill="#0a0e18"/><circle cx="432" cy="470" r="12" fill="', accent, '"/>',
                '<circle cx="592" cy="470" r="34" fill="none" stroke="#0a0e18" stroke-width="8"/>',
                '<circle cx="592" cy="470" r="14" fill="', accent, '" filter="url(#glow)"/>',
                '<line x1="614" y1="500" x2="662" y2="556" stroke="#0a0e18" stroke-width="6"/>'
            );
        }
        return string.concat(
            '<circle cx="432" cy="470" r="28" fill="#0a0e18"/><circle cx="592" cy="470" r="28" fill="#0a0e18"/>',
            '<circle cx="422" cy="460" r="9" fill="#ffffff" opacity="0.95"/>',
            '<circle cx="582" cy="460" r="9" fill="#ffffff" opacity="0.95"/>'
        );
    }

    function _headSvg(uint8 h, string memory accent) internal pure returns (string memory) {
        if (h == 1) return '<path d="M420 250 l26 -58 l28 46 l26 -58 l28 58" fill="none" stroke="#0a0e18" stroke-width="14" stroke-linejoin="round"/>';
        if (h == 2) {
            return string.concat(
                '<path d="M418 262 l-26 -74 l58 30 z" fill="url(#metal)" stroke="#0a0e18" stroke-width="4"/>',
                '<path d="M606 262 l26 -74 l-58 30 z" fill="url(#metal)" stroke="#0a0e18" stroke-width="4"/>'
            );
        }
        if (h == 3) {
            return string.concat(
                '<line x1="512" y1="250" x2="512" y2="164" stroke="#9aa8c2" stroke-width="8"/>',
                '<circle cx="512" cy="152" r="17" fill="', accent, '" filter="url(#glow)"/>'
            );
        }
        if (h == 4) return '<path d="M424 256 l24 -54 l24 34 l24 -54 l24 54 l24 -34 l24 54 z" fill="#0a0e18" stroke="#9aa8c2" stroke-width="3"/>';
        return "";
    }

    function _extraSvg(uint8 x, string memory accent) internal pure returns (string memory) {
        if (x == 1) return string.concat('<ellipse cx="512" cy="176" rx="96" ry="17" fill="none" stroke="', accent, '" stroke-width="9" filter="url(#glow)" opacity="0.9"/>');
        if (x == 2) return '<path d="M370 706 q142 56 284 0 l0 44 q-142 56 -284 0 z" fill="#0a0e18" stroke="#9aa8c2" stroke-width="3"/>';
        if (x == 3) return string.concat('<circle cx="742" cy="606" r="34" fill="', accent, '" opacity="0.85" filter="url(#glow)"/><circle cx="732" cy="596" r="10" fill="#ffffff" opacity="0.8"/>');
        return "";
    }

    function _pad(uint256 tokenId) internal pure returns (string memory) {
        string memory s = tokenId.toString();
        if (tokenId < 10) return string.concat("000", s);
        if (tokenId < 100) return string.concat("00", s);
        if (tokenId < 1000) return string.concat("0", s);
        return s;
    }

    function _bgTop(uint8 b) internal pure returns (string memory) {
        if (b == 1) return "#241a34";
        if (b == 2) return "#16281e";
        if (b == 3) return "#2c1a16";
        if (b == 4) return "#122a28";
        return "#1a2334";
    }

    function _svg(uint256 tokenId) internal view returns (string memory) {
        (uint8 s, uint8 e, uint8 h, uint8 x, uint8 b) = traits(tokenId);
        string memory accent = _tierColor(tokenId);
        string memory serial = _pad(tokenId);

        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">',
            '<defs>',
            '<radialGradient id="spot" cx="0.5" cy="0.36" r="0.66">',
            '<stop offset="0" stop-color="', _bgTop(b), '"/><stop offset="1" stop-color="#04060b"/></radialGradient>',
            '<linearGradient id="metal" x1="0.2" y1="0" x2="0.8" y2="1">',
            '<stop offset="0" stop-color="#eef3fd"/><stop offset="0.45" stop-color="#9aa8c2"/><stop offset="1" stop-color="#48526b"/></linearGradient>',
            '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">',
            '<feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
            '<radialGradient id="vig" cx="0.5" cy="0.5" r="0.78">',
            '<stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/></radialGradient>',
            "</defs>",
            '<rect width="1024" height="1024" fill="url(#spot)"/>',
            '<text x="512" y="700" font-family="monospace" font-size="430" fill="#ffffff" opacity="0.045" text-anchor="middle">',
            serial,
            "</text>",
            _bodySvg(s),
            _eyesSvg(e, accent),
            _headSvg(h, accent),
            _extraSvg(x, accent),
            '<g stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.5" fill="none">',
            '<path d="M64 120 L64 64 L120 64"/><path d="M904 64 L960 64 L960 120"/>',
            '<path d="M960 904 L960 960 L904 960"/><path d="M120 960 L64 960 L64 904"/></g>',
            '<text x="96" y="132" font-family="monospace" font-size="22" letter-spacing="6" fill="#9aa8c2">SPECIMEN / BSC</text>',
            '<text x="928" y="132" font-family="monospace" font-size="22" letter-spacing="4" fill="',
            accent,
            '" text-anchor="end">',
            revealed() ? _upper(tierOf(tokenId)) : "SEALED",
            "</text>",
            '<line x1="96" y1="848" x2="928" y2="848" stroke="#ffffff" stroke-opacity="0.14"/>',
            '<text x="96" y="906" font-family="monospace" font-size="36" fill="#e8eefb">#',
            serial,
            "</text>",
            '<text x="928" y="906" font-family="monospace" font-size="27" fill="',
            accent,
            '" text-anchor="end">@',
            _handle[tokenId],
            "</text>",
            '<text x="96" y="946" font-family="monospace" font-size="18" letter-spacing="3" fill="#6f7c96">',
            _upper(SPECIES[s]), " / ", _upper(EYES[e]), " / ", _upper(HEAD[h]), " / ", _upper(EXTRA[x]),
            "</text>",
            '<rect width="1024" height="1024" fill="url(#vig)"/>',
            "</svg>"
        );
    }

    function _upper(string memory str) internal pure returns (string memory) {
        bytes memory b = bytes(str);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x61 && b[i] <= 0x7a) b[i] = bytes1(uint8(b[i]) - 32);
        }
        return string(b);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId > 0 && tokenId <= totalMinted, "No token");
        (uint8 s, uint8 e, uint8 h, uint8 x, uint8 b) = traits(tokenId);
        string memory json = string.concat(
            '{"name":"Bestiary #', tokenId.toString(),
            '","description":"Agent Bestiary - on-chain specimens owned by .ai Agent IDs. The art is generated by the contract itself.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(_svg(tokenId))), '",',
            '"attributes":[',
            '{"trait_type":"State","value":"', revealed() ? "Revealed" : "Sealed", '"},',
            '{"trait_type":"Tier","value":"', revealed() ? tierOf(tokenId) : "Sealed", '"},',
            '{"trait_type":"Species","value":"', SPECIES[s], '"},',
            '{"trait_type":"Eyes","value":"', EYES[e], '"},',
            '{"trait_type":"Head","value":"', HEAD[h], '"},',
            '{"trait_type":"Extra","value":"', EXTRA[x], '"},',
            '{"trait_type":"Background","value":"', BG[b], '"},',
            '{"trait_type":"Agent","value":"', _handle[tokenId], '"}',
            "]}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 id)
        public
        view
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(id);
    }
}
