// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRevealVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[8] calldata input
    ) external view returns (bool);
}