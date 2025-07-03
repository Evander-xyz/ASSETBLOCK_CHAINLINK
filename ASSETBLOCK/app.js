// Global variables
let web3;
let userAccount;

let propertyNFTContract;
let propertyDataConsumerContract;
//patched ^
//for things to fix...remember to check lines :152, 245, 292, 304,
//i also added an update to lines 316 ,322
const API_URL = 'https://685bc54189952852c2dae926.mockapi.io/PROPERTIES/PROPERTIES';

// Contract addresses (update these after deployment)
const PROPERTY_NFT_ADDRESS = '0x602d107EC172978e20eA89675dc22CD58a7A6Bda';
const PROPERTY_DATA_CONSUMER_ADDRESS = '0xF69ff491A125a576dee83056415F248b18F1bCfb';

// Contract ABIs (add your deployed contract ABIs here)
export const PROPERTY_NFT_ABI = [
    // Add your PropertyNFT contract ABI here after compilation
    {
        "inputs": [{"name": "to", "type": "address"}, {"name": "propertyId", "type": "string"}, {"name": "title", "type": "string"}, {"name": "propertyAddress", "type": "string"}, {"name": "price", "type": "string"}, {"name": "propertyType", "type": "string"}, {"name": "size", "type": "string"}, {"name": "bedrooms", "type": "string"}, {"name": "bathrooms", "type": "string"}, {"name": "image", "type": "string"}],
        "name": "mintPropertyNFT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "propertyId", "type": "string"}],
        "name": "requestAndMintProperty",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "propertyId", "type": "string"}],
        "name": "isPropertyMinted",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

export const PROPERTY_DATA_CONSUMER_ABI = [
    
    // Add your PropertyDataConsumer contract ABI here after compilation
    {
        "inputs": [{"name": "propertyId", "type": "string"}],
        "name": "requestPropertyData",
        "outputs": [{"name": "requestId", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "propertyId", "type": "string"}],
        "name": "getPropertyData",
        "outputs": [{"name": "", "type": "tuple", "components": [{"name": "id", "type": "string"}, {"name": "title", "type": "string"}, {"name": "propertyAddress", "type": "string"}, {"name": "price", "type": "string"}, {"name": "propertyType", "type": "string"}, {"name": "size", "type": "string"}, {"name": "bedrooms", "type": "string"}, {"name": "bathrooms", "type": "string"}, {"name": "image", "type": "string"}, {"name": "exists", "type": "bool"}]}],
        "stateMutability": "view",
        "type": "function"
    }
];


// DOM elements
const connectWalletBtn = document.getElementById('connectWallet');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const propertyResults = document.getElementById('propertyResults');
const loading = document.getElementById('loading');

// Event listeners
document.addEventListener('DOMContentLoaded', init);
connectWalletBtn.addEventListener('click', connectWallet);
searchBtn.addEventListener('click', searchProperties);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchProperties();
    }
});

// Initialize the application
function init() {
    checkWalletConnection();
    loadAllProperties();
}

// Check if MetaMask is already connected
async function checkWalletConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                userAccount = accounts[0];
                updateWalletUI();
            }
        } catch (error) {
            console.error('Error checking wallet connection:', error);
        }
    }
}
// the part bellow is an update

// Initialize Web3 and contracts
async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        
        // Initialize contracts
        if (PROPERTY_NFT_ADDRESS !== 'YOUR_PROPERTY_NFT_CONTRACT_ADDRESS') {
            propertyNFTContract = new web3.eth.Contract(PROPERTY_NFT_ABI, PROPERTY_NFT_ADDRESS);
        }
        
        if (PROPERTY_DATA_CONSUMER_ADDRESS !== 'YOUR_PROPERTY_DATA_CONSUMER_ADDRESS') {
            propertyDataConsumerContract = new web3.eth.Contract(PROPERTY_DATA_CONSUMER_ABI, PROPERTY_DATA_CONSUMER_ADDRESS);
        }
    }
}
// Connect to MetaMask wallet
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask is not installed. Please install MetaMask to use this feature.');
        return;
    }

    try {
        connectWalletBtn.textContent = 'Connecting...';
        connectWalletBtn.disabled = true;

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        userAccount = accounts[0];
        updateWalletUI();
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                userAccount = null;
                updateWalletUI();
            } else {
                userAccount = accounts[0];
                updateWalletUI();
            }
        });

    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
        connectWalletBtn.textContent = 'Connect MetaMask';
        connectWalletBtn.disabled = false;
    }
}
// this bellow part is also updated...needs to be debugged if it gives issue pls delete
 // Listen for network changes
 
//ends here
 

// Update wallet UI
function updateWalletUI() {
    if (userAccount) {
        connectWalletBtn.textContent = 'Connected';
        connectWalletBtn.disabled = true;
        walletAddress.textContent = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;
        walletInfo.style.display = 'block';
    } else {
        connectWalletBtn.textContent = 'Connect MetaMask';
        connectWalletBtn.disabled = false;
        walletInfo.style.display = 'none';
    }
}

// Load all properties on page load
async function loadAllProperties() {
    showLoading(true);
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch properties');
        }
        const properties = await response.json();
        displayProperties(properties);
    } catch (error) {
        console.error('Error loading properties:', error);
        showError('Failed to load properties. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Search properties by ID or address
async function searchProperties() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        loadAllProperties();
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch properties');
        }
        const properties = await response.json();
        
        const filteredProperties = properties.filter(property => 
            property.id.toString().toLowerCase().includes(searchTerm) ||
            (property.address && property.address.toLowerCase().includes(searchTerm))
        );
        
        displayProperties(filteredProperties);
        
        if (filteredProperties.length === 0) {
            showNoResults();
        }
    } catch (error) {
        console.error('Error searching properties:', error);
        showError('Failed to search properties. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Display properties in cards
function displayProperties(properties) {
    propertyResults.innerHTML = '';
    
    if (properties.length === 0) {
        showNoResults();
        return;
    }

    properties.forEach(property => {
        const card = createPropertyCard(property);
        propertyResults.appendChild(card);
    });
}

// Create individual property card
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';
    
    //this part is an update 
    // Check if property is already minted
    
    //the update ends here if error delete
    
    // Format price
    const price = property.valuation ? formatPrice(property.valuation) : 'Price not available';
    
    // Format property details
    const size = property.squareft || 'N/A';
    const bedrooms = property.bedrooms || 'N/A';
    const bathrooms = property.bedrooms || 'N/A';
    const type = property.type || 'Property';
    console.log(JSON.stringify(property))
    
    card.innerHTML = `
        <img src="${property.img || 'https://via.placeholder.com/350x200/f8f9fa/6c757d?text=Property+Image'}" 
             alt="Property ${ property.id }" 
             class="property-image"
             onerror="this.src='https://via.placeholder.com/350x200/f8f9fa/6c757d?text=No+Image'">
        
        <div class="property-content">
            <div class="property-id">ID: ${property.id}</div>
            <h3 class="property-title">${property.title || `${type} #${property.id}`}</h3>
            <p class="property-address">${property.address || 'Address not provided'}</p>
            
            <div class="property-details">
                <div class="detail-item">
                    <div class="detail-label">Size</div>
                    <div class="detail-value">${property.squareft}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Bedrooms</div>
                    <div class="detail-value">${bedrooms}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Bathrooms</div>
                    <div class="detail-value">${bathrooms}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Type</div>
                    <div class="detail-value">${type}</div>
                </div>
            </div>
            
            <div class="property-price">${price}</div>

        //this button also needs to be updated
            <button class="mint-btn" onclick="mintNFT('${property.id}', '${property.title || `Property #${property.id}`}')">
                 Mint Property
            </button>
        //ends here
        
        </div> 
    `;
    
    return card;
}

// Format price for display
function formatPrice(price) {
    if (typeof price === 'number') {
        return `$${price.toLocaleString()}`;
    }
    if (typeof price === 'string' && price.includes('$')) {
        return price;
    }
    return `$${price}`;
}

// Mint NFT functionality
//i added an update....before the update the only things mintNFT was taking in was (propertyId, propertyTitle)
async function mintNFT(propertyId, propertyTitle, propertyAddress, price, propertyType, size, bedrooms, bathrooms, image) {
    if (!userAccount) {
        alert('Please connect your MetaMask wallet first.');
        return;
    }
    //this is also an update
    if (!propertyNFTContract) {
        alert('Smart contracts not initialized. Please check contract addresses.');
        return;
    }
    //ends here
    /*try {
        // Show confirmation dialog
        const confirmed = confirm(`Do you want to mint "${propertyTitle}" as an NFT?`);
        if (!confirmed) return;

        // Simulate NFT minting process
        const mintButton = event.target;
        const originalText = mintButton.textContent;
        
        mintButton.textContent = 'Minting...';
        mintButton.disabled = true;

        // Simulate blockchain transaction delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In a real application, you would:
        // 1. Deploy or interact with an NFT smart contract
        // 2. Call the contract's mint function
        // 3. Handle the transaction response

        // For demo purposes, we'll simulate a successful mint
        const transactionHash = generateMockTxHash();
        
        alert(`NFT minted successfully!\nProperty: ${propertyTitle}\nTransaction Hash: ${transactionHash}`);
        
        mintButton.textContent = '✅ Minted';
        mintButton.style.background = '#27ae60';
        
        // Reset button after 3 seconds
        setTimeout(() => {
            mintButton.textContent = originalText;
            mintButton.disabled = false;
            mintButton.style.background = '';
        }, 3000);

    } catch (error) {
        console.error('Error minting NFT:', error);
        alert('Failed to mint NFT. Please try again.');
        
        // Reset button on error
        const mintButton = event.target;
        mintButton.textContent = '🎨 Mint as NFT';
        mintButton.disabled = false;
    }
    */
   try {
        // Show confirmation dialog
        const confirmed = confirm(`Do you want to mint "${propertyTitle}" as an NFT?\n\nThis will:\n1. Fetch verified property data using Chainlink Functions\n2. Mint an NFT with the verified data\n3. Require gas fees for the transactions`);
        if (!confirmed) return;

        const mintButton = event.target;
        const originalText = mintButton.textContent;
        
        mintButton.textContent = 'Requesting Data...';
        mintButton.disabled = true;

        // Step 1: Request property data via Chainlink Functions (if using the consumer contract)
        if (propertyDataConsumerContract) {
            try {
                console.log('Requesting property data via Chainlink Functions...');
                const gasEstimate = await propertyDataConsumerContract.methods
                    .requestPropertyData(propertyId.toString())
                    .estimateGas({ from: userAccount });

                const requestTx = await propertyDataConsumerContract.methods
                    .requestPropertyData(propertyId.toString())
                    .send({ 
                        from: userAccount,
                        gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
                    });

                console.log('Property data request submitted:', requestTx.transactionHash);
                
                mintButton.textContent = 'Data Requested, Waiting...';
                
                // Wait for Chainlink Functions to fulfill the request
                // In production, you'd implement proper event listening
                await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
                
            } catch (error) {
                console.error('Error requesting property data:', error);
                // Continue with direct minting if Chainlink Functions fails
                console.log('Proceeding with direct minting...');
            }
        }

        // Step 2: Mint the NFT
        mintButton.textContent = 'Minting NFT...';
        
        console.log('Minting NFT with data:', {
            propertyId,
            propertyTitle,
            propertyAddress,
            price,
            propertyType,
            size,
            bedrooms,
            bathrooms,
            image
        });

        // Estimate gas for minting
        const mintGasEstimate = await propertyNFTContract.methods
            .mintPropertyNFT(
                userAccount,
                propertyId.toString(),
                propertyTitle || '',
                propertyAddress || '',
                price || '',
                propertyType || '',
                size || '',
                bedrooms || '',
                bathrooms || '',
                image || ''
            )
            .estimateGas({ from: userAccount });

        // Execute the mint transaction
        const mintTx = await propertyNFTContract.methods
            .mintPropertyNFT(
                userAccount,
                propertyId.toString(),
                propertyTitle || '',
                propertyAddress || '',
                price || '',
                propertyType || '',
                size || '',
                bedrooms || '',
                bathrooms || '',
                image || ''
            )
            .send({ 
                from: userAccount,
                gas: Math.floor(mintGasEstimate * 1.2) // Add 20% buffer
            });

        console.log('NFT minted successfully:', mintTx.transactionHash);
        
        // Show success message
        alert(`NFT minted successfully!\n\nProperty: ${propertyTitle}\nTransaction Hash: ${mintTx.transactionHash}\n\nView on blockchain explorer: https://polygonscan.com/tx/${mintTx.transactionHash}`);
        
        mintButton.textContent = '✅ Minted Successfully';
        mintButton.style.background = '#27ae60';
        mintButton.disabled = true;

        // Refresh the properties to update mint status
        setTimeout(() => {
            if (searchInput.value.trim()) {
                searchProperties();
            } else {
                loadAllProperties();
            }
        }, 2000);

    } catch (error) {
        console.error('Error minting NFT:', error);
        
        let errorMessage = 'Failed to mint NFT. ';
        
        if (error.message.includes('user rejected')) {
            errorMessage += 'Transaction was cancelled by user.';
        } else if (error.message.includes('insufficient funds')) {
            errorMessage += 'Insufficient funds for gas fees.';
        } else if (error.message.includes('already minted')) {
            errorMessage += 'This property has already been minted.';
        } else {
            errorMessage += 'Please try again or check the console for details.';
        }
        
        alert(errorMessage);
        
        // Reset button on error
        const mintButton = event.target;
        mintButton.textContent = '🎨 Mint as NFT';
        mintButton.disabled = false;
        mintButton.style.background = '';
    }
}

// Function to check transaction status
async function checkTransactionStatus(txHash) {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        return receipt;
    } catch (error) {
        console.error('Error checking transaction status:', error);
        return null;
    }
}

// Function to get user's minted NFTs
async function getUserNFTs() {
    if (!propertyNFTContract || !userAccount) {
        return [];
    }

    try {
        // This would require implementing a function in your contract to get user's tokens
        // For now, we'll return an empty array
        return [];
    } catch (error) {
        console.error('Error fetching user NFTs:', error);
        return [];
    }
}

// Show/hide loading spinner
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// Show no results message
function showNoResults() {
    propertyResults.innerHTML = `
        <div class="no-results">
            <h3>No properties found</h3>
            <p>Try searching with different keywords or browse all properties.</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    propertyResults.innerHTML = `
        <div class="error-message">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Utility function to add Web3 library if not present
function loadWeb3() {
    if (typeof Web3 === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/web3/1.8.0/web3.min.js';
        script.onload = () => {
            console.log('Web3 library loaded');
        };
        document.head.appendChild(script);
    }
}

// Load Web3 on initialization
loadWeb3();
// }

// Generate mock transaction hash for demo
function generateMockTxHash() {
    return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Show/hide loading spinner
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// Show no results message
function showNoResults() {
    propertyResults.innerHTML = `
        <div class="no-results">
            <h3>No properties found</h3>
            <p>Try searching with different keywords or browse all properties.</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    propertyResults.innerHTML = `
        <div class="error-message">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Handle network changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}

//from line 329 to the end don't forget to replace the simulation withe code bellow
//note:the reason why my searchbar isn"t working right now is because of this part bellow, if you want to fix just delete
/*try {
        // Show confirmation dialog
        const confirmed = confirm(`Do you want to mint "${propertyTitle}" as an NFT?\n\nThis will:\n1. Fetch verified property data using Chainlink Functions\n2. Mint an NFT with the verified data\n3. Require gas fees for the transactions`);
        if (!confirmed) return;

        const mintButton = event.target;
        const originalText = mintButton.textContent;
        
        mintButton.textContent = 'Requesting Data...';
        mintButton.disabled = true;

        // Step 1: Request property data via Chainlink Functions (if using the consumer contract)
        if (propertyDataConsumerContract) {
            try {
                console.log('Requesting property data via Chainlink Functions...');
                const gasEstimate = await propertyDataConsumerContract.methods
                    .requestPropertyData(propertyId.toString())
                    .estimateGas({ from: userAccount });

                const requestTx = await propertyDataConsumerContract.methods
                    .requestPropertyData(propertyId.toString())
                    .send({ 
                        from: userAccount,
                        gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
                    });

                console.log('Property data request submitted:', requestTx.transactionHash);
                
                mintButton.textContent = 'Data Requested, Waiting...';
                
                // Wait for Chainlink Functions to fulfill the request
                // In production, you'd implement proper event listening
                await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
                
            } catch (error) {
                console.error('Error requesting property data:', error);
                // Continue with direct minting if Chainlink Functions fails
                console.log('Proceeding with direct minting...');
            }
        }

        // Step 2: Mint the NFT
        mintButton.textContent = 'Minting NFT...';
        
        console.log('Minting NFT with data:', {
            propertyId,
            propertyTitle,
            propertyAddress,
            price,
            propertyType,
            size,
            bedrooms,
            bathrooms,
            image
        });

        // Estimate gas for minting
        const mintGasEstimate = await propertyNFTContract.methods
            .mintPropertyNFT(
                userAccount,
                propertyId.toString(),
                propertyTitle || '',
                propertyAddress || '',
                price || '',
                propertyType || '',
                size || '',
                bedrooms || '',
                bathrooms || '',
                image || ''
            )
            .estimateGas({ from: userAccount });

        // Execute the mint transaction
        const mintTx = await propertyNFTContract.methods
            .mintPropertyNFT(
                userAccount,
                propertyId.toString(),
                propertyTitle || '',
                propertyAddress || '',
                price || '',
                propertyType || '',
                size || '',
                bedrooms || '',
                bathrooms || '',
                image || ''
            )
            .send({ 
                from: userAccount,
                gas: Math.floor(mintGasEstimate * 1.2) // Add 20% buffer
            });

        console.log('NFT minted successfully:', mintTx.transactionHash);
        
        // Show success message
        alert(`NFT minted successfully!\n\nProperty: ${propertyTitle}\nTransaction Hash: ${mintTx.transactionHash}\n\nView on blockchain explorer: https://polygonscan.com/tx/${mintTx.transactionHash}`);
        
        mintButton.textContent = '✅ Minted Successfully';
        mintButton.style.background = '#27ae60';
        mintButton.disabled = true;

        // Refresh the properties to update mint status
        setTimeout(() => {
            if (searchInput.value.trim()) {
                searchProperties();
            } else {
                loadAllProperties();
            }
        }, 2000);

    } catch (error) {
        console.error('Error minting NFT:', error);
        
        let errorMessage = 'Failed to mint NFT. ';
        
        if (error.message.includes('user rejected')) {
            errorMessage += 'Transaction was cancelled by user.';
        } else if (error.message.includes('insufficient funds')) {
            errorMessage += 'Insufficient funds for gas fees.';
        } else if (error.message.includes('already minted')) {
            errorMessage += 'This property has already been minted.';
        } else {
            errorMessage += 'Please try again or check the console for details.';
        }
        
        alert(errorMessage);
        
        // Reset button on error
        const mintButton = event.target;
        mintButton.textContent = '🎨 Mint as NFT';
        mintButton.disabled = false;
        mintButton.style.background = '';
    }
}

// Function to check transaction status
async function checkTransactionStatus(txHash) {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        return receipt;
    } catch (error) {
        console.error('Error checking transaction status:', error);
        return null;
    }
}

// Function to get user's minted NFTs
async function getUserNFTs() {
    if (!propertyNFTContract || !userAccount) {
        return [];
    }

    try {
        // This would require implementing a function in your contract to get user's tokens
        // For now, we'll return an empty array
        return [];
    } catch (error) {
        console.error('Error fetching user NFTs:', error);
        return [];
    }
}

// Show/hide loading spinner
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// Show no results message
function showNoResults() {
    propertyResults.innerHTML = `
        <div class="no-results">
            <h3>No properties found</h3>
            <p>Try searching with different keywords or browse all properties.</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    propertyResults.innerHTML = `
        <div class="error-message">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Utility function to add Web3 library if not present
function loadWeb3() {
    if (typeof Web3 === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/web3/1.8.0/web3.min.js';
        script.onload = () => {
            console.log('Web3 library loaded');
        };
        document.head.appendChild(script);
    }
}

// Load Web3 on initialization
loadWeb3();

*/