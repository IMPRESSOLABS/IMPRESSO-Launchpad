// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract ImpressoMoca is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    /*
     * @title Impresso Token with Commission System
     * @notice This contract implements an ERC20 token with a commission system
     * @dev Inherits from OpenZeppelin contracts and implements UUPS proxy pattern
     */

    bool private _commissionEnabled;
    address[] public _commissionAddresses;
    uint256 public _maxTotalSupply;
    bool private _useMaxTotalSupply;
    mapping(address => bool) private _commissionExempt;

    // Governance-related variables
    address public governanceContract;
    mapping(bytes32 => bool) private _proposalExecuted;
    mapping(bytes32 => mapping(address => bool)) private _proposalVotes;

    // roles
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Minimum commission percentage allowed
    uint8 private constant MIN_COMMISSION_PERCENTAGE = 1;

    event CommissionToggled(bool enabled);
    event CommissionPercentagesSet(address[] addresses, uint256[] percentages);
    event RoleGranted(address indexed user, bytes32 indexed role);
    event CommissionExemptionSet(address indexed account, bool exempt);
    event GovernanceContractSet(address indexed governanceContract);
    event ProposalCreated(bytes32 indexed proposalId, address indexed proposer, bytes data);
    event ProposalVoted(bytes32 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(bytes32 indexed proposalId);

    // map (commissionerAddress => amount)
    mapping(address => uint256) private _commissionPercentages;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // assume that the commission will be enabled by default
        _commissionEnabled = true;
        _disableInitializers();
    }

    /* ##################   ######################  ################## */
    /* ##################   OPENZEPPELIN FUNCTIONS  ################## */
    /* ##################   ######################  ################## */
    function initialize(
        string memory name,
        string memory symbol,
        uint256 maxTotalSupply,
        bool useMaxTotalSupply,
        address owner
    ) public initializer {
        require(owner != address(0), "Owner cannot be zero address");

        _maxTotalSupply = maxTotalSupply;
        _useMaxTotalSupply = useMaxTotalSupply;

        // assume that the commission will be enabled by default
        _commissionEnabled = true;

        __ERC20_init(name, symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
        _grantRole(BURNER_ROLE, owner);
    }

    /**
     * @notice Sets the governance contract address
     * @param _governanceContract Address of the governance contract
     * @dev This can only be called by the admin role and should be set once governance is deployed
     */
    function setGovernanceContract(address _governanceContract) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        whenNotPaused 
    {
        require(_governanceContract != address(0), "Governance cannot be zero address");
        require(governanceContract == address(0), "Governance already set");
        
        governanceContract = _governanceContract;
        emit GovernanceContractSet(_governanceContract);
    }

    function grantRoleForAddress(
        address user,
        string memory role
    ) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        // Convert the string role to bytes32
        bytes32 roleHash = keccak256(abi.encodePacked(role));

        // Check if the role is one of the predefined roles
        require(
            roleHash == BURNER_ROLE ||
                roleHash == PAUSER_ROLE ||
                roleHash == MINTER_ROLE ||
                roleHash == UPGRADER_ROLE,
            "Invalid role"
        );

        _grantRole(roleHash, user);
        emit RoleGranted(user, roleHash);
    }

    function burn(
        address account,
        uint256 amount
    ) public whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(account != address(0), "Account cannot be zero address");
        
        // Check if caller is authorized
        bool isAuthorized = hasRole(BURNER_ROLE, msg.sender) || 
                           (governanceContract != address(0) && msg.sender == governanceContract);
        
        require(isAuthorized, "Not authorized");
        
        _burn(account, amount);
    }

    function pause() public whenNotPaused {
        // Check if caller is authorized
        bool isAuthorized = hasRole(PAUSER_ROLE, msg.sender) || 
                           (governanceContract != address(0) && msg.sender == governanceContract);
        
        require(isAuthorized, "Not authorized");
        
        _pause();
    }

    function unpause() public {
        // Check if caller is authorized
        bool isAuthorized = hasRole(PAUSER_ROLE, msg.sender) || 
                           (governanceContract != address(0) && msg.sender == governanceContract);
        
        require(isAuthorized, "Not authorized");
        
        _unpause();
    }

    function mint(
        address to,
        uint256 amount
    ) public whenNotPaused nonReentrant {
        require(to != address(0), "Mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Check if caller is authorized
        bool isAuthorized = hasRole(MINTER_ROLE, msg.sender) || 
                           (governanceContract != address(0) && msg.sender == governanceContract);
        
        require(isAuthorized, "Not authorized");
        
        if (_useMaxTotalSupply) {
            require(
                totalSupply() + amount <= _maxTotalSupply,
                "Exceeds maximum total supply"
            );
        }
        _mint(to, amount);
    }

    function _authorizeUpgrade(
        address /* newImplementation */
    ) internal view override {
        // Check if caller is authorized
        bool isAuthorized = hasRole(UPGRADER_ROLE, _msgSender()) || 
                           (governanceContract != address(0) && _msgSender() == governanceContract);
        
        require(isAuthorized, "Not authorized to upgrade");
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20PausableUpgradeable, ERC20Upgradeable) {
        super._beforeTokenTransfer(from, to, amount); // Call parent implementation
    }

    /* ##################   ######################  ################## */
    /* ##################         COMMISSION        ################## */
    /* ##################   ######################  ################## */

    /**
     * @notice Toggle enable or disable commission
     * @param enable Boolean to enable or disable commission
     */
    function toggleCommission(
        bool enable
    ) public whenNotPaused {
        // Check if caller is authorized
        bool isAuthorized = hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || 
                           (governanceContract != address(0) && msg.sender == governanceContract);
        
        require(isAuthorized, "Not authorized");
        
        _commissionEnabled = enable;
        emit CommissionToggled(enable);
    }

    function getCommissionEnabled() public view whenNotPaused returns (bool) {
        return _commissionEnabled;
    }

    /*
     * @notice Sets commission percentages for multiple addresses
     * @param addrs Array of commissioner addresses
     * @param percentages Array of commission percentages
     * @dev Each percentage must be between 0 and 100
     * @dev Arrays must be of equal length and total commissioners cannot exceed 3
     */
    function setCommissionPercentages(
        address[] memory addrs,
        uint256[] memory percentages
    ) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(addrs.length == percentages.length, "Arrays length mismatch");
        require(
            addrs.length + _commissionAddresses.length <= 3,
            "Exceeds maximum number of commission addresses"
        );

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            totalPercentage += percentages[i];
        }
        // Add existing percentages to total
        for (uint256 i = 0; i < _commissionAddresses.length; i++) {
            totalPercentage += _commissionPercentages[_commissionAddresses[i]];
        }
        require(
            totalPercentage <= 100,
            "Total commission percentage exceeds 100%"
        );

        for (uint256 i = 0; i < addrs.length; i++) {
            require(
                addrs[i] != address(0),
                "Commission address cannot be zero"
            );

            address addr = addrs[i];
            uint256 percentage = percentages[i];

            require(percentage <= 100, "Percentage must be <= 100");

            if (_commissionPercentages[addr] == 0) {
                _commissionAddresses.push(addr);
            }

            _commissionPercentages[addr] = percentage;
        }

        emit CommissionPercentagesSet(addrs, percentages);
    }

    // get commission percentage by address
    function getCommissionPercentage(
        address addr
    ) public view whenNotPaused returns (uint256) {
        return _commissionPercentages[addr];
    }

    /**
     * @notice Returns all commission addresses and their percentages
     * @return addresses Array of commission addresses
     * @return percentages Array of corresponding percentages
     */
    function getAllCommissionPercentages() public view returns (address[] memory addresses, uint256[] memory percentages) {
        addresses = _commissionAddresses;
        percentages = new uint256[](addresses.length);
        
        for (uint256 i = 0; i < addresses.length; i++) {
            percentages[i] = _commissionPercentages[addresses[i]];
        }
        
        return (addresses, percentages);
    }

    /**
     * @notice Sets or removes commission exemption for an address
     * @param account Address to set exemption for
     * @param exempt Whether the address should be exempt from commission
     */
    function setCommissionExempt(
        address account,
        bool exempt
    ) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(account != address(0), "Account cannot be zero address");
        _commissionExempt[account] = exempt;
        emit CommissionExemptionSet(account, exempt);
    }

    /**
     * @notice Checks if an address is exempt from commission
     * @param account Address to check
     * @return Boolean indicating if the address is exempt
     */
    function isCommissionExempt(address account) public view returns (bool) {
        return _commissionExempt[account];
    }

    // override the _transfer (for commission calculations)
    function transfer(
        address to,
        uint256 amount
    ) public override whenNotPaused returns (bool) {
        address sender = msg.sender;
        require(sender != address(0), "Transfer from 0 address");

        uint256 commission = 0;
        uint256[] memory commissionsPerAddr = new uint256[](
            _commissionAddresses.length
        );

        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                address commissionAddr = _commissionAddresses[i];
                commissionsPerAddr[i] =
                    (amount * _commissionPercentages[commissionAddr]) /
                    100;
                commission += commissionsPerAddr[i];
            }
        }

        require(commission <= amount, "Commission exceeds transfer amount");

        // Execute all transfers after calculations
        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                super._transfer(
                    sender,
                    _commissionAddresses[i],
                    commissionsPerAddr[i]
                );
            }
        }

        super._transfer(sender, to, amount - commission);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override whenNotPaused returns (bool) {
        super._spendAllowance(from, msg.sender, amount);

        require(from != address(0), "Transfer from 0 address");
        require(amount > 0, "Amount must be greater than 0");

        uint256 commission = 0;
        uint256[] memory commissionsPerAddr = new uint256[](
            _commissionAddresses.length
        );

        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                address commissionAddr = _commissionAddresses[i];
                commissionsPerAddr[i] =
                    (amount * _commissionPercentages[commissionAddr]) /
                    100;
                commission += commissionsPerAddr[i];
            }
        }

        require(commission <= amount, "Commission exceeds transfer amount");

        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                super._transfer(
                    from,
                    _commissionAddresses[i],
                    commissionsPerAddr[i]
                );
            }
        }

        super._transfer(from, to, amount - commission);
        return true;
    }
}
