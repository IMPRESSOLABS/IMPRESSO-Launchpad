// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;


import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract ImpressoAC is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, ERC20PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bool private _commissionEnabled;
    address[] public _commissionAddresses;
    uint256 public _maxTotalSupply;
    bool private _useMaxTotalSupply;
    
    // roles
    bytes32 public constant BURNER_ROLE   = keccak256("BURNER_ROLE"  );
    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE"  );
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE"  );
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");


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
    function initialize(string memory name, string memory symbol, uint256 maxTotalSupply, bool useMaxTotalSupply, address owner) initializer public {
        _maxTotalSupply = maxTotalSupply;
        _useMaxTotalSupply = useMaxTotalSupply;

        __ERC20_init(name, symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE,        owner);
        _grantRole(MINTER_ROLE,        owner);
        _grantRole(UPGRADER_ROLE,      owner);
        _grantRole(BURNER_ROLE,        owner);
    }

    function grantRoleForAddress(address user, string memory role) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        // Convert the string role to bytes32
        bytes32 roleHash = keccak256(abi.encodePacked(role));

        // Check if the role is one of the predefined roles
        require(roleHash == BURNER_ROLE || roleHash == PAUSER_ROLE || roleHash == MINTER_ROLE || roleHash == UPGRADER_ROLE, "Invalid role");

        _grantRole(roleHash, user);
    }

    function burn(address account, uint256 amount) public onlyRole(BURNER_ROLE) whenNotPaused {
        _burn(account, amount);
    }

    function pause() public onlyRole(PAUSER_ROLE) whenNotPaused {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused {
        if (_useMaxTotalSupply) {
            require(totalSupply() + amount <= _maxTotalSupply, "Exceeds maximum total supply");
        }
        _mint(to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override(ERC20PausableUpgradeable, ERC20Upgradeable) {
        super._beforeTokenTransfer(from, to, amount); // Call parent implementation
    }

    /* ##################   ######################  ################## */
    /* ##################         COMMISSION        ################## */
    /* ##################   ######################  ################## */

    // enable or disable commission
    function toggleCommission(bool enable) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _commissionEnabled = enable;
    }

    // setup percentage of the commission for the address
    function setCommissionPercentages(address[] memory addrs, uint256[] memory percentages) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(addrs.length == percentages.length, "Arrays length mismatch");
        require(addrs.length + _commissionAddresses.length <= 3, "Exceeds maximum number of commission addresses");

        for (uint256 i = 0; i < addrs.length; i++) {
            address addr = addrs[i];
            uint256 percentage = percentages[i];

            require(percentage <= 100, "Percentage must be <= 100");

            if (_commissionPercentages[addr] == 0) {
                _commissionAddresses.push(addr);
            }

            _commissionPercentages[addr] = percentage;
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