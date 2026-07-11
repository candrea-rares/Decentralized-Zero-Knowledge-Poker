// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./GameTypes.sol";
import "../interfaces/IShuffleCommitVerifier.sol";
import "../interfaces/IShufflePokerDealVerifier.sol";
import "../interfaces/IPartialDecryptVerifier.sol";
import "../interfaces/IRevealVerifier.sol";
import "../interfaces/IEncryptDeckCommitVerifier.sol";
import "../interfaces/IPublicKeyVerifier.sol";

import "../interfaces/IPoseidon.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../libraries/PokerHandEvaluator.sol";

contract ZKPokerGameV6 is ReentrancyGuard {
   // using GameTypes for GameTypes.Point;
    using SafeERC20 for IERC20;
    //using PokerHandEvaluator for uint8[5];

    // =============================================================
    //                            ERRORS
    // =============================================================

    error InvalidPlayerCount();
    error InvalidDeckSize();
    error InvalidBuyIn();
    error WrongPhase(GameTypes.Phase expected, GameTypes.Phase actual);
    error NotOwner();
    error AlreadyJoined();
    error NotJoined();
    error GameFull();
    error PublicKeyAlreadySubmitted();
    error ZeroAddress();
    error InvalidPoint();
    error AggregateKeyNotSubmitted();
    error InitialDeckAlreadySubmitted();
    error InitialDeckNotSubmitted();
    error AlreadyShuffled();
    error WrongPlayerOrder(uint256 expectedIndex, uint256 actualIndex);
    error ShuffleProofVerificationFailed();
    error ShufflePublicSignalsMismatch();
    error DealtCardIndexOutOfBounds();
    error NotCardOwner();
    error OwnerCannotPartialDecrypt();
    error AlreadySubmittedPartialDecrypt();
    error CardAlreadyReadyForReveal();
    error CardNotReadyForReveal();
    error PartialDecryptProofVerificationFailed();
    error PartialDecryptPublicSignalsMismatch();
    error CardAlreadyRevealed();
    error InvalidRevealPoint();
    error InvalidCardPointHashesLength(uint256 expected, uint256 got);
    error RevealProofVerificationFailed();
    error RevealPublicSignalsMismatch();
    error InitialDeckProofVerificationFailed();
    error InitialDeckPublicSignalsMismatch();
    error TimeoutNotReached();
    error NoTimeoutWinner();
    error InvalidDeckCommit();
    error DeadlineExpired();
    error PublicKeyProofVerificationFailed();
    error InvalidSubmittedHand();
    error HandAlreadySubmitted();
    error NotActionPlayer();
    error BettingRoundNotOpen();
    error CannotCheck();
    error NoBetToCall();
    error InvalidBetAmount();
    error NotInRevealWindow();
    error InvalidDeckLength(uint256 expected, uint256 got);
    error InvalidCiphertext();
    error PublicKeyNotRegistered();
    error CannotRotateKeyWhileSeated();

    // =============================================================
    //                            EVENTS
    // =============================================================

    event PlayerJoined(address indexed player, uint256 indexed playerIndex);
    event PublicKeySubmitted(address indexed player, uint256 x, uint256 y);
    event AggregatePublicKeySubmitted(uint256 x, uint256 y);
    event PhaseAdvanced(GameTypes.Phase newPhase);
    event InitialDeckSubmitted(address indexed submittedBy, uint256 deckLength, uint256 deckCommit);
    event ShuffleSubmitted(address indexed player, uint256 indexed playerIndex, uint256 shuffleNumber, uint256 newDeckCommit);
    event PartialDecryptSubmitted(uint256 indexed cardIndex, address indexed player, uint8 partialCount, uint256 cardsReadyForRevealCount);
    event CardReadyForReveal(uint256 indexed cardIndex);
    event CardRevealed(uint256 indexed cardIndex, address indexed owner, uint8 cardId, uint8 rank);
    event RoundStarted(uint256 indexed roundId);
    event DeadlineExtended(uint256 newDeadline);
    event TimeoutVictory(address indexed winner);
    event GameRefunded();
    event PlayerLeft(address indexed player);
    event PlayerForfeited(address indexed loser, address indexed winner);
    event BestHandSubmitted(address indexed player, uint256 score, uint8[5] cardIndexes);
    event BettingRoundStarted(uint8 street, address indexed actionPlayer);
    event PlayerChecked(address indexed player, uint8 street);
    event PlayerBet(address indexed player, uint8 street, uint256 amount);
    event PlayerCalled(address indexed player, uint8 street, uint256 amount);
    event PlayerFolded(address indexed loser, address indexed winner, uint256 pot);
    event BettingRoundClosed(uint8 street);
    event DeckPublished(uint256 indexed roundId, uint256 indexed step, uint256 deckCommit, GameTypes.Ciphertext[] deck);
    event PublicKeyRotated(address indexed player, uint256 x, uint256 y);
    event HandResult(uint256 indexed roundId, address indexed winner, bool isTie, uint8 winningHandCategory);

    // =============================================================
    //                        IMMUTABLE CONFIG
    // =============================================================

    address public immutable owner;
    uint8 public immutable maxPlayers;
    uint8 public immutable deckSize;

    //uint256 public immutable buyInWei;
    IERC20 public immutable gameToken;
    uint256 public immutable bigBlindAmount;
    uint16 public immutable rakeBps;

    IShuffleCommitVerifier public immutable shuffleVerifier;
    IShufflePokerDealVerifier public immutable finalShuffleDealVerifier;
    IPartialDecryptVerifier public immutable partialDecryptVerifier;
    IRevealVerifier public immutable revealVerifier;
    IEncryptDeckCommitVerifier public immutable initialDeckVerifier;
    IPublicKeyVerifier public immutable publicKeyVerifier;

    // poseidon state
    IPoseidon2 public immutable poseidon2;
    IPoseidon4 public immutable poseidon4;

    // =============================================================
    //                         CORE STATE
    // =============================================================

    GameTypes.Phase public phase;

    address[] private _players;

    // 0 => not joined, otherwise index + 1
    mapping(address => uint256) public playerIndexPlusOne;

    mapping(address => bool) public hasSubmittedKey;
    mapping(address => GameTypes.Point) private _publicKeys;

    uint256 public publicKeyCount;

    GameTypes.Point public aggregatePk;
    bool public aggregatePkSubmitted;

    bool public initialDeckSubmitted;

    uint256 public shuffleCount;
    mapping(address => bool) public hasShuffled;

    struct DealtCardState {
        address owner;
        GameTypes.Ciphertext originalCiphertext;
        GameTypes.Point currentPoint;
        uint8 partialCount;
        bool revealReady;
        bool revealed;
        GameTypes.Point revealedPoint;
        uint8 revealedCardId;
        uint8 revealedRank;
    }

    DealtCardState[] private _dealtCards;
    uint256 public dealtCardCount;
    uint256 public cardsReadyForRevealCount;
    uint256 public revealCount;

    uint8 public constant POKER_DEALT_CARD_COUNT = 9;
    uint8 public constant PRIVATE_CARD_COUNT = 4;
    uint8 public constant COMMUNITY_CARD_START_INDEX = 4;

    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasSubmittedPartialDecrypt;

    address public winner;
    bool public isTie;

    mapping(bytes32 => uint8) public pointHashToCardIdPlusOne;

    uint256 public currentDeckCommit;

    uint256 public rakeAccrued;
    mapping(address => uint256) public claimableWinnings;

    uint256 public roundId;

    // babyjubjub addition
    uint256 internal constant BABYJUB_Q = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 internal constant BABYJUB_A = 168700;
    uint256 internal constant BABYJUB_D = 168696;

    // timestamps / forfeit logic
    uint256 public actionDeadline;
    uint256 public constant ACTION_TIMEOUT = 10 minutes;
    
    /// poker logic
    mapping(address => bool) public hasSubmittedBestHand;
    mapping(address => uint256) public submittedBestHandScore;
    mapping(address => uint8[5]) public submittedBestHandIndexes;
    uint256 public bestHandSubmitCount;
    uint8 public winningHandCategory;

    enum BettingStreet {
        None,
        Preflop,
        Flop,
        Turn,
        River,
        Showdown
    }

    BettingStreet public bettingStreet;
    bool public bettingRoundOpen;
    address public actionPlayer;

    uint256 public currentBet;
    uint256 public minBet;

    mapping(address => uint256) public committedThisStreet;
    mapping(address => bool) public actedThisStreet;

    mapping(address => uint256) public tableBalance;
    uint256 public handPot;

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyPlayer() {
        if (playerIndexPlusOne[msg.sender] == 0) revert NotJoined();
        _;
    }

    modifier beforeDeadline() {
        if (actionDeadline != 0 && block.timestamp > actionDeadline) {
            revert DeadlineExpired();
        }
        _;
    }

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    constructor(
        uint8 maxPlayers_,
        uint8 deckSize_,
        address gameToken_,
        uint256 bigBlindAmount_,
        uint16 rakeBps_,
        address poseidon2_,
        address poseidon4_,
        address publicKeyVerifier_,
        address initialDeckVerifier_,
        address shuffleVerifier_,
        address finalShuffleDealVerifier_,
        address partialDecryptVerifier_,
        address revealVerifier_,
        bytes32[] memory cardPointHashes
    ) {
        //if (maxPlayers_ < 2 || maxPlayers_ > 9) revert InvalidPlayerCount();
        if (maxPlayers_ != 2) revert InvalidPlayerCount();
        // if (deckSize_ < maxPlayers_) revert InvalidDeckSize();
        if (deckSize_ != 52) revert InvalidDeckSize();
        if (publicKeyVerifier_ == address(0)) revert ZeroAddress();
        if (shuffleVerifier_ == address(0)) revert ZeroAddress();
        if (finalShuffleDealVerifier_ == address(0)) revert ZeroAddress();
        if (partialDecryptVerifier_ == address(0)) revert ZeroAddress();
        if (revealVerifier_ == address(0)) revert ZeroAddress();
        if (initialDeckVerifier_ == address(0)) revert ZeroAddress();
        if (gameToken_ == address(0)) revert ZeroAddress();
        if (poseidon2_ == address(0)) revert ZeroAddress();
        if (poseidon4_ == address(0)) revert ZeroAddress();
        if (bigBlindAmount_ == 0) revert InvalidBuyIn();
        if (rakeBps_ > 1000) revert InvalidBuyIn(); // max 10% rake for safety

        if (cardPointHashes.length != deckSize_) {
            revert InvalidCardPointHashesLength(deckSize_, cardPointHashes.length);
        }

        owner = msg.sender;
        maxPlayers = maxPlayers_;
        deckSize = deckSize_;
        
        bigBlindAmount = bigBlindAmount_;
        rakeBps = rakeBps_;

        minBet = bigBlindAmount;

        gameToken = IERC20(gameToken_);
        shuffleVerifier = IShuffleCommitVerifier(shuffleVerifier_);
        finalShuffleDealVerifier = IShufflePokerDealVerifier(finalShuffleDealVerifier_);
        partialDecryptVerifier = IPartialDecryptVerifier(partialDecryptVerifier_);
        revealVerifier = IRevealVerifier(revealVerifier_);
        initialDeckVerifier = IEncryptDeckCommitVerifier(initialDeckVerifier_);
        publicKeyVerifier = IPublicKeyVerifier(publicKeyVerifier_);
        poseidon2 = IPoseidon2(poseidon2_);
        poseidon4 = IPoseidon4(poseidon4_);

        for (uint8 i = 0; i < deckSize_; ) {
            if (cardPointHashes[i] == bytes32(0)) revert InvalidRevealPoint();
            if (pointHashToCardIdPlusOne[cardPointHashes[i]] != 0) revert InvalidRevealPoint();

            pointHashToCardIdPlusOne[cardPointHashes[i]] = i + 1;

            unchecked {
                ++i;
            }
        }

        phase = GameTypes.Phase.Created;
        roundId = 0;
    }

    // =============================================================
    //                        LOBBY / JOIN
    // =============================================================

    function joinGame(uint256 amount) external nonReentrant {
        if (phase != GameTypes.Phase.Created) {
            revert WrongPhase(GameTypes.Phase.Created, phase);
        }

        if (playerIndexPlusOne[msg.sender] != 0) revert AlreadyJoined();
        if (_players.length >= maxPlayers) revert GameFull();
        if (amount == 0) revert InvalidBuyIn();

        gameToken.safeTransferFrom(msg.sender, address(this), amount);
        tableBalance[msg.sender] += amount;

        _players.push(msg.sender);
        playerIndexPlusOne[msg.sender] = _players.length;

        emit PlayerJoined(msg.sender, _players.length - 1);

        if (_players.length == maxPlayers) {
            _tryStartNextHand();
        }
    }

    // =============================================================
    //                      PLAYER KEY SUBMISSION
    // =============================================================

    function submitPublicKey(
        GameTypes.Groth16Proof calldata proof,
        uint256[2] calldata publicSignals
    ) external beforeDeadline {
        if (hasSubmittedKey[msg.sender]) revert PublicKeyAlreadySubmitted();

        GameTypes.Point memory pk = GameTypes.Point({
            x: publicSignals[0],
            y: publicSignals[1]
        });

        _validatePointMemory(pk);

        bool ok = publicKeyVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );

        if (!ok) revert PublicKeyProofVerificationFailed();

        _publicKeys[msg.sender] = pk;
        hasSubmittedKey[msg.sender] = true;

        unchecked {
            ++publicKeyCount;
        }

        emit PublicKeySubmitted(msg.sender, pk.x, pk.y);

        if (
            phase == GameTypes.Phase.PlayersJoined &&
            _players.length == maxPlayers &&
            _allSeatedPlayersHaveKeys()
        ) {
            aggregatePk = _computeAggregatePublicKey();
            aggregatePkSubmitted = true;

            _refreshDeadline();

            emit AggregatePublicKeySubmitted(aggregatePk.x, aggregatePk.y);

            phase = GameTypes.Phase.KeysSubmitted;
            emit PhaseAdvanced(phase);
        }
    }

    function rotatePublicKey(
        GameTypes.Groth16Proof calldata proof,
        uint256[2] calldata publicSignals
    ) external beforeDeadline {
        if (playerIndexPlusOne[msg.sender] != 0) {
            revert CannotRotateKeyWhileSeated();
        }

        if (!hasSubmittedKey[msg.sender]) {
            revert PublicKeyNotRegistered();
        }

        GameTypes.Point memory pk = GameTypes.Point({
            x: publicSignals[0],
            y: publicSignals[1]
        });

        _validatePointMemory(pk);

        bool ok = publicKeyVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );

        if (!ok) revert PublicKeyProofVerificationFailed();

        _publicKeys[msg.sender] = pk;

        emit PublicKeyRotated(msg.sender, pk.x, pk.y);
    }

    // =============================================================
    //                  SUBMIT INITIAL ENCRYPTED DECK
    // =============================================================

    function submitInitialDeck(
        GameTypes.Ciphertext[] calldata encryptedDeck,
        GameTypes.Groth16Proof calldata proof,
        uint256[3] calldata publicSignals
    ) external onlyPlayer beforeDeadline {
        if (phase != GameTypes.Phase.KeysSubmitted) {
            revert WrongPhase(GameTypes.Phase.KeysSubmitted, phase);
        }

        if (msg.sender != _players[0]) {
            revert WrongPlayerOrder(0, _playerIndex(msg.sender));
        }

        if (!aggregatePkSubmitted) revert AggregateKeyNotSubmitted();
        if (initialDeckSubmitted) revert InitialDeckAlreadySubmitted();

        if (encryptedDeck.length != deckSize) {
            revert InvalidDeckLength(deckSize, encryptedDeck.length);
        }

        for (uint256 i = 0; i < encryptedDeck.length; ) {
            _validateCiphertext(encryptedDeck[i]);
            unchecked {
                ++i;
            }
        }

        if (publicSignals[0] != aggregatePk.x) {
            revert InitialDeckPublicSignalsMismatch();
        }

        if (publicSignals[1] != aggregatePk.y) {
            revert InitialDeckPublicSignalsMismatch();
        }

        if (publicSignals[2] == 0) revert InvalidDeckCommit();

        uint256 computedCommit = _commitDeckPoseidon(encryptedDeck);

        if (computedCommit != publicSignals[2]) {
            revert InitialDeckPublicSignalsMismatch();
        }

        bool ok = initialDeckVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );

        if (!ok) revert InitialDeckProofVerificationFailed();

        initialDeckSubmitted = true;
        currentDeckCommit = publicSignals[2];
        shuffleCount = 0;

        phase = GameTypes.Phase.PlayersShuffling;

        _refreshDeadline();

        emit InitialDeckSubmitted(msg.sender, deckSize, currentDeckCommit);

        emit DeckPublished(
            roundId,
            0,
            currentDeckCommit,
            encryptedDeck
        );

        emit PhaseAdvanced(phase);
    }

    // =============================================================
    //                  SUBMIT SHUFFLES AND REENCRYPTION
    // =============================================================

    function submitShuffle(
        GameTypes.Ciphertext[] calldata shuffledDeck,
        GameTypes.Groth16Proof calldata proof,
        uint256[4] calldata publicSignals
    ) external onlyPlayer beforeDeadline {
        if (phase != GameTypes.Phase.PlayersShuffling) {
            revert WrongPhase(GameTypes.Phase.PlayersShuffling, phase);
        }

        if (!initialDeckSubmitted) revert InitialDeckNotSubmitted();
        if (hasShuffled[msg.sender]) revert AlreadyShuffled();

        if (shuffledDeck.length != deckSize) {
            revert InvalidDeckLength(deckSize, shuffledDeck.length);
        }

        for (uint256 i = 0; i < shuffledDeck.length; ) {
            _validateCiphertext(shuffledDeck[i]);
            unchecked {
                ++i;
            }
        }

        uint256 actualIndex = _playerIndex(msg.sender);
        uint256 expectedIndex = shuffleCount;

        if (actualIndex != expectedIndex) {
            revert WrongPlayerOrder(expectedIndex, actualIndex);
        }

        // Last player must use submitFinalShuffleAndDeal instead.
        if (shuffleCount == maxPlayers - 1) {
            revert WrongPlayerOrder(maxPlayers - 1, actualIndex);
        }

        if (publicSignals[0] != aggregatePk.x) revert ShufflePublicSignalsMismatch();
        if (publicSignals[1] != aggregatePk.y) revert ShufflePublicSignalsMismatch();
        if (publicSignals[2] != currentDeckCommit) revert ShufflePublicSignalsMismatch();
        if (publicSignals[3] == 0) revert InvalidDeckCommit();

        uint256 computedCommit = _commitDeckPoseidon(shuffledDeck);

        if (computedCommit != publicSignals[3]) {
            revert ShufflePublicSignalsMismatch();
        }

        bool ok = shuffleVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );

        if (!ok) revert ShuffleProofVerificationFailed();

        currentDeckCommit = publicSignals[3];

        hasShuffled[msg.sender] = true;

        unchecked {
            ++shuffleCount;
        }

        _refreshDeadline();

        emit ShuffleSubmitted(msg.sender, actualIndex, shuffleCount, currentDeckCommit);

        emit DeckPublished(
            roundId,
            shuffleCount,
            currentDeckCommit,
            shuffledDeck
        );
    }

    function submitFinalShuffleAndDeal(
        GameTypes.Groth16Proof calldata proof,
        uint256[40] calldata publicSignals
    ) external onlyPlayer beforeDeadline {
        if (phase != GameTypes.Phase.PlayersShuffling) {
            revert WrongPhase(GameTypes.Phase.PlayersShuffling, phase);
        }

        if (!initialDeckSubmitted) revert InitialDeckNotSubmitted();
        if (hasShuffled[msg.sender]) revert AlreadyShuffled();

        uint256 actualIndex = _playerIndex(msg.sender);
        uint256 expectedIndex = shuffleCount;

        if (actualIndex != expectedIndex) {
            revert WrongPlayerOrder(expectedIndex, actualIndex);
        }

        if (shuffleCount != maxPlayers - 1) {
            revert WrongPlayerOrder(maxPlayers - 1, actualIndex);
        }

        if (publicSignals[0] != aggregatePk.x) revert ShufflePublicSignalsMismatch();
        if (publicSignals[1] != aggregatePk.y) revert ShufflePublicSignalsMismatch();
        if (publicSignals[2] != currentDeckCommit) revert ShufflePublicSignalsMismatch();
        if (publicSignals[3] == 0) revert InvalidDeckCommit();

        bool ok = finalShuffleDealVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );

        if (!ok) revert ShuffleProofVerificationFailed();

        currentDeckCommit = publicSignals[3];

        hasShuffled[msg.sender] = true;

        unchecked {
            ++shuffleCount;
        }

        emit ShuffleSubmitted(msg.sender, actualIndex, shuffleCount, currentDeckCommit);

        _startDealingFromPublicSignals(publicSignals);

        bettingStreet = BettingStreet.None;
        bettingRoundOpen = false;
        currentBet = 0;
    }

    function _startDealingFromPublicSignals(
        uint256[40] calldata publicSignals
    ) internal {
        delete _dealtCards;

        for (uint256 i = 0; i < POKER_DEALT_CARD_COUNT; ) {
            GameTypes.Point memory c1 = GameTypes.Point({
                x: publicSignals[4 + i * 2],
                y: publicSignals[5 + i * 2]
            });

            GameTypes.Point memory c2 = GameTypes.Point({
                x: publicSignals[22 + i * 2],
                y: publicSignals[23 + i * 2]
            });

            _validatePointMemory(c1);
            _validatePointMemory(c2);

            address cardOwner = _dealtCardOwner(i);

            _dealtCards.push(
                DealtCardState({
                    owner: cardOwner,
                    originalCiphertext: GameTypes.Ciphertext({
                        c1: c1,
                        c2: c2
                    }),
                    currentPoint: c2,
                    partialCount: 0,
                    revealReady: false,
                    revealed: false,
                    revealedPoint: GameTypes.Point({x: 0, y: 0}),
                    revealedCardId: 0,
                    revealedRank: 0
                })
            );

            unchecked {
                ++i;
            }
        }

        dealtCardCount = POKER_DEALT_CARD_COUNT;
        cardsReadyForRevealCount = 0;
        revealCount = 0;

        phase = GameTypes.Phase.CardsDealing;

        _refreshDeadline();

        emit PhaseAdvanced(phase);
    }

    function submitPartialDecrypt(
        uint256 cardIndex,
        GameTypes.Groth16Proof calldata proof,
        uint256[8] calldata publicSignals
    ) external onlyPlayer beforeDeadline {
        if (phase != GameTypes.Phase.CardsDealing) {
            revert WrongPhase(GameTypes.Phase.CardsDealing, phase);
        }

        if (cardIndex >= _dealtCards.length) revert DealtCardIndexOutOfBounds();

        DealtCardState storage card = _dealtCards[cardIndex];


        if (card.owner == msg.sender) revert OwnerCannotPartialDecrypt();
        if (hasSubmittedPartialDecrypt[roundId][cardIndex][msg.sender]) {
            revert AlreadySubmittedPartialDecrypt();
        }
        if (card.revealReady) revert CardAlreadyReadyForReveal();

        if (!_cardCanBePartialDecryptedNow(cardIndex)) revert NotInRevealWindow();

        GameTypes.Point memory nextPoint = GameTypes.Point({
            x: publicSignals[6],
            y: publicSignals[7]
        });

        _validatePointMemory(nextPoint);

        if (!_matchesPartialDecryptPublicSignals(cardIndex, publicSignals)) {
            revert PartialDecryptPublicSignalsMismatch();
        }

        bool ok = partialDecryptVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );

        if (!ok) revert PartialDecryptProofVerificationFailed();

        hasSubmittedPartialDecrypt[roundId][cardIndex][msg.sender] = true;
        card.currentPoint = nextPoint;

        unchecked {
            card.partialCount += 1;
        }

        if (card.partialCount == maxPlayers - 1) {
            card.revealReady = true;

            unchecked {
                cardsReadyForRevealCount += 1;
            }

            emit CardReadyForReveal(cardIndex);

            if (bettingStreet == BettingStreet.None && _readyRange(0, 3)) {
                _startBettingRound(BettingStreet.Preflop); // already refreshes deadline
            } else {
                _refreshDeadline();
            }
        } else {
            _refreshDeadline();
        }

        emit PartialDecryptSubmitted(
            cardIndex,
            msg.sender,
            card.partialCount,
            cardsReadyForRevealCount
        );
    }

    function revealCard(
        uint256 cardIndex,
        GameTypes.Groth16Proof calldata proof,
        uint256[8] calldata publicSignals
    ) external onlyPlayer beforeDeadline {
        if (phase != GameTypes.Phase.CardsDealing) {
            revert WrongPhase(GameTypes.Phase.CardsDealing, phase);
        }

        if (cardIndex >= _dealtCards.length) revert DealtCardIndexOutOfBounds();

        DealtCardState storage card = _dealtCards[cardIndex];

        if (card.owner != msg.sender) revert NotCardOwner();
        if (!card.revealReady) revert CardNotReadyForReveal();
        if (card.revealed) revert CardAlreadyRevealed();

        if (!_cardCanBeRevealedNow(cardIndex)) revert NotInRevealWindow();

        GameTypes.Point memory openedPoint = GameTypes.Point({
            x: publicSignals[6],
            y: publicSignals[7]
        });

        _validatePointMemory(openedPoint);

        if (!_matchesRevealPublicSignals(cardIndex, publicSignals)) {
            revert RevealPublicSignalsMismatch();
        }

        bool ok = revealVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );

        if (!ok) revert RevealProofVerificationFailed();

        uint8 cardId = _cardIdOf(openedPoint);
        uint8 rank = _rankOf(cardId);

        card.revealed = true;
        card.revealedPoint = openedPoint;
        card.revealedCardId = cardId;
        card.revealedRank = rank;

        unchecked {
            ++revealCount;
        }

        emit CardRevealed(cardIndex, msg.sender, cardId, rank);

        uint256 oldDeadline = actionDeadline;

        _afterCardRevealProgress();

        if (actionDeadline == oldDeadline && phase == GameTypes.Phase.CardsDealing) {
            _refreshDeadline();
        }
    }

    function withdrawWinnings() external nonReentrant {
        uint256 amount = claimableWinnings[msg.sender];
        if (amount == 0) revert InvalidBuyIn();

        claimableWinnings[msg.sender] = 0;
        gameToken.safeTransfer(msg.sender, amount);
    }

    function withdrawRake(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        uint256 amount = rakeAccrued;
        if (amount == 0) revert InvalidBuyIn();

        rakeAccrued = 0;
        gameToken.safeTransfer(to, amount);
    }


    // =============================================================
    //                      GETTERS
    // =============================================================

    function getPlayer(uint256 index) external view returns (address) {
        return _players[index];
    }

    function getPlayerCount() external view returns (uint256) {
        return _players.length;
    }

    function getPublicKey(address player) external view returns (uint256 x, uint256 y) {
        GameTypes.Point storage pk = _publicKeys[player];
        return (pk.x, pk.y);
    }

    function getDealtCard(uint256 cardIndex)
        external
        view
        returns (
            address owner_,
            uint256 c1x,
            uint256 c1y,
            uint256 c2x,
            uint256 c2y,
            uint256 currentX,
            uint256 currentY,
            uint8 partialCount,
            bool revealReady,
            bool revealed,
            uint8 revealedCardId,
            uint8 revealedRank
        )
    {
        DealtCardState storage card = _dealtCards[cardIndex];

        return (
            card.owner,
            card.originalCiphertext.c1.x,
            card.originalCiphertext.c1.y,
            card.originalCiphertext.c2.x,
            card.originalCiphertext.c2.y,
            card.currentPoint.x,
            card.currentPoint.y,
            card.partialCount,
            card.revealReady,
            card.revealed,
            card.revealedCardId,
            card.revealedRank
        );
    }


    // =============================================================
    //                      INTERNAL VALIDATION
    // =============================================================

    function _validatePointMemory(GameTypes.Point memory p) internal pure {
        if (p.x >= BABYJUB_Q || p.y >= BABYJUB_Q) revert InvalidPoint();

        if (p.x == 0 && p.y == 0) revert InvalidPoint();
        if (p.x == 0 && p.y == 1) revert InvalidPoint();

        uint256 x2 = mulmod(p.x, p.x, BABYJUB_Q);
        uint256 y2 = mulmod(p.y, p.y, BABYJUB_Q);

        uint256 left = addmod(
            mulmod(BABYJUB_A, x2, BABYJUB_Q),
            y2,
            BABYJUB_Q
        );

        uint256 right = addmod(
            1,
            mulmod(
                BABYJUB_D,
                mulmod(x2, y2, BABYJUB_Q),
                BABYJUB_Q
            ),
            BABYJUB_Q
        );

        if (left != right) revert InvalidPoint();
    }

    function _playerIndex(address player) internal view returns (uint256) {
        uint256 idxPlusOne = playerIndexPlusOne[player];
        if (idxPlusOne == 0) revert NotJoined();
        return idxPlusOne - 1;
    }

    function _matchesPartialDecryptPublicSignals(
        uint256 cardIndex,
        uint256[8] calldata publicSignals
    ) internal view returns (bool) {
        if (cardIndex >= _dealtCards.length) {
            return false;
        }

        DealtCardState storage card = _dealtCards[cardIndex];
        GameTypes.Point storage playerPk = _publicKeys[msg.sender];

        if (publicSignals[0] != playerPk.x) return false;
        if (publicSignals[1] != playerPk.y) return false;

        if (publicSignals[2] != card.originalCiphertext.c1.x) return false;
        if (publicSignals[3] != card.originalCiphertext.c1.y) return false;

        if (publicSignals[4] != card.currentPoint.x) return false;
        if (publicSignals[5] != card.currentPoint.y) return false;

        return true;
    }

    function _matchesRevealPublicSignals(
        uint256 cardIndex,
        uint256[8] calldata publicSignals
    ) internal view returns (bool) {
        if (cardIndex >= _dealtCards.length) {
            return false;
        }

        DealtCardState storage card = _dealtCards[cardIndex];
        GameTypes.Point storage playerPk = _publicKeys[msg.sender];

        if (publicSignals[0] != playerPk.x) return false;
        if (publicSignals[1] != playerPk.y) return false;

        if (publicSignals[2] != card.originalCiphertext.c1.x) return false;
        if (publicSignals[3] != card.originalCiphertext.c1.y) return false;

        if (publicSignals[4] != card.currentPoint.x) return false;
        if (publicSignals[5] != card.currentPoint.y) return false;

        return true;
    }

    function _pointHash(GameTypes.Point memory p) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(p.x, p.y));
    }

    function _cardIdOf(GameTypes.Point memory openedPoint) internal view returns (uint8) {
        uint8 stored = pointHashToCardIdPlusOne[_pointHash(openedPoint)];
        if (stored == 0) revert InvalidRevealPoint();
        return stored - 1;
    }

    function _rankOf(uint8 cardId) internal pure returns (uint8) {
        return (cardId % 13) + 1;
    }

    function _settlePot() internal {
        uint256 pot = handPot;
        uint256 rake = (pot * rakeBps) / 10000;
        uint256 payout = pot - rake;

        handPot = 0;
        rakeAccrued += rake;

        if (isTie) {
            uint256 half = payout / 2;
            tableBalance[_players[0]] += half;
            tableBalance[_players[1]] += payout - half;
        } else {
            tableBalance[winner] += payout;
        }

        phase = GameTypes.Phase.Settled;

        _clearBettingState();

        actionDeadline = 0;
        emit PhaseAdvanced(phase);

        _tryStartNextHand();
    }

    function _settlePotNoAutoStart() internal {
        uint256 pot = handPot;
        uint256 rake = (pot * rakeBps) / 10000;
        uint256 payout = pot - rake;

        handPot = 0;
        rakeAccrued += rake;

        if (isTie) {
            uint256 half = payout / 2;
            tableBalance[_players[0]] += half;
            tableBalance[_players[1]] += payout - half;
        } else {
            tableBalance[winner] += payout;
        }

        phase = GameTypes.Phase.Settled;
        
         _clearBettingState();

        actionDeadline = 0;
        emit PhaseAdvanced(phase);
    }

    function _resetRoundState() internal {
        // Reset per-player round state
        for (uint256 i = 0; i < _players.length; ) {
            address player = _players[i];

           // hasSubmittedKey[player] = false;
            hasShuffled[player] = false;
           // delete _publicKeys[player];

            delete hasSubmittedBestHand[player];
            delete submittedBestHandScore[player];
            delete submittedBestHandIndexes[player];

            unchecked {
                ++i;
            }
        }

        _clearBettingState();

        bestHandSubmitCount = 0;

        // publicKeyCount = 0;

        // delete aggregatePk;
        // aggregatePkSubmitted = false;

        initialDeckSubmitted = false;
        currentDeckCommit = 0;

        shuffleCount = 0;

        delete _dealtCards;
        dealtCardCount = 0;
        cardsReadyForRevealCount = 0;
        revealCount = 0;

        isTie = false;

        winningHandCategory = 0;
        winner = address(0);
    }

    function _submod(uint256 a, uint256 b) internal pure returns (uint256) {
    return addmod(a, BABYJUB_Q - b, BABYJUB_Q);
}

    function _modInv(uint256 x) internal view returns (uint256 result) {
        require(x != 0, "INV_ZERO");

        uint256[6] memory input;
        input[0] = 32; // base length
        input[1] = 32; // exponent length
        input[2] = 32; // modulus length
        input[3] = x;
        input[4] = BABYJUB_Q - 2;
        input[5] = BABYJUB_Q;

        uint256[1] memory output;

        bool success;

        assembly {
            success := staticcall(
                gas(),
                5,
                input,
                0xc0,
                output,
                0x20
            )
        }

        require(success, "INV_FAILED");

        result = output[0];
    }

    function _babyJubAdd(
        GameTypes.Point memory p1,
        GameTypes.Point memory p2
    ) internal view returns (GameTypes.Point memory r) {
        uint256 x1x2 = mulmod(p1.x, p2.x, BABYJUB_Q);
        uint256 y1y2 = mulmod(p1.y, p2.y, BABYJUB_Q);
        uint256 x1y2 = mulmod(p1.x, p2.y, BABYJUB_Q);
        uint256 y1x2 = mulmod(p1.y, p2.x, BABYJUB_Q);

        uint256 xyxy = mulmod(x1x2, y1y2, BABYJUB_Q);
        uint256 dxyxy = mulmod(BABYJUB_D, xyxy, BABYJUB_Q);

        uint256 xNum = addmod(x1y2, y1x2, BABYJUB_Q);
        uint256 xDen = addmod(1, dxyxy, BABYJUB_Q);

        uint256 yNum = _submod(
            y1y2,
            mulmod(BABYJUB_A, x1x2, BABYJUB_Q)
        );
        uint256 yDen = _submod(1, dxyxy);

        if (xDen == 0 || yDen == 0) revert InvalidPoint();

        r.x = mulmod(xNum, _modInv(xDen), BABYJUB_Q);
        r.y = mulmod(yNum, _modInv(yDen), BABYJUB_Q);
    }

    function _computeAggregatePublicKey() internal view returns (GameTypes.Point memory acc) {
        // Edwards identity point
        acc = GameTypes.Point({x: 0, y: 1});

        for (uint256 i = 0; i < _players.length; ) {
            acc = _babyJubAdd(acc, _publicKeys[_players[i]]);

            unchecked {
                ++i;
            }
        }

        if (acc.x == 0 && acc.y == 1) revert InvalidPoint();

        return acc;
    }

    function _allSeatedPlayersHaveKeys() internal view returns (bool) {
        if (_players.length != maxPlayers) return false;

        for (uint256 i = 0; i < _players.length; ) {
            if (!hasSubmittedKey[_players[i]]) {
                return false;
            }

            unchecked {
                ++i;
            }
        }

        return true;
    }

    function _refreshDeadline() internal {
        actionDeadline = block.timestamp + ACTION_TIMEOUT;

        emit DeadlineExtended(actionDeadline);
    }

    function _refundAllPlayers() internal {
        uint256 pot = handPot;
        handPot = 0;

        uint256 half = pot / 2;

        tableBalance[_players[0]] += half;
        tableBalance[_players[1]] += pot - half;

        _clearBettingState();

        actionDeadline = 0;
        phase = GameTypes.Phase.Settled;

        emit GameRefunded();
        emit PhaseAdvanced(phase);

        _tryStartNextHand();
    }

    function _otherPlayer(address player) internal view returns (address) {
        if (_players.length != 2) revert InvalidPlayerCount();

        if (_players[0] == player) return _players[1];
        if (_players[1] == player) return _players[0];

        revert NotJoined();
    }

    ///////////////////// TIMEOUT CLAIMS ////////////////////
    function claimTimeoutVictory() external onlyPlayer nonReentrant {
        if (block.timestamp <= actionDeadline) {
            revert TimeoutNotReached();
        }

        // Betting timeout: the player whose turn it is loses.
        if (bettingRoundOpen) {
            address loser = actionPlayer;
            address winner_ = _otherPlayer(loser);

            winner = winner_;
            isTie = false;

            _settlePot();

            emit PlayerForfeited(loser, winner_);
            return;
        }

        // Best-hand submission timeout.
        if (phase == GameTypes.Phase.HandScoring) {
            address p0 = _players[0];
            address p1 = _players[1];

            if (hasSubmittedBestHand[p0] && !hasSubmittedBestHand[p1]) {
                winner = p0;
                isTie = false;
                _settlePot();
                emit TimeoutVictory(p0);
                return;
            }

            if (hasSubmittedBestHand[p1] && !hasSubmittedBestHand[p0]) {
                winner = p1;
                isTie = false;
                _settlePot();
                emit TimeoutVictory(p1);
                return;
            }

            // Nobody submitted: neutral refund, then auto-start if both still have balance.
            if (!hasSubmittedBestHand[p0] && !hasSubmittedBestHand[p1]) {
                _refundAllPlayers();
                return;
            }

            revert NoTimeoutWinner();
        }

        // Card reveal / partial decrypt timeout.
        if (phase == GameTypes.Phase.CardsDealing && !bettingRoundOpen) {
            address expected = address(0);

            if (bettingStreet == BettingStreet.None) {
                bool p0Done =
                    hasSubmittedPartialDecrypt[roundId][1][_players[0]] &&
                    hasSubmittedPartialDecrypt[roundId][3][_players[0]];

                bool p1Done =
                    hasSubmittedPartialDecrypt[roundId][0][_players[1]] &&
                    hasSubmittedPartialDecrypt[roundId][2][_players[1]];

                if (p0Done && !p1Done && msg.sender == _players[0]) {
                    winner = _players[0];
                    isTie = false;
                    _settlePot();
                    emit TimeoutVictory(msg.sender);
                    return;
                }

                if (p1Done && !p0Done && msg.sender == _players[1]) {
                    winner = _players[1];
                    isTie = false;
                    _settlePot();
                    emit TimeoutVictory(msg.sender);
                    return;
                }

                if (!p0Done && !p1Done) {
                    _refundAllPlayers();
                    return;
                }

                revert NoTimeoutWinner();
            }

            if (bettingStreet == BettingStreet.Flop) {
                expected = _readyRange(4, 6) ? _players[0] : _players[1];
            } else if (bettingStreet == BettingStreet.Turn) {
                expected = _dealtCards[7].revealReady ? _players[0] : _players[1];
            } else if (bettingStreet == BettingStreet.River) {
                expected = _dealtCards[8].revealReady ? _players[0] : _players[1];
            } else if (bettingStreet == BettingStreet.Showdown) {
                expected = _expectedShowdownRevealer();
            }

            if (expected == address(0)) revert NoTimeoutWinner();
            if (msg.sender == expected) revert NoTimeoutWinner();

            winner = msg.sender;
            isTie = false;

            _settlePot();

            emit TimeoutVictory(msg.sender);
            return;
        }

        // Public key submission timeout.
        if (phase == GameTypes.Phase.PlayersJoined) {
            bool senderSubmitted = hasSubmittedKey[msg.sender];
            uint256 submitters = publicKeyCount;

            if (submitters == 0) {
                _refundAllPlayers();
                return;
            }

            if (senderSubmitted && submitters == 1) {
                winner = msg.sender;
                isTie = false;
                _settlePot();
                emit TimeoutVictory(msg.sender);
                return;
            }

            revert NoTimeoutWinner();
        }

        // Initial deck timeout.
        if (phase == GameTypes.Phase.KeysSubmitted) {
            address expectedPlayer = _players[0];

            if (msg.sender == expectedPlayer) revert NoTimeoutWinner();

            winner = msg.sender;
            isTie = false;
            _settlePot();
            emit TimeoutVictory(msg.sender);
            return;
        }

        // Shuffle timeout.
        if (phase == GameTypes.Phase.PlayersShuffling) {
            address expectedPlayer = _players[shuffleCount];

            if (msg.sender == expectedPlayer) revert NoTimeoutWinner();

            winner = msg.sender;
            isTie = false;
            _settlePot();
            emit TimeoutVictory(msg.sender);
            return;
        }

        revert NoTimeoutWinner();
    }

    function leaveGame() external onlyPlayer nonReentrant {
        address leavingPlayer = msg.sender;

        // Waiting table / no active hand.
        if (phase == GameTypes.Phase.Created) {
            _cashOutTableBalance(leavingPlayer);
            _removeSeatOnly(leavingPlayer);

            if (_players.length == 0) {
                _resetTableToCreated();
            }

            return;
        }

        // After hand is settled, leaving removes the player from the table.
        if (phase == GameTypes.Phase.Settled) {
            _cashOutTableBalance(leavingPlayer);
            _removeSeatOnly(leavingPlayer);

            if (_players.length == 0) {
                _resetTableToCreated();
                return;
            }

            phase = GameTypes.Phase.Created;
            actionDeadline = 0;

            emit PhaseAdvanced(phase);
            return;
        }

        // Active hand: leaving = fold/forfeit.
        address winner_ = _otherPlayer(leavingPlayer);

        winner = winner_;
        isTie = false;

        _settlePotNoAutoStart();

        emit PlayerForfeited(leavingPlayer, winner_);

        _cashOutTableBalance(leavingPlayer);
        _removeSeatOnly(leavingPlayer);

        if (_players.length == 0) {
            _resetTableToCreated();
            return;
        }

        phase = GameTypes.Phase.Created;
        actionDeadline = 0;

        emit PhaseAdvanced(phase);
        return;
    }

    function _resetTableToCreated() internal {

        _clearBettingState();
        handPot = 0;

        for (uint256 i = 0; i < _players.length; ) {
            address p = _players[i];

            delete playerIndexPlusOne[p];
            delete hasShuffled[p];

            delete hasSubmittedBestHand[p];
            delete submittedBestHandScore[p];
            delete submittedBestHandIndexes[p];

            unchecked {
                ++i;
            }
        }

        bestHandSubmitCount = 0;

        delete _players;
        delete _dealtCards;

        delete aggregatePk;
        aggregatePkSubmitted = false;

        initialDeckSubmitted = false;
        currentDeckCommit = 0;

        shuffleCount = 0;

        dealtCardCount = 0;
        cardsReadyForRevealCount = 0;
        revealCount = 0;

        winner = address(0);
        isTie = false;

        actionDeadline = 0;

        roundId = 0;

        phase = GameTypes.Phase.Created;

        emit PhaseAdvanced(phase);
    }

    function _removeSeatOnly(address player) internal {
        uint256 idxPlusOne = playerIndexPlusOne[player];
        if (idxPlusOne == 0) revert NotJoined();

        uint256 idx = idxPlusOne - 1;
        uint256 lastIdx = _players.length - 1;

        if (idx != lastIdx) {
            address lastPlayer = _players[lastIdx];
            _players[idx] = lastPlayer;
            playerIndexPlusOne[lastPlayer] = idx + 1;
        }

        _players.pop();
        delete playerIndexPlusOne[player];

        delete hasShuffled[player];

        delete hasSubmittedBestHand[player];
        delete submittedBestHandScore[player];
        delete submittedBestHandIndexes[player];

        emit PlayerLeft(player);
    }

    function _dealtCardOwner(uint256 cardIndex) internal view returns (address) {
        // Private cards
        if (cardIndex == 0) return _players[0];
        if (cardIndex == 1) return _players[1];
        if (cardIndex == 2) return _players[0];
        if (cardIndex == 3) return _players[1];

        // Community cards: player 0 acts as dealer / final revealer
        if (cardIndex >= COMMUNITY_CARD_START_INDEX && cardIndex < POKER_DEALT_CARD_COUNT) {
            return _players[0];
        }

        revert DealtCardIndexOutOfBounds();
    }

////////////////////////////////////////////////////
    ////////// poker hand mechanisms //////////////
    /////////////////////////////////////////////

    function submitBestHand(uint8[5] calldata cardIndexes)
        external
        onlyPlayer
        beforeDeadline
    {
        if (phase != GameTypes.Phase.HandScoring) {
            revert WrongPhase(GameTypes.Phase.HandScoring, phase);
        }

        if (hasSubmittedBestHand[msg.sender]) {
            revert HandAlreadySubmitted();
        }

        uint8[5] memory cardIds = _validateAndGetSubmittedCardIds(
            msg.sender,
            cardIndexes
        );

        uint256 score = PokerHandEvaluator.scoreFiveCardPokerHand(cardIds);

        hasSubmittedBestHand[msg.sender] = true;
        submittedBestHandScore[msg.sender] = score;
        submittedBestHandIndexes[msg.sender] = cardIndexes;

        unchecked {
            ++bestHandSubmitCount;
        }

        emit BestHandSubmitted(msg.sender, score, cardIndexes);

        if (bestHandSubmitCount == maxPlayers) {
            _settleBySubmittedHands();
        } else {
            _refreshDeadline();
        }
    }

    function _validateAndGetSubmittedCardIds(
        address player,
        uint8[5] calldata cardIndexes
    ) internal view returns (uint8[5] memory cardIds) {
        bool[9] memory used;

        for (uint256 i = 0; i < 5; ) {
            uint8 cardIndex = cardIndexes[i];

            if (cardIndex >= POKER_DEALT_CARD_COUNT) {
                revert InvalidSubmittedHand();
            }

            if (used[cardIndex]) {
                revert InvalidSubmittedHand();
            }

            used[cardIndex] = true;

            if (!_cardUsableByPlayer(player, cardIndex)) {
                revert InvalidSubmittedHand();
            }

            DealtCardState storage card = _dealtCards[cardIndex];

            if (!card.revealed) {
                revert InvalidSubmittedHand();
            }

            cardIds[i] = card.revealedCardId;

            unchecked {
                ++i;
            }
        }
    }

    function _cardUsableByPlayer(address player, uint8 cardIndex)
        internal
        view
        returns (bool)
    {
        if (player == _players[0]) {
            return (
                cardIndex == 0 ||
                cardIndex == 2 ||
                cardIndex >= COMMUNITY_CARD_START_INDEX
            );
        }

        if (player == _players[1]) {
            return (
                cardIndex == 1 ||
                cardIndex == 3 ||
                cardIndex >= COMMUNITY_CARD_START_INDEX
            );
        }

        return false;
    }

    function _settleBySubmittedHands() internal {
        uint256 p0Score = submittedBestHandScore[_players[0]];
        uint256 p1Score = submittedBestHandScore[_players[1]];

        uint256 winningScore;

        if (p0Score > p1Score) {
            winner = _players[0];
            isTie = false;
            winningScore = p0Score;
        } else if (p1Score > p0Score) {
            winner = _players[1];
            isTie = false;
            winningScore = p1Score;
        } else {
            winner = address(0);
            isTie = true;
            winningScore = p0Score;
        }

        winningHandCategory = PokerHandEvaluator.categoryFromScore(winningScore);

        emit HandResult(
            roundId,
            winner,
            isTie,
            winningHandCategory
        );

        _settlePot();
    }

    function _cardCanBePartialDecryptedNow(uint256 cardIndex) internal view returns (bool) {
        if (bettingRoundOpen) return false;

        if (bettingStreet == BettingStreet.None) {
            return cardIndex < PRIVATE_CARD_COUNT; // private cards only
        }

        if (bettingStreet == BettingStreet.Flop) {
            return cardIndex >= 4 && cardIndex <= 6;
        }

        if (bettingStreet == BettingStreet.Turn) {
            return cardIndex == 7;
        }

        if (bettingStreet == BettingStreet.River) {
            return cardIndex == 8;
        }

        if (bettingStreet == BettingStreet.Showdown) {
            return false;
        }

        return false;
    }

    function _cardCanBeRevealedNow(uint256 cardIndex) internal view returns (bool) {
        if (bettingRoundOpen) return false;

        if (bettingStreet == BettingStreet.Flop) {
            return cardIndex >= 4 && cardIndex <= 6;
        }

        if (bettingStreet == BettingStreet.Turn) {
            return cardIndex == 7;
        }

        if (bettingStreet == BettingStreet.River) {
            return cardIndex == 8;
        }

        if (bettingStreet == BettingStreet.Showdown) {
            return cardIndex < PRIVATE_CARD_COUNT;
        }

        return false;
    }

    function _afterCardRevealProgress() internal {
        if (bettingStreet == BettingStreet.Flop && _revealedRange(4, 6)) {
            _startBettingRound(BettingStreet.Flop);
            return;
        }

        if (bettingStreet == BettingStreet.Turn && _dealtCards[7].revealed) {
            _startBettingRound(BettingStreet.Turn);
            return;
        }

        if (bettingStreet == BettingStreet.River && _dealtCards[8].revealed) {
            _startBettingRound(BettingStreet.River);
            return;
        }

        if (bettingStreet == BettingStreet.Showdown && _revealedRange(0, 3)) {
            phase = GameTypes.Phase.HandScoring;
            _refreshDeadline();
            emit PhaseAdvanced(phase);
            return;
        }
    }

    function _revealedRange(uint256 from, uint256 to) internal view returns (bool) {
        for (uint256 i = from; i <= to; ) {
            if (!_dealtCards[i].revealed) return false;
            unchecked { ++i; }
        }

        return true;
    }

///////////////// check bet call fold ///////////////

    function check() external onlyPlayer beforeDeadline nonReentrant {
        if (!bettingRoundOpen) revert BettingRoundNotOpen();
        if (msg.sender != actionPlayer) revert NotActionPlayer();

        if (committedThisStreet[msg.sender] != currentBet) {
            revert CannotCheck();
        }

        actedThisStreet[msg.sender] = true;

        emit PlayerChecked(msg.sender, uint8(bettingStreet));

        if (_bettingRoundComplete()) {
            _closeBettingRound();
        } else {
            actionPlayer = _otherPlayer(msg.sender);
            _refreshDeadline();
        }
    }

    function bet(uint256 amount) external onlyPlayer beforeDeadline nonReentrant {
        if (!bettingRoundOpen) revert BettingRoundNotOpen();
        if (msg.sender != actionPlayer) revert NotActionPlayer();
        if (amount == 0) revert InvalidBetAmount();

        address opponent = _otherPlayer(msg.sender);

        uint256 senderCommitted = committedThisStreet[msg.sender];
        uint256 opponentCommitted = committedThisStreet[opponent];

        uint256 newSenderCommitted = senderCommitted + amount;

        // First bet: must be at least minBet.
        if (currentBet == 0) {
            if (amount < minBet) revert InvalidBetAmount();
        } else {
            // Raise/re-raise: must first beat currentBet.
            if (newSenderCommitted <= currentBet) revert InvalidBetAmount();

            uint256 raiseAmount = newSenderCommitted - currentBet;

            // Minimum raise must be at least the current bet size.
            // Example: currentBet = 100, raising player must go to at least 200.
            if (raiseAmount < currentBet) revert InvalidBetAmount();
        }

        // Cap bet/raise so opponent can call all-in, but not more.
        uint256 opponentMaxReachableCommitment =
            opponentCommitted + tableBalance[opponent];

        if (newSenderCommitted > opponentMaxReachableCommitment) {
            newSenderCommitted = opponentMaxReachableCommitment;
            amount = newSenderCommitted - senderCommitted;
        }

        if (newSenderCommitted <= currentBet && currentBet != 0) {
            revert InvalidBetAmount();
        }

        if (amount == 0) revert InvalidBetAmount();
        if (tableBalance[msg.sender] < amount) revert InvalidBuyIn();

        tableBalance[msg.sender] -= amount;

        committedThisStreet[msg.sender] = newSenderCommitted;
        handPot += amount;
        currentBet = newSenderCommitted;

        actedThisStreet[msg.sender] = true;
        actedThisStreet[opponent] = false;

        actionPlayer = opponent;

        emit PlayerBet(msg.sender, uint8(bettingStreet), amount);

        _refreshDeadline();
    }

    function callBet() external onlyPlayer beforeDeadline nonReentrant {
        if (!bettingRoundOpen) revert BettingRoundNotOpen();
        if (msg.sender != actionPlayer) revert NotActionPlayer();

        uint256 committed = committedThisStreet[msg.sender];

        if (currentBet <= committed) revert NoBetToCall();

        uint256 amountToCall = currentBet - committed;

        if (tableBalance[msg.sender] < amountToCall) revert InvalidBuyIn();

        tableBalance[msg.sender] -= amountToCall;

        committedThisStreet[msg.sender] = currentBet;
        handPot += amountToCall;

        actedThisStreet[msg.sender] = true;

        emit PlayerCalled(msg.sender, uint8(bettingStreet), amountToCall);

        _closeBettingRound();
    }

    function fold() external onlyPlayer beforeDeadline nonReentrant {
        if (!bettingRoundOpen) revert BettingRoundNotOpen();
        if (msg.sender != actionPlayer) revert NotActionPlayer();

        address winner_ = _otherPlayer(msg.sender);

        winner = winner_;
        isTie = false;

        uint256 pot = handPot;
        _settlePot();

        emit PlayerFolded(msg.sender, winner_, pot);
    }

    //////////////////////////////////

    function _startBettingRound(BettingStreet street_) internal {
        bettingStreet = street_;
        bettingRoundOpen = true;
        currentBet = 0;

        for (uint256 i = 0; i < _players.length; ) {
            committedThisStreet[_players[i]] = 0;
            actedThisStreet[_players[i]] = false;
            unchecked { ++i; }
        }

        if (street_ == BettingStreet.Preflop) {
            actionPlayer = _players[0];
        } else {
            actionPlayer = _players[1];
        }

        _refreshDeadline();

        emit BettingRoundStarted(uint8(street_), actionPlayer);
    }

    function _bettingRoundComplete() internal view returns (bool) {
        address p0 = _players[0];
        address p1 = _players[1];

        return
            actedThisStreet[p0] &&
            actedThisStreet[p1] &&
            committedThisStreet[p0] == committedThisStreet[p1];
    }

    function _closeBettingRound() internal {
        emit BettingRoundClosed(uint8(bettingStreet));

        bettingRoundOpen = false;
        currentBet = 0;

        for (uint256 i = 0; i < _players.length; ) {
            committedThisStreet[_players[i]] = 0;
            actedThisStreet[_players[i]] = false;
            unchecked { ++i; }
        }

        if (bettingStreet == BettingStreet.Preflop) {
            bettingStreet = BettingStreet.Flop;
            phase = GameTypes.Phase.CardsDealing;
            _refreshDeadline();
            return;
        }

        if (bettingStreet == BettingStreet.Flop) {
            bettingStreet = BettingStreet.Turn;
            phase = GameTypes.Phase.CardsDealing;
            _refreshDeadline();
            return;
        }

        if (bettingStreet == BettingStreet.Turn) {
            bettingStreet = BettingStreet.River;
            phase = GameTypes.Phase.CardsDealing;
            _refreshDeadline();
            return;
        }

        if (bettingStreet == BettingStreet.River) {
            bettingStreet = BettingStreet.Showdown;
            phase = GameTypes.Phase.CardsDealing;
            _refreshDeadline();
            emit PhaseAdvanced(phase);
            return;
        }
    }

    function depositToTable(uint256 amount) external onlyPlayer nonReentrant {
        if (phase != GameTypes.Phase.Created && phase != GameTypes.Phase.Settled) {
            revert WrongPhase(GameTypes.Phase.Created, phase);
        }

        if (amount == 0) revert InvalidBuyIn();

        gameToken.safeTransferFrom(msg.sender, address(this), amount);
        tableBalance[msg.sender] += amount;

        _tryStartNextHand();
    }

    function withdrawTableBalance(uint256 amount) external onlyPlayer nonReentrant {
        if (phase != GameTypes.Phase.Settled && phase != GameTypes.Phase.Created) {
            revert WrongPhase(GameTypes.Phase.Settled, phase);
        }

        if (amount == 0 || tableBalance[msg.sender] < amount) revert InvalidBuyIn();

        tableBalance[msg.sender] -= amount;
        gameToken.safeTransfer(msg.sender, amount);
    }

    function _tryStartNextHand() internal {
        if (_players.length != maxPlayers) return;

        address p0 = _players[0];
        address p1 = _players[1];

        if (tableBalance[p0] < bigBlindAmount) return;
        if (tableBalance[p1] < bigBlindAmount) return;

        tableBalance[p0] -= bigBlindAmount;
        tableBalance[p1] -= bigBlindAmount;

        handPot = bigBlindAmount * maxPlayers;

        _resetRoundState();

        unchecked {
            ++roundId;
        }

        if (_allSeatedPlayersHaveKeys()) {
            aggregatePk = _computeAggregatePublicKey();
            aggregatePkSubmitted = true;

            phase = GameTypes.Phase.KeysSubmitted;

            emit AggregatePublicKeySubmitted(aggregatePk.x, aggregatePk.y);
        } else {
            delete aggregatePk;
            aggregatePkSubmitted = false;

            phase = GameTypes.Phase.PlayersJoined;
        }
        _refreshDeadline();

        emit RoundStarted(roundId);
        emit PhaseAdvanced(phase);
    }

    function _cashOutTableBalance(address player) internal {
        uint256 amount = tableBalance[player];
        if (amount > 0) {
            tableBalance[player] = 0;
            claimableWinnings[player] += amount;
        }
    }

    function _readyRange(uint256 from, uint256 to) internal view returns (bool) {
        for (uint256 i = from; i <= to; ) {
            if (!_dealtCards[i].revealReady) return false;
            unchecked { ++i; }
        }

        return true;
    }

    function _expectedShowdownRevealer() internal view returns (address) {
        for (uint256 i = 0; i < PRIVATE_CARD_COUNT; ) {
            if (!_dealtCards[i].revealed) {
                return _dealtCards[i].owner;
            }

            unchecked {
                ++i;
            }
        }

        return address(0);
    }

    function _clearBettingState() internal {
        bettingStreet = BettingStreet.None;
        bettingRoundOpen = false;
        actionPlayer = address(0);
        currentBet = 0;

        for (uint256 i = 0; i < _players.length; ) {
            committedThisStreet[_players[i]] = 0;
            actedThisStreet[_players[i]] = false;
            unchecked { ++i; }
        }
    }
    
    ///////// Poseidon functions ///////

    function _validateCiphertext(GameTypes.Ciphertext calldata ct) internal pure {
        if (
            (ct.c1.x == 0 && ct.c1.y == 0) ||
            (ct.c2.x == 0 && ct.c2.y == 0)
        ) {
            revert InvalidCiphertext();
        }

        _validatePointMemory(ct.c1);
        _validatePointMemory(ct.c2);
    }

    function _commitCiphertextPoseidon(
        GameTypes.Ciphertext calldata ct
    ) internal view returns (uint256) {
        uint256[4] memory input = [
            ct.c1.x,
            ct.c1.y,
            ct.c2.x,
            ct.c2.y
        ];

        return poseidon4.poseidon(input);
    }

    function _commitDeckPoseidon(
        GameTypes.Ciphertext[] calldata deck_
    ) internal view returns (uint256) {
        uint256 running = 0;

        for (uint256 i = 0; i < deck_.length; ) {
            uint256 cardCommit = _commitCiphertextPoseidon(deck_[i]);

            uint256[2] memory foldInput = [
                running,
                cardCommit
            ];

            running = poseidon2.poseidon(foldInput);

            unchecked {
                ++i;
            }
        }

        return running;
    }
    ///////////////////////////////////////////

}