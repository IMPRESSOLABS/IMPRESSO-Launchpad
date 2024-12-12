// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UUPSProxy is ERC1967Proxy {
    address private immutable _owner;

    modifier onlyOwner() {
        require(msg.sender == _owner, "Not authorized");
        _;
    }

    constructor(
        address implementation,
        bytes memory _data,
        address owner_
    ) ERC1967Proxy(implementation, _data) {
        require(owner_ != address(0), "Owner cannot be zero address");
        require(
            implementation.code.length > 0,
            "Implementation must be a contract"
        );
        _owner = owner_;
    }
}
