// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPoseidon2 {
    function poseidon(uint256[2] calldata input) external pure returns (uint256);
}

interface IPoseidon4 {
    function poseidon(uint256[4] calldata input) external pure returns (uint256);
}