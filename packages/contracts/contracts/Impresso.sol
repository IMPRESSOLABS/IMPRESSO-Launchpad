// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;


import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract Impresso is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, ERC20PausableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    bool private _commissionEnabled;
    address[] public _commissionAddresses;
    uint256 public _maxTotalSupply;
    bool private _useMaxTotalSupply;
    
    // map (commissionerAddress => amount)
    mapping(address => uint256) private _commissionPercentages;

    // IMPRROVEMENT: Add detailed event logging for all critical actions, including parameter changes, role updates, and financial transactions.
    event CommissionUpdated(address indexed commissioner, uint256 newPercentage);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // assume that the commission will be enabled by default
        _commissionEnabled = true;
        _disableInitializers();
    }

    /* ##################   ######################  ################## */
    /* ##################   OPENZEPPELIN FUNCTIONS  ################## */
    /* ##################   ######################  ################## */
    function initialize(string memory name, string memory symbol, uint256 maxTotalSupply, bool useMaxTotalSupply) initializer public {
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

    function mint(address to, uint256 amount) public onlyOwner whenNotPaused {
        if (_useMaxTotalSupply) {
            require(totalSupply() + amount <= _maxTotalSupply, "Exceeds maximum total supply");
        }
        _mint(to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override(ERC20PausableUpgradeable, ERC20Upgradeable) {
        super._beforeTokenTransfer(from, to, amount); // Call parent implementation
    }


    /* ##################   ######################  ################## */
    /* ##################         COMMISSION        ################## */
    /* ##################   ######################  ################## */

    // enable or disable commission
    function toggleCommission(bool enable) public onlyOwner whenNotPaused() {
        _commissionEnabled = enable;
    }

    // setup percentage of the commission for the address
    function setCommissionPercentages(address[] memory addrs, uint256[] memory percentages) public onlyOwner whenNotPaused {
        require(addrs.length == percentages.length, "Arrays length mismatch");
        require(addrs.length + _commissionAddresses.length <= 3, "Exceeds maximum number of commission addresses");
        
        // IMPPROVEMENT: Implement cumulative percentage validation to ensure the total does not exceed 100%.
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            totalPercentage += percentages[i];
        }
        require(totalPercentage <= 100, "Total commission percentages exceed 100%");

        for (uint256 i = 0; i < addrs.length; i++) {
            address addr = addrs[i];
            uint256 percentage = percentages[i];

            require(percentage <= 100, "Percentage must be <= 100");

            if (_commissionPercentages[addr] == 0) {
                _commissionAddresses.push(addr);
            }

            _commissionPercentages[addr] = percentage;

            
            // IMPRROVEMENT: Add detailed event logging for all critical actions, including parameter changes, role updates, and financial transactions.
            emit CommissionUpdated(addr, percentage);
        }
    }

    // get commission percentage by address
    function getCommissionPercentage(address addr) public view whenNotPaused returns(uint256) {
        return _commissionPercentages[addr];
    }


    // override the _transfer (for commission calculations)
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        address sender = msg.sender;

        require(sender != address(0), "Transfer from 0 address");

        // commission calc
        uint256 commission = 0;
        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                address commissionAddr = _commissionAddresses[i];
                uint256 comissionPerCurrentCommissioner = (amount * _commissionPercentages[commissionAddr]) / 100;

                commission += comissionPerCurrentCommissioner;

                // send commissions to pre-defined wallets
                super._transfer(sender, commissionAddr, comissionPerCurrentCommissioner);
            }
        }

        // call base (parent) _transfer, (with comission)
        super._transfer(sender, to, amount - commission);

        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns(bool) {
        super._spendAllowance(from, msg.sender, amount);

        require(from != address(0), "Transfer from 0 address");

        // commission calc
        uint256 commission = 0;
        if (_commissionEnabled) {
            for (uint256 i = 0; i < _commissionAddresses.length; i++) {
                address commissionAddr = _commissionAddresses[i];
                uint256 comissionPerCurrentCommissioner = (amount * _commissionPercentages[commissionAddr]) / 100;

                commission += comissionPerCurrentCommissioner;

                // send commissions to pre-defined wallets
                super._transfer(from, commissionAddr, comissionPerCurrentCommissioner);
            }
        }

        // call base (parent) _transfer, (with comission)
        super._transfer(from, to, amount - commission);

        return true;
    }
}