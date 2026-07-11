// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library GameTypes {
    enum Phase {
        Created,
        PlayersJoined,
        KeysSubmitted,
        PlayersShuffling,
        CardsDealing,
        RevealingCards,
        HandScoring,   // poker v2
        Settled,
        Cancelled
    }

    struct Point {
        uint256 x;
        uint256 y;
    }

    struct Ciphertext {
        Point c1;
        Point c2;
    }

    struct Groth16Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    

    function pointHash(Point memory p) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(p.x, p.y));
    }
}
