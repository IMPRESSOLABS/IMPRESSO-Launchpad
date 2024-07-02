// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ImpressoAC is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bool private _commissionEnabled;
    address[] public _commissionAddresses;
    uint256 public _maxTotalSupply;
    bool private _useMaxTotalSupply;
    uint256 public lastUpdateTimestamp;
    uint256 public updateCooldown = 1 days;

    // roles
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // map (commissionerAddress => amount)
    mapping(address => uint256) private _commissionPercentages;

    // IMPRROVEMENT: Add detailed event logging for all critical actions, including parameter changes, role updates, and financial transactions.
    event CommissionUpdated(
        address indexed commissioner,
        uint256 newPercentage
    );

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
        _maxTotalSupply = maxTotalSupply;
        _useMaxTotalSupply = useMaxTotalSupply;

        __ERC20_init(name, symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
        _grantRole(BURNER_ROLE, owner);
    }

    /**
     * @dev Grants a role to a specified address.
     * @param user The address to grant the role to.
     * @param role The role to grant.
     */
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
    }

    function burn(
        address account,
        uint256 amount
    ) public onlyRole(BURNER_ROLE) whenNotPaused {
        _burn(account, amount);
    }

    function pause() public onlyRole(PAUSER_ROLE) whenNotPaused {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function emergencyPause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function emergencyUnpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    function mint(
        address to,
        uint256 amount
    ) public onlyRole(MINTER_ROLE) whenNotPaused {
        if (_useMaxTotalSupply) {
            require(
                totalSupply() + amount <= _maxTotalSupply,
                "Exceeds maximum total supply"
            );
        }
        _mint(to, amount);
    }

    /**
     * @dev Grants a role to a specified address.
     * @param user The address to grant the role to.
     * @param role The role to grant.
     */

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

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

    // enable or disable commission
    function toggleCommission(
        bool enable
    ) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _commissionEnabled = enable;
    }

    // setup percentage of the commission for the address
    function setCommissionPercentages(
        address[] memory addrs,
        uint256[] memory percentages
    ) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(
            block.timestamp > lastUpdateTimestamp + updateCooldown,
            "Update cooldown in effect"
        );
        require(addrs.length == percentages.length, "Arrays length mismatch");

        // Optimize storage by using mappings
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < addrs.length; i++) {
            totalPercentage += percentages[i];
            require(
                totalPercentage <= 100,
                "Total commission percentages exceed 100%"
            );
            _commissionPercentages[addrs[i]] = percentages[i];
        }

        // Update commission addresses
        _commissionAddresses = addrs;
        lastUpdateTimestamp = block.timestamp;
        emit CommissionUpdated(addrs, percentages);
    }

    // get commission percentage by address
    function getCommissionPercentage(
        address addr
    ) public view whenNotPaused returns (uint256) {
        return _commissionPercentages[addr];
    }

    // override the _transfer (for commission calculations)
    // Use nonReentrant modifier for sensitive functions
    function transfer(
        address to,
        uint256 amount
    ) public override whenNotPaused nonReentrant returns (bool) {
        address sender = msg.sender;

        require(sender != address(0), "Transfer from 0 address");

        // commission calc
        uint256 commission = 0;
        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                address commissionAddr = _commissionAddresses[i];
                uint256 comissionPerCurrentCommissioner = (amount *
                    _commissionPercentages[commissionAddr]) / 100;

                commission += comissionPerCurrentCommissioner;

                // send commissions to pre-defined wallets
                super._transfer(
                    sender,
                    commissionAddr,
                    comissionPerCurrentCommissioner
                );
            }
        }

        // call base (parent) _transfer, (with comission)
        super._transfer(sender, to, amount - commission);

        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override whenNotPaused nonReentrant returns (bool) {
        super._spendAllowance(from, msg.sender, amount);

        require(from != address(0), "Transfer from 0 address");

        // commission calc
        uint256 commission = 0;
        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                address commissionAddr = _commissionAddresses[i];
                uint256 comissionPerCurrentCommissioner = (amount *
                    _commissionPercentages[commissionAddr]) / 100;

                commission += comissionPerCurrentCommissioner;

                // send commissions to pre-defined wallets
                super._transfer(
                    from,
                    commissionAddr,
                    comissionPerCurrentCommissioner
                );
            }
        }

        // call base (parent) _transfer, (with comission)
        super._transfer(from, to, amount - commission);

        return true;
    }
}
