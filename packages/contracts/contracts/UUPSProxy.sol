// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
event Upgraded(address indexed implementation);

contract UUPSProxy is ERC1967Proxy {
    event Upgraded(address indexed implementation);

    /**
     * @dev Constructor for the UUPSProxy contract.
     * @param implementation The address of the initial implementation contract.
     * @param _data The data to be sent to the initial implementation contract for initialization.
     */
    constructor(
        address implementation,
        bytes memory _data
    ) ERC1967Proxy(implementation, _data) {}

    function _upgradeTo(address newImplementation) internal override {
        super._upgradeTo(newImplementation);
        emit Upgraded(newImplementation);
    }
}
