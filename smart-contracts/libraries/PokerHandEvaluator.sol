// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library PokerHandEvaluator {
    function scoreFiveCardPokerHand(uint8[5] memory cardIds)
        public
        pure
        returns (uint256)
    {
        uint8[15] memory rankCount;
        uint8[4] memory suitCount;
        uint8[5] memory ranks;

        for (uint256 i = 0; i < 5; ) {
            uint8 cardId = cardIds[i];

            uint8 rawRank = (cardId % 13) + 1;
            uint8 rank = rawRank == 1 ? 14 : rawRank;
            uint8 suit = cardId / 13;

            ranks[i] = rank;
            rankCount[rank]++;
            suitCount[suit]++;

            unchecked { ++i; }
        }

        _sortDesc5(ranks);

        bool flush =
            suitCount[0] == 5 ||
            suitCount[1] == 5 ||
            suitCount[2] == 5 ||
            suitCount[3] == 5;

        uint8 straightHigh = _straightHigh(rankCount);

        uint8 four;
        uint8 three;
        uint8[2] memory pairs;
        uint8 pairCount;
        uint8[5] memory singles;
        uint8 singleCount;

        for (uint8 r = 14; r > 1; ) {
            if (rankCount[r] == 4) {
                four = r;
            } else if (rankCount[r] == 3) {
                three = r;
            } else if (rankCount[r] == 2) {
                pairs[pairCount] = r;
                pairCount++;
            } else if (rankCount[r] == 1) {
                singles[singleCount] = r;
                singleCount++;
            }

            unchecked { --r; }
        }

        if (straightHigh != 0 && flush) {
            return _packScore(8, straightHigh, 0, 0, 0, 0);
        }

        if (four != 0) {
            return _packScore(7, four, singles[0], 0, 0, 0);
        }

        if (three != 0 && pairCount == 1) {
            return _packScore(6, three, pairs[0], 0, 0, 0);
        }

        if (flush) {
            return _packScore(5, ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]);
        }

        if (straightHigh != 0) {
            return _packScore(4, straightHigh, 0, 0, 0, 0);
        }

        if (three != 0) {
            return _packScore(3, three, singles[0], singles[1], 0, 0);
        }

        if (pairCount == 2) {
            return _packScore(2, pairs[0], pairs[1], singles[0], 0, 0);
        }

        if (pairCount == 1) {
            return _packScore(1, pairs[0], singles[0], singles[1], singles[2], 0);
        }

        return _packScore(0, ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]);
    }

    function categoryFromScore(uint256 score) public pure returns (uint8) {
        return uint8(score / (15 ** 5));
    }

    function _straightHigh(uint8[15] memory rankCount)
        private
        pure
        returns (uint8)
    {
        if (
            rankCount[14] > 0 &&
            rankCount[5] > 0 &&
            rankCount[4] > 0 &&
            rankCount[3] > 0 &&
            rankCount[2] > 0
        ) {
            return 5;
        }

        for (uint8 high = 14; high >= 6; ) {
            if (
                rankCount[high] > 0 &&
                rankCount[high - 1] > 0 &&
                rankCount[high - 2] > 0 &&
                rankCount[high - 3] > 0 &&
                rankCount[high - 4] > 0
            ) {
                return high;
            }

            unchecked { --high; }
        }

        return 0;
    }

    function _sortDesc5(uint8[5] memory arr) private pure {
        for (uint256 i = 0; i < 5; ) {
            for (uint256 j = i + 1; j < 5; ) {
                if (arr[j] > arr[i]) {
                    uint8 tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }

                unchecked { ++j; }
            }

            unchecked { ++i; }
        }
    }

    function _packScore(
        uint8 category,
        uint8 a,
        uint8 b,
        uint8 c,
        uint8 d,
        uint8 e
    ) private pure returns (uint256) {
        return
            (((((uint256(category) * 15 + a) * 15 + b) * 15 + c) * 15 + d) * 15) + e;
    }
}