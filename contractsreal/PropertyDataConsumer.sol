// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PropertyDataConsumer
 * @notice Contract to fetch property data using Chainlink Functions
 */
contract PropertyDataConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // State variables to store the last request ID and result
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;
    
    // Property data structure
    struct PropertyData {
        uint256 id;
        string title;
        string propertyAddress;
        string price;
        string propertyType;
        string size;
        string bedrooms;
        string bathrooms;
        string image;
        bool exists;
    }
    
    // Mapping to store property data by property ID
    mapping(string => PropertyData) public properties;
    
    // Mapping to store request ID to property ID
    mapping(bytes32 => string) public requestToPropertyId;
    
    // Events
    event PropertyDataRequested(bytes32 indexed requestId, string propertyId);
    event PropertyDataReceived(bytes32 indexed requestId, string propertyId);
    event PropertyDataError(bytes32 indexed requestId, bytes error);

    // Chainlink Functions configuration for Polygon Mumbai
    // notr:i swithed to sepolia Eth because that is what i  am using for the test net
    address router = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    bytes32 donID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;
    uint32 gasLimit = 300000;
    uint64 subscriptionId = 5188; // Set this after creating subscription

    // JavaScript source code for Chainlink Functions
    string source = 
        "const propertyId = args[0];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "  url: `https://685bc54189952852c2dae926.mockapi.io/PROPERTIES/PROPERTIES/${propertyId}`"
        "});"
        "if (apiResponse.error) {"
        "  throw Error('Request failed');"
        "}"
        "const { data } = apiResponse;"
        "return Functions.encodeString("
        "  JSON.stringify({"
        "    id: data.id || 0,"
        "    title: data.title || '',"
        "    address: data.address || '',"
        "    price: data.price || '',"
        "    type: data.type || '',"
        "    size: data.size || '',"
        "    bedrooms: data.bedrooms || '',"
        "    bathrooms: data.bathrooms || '',"
        "    image: data.image || ''"
        "  })"
        ");";

    constructor(uint64 _subscriptionId) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Send a request to fetch property data
     * @param propertyId The ID of the property to fetch
     */
    function requestPropertyData(uint256 propertyId) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        
        string[] memory args = new string[](1);
        args[0] = Strings.toString(propertyId);
        req.setArgs(args);

        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );
        
        requestToPropertyId[s_lastRequestId] = Strings.toString(propertyId);
        emit PropertyDataRequested(s_lastRequestId, Strings.toString(propertyId));
        
        return s_lastRequestId;
    }

    /**
     * @notice Callback function for Chainlink Functions response
     * @param requestId The ID of the request
     * @param response The response from the API
     * @param err Any error that occurred
     */
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        if (err.length > 0) {
            s_lastError = err;
            emit PropertyDataError(requestId, err);
            return;
        }
        
        s_lastResponse = response;
        string memory propertyId = requestToPropertyId[requestId];
        
        // Parse the JSON response
        string memory jsonString = string(response);
        _parseAndStorePropertyData(propertyId, jsonString);
        
        emit PropertyDataReceived(requestId, propertyId);
    }

    /**
     * @notice Parse JSON response and store property data
     * @param propertyId The property ID
     * @param jsonData The JSON data as string
     */
    function _parseAndStorePropertyData(string memory propertyId, string memory jsonData) internal {
        // Note: In a production environment, you would use a JSON parsing library
        // For this example, we'll store the raw JSON and parse it off-chain
        // or use a more sophisticated parsing method
        //in my debugging i removed this argument "string memory jsonData" form my "_parseAndStorePropertyData"
        
        properties[propertyId] = PropertyData({
            id: Strings.parseUint(propertyId),
            title: "",
            propertyAddress: "",
            price: "",
            propertyType: "",
            size: "",
            bedrooms: "",
            bathrooms: "",
            image: "",
            exists: true
        });
        
        // Store the raw JSON data for parsing in the frontend
        // In production, implement proper JSON parsing
    }

    /**
     * @notice Get property data by ID
     * @param propertyId The property ID
     */
    function getPropertyData(string memory propertyId) external view returns (PropertyData memory) {
        return properties[propertyId];
    }

    /**
     * @notice Check if property data exists
     * @param propertyId The property ID
     */
    function propertyExists(string memory propertyId) external view returns (bool) {
        return properties[propertyId].exists;
    }

    /**
     * @notice Update subscription ID (only owner)
     * @param _subscriptionId New subscription ID
     */
    function updateSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Get the raw response data
     */
    function getLastResponse() external view returns (bytes memory) {
        return s_lastResponse;
    }

    /**
     * @notice Get the last error
     */
    function getLastError() external view returns (bytes memory) {
        return s_lastError;
    }
}