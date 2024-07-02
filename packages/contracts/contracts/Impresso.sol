// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Impresso is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuard
{
    bool private _commissionEnabled;
    address[] public _commissionAddresses;
    uint256 public _maxTotalSupply;
    bool private _useMaxTotalSupply;
    uint256 public lastUpdateTimestamp;
    uint256 public updateCooldown = 1 days;

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
        bool useMaxTotalSupply
    ) public initializer {
        _maxTotalSupply = maxTotalSupply;
        _useMaxTotalSupply = useMaxTotalSupply;

        __ERC20_init(name, symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() public onlyOwner {
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

    function mint(address to, uint256 amount) public onlyOwner whenNotPaused {
        if (_useMaxTotalSupply) {
            require(
                totalSupply() + amount <= _maxTotalSupply,
                "Exceeds maximum total supply"
            );
        }
        _mint(to, amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

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
    function toggleCommission(bool enable) public onlyOwner whenNotPaused {
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
