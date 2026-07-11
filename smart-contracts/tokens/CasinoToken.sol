// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CasinoToken is ERC20, ERC20Burnable, Ownable {
    error NotMinter();
    error ZeroAddress();

    address public minter;

    constructor(
        string memory name_,
        string memory symbol_
    )
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {}

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    function setMinter(address minter_) external onlyOwner {
        if (minter_ == address(0)) revert ZeroAddress();
        minter = minter_;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}