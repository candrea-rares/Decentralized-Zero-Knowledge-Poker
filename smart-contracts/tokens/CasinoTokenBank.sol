// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./CasinoToken.sol";

contract CasinoTokenBank is Ownable, ReentrancyGuard {
    using SafeERC20 for CasinoToken;

    error InvalidRate();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientEthReserve();

    CasinoToken public immutable token;

    // tokenRate = token base units received per 1 ETH.
    // Example: 1000 ether means 1 ETH buys 1000 tokens.
    uint256 public tokenRate;

    event TokensPurchased(address indexed buyer, uint256 ethIn, uint256 tokensOut);
    event TokensRedeemed(address indexed user, uint256 tokensIn, uint256 ethOut);
    event TokenRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(
        address token_,
        uint256 tokenRate_
    )
        Ownable(msg.sender)
    {
        if (token_ == address(0)) revert ZeroAddress();
        if (tokenRate_ == 0) revert InvalidRate();

        token = CasinoToken(token_);
        tokenRate = tokenRate_;
    }

    receive() external payable {}

    function setTokenRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert InvalidRate();

        uint256 oldRate = tokenRate;
        tokenRate = newRate;

        emit TokenRateUpdated(oldRate, newRate);
    }

    function buyTokens() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        uint256 tokensOut = (msg.value * tokenRate) / 1 ether;
        if (tokensOut == 0) revert ZeroAmount();

        token.mint(msg.sender, tokensOut);

        emit TokensPurchased(msg.sender, msg.value, tokensOut);
    }

    function redeemTokens(uint256 tokenAmount) external nonReentrant {
        if (tokenAmount == 0) revert ZeroAmount();

        uint256 ethOut = (tokenAmount * 1 ether) / tokenRate;
        if (ethOut == 0) revert ZeroAmount();

        if (address(this).balance < ethOut) revert InsufficientEthReserve();

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        token.burn(tokenAmount);

        (bool ok, ) = msg.sender.call{value: ethOut}("");
        require(ok, "ETH_TRANSFER_FAILED");

        emit TokensRedeemed(msg.sender, tokenAmount, ethOut);
    }

    function ethReserve() external view returns (uint256) {
        return address(this).balance;
    }
}