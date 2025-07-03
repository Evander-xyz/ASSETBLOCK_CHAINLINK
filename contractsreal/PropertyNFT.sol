// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./PropertyDataConsumer.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


/**
 * @title PropertyNFT
 * @notice NFT contract for minting property tokens with verified data
 */
contract PropertyNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using SafeMath for uint256;


    Counters.Counter private _tokenIdCounter;
    PropertyDataConsumer public propertyDataConsumer;

    // Structure to store NFT metadata
    struct PropertyNFTMetadata {
        uint256 propertyId;
        string title;
        string propertyAddress;
        string price;
        string propertyType;
        string size;
        string bedrooms;
        string bathrooms;
        string image;
        uint256 mintTimestamp;
        address originalMinter;
    }

    // Mapping from token ID to property metadata
    mapping(uint256 => PropertyNFTMetadata) public tokenMetadata;
    
    // Mapping from property ID to token ID (prevent duplicate minting)
    mapping(uint256 => uint256) public propertyToTokenId;
    
    // Mapping to track if a property has been minted
    mapping(uint256 => bool) public propertyMinted;

    // Events
    event PropertyNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed propertyId,
        address indexed to,
        string metadataURI
    );
    
    event PropertyDataRequested(uint256 indexed propertyId, bytes32 requestId);

    constructor(address _propertyDataConsumer) Ownable(msg.sender) ERC721("PropertyNFT", "PROP") {
        propertyDataConsumer = PropertyDataConsumer(_propertyDataConsumer);
    }

    /**
     * @notice Request property data and mint NFT
     * @param propertyId The ID of the property to mint
     */
    function requestAndMintProperty(uint256 propertyId) external {
        require(!propertyMinted[propertyId], "Property already minted");
        
        // Request property data from Chainlink Functions
        bytes32 requestId = propertyDataConsumer.requestPropertyData(propertyId);
        emit PropertyDataRequested(propertyId, requestId);
        
        // Mark as pending (you might want to implement a more sophisticated state management)
        propertyMinted[propertyId] = true;
    }

    /**
     * @notice Mint NFT with verified property data
     * @param to Address to mint the token to
     * @param propertyId The property ID that was verified
     * @param title Property title
     * @param propertyAddress Property address
     * @param price Property price
     * @param propertyType Property type
     * @param size Property size
     * @param bedrooms Number of bedrooms
     * @param bathrooms Number of bathrooms
     * @param image Property image URL
     */
    function mintPropertyNFT(
        address to,
        uint256 propertyId,
        string memory title,
        string memory propertyAddress,
        string memory price,
        string memory propertyType,
        string memory size,
        string memory bedrooms,
        string memory bathrooms,
        string memory image
    ) public {
        require(!propertyMinted[propertyId] || msg.sender == owner(), "Property already minted or unauthorized");
        
        // Verify that property data exists in the consumer contract
        PropertyDataConsumer.PropertyData memory propertyData = propertyDataConsumer.getPropertyData(Strings.toString(propertyId));
        require(propertyData.exists || msg.sender == owner(), "Property data not verified");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Store metadata
        tokenMetadata[tokenId] = PropertyNFTMetadata({
            propertyId: propertyId,
            title: title,
            propertyAddress: propertyAddress,
            price: price,
            propertyType: propertyType,
            size: size,
            bedrooms: bedrooms,
            bathrooms: bathrooms,
            image: image,
            mintTimestamp: block.timestamp,
            originalMinter: to
        });

        // Map property ID to token ID
        propertyToTokenId[propertyId] = tokenId;
        propertyMinted[propertyId] = true;

        // Mint the token
        _safeMint(to, tokenId);

        // Generate and set token URI
        string memory tokenURI = _generateTokenURI(tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit PropertyNFTMinted(tokenId, propertyId, to, tokenURI);
    }

    /**
     * @notice Generate token URI with metadata
     * @param tokenId The token ID
     */
    function _generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        PropertyNFTMetadata memory metadata = tokenMetadata[tokenId];
        
        // Create JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name": "Property #', tokenId.toString(), '",',
            '"description": "Verified Real Estate Property NFT",',
            '"image": "', metadata.image, '",',
            '"attributes": [',
                '{"trait_type": "Property ID", "value": "', metadata.propertyId, '"},',
                '{"trait_type": "Title", "value": "', metadata.title, '"},',
                '{"trait_type": "Address", "value": "', metadata.propertyAddress, '"},',
                '{"trait_type": "Price", "value": "', metadata.price, '"},',
                '{"trait_type": "Type", "value": "', metadata.propertyType, '"},',
                '{"trait_type": "Size", "value": "', metadata.size, '"},',
                '{"trait_type": "Bedrooms", "value": "', metadata.bedrooms, '"},',
                '{"trait_type": "Bathrooms", "value": "', metadata.bathrooms, '"},',
                '{"trait_type": "Mint Timestamp", "value": ', Strings.toString(metadata.mintTimestamp), '}',
            ']}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", _base64Encode(bytes(json))));
    }

    /**
     * @notice Get property metadata by token ID
     * @param tokenId The token ID
     */
     //this ia an update by me,  line 175
    

   

    function getPropertyMetadata(uint256 tokenId) external view returns (PropertyNFTMetadata memory) {
        require(isPropertyMinted(tokenId), "Token does not exist");
        return tokenMetadata[tokenId];
    }

    /**
     * @notice Get token ID by property ID
     * @param propertyId The property ID
     */
    function getTokenIdByPropertyId(uint256 propertyId) external view returns (uint256) {
        require(propertyMinted[propertyId], "Property not minted");
        return propertyToTokenId[propertyId];
    }

    /**
     * @notice Check if property is already minted
     * @param propertyId The property ID
     */
    function isPropertyMinted(uint256 propertyId) public  view returns (bool) {
        return propertyMinted[propertyId];
    }

    /**
     * @notice Get total number of minted tokens
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @notice Update property data consumer contract (only owner)
     * @param _propertyDataConsumer New consumer contract address
     */
    function updatePropertyDataConsumer(address _propertyDataConsumer) external onlyOwner {
        propertyDataConsumer = PropertyDataConsumer(_propertyDataConsumer);
    }

    /**
     * @notice Emergency mint function (only owner)
     */
    function emergencyMint(
        address to,
        string memory propertyId,
        string memory title,
        string memory propertyAddress,
        string memory price,
        string memory propertyType,
        string memory size,
        string memory bedrooms,
        string memory bathrooms,
        string memory image
    ) external onlyOwner {
        mintPropertyNFT(to, Strings.parseUint(propertyId), title, propertyAddress, price, propertyType, size, bedrooms, bathrooms, image);
    }

    // Base64 encoding function
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        
        assembly {
            let tablePtr := add(table, 1)
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)
            
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr( 6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(        input,  0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            
            mstore(result, encodedLen)
        }
        
        return result;
    }

 

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}