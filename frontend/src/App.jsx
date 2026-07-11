import TopBar from "./components/TopBar";
import GameTable from "./components/GameTable";
import ActionPanel from "./components/ActionPanel";
import Lobby from "./components/Lobby";

import { useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseEther
} from "ethers";

import {
  generatePokerKeypair,
  buildInitialEncryptedDeck,
  buildShuffleReencryptDeck,
  buildFinalShuffleDealDeck,
  partialDecryptCardLocal,
  locallyRevealCard,
  buildRevealCardLocal,
  privatePointToCardId
} from "./crypto/browserGameCrypto";

import gameAbi from "./contracts/ZKPokerGame.json";
import tokenAbi from "./contracts/GameToken.json";
import bankAbi from "./contracts/CasinoTokenBank.json";

import { groth16 } from "snarkjs";

import cardInfo from "./data/card_info.json";

import {
  GAME_ADDRESS,
  TOKEN_ADDRESS,
  BANK_ADDRESS
} from "./contracts/addresses";

import "./App.css";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");

  const [gameContract, setGameContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);

  const [phase, setPhase] = useState("");
  const [roundId, setRoundId] = useState("");
  const [handPot, setHandPot] = useState("");
  const [tableBalance, setTableBalance] = useState("");
  const [tokenBalance, setTokenBalance] = useState("");

  const [error, setError] = useState("");

  const [amount, setAmount] = useState("100");
  const [txLoading, setTxLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState("");

  const [claimableWinnings, setClaimableWinnings] = useState("");

  const [bigBlindAmount, setBigBlindAmount] = useState("");
  const [minBet, setMinBet] = useState("");
  const [actionDeadline, setActionDeadline] = useState("");
  const [bettingStreet, setBettingStreet] = useState("");
  const [bettingRoundOpen, setBettingRoundOpen] = useState("");
  const [actionPlayer, setActionPlayer] = useState("");
  const [currentBet, setCurrentBet] = useState("");
  const [winner, setWinner] = useState("");
  const [isTie, setIsTie] = useState("");

  const [publicKeyCount, setPublicKeyCount] = useState("");
  const [aggregatePkSubmitted, setAggregatePkSubmitted] = useState("");
  const [initialDeckSubmitted, setInitialDeckSubmitted] = useState("");
  const [currentDeckCommit, setCurrentDeckCommit] = useState("");
  const [shuffleCount, setShuffleCount] = useState("");
  const [dealtCardCount, setDealtCardCount] = useState("");
  const [cardsReadyForRevealCount, setCardsReadyForRevealCount] = useState("");
  const [revealCount, setRevealCount] = useState("");
  const [bestHandSubmitCount, setBestHandSubmitCount] = useState("");
  const [winningHandCategory, setWinningHandCategory] = useState("");

  const [playerCount, setPlayerCount] = useState("");
  const [player0, setPlayer0] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player0Pk, setPlayer0Pk] = useState({ x: "", y: "" });
  const [player1Pk, setPlayer1Pk] = useState({ x: "", y: "" });
  const [dealtCards, setDealtCards] = useState([]);

  const [localSk, setLocalSk] = useState("");
  const [localPk, setLocalPk] = useState({ x: "", y: "" });

  const [publicKeyProof, setPublicKeyProof] = useState(null);
  const [publicKeySignals, setPublicKeySignals] = useState(null);

  const [initialDeck, setInitialDeck] = useState(null);
  const [initialDeckCommitLocal, setInitialDeckCommitLocal] = useState("");
  const [initialDeckProof, setInitialDeckProof] = useState(null);
  const [initialDeckSignals, setInitialDeckSignals] = useState(null);

  const [shuffleInputDeck, setShuffleInputDeck] = useState(null);
  const [shuffleInputCommit, setShuffleInputCommit] = useState("");
  const [shuffledDeck, setShuffledDeck] = useState(null);
  const [shuffleDeckCommitLocal, setShuffleDeckCommitLocal] = useState("");
  const [shuffleProof, setShuffleProof] = useState(null);
  const [shuffleSignals, setShuffleSignals] = useState(null);

  const [finalShuffleInputDeck, setFinalShuffleInputDeck] = useState(null);
  const [finalShuffleInputCommit, setFinalShuffleInputCommit] = useState("");
  const [finalShuffleDeckCommitLocal, setFinalShuffleDeckCommitLocal] = useState("");
  const [finalShuffleProof, setFinalShuffleProof] = useState(null);
  const [finalShuffleSignals, setFinalShuffleSignals] = useState(null);

  const [partialDecryptProofsReady, setPartialDecryptProofsReady] = useState(false);
  const [myPrivateCards, setMyPrivateCards] = useState([]);

  const [communityCards, setCommunityCards] = useState([]);

  const [bestHandIndexes, setBestHandIndexes] = useState("");
  const [submittedHands, setSubmittedHands] = useState([]);

  const [bankContract, setBankContract] = useState(null);
  const [ethAmount, setEthAmount] = useState("0.01");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [tokenRate, setTokenRate] = useState("");
  const [ethReserve, setEthReserve] = useState("");

  const [myCommittedThisStreet, setMyCommittedThisStreet] = useState("0");
  const [toCall, setToCall] = useState("0");

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lastSeenRoundId, setLastSeenRoundId] = useState("");

  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [forceLobbyView, setForceLobbyView] = useState(false);

  const [player0TableBalance, setPlayer0TableBalance] = useState("0");
  const [player1TableBalance, setPlayer1TableBalance] = useState("0");

  const [player0Committed, setPlayer0Committed] = useState("0");
  const [player1Committed, setPlayer1Committed] = useState("0");

  const [showdownMessage, setShowdownMessage] = useState("");


  const PHASE_NAMES = [
    "Created",
    "PlayersJoined",
    "KeysSubmitted",
    "PlayersShuffling",
    "CardsDealing",
    "RevealingCards",
    "HandScoring",
    "Settled",
    "Cancelled"
  ];

  async function connectWallet() {
    setError("");

    try {
      if (!window.ethereum) {
        setError("MetaMask not installed.");
        return;
      }

      const p = new BrowserProvider(window.ethereum);

      await p.send("eth_requestAccounts", []);

      const s = await p.getSigner();

      const addr = await s.getAddress();

      const savedSk = localStorage.getItem(`zkpoker_sk_${addr}`);
      const savedPk = localStorage.getItem(`zkpoker_pk_${addr}`);

      if (savedSk && savedPk) {
        setLocalSk(savedSk);
        setLocalPk(JSON.parse(savedPk));
      }

      const network = await p.getNetwork();

      const game = new Contract(
        GAME_ADDRESS,
        gameAbi,
        s
      );

      const token = new Contract(
        TOKEN_ADDRESS,
        tokenAbi,
        s
      );

      const bank = new Contract(
        BANK_ADDRESS,
        bankAbi,
        s
      );

      setProvider(p);
      setSigner(s);

      setAccount(addr);
      setChainId(network.chainId.toString());

      setGameContract(game);
      setTokenContract(token);
      setBankContract(bank);

    } catch (err) {
      console.error(err);
      setError(err.message || "Wallet connection failed.");
    }
  }

  async function loadPlayersAndCards(game) {
    const count = await game.getPlayerCount();
    const countNumber = Number(count);

    let p0 = "";
    let p1 = "";
    let pk0 = { x: "", y: "" };
    let pk1 = { x: "", y: "" };

    let bal0 = "0";
    let bal1 = "0";

    if (countNumber > 0) {
      p0 = await game.getPlayer(0);

      const balance0 = await game.tableBalance(p0);
      bal0 = balance0.toString();

      const key0 = await game.getPublicKey(p0);
      pk0 = {
        x: key0[0].toString(),
        y: key0[1].toString()
      };
    }

    if (countNumber > 1) {
      p1 = await game.getPlayer(1);

      const balance1 = await game.tableBalance(p1);
      bal1 = balance1.toString();

      const key1 = await game.getPublicKey(p1);
      pk1 = {
        x: key1[0].toString(),
        y: key1[1].toString()
      };
    }

    const dealtCount = await game.dealtCardCount();
    const dealtCountNumber = Number(dealtCount);

    const cards = [];

    for (let i = 0; i < dealtCountNumber; i++) {
      const c = await game.getDealtCard(i);

      cards.push({
        index: i,
        owner: c[0],
        c1x: c[1].toString(),
        c1y: c[2].toString(),
        c2x: c[3].toString(),
        c2y: c[4].toString(),
        currentX: c[5].toString(),
        currentY: c[6].toString(),
        partialCount: c[7].toString(),
        revealReady: c[8],
        revealed: c[9],
        revealedCardId: c[10].toString(),
        revealedRank: c[11].toString()
      });
    }

    return {
      count: countNumber.toString(),
      p0,
      p1,
      pk0,
      pk1,
      bal0,
      bal1,
      cards
    };
  }

  async function loadGameState() {
    if (!gameContract || !tokenContract || !account) {
      return;
    }

    try {
      const [
        phaseValue,
        currentRound,
        currentHandPot,
        currentTableBalance,
        currentTokenBalance,
        currentClaimableWinnings,
        currentBigBlindAmount,
        currentMinBet,
        currentActionDeadline,
        currentBettingStreet,
        currentBettingRoundOpen,
        currentActionPlayer,
        currentBet,
        currentMyCommittedThisStreet,
        currentWinner,
        currentIsTie,

        currentPublicKeyCount,
        currentAggregatePkSubmitted,
        currentInitialDeckSubmitted,
        currentCurrentDeckCommit,
        currentShuffleCount,
        currentDealtCardCount,
        currentCardsReadyForRevealCount,
        currentRevealCount,
        currentBestHandSubmitCount,
        currentWinningHandCategory

      ] = await Promise.all([
        gameContract.phase(),
        gameContract.roundId(),
        gameContract.handPot(),
        gameContract.tableBalance(account),
        tokenContract.balanceOf(account),
        gameContract.claimableWinnings(account),
        gameContract.bigBlindAmount(),
        gameContract.minBet(),
        gameContract.actionDeadline(),
        gameContract.bettingStreet(),
        gameContract.bettingRoundOpen(),
        gameContract.actionPlayer(),
        gameContract.currentBet(),
        gameContract.committedThisStreet(account),
        gameContract.winner(),
        gameContract.isTie(),

        gameContract.publicKeyCount(),
        gameContract.aggregatePkSubmitted(),
        gameContract.initialDeckSubmitted(),
        gameContract.currentDeckCommit(),
        gameContract.shuffleCount(),
        gameContract.dealtCardCount(),
        gameContract.cardsReadyForRevealCount(),
        gameContract.revealCount(),
        gameContract.bestHandSubmitCount(),
        gameContract.winningHandCategory()
      ]);

      const playerCardState = await loadPlayersAndCards(gameContract);

      let p0Committed = "0";
      let p1Committed = "0";

      if (playerCardState.p0) {
        p0Committed = (await gameContract.committedThisStreet(playerCardState.p0)).toString();
      }

      if (playerCardState.p1) {
        p1Committed = (await gameContract.committedThisStreet(playerCardState.p1)).toString();
      }

      setPlayer0Committed(p0Committed);
      setPlayer1Committed(p1Committed);

      setPhase(PHASE_NAMES[Number(phaseValue)] || "Unknown");

      setRoundId(currentRound.toString());

      setHandPot(
        currentHandPot.toString()
      );

      setTableBalance(
        currentTableBalance.toString()
      );

      setTokenBalance(
        currentTokenBalance.toString()
      );

      setClaimableWinnings(currentClaimableWinnings.toString());

      setBigBlindAmount(currentBigBlindAmount.toString());
      setMinBet(currentMinBet.toString());
      setActionDeadline(currentActionDeadline.toString());
      setBettingStreet(currentBettingStreet.toString());
      setBettingRoundOpen(currentBettingRoundOpen.toString());
      setActionPlayer(currentActionPlayer);
      setCurrentBet(currentBet.toString());

      const committed = currentMyCommittedThisStreet.toString();
      setMyCommittedThisStreet(committed);

      const diff = BigInt(currentBet.toString()) - BigInt(committed);
      setToCall(diff > 0n ? diff.toString() : "0");

      setWinner(currentWinner);
      setIsTie(currentIsTie.toString());

      setPublicKeyCount(currentPublicKeyCount.toString());
      setAggregatePkSubmitted(currentAggregatePkSubmitted.toString());
      setInitialDeckSubmitted(currentInitialDeckSubmitted.toString());
      setCurrentDeckCommit(currentCurrentDeckCommit.toString());
      setShuffleCount(currentShuffleCount.toString());
      setDealtCardCount(currentDealtCardCount.toString());
      setCardsReadyForRevealCount(currentCardsReadyForRevealCount.toString());
      setRevealCount(currentRevealCount.toString());
      setBestHandSubmitCount(currentBestHandSubmitCount.toString());
      setWinningHandCategory(currentWinningHandCategory.toString());

      setPlayerCount(playerCardState.count);
      setPlayer0(playerCardState.p0);
      setPlayer1(playerCardState.p1);
      setPlayer0TableBalance(playerCardState.bal0);
      setPlayer1TableBalance(playerCardState.bal1);
      setPlayer0Pk(playerCardState.pk0);
      setPlayer1Pk(playerCardState.pk1);
      setDealtCards(playerCardState.cards);
      
      await rebuildRevealedCommunityCards();

    } catch (err) {
      console.error(err);
    }
  }

  async function approveTokens() {
    if (!tokenContract) return;

    try {
      setTxLoading(true);

      const tx = await tokenContract.approve(
        GAME_ADDRESS,
        BigInt(amount)
      );

      await tx.wait();

      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Approve failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function joinGame() {
    if (!gameContract) return;

    try {
      setTxLoading(true);

      const tx = await gameContract.joinGame(
        BigInt(amount)
      );

      await tx.wait();

      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Join game failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function depositToTable() {
    if (!gameContract) return;

    try {
      setTxLoading(true);

      const tx = await gameContract.depositToTable(
        BigInt(amount)
      );

      await tx.wait();

      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Deposit failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function leaveGame() {
    if (!gameContract) return;

    try {
      setTxLoading(true);

      const tx = await gameContract.leaveGame();

      await tx.wait();

      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Leave game failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function withdrawTableBalance() {
    if (!gameContract) return;

    try {
      setTxLoading(true);

      const tx = await gameContract.withdrawTableBalance(
        BigInt(amount)
      );

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Withdraw table balance failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function withdrawWinnings() {
    if (!gameContract) return;

    try {
      setTxLoading(true);

      const tx = await gameContract.withdrawWinnings();

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Withdraw winnings failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function claimTimeoutVictory() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const tx = await gameContract.claimTimeoutVictory();

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);

      const msg = err?.message || "";

      if (
        msg.includes("0x1f1cc6d0") ||
        msg.toLowerCase().includes("execution reverted")
      ) {
        setError("You cannot claim this timeout. The opponent must be the player who timed out.");
        return;
      }

      setError("Claim timeout victory failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function checkAction() {
    if (blockIfTimeoutReached()) return;
    try {
      setError("");

      const tx = await gameContract.check();
      await tx.wait();

      await loadGameState();

    } catch (err) {
      console.error(err);

      const msg = err?.message || "";

      if (
        msg.includes("0x782b2f28") ||
        msg.toLowerCase().includes("execution reverted")
      ) {
        setError("Check is not available. Call the bet or Fold.");
        return;
      }

      setError("Check failed.");
    }
  }

  async function betAction() {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const tx = await gameContract.bet(BigInt(amount));

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);

      const msg = err?.message || "";

      if (
        msg.includes("0x9de3d441") ||
        msg.toLowerCase().includes("execution reverted")
      ) {
        setError("Bet / Raise is too small.");
        return;
      }

      setError(err.message || "Bet failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function callBetAction() {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      const tx = await gameContract.callBet();
      await tx.wait();
      await loadGameState();
    } catch (err) {
      console.error(err);
      setError(err.message || "Call bet failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function foldAction() {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      const tx = await gameContract.fold();
      await tx.wait();
      await loadGameState();
    } catch (err) {
      console.error(err);
      setError(err.message || "Fold failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function generatePublicKeyLocal() {
    try {
      setTxLoading(true);
      setError("");

      const savedSk = localStorage.getItem(`zkpoker_sk_${account}`);
      const savedPk = localStorage.getItem(`zkpoker_pk_${account}`);

      if (savedSk && savedPk) {
        const parsedPk = JSON.parse(savedPk);

        setLocalSk(savedSk);
        setLocalPk(parsedPk);

        console.log("Reused saved keypair:", parsedPk);
        return;
      }

      const keypair = await generatePokerKeypair();

      setLocalSk(keypair.sk);
      setLocalPk(keypair.pk);

      localStorage.setItem(`zkpoker_sk_${account}`, keypair.sk);
      localStorage.setItem(`zkpoker_pk_${account}`, JSON.stringify(keypair.pk));

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate keypair.");
    } finally {
      setTxLoading(false);
    }
  }

  function formatProofForSolidity(proof) {
    return {
      a: [
        proof.pi_a[0],
        proof.pi_a[1]
      ],
      b: [
        [
          proof.pi_b[0][1],
          proof.pi_b[0][0]
        ],
        [
          proof.pi_b[1][1],
          proof.pi_b[1][0]
        ]
      ],
      c: [
        proof.pi_c[0],
        proof.pi_c[1]
      ]
    };
  }

  function parseSolidityCalldata(calldata) {
    const argv = JSON.parse(`[${calldata}]`);

    const a = argv[0];
    const b = argv[1];
    const c = argv[2];
    const publicSignals = argv[3];

    return {
      proof: {
        a,
        b,
        c
      },
      publicSignals
    };
  }

  async function generatePublicKeyProof() {
    try {
      setTxLoading(true);
      setError("");

      if (!localSk || !localPk.x || !localPk.y) {
        setError("Generate local public key first.");
        return;
      }

      const input = {
        pk: [
          localPk.x,
          localPk.y
        ],
        sk: localSk
      };

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/circuits/publickey/publickey1.wasm",
        "/circuits/publickey/pk_final.zkey"
      );

      const solidityProof = formatProofForSolidity(proof);

      setPublicKeyProof(solidityProof);
      setPublicKeySignals(publicSignals);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate public key proof.");
    } finally {
      setTxLoading(false);
    }
  }

  async function submitPublicKeyProof() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      if (!publicKeyProof || !publicKeySignals) {
        setError("Generate public key proof first.");
        return;
      }

      const tx = await gameContract.submitPublicKey(
        publicKeyProof,
        publicKeySignals
      );

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Submit public key proof failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function generateInitialDeckLocal() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const pk = await gameContract.aggregatePk();

      const aggregatePk = {
        x: pk[0].toString(),
        y: pk[1].toString()
      };

      const result = await buildInitialEncryptedDeck(aggregatePk);

      setInitialDeck(result.solidityDeck);
      setInitialDeckCommitLocal(result.deckCommit);

      localStorage.setItem(
        `zkpoker_initial_deck_${roundId}`,
        JSON.stringify(result.solidityDeck)
      );

      localStorage.setItem(
        `zkpoker_initial_deck_input_${roundId}`,
        JSON.stringify(result.circuitInput)
      );

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate initial deck.");
    } finally {
      setTxLoading(false);
    }
  }

  async function generateInitialDeckProof() {
    try {
      setTxLoading(true);
      setError("");

      const savedInput = localStorage.getItem(
        `zkpoker_initial_deck_input_${roundId}`
      );

      if (!savedInput) {
        setError("Generate initial deck first.");
        return;
      }

      const input = JSON.parse(savedInput);
      
      const t0 = performance.now();

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/circuits/initialdeck/encryptdeck52.wasm",
        "/circuits/initialdeck/encrypt52_final.zkey"
      );

      const t1 = performance.now();
      console.log(`Initial Deck Encryption proof generation: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

      const calldata = await groth16.exportSolidityCallData(
        proof,
        publicSignals
      );

      const parsed = parseSolidityCalldata(calldata);

      setInitialDeckProof(parsed.proof);
      setInitialDeckSignals(parsed.publicSignals);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate initial deck proof.");
    } finally {
      setTxLoading(false);
    }
  }

  async function submitInitialDeckProof() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      if (!initialDeck || !initialDeckProof || !initialDeckSignals) {
        setError("Generate initial deck and proof first.");
        return;
      }

      const tx = await gameContract.submitInitialDeck(
        initialDeck,
        initialDeckProof,
        initialDeckSignals
      );

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Submit initial deck failed.");
    } finally {
      setTxLoading(false);
    }
  }

  ////////
  function normalizeEventDeck(deck) {
    return deck.map((ct) => ({
      c1: {
        x: ct.c1.x.toString(),
        y: ct.c1.y.toString()
      },
      c2: {
        x: ct.c2.x.toString(),
        y: ct.c2.y.toString()
      }
    }));
  }

  async function loadInitialDeckFromEvent() {
    if (!gameContract) return null;

    const filter = gameContract.filters.DeckPublished(
      BigInt(roundId),
      0
    );

    const events = await gameContract.queryFilter(
      filter,
      0,
      "latest"
    );

    if (events.length === 0) {
      throw new Error("Initial DeckPublished event not found.");
    }

    const latest = events[events.length - 1];

    const deckCommit = latest.args.deckCommit.toString();
    const deck = normalizeEventDeck(latest.args.deck);

    setShuffleInputDeck(deck);
    setShuffleInputCommit(deckCommit);

    localStorage.setItem(
      `zkpoker_initial_event_deck_${roundId}`,
      JSON.stringify(deck)
    );

    localStorage.setItem(
      `zkpoker_initial_event_commit_${roundId}`,
      deckCommit
    );

    return {
      deck,
      deckCommit
    };
  }

  async function generateShuffleLocal() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      let eventDeck = shuffleInputDeck;
      let eventCommit = shuffleInputCommit;

      if (!eventDeck || !eventCommit) {
        const loaded = await loadInitialDeckFromEvent();
        eventDeck = loaded.deck;
        eventCommit = loaded.deckCommit;
      }

      const pk = await gameContract.aggregatePk();

      const aggregatePk = {
        x: pk[0].toString(),
        y: pk[1].toString()
      };

      const result = await buildShuffleReencryptDeck(
        eventDeck,
        aggregatePk,
        eventCommit
      );

      setShuffledDeck(result.solidityDeck);
      setShuffleDeckCommitLocal(result.outputDeckCommit);

      localStorage.setItem(
        `zkpoker_shuffle_deck_${roundId}`,
        JSON.stringify(result.solidityDeck)
      );

      localStorage.setItem(
        `zkpoker_shuffle_input_${roundId}`,
        JSON.stringify(result.circuitInput)
      );

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate shuffle.");
    } finally {
      setTxLoading(false);
    }
  }

  async function generateShuffleProof() {
    try {
      setTxLoading(true);
      setError("");

      const savedInput = localStorage.getItem(
        `zkpoker_shuffle_input_${roundId}`
      );

      if (!savedInput) {
        setError("Generate shuffle first.");
        return;
      }

      const input = JSON.parse(savedInput);

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/circuits/shuffledeck/shuffle52reencrypt.wasm",
        "/circuits/shuffledeck/shuf52_final.zkey"
      );

      const calldata = await groth16.exportSolidityCallData(
        proof,
        publicSignals
      );

      const parsed = parseSolidityCalldata(calldata);

      console.log("Shuffle calldata:", calldata);
      console.log("Parsed shuffle proof:", parsed.proof);
      console.log("Parsed shuffle signals:", parsed.publicSignals);

      setShuffleProof(parsed.proof);
      setShuffleSignals(parsed.publicSignals);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate shuffle proof.");
    } finally {
      setTxLoading(false);
    }
  }

  async function submitShuffleProof() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      if (!shuffledDeck || !shuffleProof || !shuffleSignals) {
        setError("Generate shuffle and proof first.");
        return;
      }

      console.log("local shuffle commit:", shuffleDeckCommitLocal);
      console.log("proof input commit:", shuffleSignals[2]);
      console.log("proof output commit:", shuffleSignals[3]);

      const tx = await gameContract.submitShuffle(
        shuffledDeck,
        shuffleProof,
        shuffleSignals
      );

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Submit shuffle failed.");
    } finally {
      setTxLoading(false);
    }
  }

  //////
  async function loadPlayer0ShuffleDeckFromEvent() {
    if (!gameContract) return null;

    const filter = gameContract.filters.DeckPublished(
      BigInt(roundId),
      1
    );

    const events = await gameContract.queryFilter(
      filter,
      0,
      "latest"
    );

    if (events.length === 0) {
      throw new Error("Player 0 shuffle DeckPublished event not found.");
    }

    const latest = events[events.length - 1];

    const deckCommit = latest.args.deckCommit.toString();
    const deck = normalizeEventDeck(latest.args.deck);

    setFinalShuffleInputDeck(deck);
    setFinalShuffleInputCommit(deckCommit);

    localStorage.setItem(
      `zkpoker_p0_shuffle_deck_${roundId}`,
      JSON.stringify(deck)
    );

    localStorage.setItem(
      `zkpoker_p0_shuffle_commit_${roundId}`,
      deckCommit
    );

    return {
      deck,
      deckCommit
    };
  }

  async function generateFinalShuffleLocal() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      let eventDeck = finalShuffleInputDeck;
      let eventCommit = finalShuffleInputCommit;

      if (!eventDeck || !eventCommit) {
        const loaded = await loadPlayer0ShuffleDeckFromEvent();
        eventDeck = loaded.deck;
        eventCommit = loaded.deckCommit;
      }

      const pk = await gameContract.aggregatePk();

      const aggregatePk = {
        x: pk[0].toString(),
        y: pk[1].toString()
      };

      const result = await buildFinalShuffleDealDeck(
        eventDeck,
        aggregatePk,
        eventCommit
      );

      setFinalShuffleDeckCommitLocal(result.outputDeckCommit);

      localStorage.setItem(
        `zkpoker_final_shuffle_input_${roundId}`,
        JSON.stringify(result.circuitInput)
      );

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate final shuffle.");
    } finally {
      setTxLoading(false);
    }
  }

  async function generateFinalShuffleProof() {
    try {
      setTxLoading(true);
      setError("");

      const savedInput = localStorage.getItem(
        `zkpoker_final_shuffle_input_${roundId}`
      );

      if (!savedInput) {
        setError("Generate final shuffle first.");
        return;
      }

      const input = JSON.parse(savedInput);

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/circuits/finalshuffle/shuffle52final9.wasm",
        "/circuits/finalshuffle/shuf52deal9_final.zkey"
      );

      const calldata = await groth16.exportSolidityCallData(
        proof,
        publicSignals
      );

      const parsed = parseSolidityCalldata(calldata);

      setFinalShuffleProof(parsed.proof);
      setFinalShuffleSignals(parsed.publicSignals);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate final shuffle proof.");
    } finally {
      setTxLoading(false);
    }
  }

  async function submitFinalShuffleProof() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      if (!finalShuffleProof || !finalShuffleSignals) {
        setError("Generate final shuffle proof first.");
        return;
      }

      const tx = await gameContract.submitFinalShuffleAndDeal(
        finalShuffleProof,
        finalShuffleSignals
      );

      await tx.wait();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Submit final shuffle failed.");
    } finally {
      setTxLoading(false);
    }
  } 

  function getMyPlayerIndex() {
    const a = account.toLowerCase();

    if (player0 && player0.toLowerCase() === a) {
      return 0;
    }

    if (player1 && player1.toLowerCase() === a) {
      return 1;
    }

    return -1;
  }

  function getMyPrivateCardIndexes() {
    const idx = getMyPlayerIndex();

    if (idx === 0) {
      return [0, 2];
    }

    if (idx === 1) {
      return [1, 3];
    }

    return [];
  }

  function getOpponentPrivateCardIndexes() {
    const idx = getMyPlayerIndex();

    if (idx === 0) {
      return [1, 3];
    }

    if (idx === 1) {
      return [0, 2];
    }

    return [];
  }

  function getMyPkArray() {
    const idx = getMyPlayerIndex();

    if (idx === 0) {
      return [player0Pk.x, player0Pk.y];
    }

    if (idx === 1) {
      return [player1Pk.x, player1Pk.y];
    }

    return null;
  }
  
  /////
  async function submitBothPartialDecryptsForOpponent() {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      if (phase !== "CardsDealing") {
        setError(`Partial decrypt is only available in CardsDealing. Current phase: ${phase}`);
        return;
      }

      if (bettingStreet !== "0") {
        setError(`Private-card partial decrypt is only available before preflop. Current bettingStreet: ${bettingStreet}`);
        return;
      }

      if (bettingRoundOpen !== "false") {
        setError("Partial decrypt is not available while betting round is open.");
        return;
      }

      const sk = localSk || localStorage.getItem(`zkpoker_sk_${account}`);

      if (!sk) {
        setError("Local secret key not found. Generate/import your key first.");
        return;
      }

      const myPk = getMyPkArray();

      const storedPkRaw = localStorage.getItem(`zkpoker_pk_${account}`);
      const storedPk = storedPkRaw ? JSON.parse(storedPkRaw) : null;

      console.log("Private partial decrypt account:", account);
      console.log("Stored PK:", storedPk);
      console.log("On-chain PK:", myPk);
      console.log("Local SK exists:", !!sk);

      if (
        !storedPk ||
        storedPk.x !== myPk[0].toString() ||
        storedPk.y !== myPk[1].toString()
      ) {
        setError(
          "Local key does not match the on-chain public key. Since you cleared localStorage, redeploy/reset the game and submit fresh public keys."
        );
        return;
      }

      if (!myPk) {
        setError("Could not determine current player's public key.");
        return;
      }

      const targetIndexes = getOpponentPrivateCardIndexes();

      if (targetIndexes.length !== 2) {
        setError("Could not determine opponent private card indexes.");
        return;
      }

      for (const cardIndex of targetIndexes) {
        const c = await gameContract.getDealtCard(cardIndex);

        const card = {
          index: cardIndex,
          owner: c[0],
          c1x: c[1].toString(),
          c1y: c[2].toString(),
          c2x: c[3].toString(),
          c2y: c[4].toString(),
          currentX: c[5].toString(),
          currentY: c[6].toString(),
          partialCount: c[7].toString(),
          revealReady: c[8],
          revealed: c[9],
          revealedCardId: c[10].toString(),
          revealedRank: c[11].toString(),
          myPk
        };

        if (card.revealReady) {
          console.log(`Card ${cardIndex} already ready for reveal, skipping.`);
          continue;
        }

        if (card.partialCount !== "0") {
          console.log(`Card ${cardIndex} already has partial decrypt count ${card.partialCount}, skipping.`);
          continue;
        }

        const partial = await partialDecryptCardLocal(card, sk);

        const t0 = performance.now();

        const { proof, publicSignals } = await groth16.fullProve(
          partial.input,
          "/circuits/partialdecrypt/partialdecrypt1.wasm",
          "/circuits/partialdecrypt/pd_final.zkey"
        );

        const t1 = performance.now();
        console.log(`Partial Decrypt proof generation: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

        const calldata = await groth16.exportSolidityCallData(
          proof,
          publicSignals
        );

        const parsed = parseSolidityCalldata(calldata);

        const tx = await gameContract.submitPartialDecrypt(
          cardIndex,
          parsed.proof,
          parsed.publicSignals
        );

        await tx.wait();
      }

      setPartialDecryptProofsReady(true);
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Submit partial decrypts failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function revealMyPrivateCardsLocally() {
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const sk = localSk || localStorage.getItem(`zkpoker_sk_${account}`);

      if (!sk) {
        setError("Local secret key not found.");
        return;
      }

      const indexes = getMyPrivateCardIndexes();

      if (indexes.length !== 2) {
        setError("Could not determine your private card indexes.");
        return;
      }

      const revealed = [];

      for (const cardIndex of indexes) {
        const c = await gameContract.getDealtCard(cardIndex);

        const card = {
          index: cardIndex,
          owner: c[0],
          c1x: c[1].toString(),
          c1y: c[2].toString(),
          c2x: c[3].toString(),
          c2y: c[4].toString(),
          currentX: c[5].toString(),
          currentY: c[6].toString(),
          partialCount: c[7].toString(),
          revealReady: c[8],
          revealed: c[9],
          revealedCardId: c[10].toString(),
          revealedRank: c[11].toString()
        };

        if (!card.revealReady) {
          setError("Your private cards are not ready. Opponent must partial decrypt them first.");
          return;
        }

        const localReveal = await locallyRevealCard(card, sk);

        const cardId = await privatePointToCardId(
          localReveal.point[0],
          localReveal.point[1]
        );

        revealed.push({
          index: cardIndex,
          cardId: cardId === null ? "unknown" : cardId.toString(),
          label: cardId === null ? "Unknown card" : cardLabel(cardId),
          pointX: localReveal.point[0],
          pointY: localReveal.point[1]
        });
      }

      setMyPrivateCards(revealed);

    } catch (err) {
      console.error(err);
      setError(err.message || "Local private reveal failed.");
    } finally {
      setTxLoading(false);
    }
  }

  function cardLabel(cardId) {
    const info = cardInfo.find((c) => Number(c.cardId) === Number(cardId));
    return info ? info.label : `Unknown card ${cardId}`;
  }

  function getOnChainRevealedPrivateCardsForPlayer(playerIndex) {
    const indexes = playerIndex === 0 ? [0, 2] : [1, 3];

    return indexes
      .map((idx) => {
        const card = dealtCards.find((c) => Number(c.index) === idx);

        if (!card || !card.revealed || card.revealedCardId === "0") {
          return null;
        }

        return {
          index: idx,
          cardId: card.revealedCardId,
          label: cardLabel(card.revealedCardId)
        };
      })
      .filter(Boolean);
  }

  function getStreetIndexes(street) {
    if (street === "flop") return [4, 5, 6];
    if (street === "turn") return [7];
    if (street === "river") return [8];
    return [];
  }

  async function getCardObject(cardIndex, myPk) {
    const c = await gameContract.getDealtCard(cardIndex);

    return {
      index: cardIndex,
      owner: c[0],
      c1x: c[1].toString(),
      c1y: c[2].toString(),
      c2x: c[3].toString(),
      c2y: c[4].toString(),
      currentX: c[5].toString(),
      currentY: c[6].toString(),
      partialCount: c[7].toString(),
      revealReady: c[8],
      revealed: c[9],
      revealedCardId: c[10].toString(),
      revealedRank: c[11].toString(),
      myPk
    };
  }

  async function partialDecryptStreet(street) {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const sk = localSk || localStorage.getItem(`zkpoker_sk_${account}`);

      if (!sk) {
        setError("Local secret key not found.");
        return;
      }

      const myPk = getMyPkArray();

      const expectedPk = getMyPkArray();

      const storedPkRaw = localStorage.getItem(`zkpoker_pk_${account}`);
      const storedPk = storedPkRaw ? JSON.parse(storedPkRaw) : null;

      console.log("Account:", account);
      console.log("Local SK exists:", !!sk);
      console.log("Stored local PK:", storedPk);
      console.log("On-chain player PK:", expectedPk);

      if (
        !storedPk ||
        storedPk.x !== expectedPk[0].toString() ||
        storedPk.y !== expectedPk[1].toString()
      ) {
        setError(
          "Local key does not match the on-chain submitted public key. Use the same browser/account that generated and submitted this player's public key."
        );
        return;
      }

      if (!myPk) {
        setError("Could not determine current player's public key.");
        return;
      }

      const indexes = getStreetIndexes(street);

      for (const cardIndex of indexes) {
        const card = await getCardObject(cardIndex, myPk);

        if (card.revealReady) {
          continue;
        }

        const partial = await partialDecryptCardLocal(card, sk);

        const { proof, publicSignals } = await groth16.fullProve(
          partial.input,
          "/circuits/partialdecrypt/partialdecrypt1.wasm",
          "/circuits/partialdecrypt/pd_final.zkey"
        );

        const calldata = await groth16.exportSolidityCallData(
          proof,
          publicSignals
        );

        const parsed = parseSolidityCalldata(calldata);

        const tx = await gameContract.submitPartialDecrypt(
          cardIndex,
          parsed.proof,
          parsed.publicSignals
        );

        await tx.wait();
      }

      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || `Partial decrypt ${street} failed.`);
    } finally {
      setTxLoading(false);
    }
  }

  async function revealStreet(street) {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const sk = localSk || localStorage.getItem(`zkpoker_sk_${account}`);

      if (!sk) {
        setError("Local secret key not found.");
        return;
      }

      const myPk = getMyPkArray();

      if (!myPk) {
        setError("Could not determine current player's public key.");
        return;
      }

      const indexes = getStreetIndexes(street);
      const newlyRevealed = [];

      let actuallyRevealedAnyCard = false;

      for (const cardIndex of indexes) {
        const card = await getCardObject(cardIndex, myPk);

        if (card.revealed) {
          newlyRevealed.push({
            index: cardIndex,
            cardId: card.revealedCardId,
            label: cardLabel(card.revealedCardId),
            pointX: card.currentX,
            pointY: card.currentY
          });
          continue;
        }

        if (!card.revealReady) {
          setError(`${street} card ${cardIndex} is not ready for reveal.`);
          return;
        }

        const reveal = await buildRevealCardLocal(card, sk);

        const t0 = performance.now();

        const { proof, publicSignals } = await groth16.fullProve(
          reveal.input,
          "/circuits/reveal/finalreveal1.wasm",
          "/circuits/reveal/freveal_final.zkey"
        );

        const t1 = performance.now();
        console.log(`Final Reveal proof generation: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

        const calldata = await groth16.exportSolidityCallData(
          proof,
          publicSignals
        );

        const parsed = parseSolidityCalldata(calldata);

        const tx = await gameContract.revealCard(
          cardIndex,
          parsed.proof,
          parsed.publicSignals
        );

        await tx.wait();

        actuallyRevealedAnyCard = true;

        const updated = await gameContract.getDealtCard(cardIndex);

        newlyRevealed.push({
          index: cardIndex,
          cardId: updated[10].toString(),
          label: cardLabel(updated[10].toString()),
          pointX: parsed.publicSignals[6].toString(),
          pointY: parsed.publicSignals[7].toString()
        });
      }

      if (actuallyRevealedAnyCard) {
        playCardSound();
      }

      setCommunityCards((prev) => {
        const merged = [...prev];

        for (const c of newlyRevealed) {
          const existingIndex = merged.findIndex((x) => x.index === c.index);

          if (existingIndex >= 0) {
            merged[existingIndex] = c;
          } else {
            merged.push(c);
          }
        }

        return merged.sort((a, b) => a.index - b.index);
      });

      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || `Reveal ${street} failed.`);
    } finally {
      setTxLoading(false);
    }
  }

  ///////////// hands submission //////////
  function winnerPlayerLabel() {
    if (isTie === "true") return "Tie";

    const w = winner.toLowerCase();

    if (player0 && w === player0.toLowerCase()) return "Player 0";
    if (player1 && w === player1.toLowerCase()) return "Player 1";

    return "No winner yet";
  }

  function handCategoryLabel(category) {
    const c = Number(category);

    const labels = {
      0: "High Card",
      1: "One Pair",
      2: "Two Pair",
      3: "Three of a Kind",
      4: "Straight",
      5: "Flush",
      6: "Full House",
      7: "Four of a Kind",
      8: "Straight Flush"
    };

    return labels[c] || `Unknown category ${category}`;
  }

  async function refreshSubmittedHands() {
    if (!gameContract || !player0 || !player1) return;

    const result = [];

    for (const p of [player0, player1]) {
      const indexes = [];

      for (let i = 0; i < 5; i++) {
        const idx = await gameContract.submittedBestHandIndexes(p, i);
        indexes.push(Number(idx));
      }

      const score = await gameContract.submittedBestHandScore(p);
      const submitted = await gameContract.hasSubmittedBestHand(p);

      result.push({
        player: p,
        playerLabel: p.toLowerCase() === player0.toLowerCase() ? "Player 0" : "Player 1",
        submitted,
        score: score.toString(),
        indexes
      });
    }

    setSubmittedHands(result);
  }

  function getCardLabelByIndex(index) {
    const dealt = dealtCards.find((c) => Number(c.index) === Number(index));

    if (!dealt) return `Card index ${index}`;

    if (dealt.revealedCardId && dealt.revealedCardId !== "0") {
      return cardLabel(dealt.revealedCardId);
    }

    const localPrivate = myPrivateCards.find((c) => Number(c.index) === Number(index));

    if (localPrivate?.label) {
      return localPrivate.label;
    }

    return `Unrevealed card index ${index}`;
  }

  async function submitBestHand() {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const isSecondSubmission = bestHandSubmitCount === "1";

      const best = computeBestHandIndexes();
      setBestHandIndexes(best.indexes.join(","));

      const tx = await gameContract.submitBestHand(best.indexes);
      await tx.wait();

      await loadGameState();
      await refreshSubmittedHands();

      if (isSecondSubmission) {
        setShowdownMessage("Hand finished. Calculating winner...");

        setTimeout(() => {
          setShowdownMessage("");
        }, 4000);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Submit best hand failed.");
    } finally {
      setTxLoading(false);
    }
  }

  ///// hand computation ////
  function getRevealedCardIdsByIndex() {
    const map = {};

    for (const c of communityCards) {
      map[Number(c.index)] = Number(c.cardId);
    }

    for (const c of myPrivateCards) {
      map[Number(c.index)] = Number(c.cardId);
    }

    return map;
  }

  function rankValue(cardId) {
    const r = (cardId % 13) + 1;
    return r === 1 ? 14 : r;
  }

  function suitOf(cardId) {
    return Math.floor(cardId / 13);
  }

  function packScore(category, a = 0, b = 0, c = 0, d = 0, e = 0) {
    return (((((BigInt(category) * 15n + BigInt(a)) * 15n + BigInt(b)) * 15n + BigInt(c)) * 15n + BigInt(d)) * 15n + BigInt(e)).toString();
  }

  function scoreFiveCardHand(cardIds) {
    const counts = Array(15).fill(0);
    const suits = Array(4).fill(0);
    const ranks = cardIds.map(rankValue).sort((a, b) => b - a);

    for (const cardId of cardIds) {
      counts[rankValue(cardId)]++;
      suits[suitOf(cardId)]++;
    }

    const flush = suits.some((x) => x === 5);

    let straightHigh = 0;

    if (counts[14] && counts[5] && counts[4] && counts[3] && counts[2]) {
      straightHigh = 5;
    } else {
      for (let h = 14; h >= 6; h--) {
        if (counts[h] && counts[h - 1] && counts[h - 2] && counts[h - 3] && counts[h - 4]) {
          straightHigh = h;
          break;
        }
      }
    }

    let four = 0;
    let three = 0;
    const pairs = [];
    const singles = [];

    for (let r = 14; r >= 2; r--) {
      if (counts[r] === 4) four = r;
      else if (counts[r] === 3) three = r;
      else if (counts[r] === 2) pairs.push(r);
      else if (counts[r] === 1) singles.push(r);
    }

    if (straightHigh && flush) return packScore(8, straightHigh);
    if (four) return packScore(7, four, singles[0]);
    if (three && pairs.length === 1) return packScore(6, three, pairs[0]);
    if (flush) return packScore(5, ...ranks);
    if (straightHigh) return packScore(4, straightHigh);
    if (three) return packScore(3, three, singles[0], singles[1]);
    if (pairs.length === 2) return packScore(2, pairs[0], pairs[1], singles[0]);
    if (pairs.length === 1) return packScore(1, pairs[0], singles[0], singles[1], singles[2]);

    return packScore(0, ...ranks);
  }

  function combinations5(arr) {
    const out = [];

    for (let a = 0; a < arr.length - 4; a++)
    for (let b = a + 1; b < arr.length - 3; b++)
    for (let c = b + 1; c < arr.length - 2; c++)
    for (let d = c + 1; d < arr.length - 1; d++)
    for (let e = d + 1; e < arr.length; e++) {
      out.push([arr[a], arr[b], arr[c], arr[d], arr[e]]);
    }

    return out;
  }

  function computeBestHandIndexes() {
    const playerIndex = getMyPlayerIndex();
    const cardIdsByIndex = getRevealedCardIdsByIndex();

    const candidateIndexes =
      playerIndex === 0
        ? [0, 2, 4, 5, 6, 7, 8]
        : [1, 3, 4, 5, 6, 7, 8];

    for (const idx of candidateIndexes) {
      if (cardIdsByIndex[idx] === undefined || Number.isNaN(cardIdsByIndex[idx])) {
        throw new Error(`Missing revealed card for index ${idx}.`);
      }
    }

    let best = null;

    for (const combo of combinations5(candidateIndexes)) {
      const cardIds = combo.map((idx) => cardIdsByIndex[idx]);
      const score = scoreFiveCardHand(cardIds);

      if (!best || BigInt(score) > BigInt(best.score)) {
        best = {
          indexes: combo,
          cardIds,
          score
        };
      }
    }

    return best;
  }

  //////////////////////////

  async function revealMyPrivateCardsOnChain() {
    if (blockIfTimeoutReached()) return;
    if (!gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      const sk = localSk || localStorage.getItem(`zkpoker_sk_${account}`);

      if (!sk) {
        setError("Local secret key not found.");
        return;
      }

      const myPk = getMyPkArray();

      if (!myPk) {
        setError("Could not determine current player's public key.");
        return;
      }

      const indexes = getMyPrivateCardIndexes();

      for (const cardIndex of indexes) {
        const card = await getCardObject(cardIndex, myPk);

        if (card.revealed) {
          continue;
        }

        if (!card.revealReady) {
          setError(`Private card ${cardIndex} is not ready for reveal.`);
          return;
        }

        const reveal = await buildRevealCardLocal(card, sk);

        const { proof, publicSignals } = await groth16.fullProve(
          reveal.input,
          "/circuits/reveal/finalreveal1.wasm",
          "/circuits/reveal/freveal_final.zkey"
        );

        const calldata = await groth16.exportSolidityCallData(
          proof,
          publicSignals
        );

        const parsed = parseSolidityCalldata(calldata);

        const tx = await gameContract.revealCard(
          cardIndex,
          parsed.proof,
          parsed.publicSignals
        );

        await tx.wait();
      }

      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Reveal private cards on-chain failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function loadBankState() {
    if (!bankContract) return;

    try {
      const [rate, reserve] = await Promise.all([
        bankContract.tokenRate(),
        bankContract.ethReserve()
      ]);

      setTokenRate(rate.toString());
      setEthReserve(formatUnits(reserve, 18));
    } catch (err) {
      console.error(err);
    }
  }

  async function buyTokens() {
    if (!bankContract) return;

    try {
      setTxLoading(true);
      setError("");

      const tx = await bankContract.buyTokens({
        value: parseEther(ethAmount)
      });

      await tx.wait();

      await loadBankState();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Buy tokens failed.");
    } finally {
      setTxLoading(false);
    }
  }

  async function redeemTokensToEth() {
    if (!bankContract || !tokenContract) return;

    try {
      setTxLoading(true);
      setError("");
      setActionStatus("Approving tokens for redeem...");

      const tokenAmount = BigInt(redeemAmount);

      if (tokenAmount <= 0n) {
        setError("Enter a valid token amount to redeem.");
        return;
      }

      const approveTx = await tokenContract.approve(
        BANK_ADDRESS,
        tokenAmount
      );

      await approveTx.wait();

      setActionStatus("Redeeming tokens for ETH...");

      const redeemTx = await bankContract.redeemTokens(tokenAmount);

      await redeemTx.wait();

      setRedeemAmount("");

      await loadBankState();
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Redeem tokens failed.");
    } finally {
      setTxLoading(false);
      setActionStatus("");
    }
  }

  function isMyTurn() {
    return (
      account &&
      actionPlayer &&
      actionPlayer.toLowerCase() === account.toLowerCase()
    );
  }

  function canBetNow() {
    return bettingRoundOpen === "true" && isMyTurn();
  }

  function amountToCall() {
    if (!currentBet || !account) return "0";

    const myCommitted = 0; // temporary until we expose committedThisStreet
    const diff = BigInt(currentBet) - BigInt(myCommitted);

    return diff > 0n ? diff.toString() : "0";
  }

  async function oneClickSubmitPublicKey() {
    await generatePublicKeyLocal();
    await new Promise((r) => setTimeout(r, 100));

    const savedSk = localStorage.getItem(`zkpoker_sk_${account}`);
    const savedPkRaw = localStorage.getItem(`zkpoker_pk_${account}`);
    const savedPk = savedPkRaw ? JSON.parse(savedPkRaw) : null;

    if (!savedSk || !savedPk) {
      setError("Could not load local poker key.");
      return;
    }

    const input = {
      pk: [savedPk.x, savedPk.y],
      sk: savedSk
    };

    const { proof, publicSignals } = await groth16.fullProve(
      input,
      "/circuits/publickey/publickey1.wasm",
      "/circuits/publickey/pk_final.zkey"
    );

    const solidityProof = formatProofForSolidity(proof);

    const tx = await gameContract.submitPublicKey(
      solidityProof,
      publicSignals
    );

    await tx.wait();
    await loadGameState();
  }

  async function oneClickSubmitInitialDeck() {
    if (blockIfTimeoutReached()) return;
    setActionStatus("Generating encrypted deck...");

    const pk = await gameContract.aggregatePk();

    const aggregatePk = {
      x: pk[0].toString(),
      y: pk[1].toString()
    };

    const result = await buildInitialEncryptedDeck(aggregatePk);

    setInitialDeck(result.solidityDeck);
    setInitialDeckCommitLocal(result.deckCommit);

    setActionStatus("Generating ZK proof...");

    const t0 = performance.now();

    const { proof, publicSignals } = await groth16.fullProve(
      result.circuitInput,
      "/circuits/initialdeck/encryptdeck52.wasm",
      "/circuits/initialdeck/encrypt52_final.zkey"
    );

    const t1 = performance.now();
    console.log(`Initial Deck Encryption proof generation: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const parsed = parseSolidityCalldata(calldata);

    setActionStatus("Waiting for MetaMask confirmation...");

    const tx = await gameContract.submitInitialDeck(
      result.solidityDeck,
      parsed.proof,
      parsed.publicSignals
    );

    setActionStatus("Transaction pending...");

    await tx.wait();

    setActionStatus("Refreshing game state...");
    await loadGameState();
  }

  async function oneClickSubmitShuffle() {
    if (blockIfTimeoutReached()) return;
    setActionStatus("Loading initial deck from event...");

    let eventDeck = shuffleInputDeck;
    let eventCommit = shuffleInputCommit;

    if (!eventDeck || !eventCommit) {
      const loaded = await loadInitialDeckFromEvent();
      eventDeck = loaded.deck;
      eventCommit = loaded.deckCommit;
    }

    setActionStatus("Generating shuffled deck...");

    const pk = await gameContract.aggregatePk();

    const aggregatePk = {
      x: pk[0].toString(),
      y: pk[1].toString()
    };

    const result = await buildShuffleReencryptDeck(
      eventDeck,
      aggregatePk,
      eventCommit
    );

    setShuffledDeck(result.solidityDeck);
    setShuffleDeckCommitLocal(result.outputDeckCommit);

    setActionStatus("Generating ZK proof...");

    const t0 = performance.now();

    const { proof, publicSignals } = await groth16.fullProve(
      result.circuitInput,
      "/circuits/shuffledeck/shuffle52reencrypt.wasm",
      "/circuits/shuffledeck/shuf52_final.zkey"
    );

    const t1 = performance.now();
    console.log(`Shuffle proof generation: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const parsed = parseSolidityCalldata(calldata);

    setShuffleInputDeck(eventDeck);
    setShuffleInputCommit(eventCommit);

    setShuffledDeck(result.solidityDeck);

    setShuffleProof(parsed.proof);
    setShuffleSignals(parsed.publicSignals);

    setActionStatus("Waiting for MetaMask confirmation...");

    const tx = await gameContract.submitShuffle(
      result.solidityDeck,
      parsed.proof,
      parsed.publicSignals
    );

    setActionStatus("Transaction pending...");

    await tx.wait();

    setActionStatus("Refreshing game state...");
    await loadGameState();
  }

  async function oneClickSubmitFinalShuffle() {
    if (blockIfTimeoutReached()) return;
    setActionStatus("Loading player 0 shuffle from event...");

    let eventDeck = finalShuffleInputDeck;
    let eventCommit = finalShuffleInputCommit;

    if (!eventDeck || !eventCommit) {
      const loaded = await loadPlayer0ShuffleDeckFromEvent();
      eventDeck = loaded.deck;
      eventCommit = loaded.deckCommit;
    }

    setActionStatus("Generating final shuffle and deal...");

    const pk = await gameContract.aggregatePk();

    const aggregatePk = {
      x: pk[0].toString(),
      y: pk[1].toString()
    };

    const result = await buildFinalShuffleDealDeck(
      eventDeck,
      aggregatePk,
      eventCommit
    );

    setFinalShuffleDeckCommitLocal(result.outputDeckCommit);

    setActionStatus("Generating ZK proof...");

    const t0 = performance.now();

    const { proof, publicSignals } = await groth16.fullProve(
      result.circuitInput,
      "/circuits/finalshuffle/shuffle52final9.wasm",
      "/circuits/finalshuffle/shuf52deal9_final.zkey"
    );

    const t1 = performance.now();
    console.log(`Final Shuffle proof generation: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const parsed = parseSolidityCalldata(calldata);

    setFinalShuffleProof(parsed.proof);
    setFinalShuffleSignals(parsed.publicSignals);
    setFinalShuffleInputDeck(eventDeck);
    setFinalShuffleInputCommit(eventCommit);

    setActionStatus("Waiting for MetaMask confirmation...");

    const tx = await gameContract.submitFinalShuffleAndDeal(
      parsed.proof,
      parsed.publicSignals
    );

    setActionStatus("Transaction pending...");

    await tx.wait();
    playCardSound();

    setActionStatus("Refreshing game state...");
    await loadGameState();
  }

  async function runGameAction(fn, fallbackMessage) {
    if (txLoading) return;

    try {
      setTxLoading(true);
      setError("");
      setActionStatus("Preparing action...");

      await fn();

      setActionStatus("Done.");
    } catch (err) {
      console.error(err);
      setError(err.message || fallbackMessage);
    } finally {
      setTxLoading(false);

      setTimeout(() => {
        setActionStatus("");
      }, 800);
    }
  }

  async function joinTableOneClick() {
    if (!tokenContract || !gameContract) return;

    try {
      setTxLoading(true);
      setError("");

      setActionStatus("Checking poker key...");
      await ensurePokerKeyRegistered();

      setActionStatus("Approving tokens...");

      const buyIn = BigInt(amount);

      const approveTx = await tokenContract.approve(
        GAME_ADDRESS,
        buyIn
      );

      await approveTx.wait();

      setActionStatus("Joining table...");

      const joinTx = await gameContract.joinGame(buyIn);

      await joinTx.wait();

      setActionStatus("Refreshing game state...");
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Join table failed.");
    } finally {
      setTxLoading(false);
      setActionStatus("");
    }
  }

  function isAtTable() {
    return getMyPlayerIndex() !== -1;
  }

  function showLobby() {
    return !account || !isAtTable() || forceLobbyView;
  }

  async function rebuildRevealedCommunityCards() {
    if (!gameContract) return;

    const revealed = [];

    for (let i = 4; i <= 8; i++) {
      try {
        const c = await gameContract.getDealtCard(i);

        const isRevealed = c[9];
        const cardId = c[10].toString();

        if (isRevealed) {
          revealed.push({
            index: i,
            cardId,
            label: cardLabel(cardId),
            pointX: c[5].toString(),
            pointY: c[6].toString()
          });
        }
      } catch {
        // card not dealt yet
      }
    }

    setCommunityCards(revealed);
  }

  function formatCountdown(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function isPlayerTurnTimer() {
    return bettingRoundOpen === "true" && actionPlayer !== "0x0000000000000000000000000000000000000000";
  }

  function sharedTimerLabel() {
    if (isPlayerTurnTimer()) return "";

    if (phase === "PlayersJoined") return "Waiting for public keys";
    if (phase === "KeysSubmitted") return "Waiting for initial deck";
    if (phase === "PlayersShuffling") return "Waiting for shuffle";
    if (phase === "CardsDealing" && bettingStreet === "0") return "Waiting for private-card decrypts";
    if (phase === "CardsDealing" && bettingStreet === "2") return "Waiting for flop reveal";
    if (phase === "CardsDealing" && bettingStreet === "3") return "Waiting for turn reveal";
    if (phase === "CardsDealing" && bettingStreet === "4") return "Waiting for river reveal";
    if (phase === "CardsDealing" && bettingStreet === "5") return "Waiting for showdown reveal";
    if (phase === "HandScoring") return "Waiting for best-hand submissions";

    return "";
  }

  async function ensurePokerKeyRegistered() {
    let savedSk = localStorage.getItem(`zkpoker_sk_${account}`);
    let savedPkRaw = localStorage.getItem(`zkpoker_pk_${account}`);
    let savedPk = savedPkRaw ? JSON.parse(savedPkRaw) : null;

    if (!savedSk || !savedPk) {
      const keypair = await generatePokerKeypair();

      savedSk = keypair.sk;
      savedPk = keypair.pk;

      localStorage.setItem(`zkpoker_sk_${account}`, savedSk);
      localStorage.setItem(`zkpoker_pk_${account}`, JSON.stringify(savedPk));

      setLocalSk(savedSk);
      setLocalPk(savedPk);
    }

    const onChainPk = await gameContract.getPublicKey(account);
    const onChainX = onChainPk[0].toString();
    const onChainY = onChainPk[1].toString();

    const notRegistered = onChainX === "0" && onChainY === "0";

    if (!notRegistered) {
      if (onChainX !== savedPk.x || onChainY !== savedPk.y) {
        throw new Error(
          "Your local poker key does not match your registered on-chain public key. Use key rotation while not seated, or restore the correct local key."
        );
      }

      return;
    }

    setActionStatus("Registering poker public key...");

    const input = {
      pk: [savedPk.x, savedPk.y],
      sk: savedSk
    };

    const t0 = performance.now();

    const { proof, publicSignals } = await groth16.fullProve(
      input,
      "/circuits/publickey/publickey1.wasm",
      "/circuits/publickey/pk_final.zkey"
    );

    const t1 = performance.now();
    console.log(`Public Key proof generation: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

    const solidityProof = formatProofForSolidity(proof);

    const tx = await gameContract.submitPublicKey(
      solidityProof,
      publicSignals
    );

    await tx.wait();
  }

  async function rotatePokerKey() {
    if (!gameContract || !account) return;

    try {
      setTxLoading(true);
      setError("");
      setActionStatus("Generating new poker key...");

      const keypair = await generatePokerKeypair();

      setActionStatus("Generating public key proof...");

      const input = {
        pk: [keypair.pk.x, keypair.pk.y],
        sk: keypair.sk
      };

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/circuits/publickey/publickey1.wasm",
        "/circuits/publickey/pk_final.zkey"
      );

      const solidityProof = formatProofForSolidity(proof);

      setActionStatus("Waiting for MetaMask confirmation...");

      const tx = await gameContract.rotatePublicKey(
        solidityProof,
        publicSignals
      );

      setActionStatus("Transaction pending...");

      await tx.wait();

      localStorage.setItem(`zkpoker_sk_${account}`, keypair.sk);
      localStorage.setItem(`zkpoker_pk_${account}`, JSON.stringify(keypair.pk));

      setLocalSk(keypair.sk);
      setLocalPk(keypair.pk);

      setActionStatus("Refreshing game state...");
      await loadGameState();

    } catch (err) {
      console.error(err);
      setError(err.message || "Rotate poker key failed.");
    } finally {
      setTxLoading(false);
      setActionStatus("");
    }
  }

  function canClaimTimeoutNow() {
    const timeoutReached =
      isAtTable() &&
      account &&
      actionDeadline &&
      actionDeadline !== "0" &&
      secondsLeft === 0 &&
      phase !== "Settled" &&
      phase !== "Cancelled";

    if (!timeoutReached) return false;

    const myIndex = getMyPlayerIndex();

    // Betting timeout: only opponent of actionPlayer can claim
    if (bettingRoundOpen === "true") {
      return (
        actionPlayer &&
        actionPlayer !== "0x0000000000000000000000000000000000000000" &&
        actionPlayer.toLowerCase() !== account.toLowerCase()
      );
    }

    // Initial deck: Player 0 was supposed to act, so Player 1 can claim
    if (phase === "KeysSubmitted") {
      return myIndex === 1;
    }

    // Shuffle phase: expected player is shuffleCount
    // shuffleCount 0 => Player 0 should act, Player 1 can claim
    // shuffleCount 1 => Player 1 should act, Player 0 can claim
    if (phase === "PlayersShuffling") {
      return myIndex !== Number(shuffleCount);
    }

    // Shared phases: allow button, contract decides exact winner/refund
    if (
      phase === "PlayersJoined" ||
      phase === "CardsDealing" ||
      phase === "HandScoring"
    ) {
      return true;
    }

    return false;
  }

  function isTimeoutReached() {
    return (
      actionDeadline &&
      actionDeadline !== "0" &&
      secondsLeft === 0 &&
      phase !== "Settled" &&
      phase !== "Cancelled"
    );
  }

  function blockIfTimeoutReached() {
    if (!isTimeoutReached()) return false;

    setError("Timeout reached. Unable to act. Opponent is claiming victory.");
    return true;
  }

  function playCardSound() {
    const audio = new Audio("/sounds/card-sound.mp3");
    audio.volume = 0.35;

    audio.play().catch(() => {
      // Browser may block sound if user has not interacted yet.
    });
  }


  useEffect(() => {
    if (gameContract && tokenContract && account) {
      loadGameState();
    }

    if (bankContract) {
      loadBankState();
    }
  }, [gameContract, tokenContract, bankContract, account]);

  useEffect(() => {
    if (!gameContract || !account) return;

    function onHandResult(eventRoundId, eventWinner, eventIsTie, eventCategory) {
      const p0 = player0?.toLowerCase();
      const p1 = player1?.toLowerCase();
      const w = eventWinner?.toLowerCase();

      const winnerText = eventIsTie
        ? "Tie"
        : w === p0
          ? "Player 0"
          : w === p1
            ? "Player 1"
            : "Player";

      const categoryText = handCategoryLabel(Number(eventCategory));

      setShowdownMessage(
        eventIsTie
          ? `Hand ended in a tie with ${categoryText}`
          : `${winnerText} won the hand with ${categoryText}`
      );

      setTimeout(() => {
        setShowdownMessage("");
      }, 4000);
    }

    gameContract.on("HandResult", onHandResult);

    return () => {
      gameContract.off("HandResult", onHandResult);
    };
  }, [gameContract, account, player0, player1]);

  useEffect(() => {
    if (!gameContract || !account) return;

    const refresh = async () => {
      await loadGameState();
      await rebuildRevealedCommunityCards();
    };

    gameContract.on("PhaseAdvanced", refresh);
    gameContract.on("CardRevealed", refresh);
    gameContract.on("PartialDecryptSubmitted", refresh);
    gameContract.on("BettingRoundStarted", refresh);
    gameContract.on("BettingRoundClosed", refresh);
    gameContract.on("BestHandSubmitted", refresh);
    gameContract.on("ShuffleSubmitted", refresh);
    gameContract.on("CardsDealingStarted", refresh);

    return () => {
      gameContract.off("PhaseAdvanced", refresh);
      gameContract.off("CardRevealed", refresh);
      gameContract.off("PartialDecryptSubmitted", refresh);
      gameContract.off("BettingRoundStarted", refresh);
      gameContract.off("BettingRoundClosed", refresh);
      gameContract.off("BestHandSubmitted", refresh);
      gameContract.off("ShuffleSubmitted", refresh);
      gameContract.off("CardsDealingStarted", refresh);
    };
  }, [gameContract, account]);

  useEffect(() => {
    if (!gameContract || !account) return;

    let cancelled = false;

    async function refreshFromEvent() {
      if (cancelled) return;

      try {
        await loadGameState();
        await rebuildRevealedCommunityCards();
      } catch (err) {
        console.error("Event refresh failed:", err);
      }
    }

    const events = [
      "PlayerJoined",
      "PublicKeySubmitted",
      "AggregatePublicKeySubmitted",
      "InitialDeckSubmitted",
      "ShuffleSubmitted",
      "CardsDealingStarted",
      "PartialDecryptSubmitted",
      "CardReadyForReveal",
      "CardRevealed",
      "BettingRoundStarted",
      "PlayerChecked",
      "PlayerBet",
      "PlayerCalled",
      "PlayerFolded",
      "BettingRoundClosed",
      "BestHandSubmitted",
      "PhaseAdvanced",
      "RoundStarted",
      "TimeoutVictory",
      "GameRefunded",
      "PlayerLeft",
      "PlayerForfeited",
      "HandResult"
    ];

    for (const eventName of events) {
      gameContract.on(eventName, refreshFromEvent);
    }

    return () => {
      cancelled = true;

      for (const eventName of events) {
        gameContract.off(eventName, refreshFromEvent);
      }
    };
  }, [gameContract, account]);

  useEffect(() => {
    if (!actionDeadline || actionDeadline === "0") {
      setSecondsLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Number(actionDeadline) - now;
      setSecondsLeft(remaining > 0 ? remaining : 0);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [actionDeadline]);

  useEffect(() => {
    if (!roundId) return;

    if (lastSeenRoundId && lastSeenRoundId !== roundId) {
      setMyPrivateCards([]);
      setCommunityCards([]);
      setPartialDecryptProofsReady(false);

      setInitialDeck(null);
      setInitialDeckProof(null);
      setInitialDeckSignals(null);

      setShuffledDeck(null);
      setShuffleProof(null);
      setShuffleSignals(null);

      setFinalShuffleProof(null);
      setFinalShuffleSignals(null);

      setBestHandIndexes("");
      setSubmittedHands([]);
    }

    setLastSeenRoundId(roundId);
  }, [roundId]);

  return (
    <div className="app">
      {txLoading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" />
            <h3>Processing</h3>
            <p>{actionStatus || "Please wait..."}</p>
          </div>
        </div>
      )}

      {account && (
        <div className="wallet-balance-wrap">
          <div className="wallet-balance-pill">
            Wallet: ${tokenBalance || "0"}
          </div>

          <div className="wallet-redeem-popover">
            <p>Withdraw tokens to real wallet</p>

            <input
              className="redeem-input"
              type="number"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              placeholder="Token amount"
            />

            <button
              onClick={redeemTokensToEth}
              disabled={txLoading || !redeemAmount}
            >
              Redeem to ETH
            </button>
          </div>
        </div>
      )}

      <button
        className="debug-toggle-btn"
        onClick={() => setShowDebugPanel((prev) => !prev)}
      >
        {showDebugPanel ? "Close Debug Panel" : "Open Debug Panel"}
      </button>

      {isAtTable() && (
        <button
          className="leave-game-btn"
          onClick={leaveGame}
          disabled={txLoading}
        >
          Leave Game
        </button>
        
      )}

      <button
        className="wallet-top-btn"
        onClick={connectWallet}
      >
        {account ? "Wallet Connected" : "Connect MetaMask"}
      </button>

      {isAtTable() && !forceLobbyView && (
        <button
          className="go-lobby-btn"
          onClick={() => setForceLobbyView(true)}
        >
          Lobby
        </button>
      )}

      {canClaimTimeoutNow() && (
        <button
          className="claim-timeout-btn"
          onClick={claimTimeoutVictory}
          disabled={txLoading}
        >
          Claim Timeout
        </button>
      )}

      {showLobby() ? (
        <Lobby
          account={account}
          connectWallet={connectWallet}
          ethAmount={ethAmount}
          setEthAmount={setEthAmount}
          buyTokens={buyTokens}
          amount={amount}
          setAmount={setAmount}
          joinTable={joinTableOneClick}
          rotatePokerKey={rotatePokerKey}
          txLoading={txLoading}
          playerCount={playerCount}
          tokenBalance={tokenBalance}
          tableBalance={tableBalance}
          claimableBalance={claimableWinnings}
          withdrawWinnings={withdrawWinnings}
          isSeated={isAtTable()}
          returnToSeat={() => setForceLobbyView(false)}
        />
      ) : (
        <>
          <TopBar
            account={account}
            connectWallet={connectWallet}
          />

          <GameTable
            account={account}
            player0={player0}
            player1={player1}
            actionPlayer={actionPlayer}
            communityCards={communityCards}
            myPrivateCards={myPrivateCards}
            handPot={handPot}
            currentBet={currentBet}
            toCall={toCall}
            phase={phase}
            bettingStreet={bettingStreet}
            secondsLeft={secondsLeft}
            formatCountdown={formatCountdown}
            isPlayerTurnTimer={isPlayerTurnTimer()}
            sharedTimerLabel={sharedTimerLabel()}
            dealtCardCount={dealtCardCount}
            player0TableBalance={player0TableBalance}
            player1TableBalance={player1TableBalance}
            player0Committed={player0Committed}
            player1Committed={player1Committed}
            player0RevealedPrivateCards={getOnChainRevealedPrivateCardsForPlayer(0)}
            player1RevealedPrivateCards={getOnChainRevealedPrivateCardsForPlayer(1)}
            showdownMessage={showdownMessage}
          />

          <ActionPanel
            amount={amount}
            setAmount={setAmount}
            txLoading={txLoading}
            phase={phase}
            bettingStreet={bettingStreet}
            bettingRoundOpen={bettingRoundOpen}
            shuffleCount={shuffleCount}
            publicKeyCount={publicKeyCount}
            aggregatePkSubmitted={aggregatePkSubmitted}
            initialDeckSubmitted={initialDeckSubmitted}
            bestHandSubmitCount={bestHandSubmitCount}
            myPlayerIndex={getMyPlayerIndex()}
            canBetNow={canBetNow()}
            checkAction={checkAction}
            betAction={betAction}
            callBetAction={callBetAction}
            foldAction={foldAction}
            submitPublicKey={() => runGameAction(oneClickSubmitPublicKey, "Submit public key failed.")}
            submitInitialDeck={() => runGameAction(oneClickSubmitInitialDeck, "Submit initial deck failed.")}
            submitShuffle={() => runGameAction(oneClickSubmitShuffle, "Submit shuffle failed.")}
            submitFinalShuffle={() => runGameAction(oneClickSubmitFinalShuffle, "Submit final shuffle failed.")}
            partialDecryptPrivate={() => runGameAction(submitBothPartialDecryptsForOpponent, "Private partial decrypt failed.")}
            revealPrivateLocal={() => runGameAction(revealMyPrivateCardsLocally, "Local reveal failed.")}
            partialDecryptFlop={() => runGameAction(() => partialDecryptStreet("flop"), "Flop partial decrypt failed.")}
            revealFlop={() => runGameAction(() => revealStreet("flop"), "Reveal flop failed.")}
            partialDecryptTurn={() => runGameAction(() => partialDecryptStreet("turn"), "Turn partial decrypt failed.")}
            revealTurn={() => runGameAction(() => revealStreet("turn"), "Reveal turn failed.")}
            partialDecryptRiver={() => runGameAction(() => partialDecryptStreet("river"), "River partial decrypt failed.")}
            revealRiver={() => runGameAction(() => revealStreet("river"), "Reveal river failed.")}
            revealPrivateOnChain={() => runGameAction(revealMyPrivateCardsOnChain, "Reveal private cards failed.")}
            submitBestHand={() => runGameAction(submitBestHand, "Submit best hand failed.")}
          />
        </>
      )}

      <div className="global-game-status">
        {phase} / Street {bettingStreet}
      </div>

    {showDebugPanel && (
      <div
        className="debug-modal-overlay"
        onClick={() => setShowDebugPanel(false)}
      >
        <div
          className="debug-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="debug-modal-header">
            <h1>Debug Panel</h1>

            <button
              className="debug-modal-close"
              onClick={() => setShowDebugPanel(false)}
            >
              Close
            </button>
          </div>

      {account && (
        <div className="card">

          <p>
            <strong>Account:</strong> {account}
          </p>

          <p>
            <strong>Chain ID:</strong> {chainId}
          </p>

          <p>
            <strong>Phase:</strong> {phase}
          </p>

          <p>
            <strong>Round ID:</strong> {roundId}
          </p>

          <p>
            <strong>Hand Pot:</strong> {handPot}
          </p>

          <p>
            <strong>Table Balance:</strong> {tableBalance}
          </p>

          <p>
            <strong>Wallet Token Balance:</strong> {tokenBalance}
          </p>

          <p>
            <strong>Claimable Winnings:</strong> {claimableWinnings}
          </p>

          <p>
            <strong>Big Blind:</strong> {bigBlindAmount}
          </p>

          <p>
            <strong>Minimum Bet:</strong> {minBet}
          </p>

          <p>
            <strong>Betting Street:</strong> {bettingStreet}
          </p>

          <p>
            <strong>Betting Round Open:</strong> {bettingRoundOpen}
          </p>

          <p>
            <strong>Action Player:</strong> {actionPlayer}
          </p>

          <p>
            <strong>Current Bet:</strong> {currentBet}
          </p>

          <p>
            <strong>Action Deadline:</strong> {actionDeadline}
          </p>

          <p>
            <strong>Winner:</strong> {winner}
          </p>

          <p>
            <strong>Is Tie:</strong> {isTie}
          </p>

          <p><strong>Public Key Count:</strong> {publicKeyCount}</p>
          <p><strong>Aggregate PK Submitted:</strong> {aggregatePkSubmitted}</p>
          <p><strong>Initial Deck Submitted:</strong> {initialDeckSubmitted}</p>
          <p><strong>Current Deck Commit:</strong> {currentDeckCommit}</p>
          <p><strong>Shuffle Count:</strong> {shuffleCount}</p>
          <p><strong>Dealt Card Count:</strong> {dealtCardCount}</p>
          <p><strong>Cards Ready For Reveal:</strong> {cardsReadyForRevealCount}</p>
          <p><strong>Reveal Count:</strong> {revealCount}</p>
          <p><strong>Best Hand Submit Count:</strong> {bestHandSubmitCount}</p>
          <p><strong>Winning Hand Category:</strong> {winningHandCategory}</p>

          <h3>Players</h3>

          <p>
            <strong>Player Count:</strong> {playerCount}
          </p>

          <p>
            <strong>Player 0:</strong> {player0}
          </p>

          <p>
            <strong>Player 0 PK X:</strong> {player0Pk.x}
          </p>

          <p>
            <strong>Player 0 PK Y:</strong> {player0Pk.y}
          </p>

          <p>
            <strong>Player 1:</strong> {player1}
          </p>

          <p>
            <strong>Player 1 PK X:</strong> {player1Pk.x}
          </p>

          <p>
            <strong>Player 1 PK Y:</strong> {player1Pk.y}
          </p>

          <h3>Local Keypair</h3>

          <p>
            <strong>Local PK X:</strong> {localPk.x}
          </p>

          <p>
            <strong>Local PK Y:</strong> {localPk.y}
          </p>

          <p>
            <strong>Local SK Stored:</strong> {localSk ? "yes" : "no"}
          </p>

          <p>
            <strong>Public Key Proof Ready:</strong> {publicKeyProof ? "yes" : "no"}
          </p>

          <h3>Initial Deck</h3>

          <p>
            <strong>Initial Deck Ready:</strong> {initialDeck ? "yes" : "no"}
          </p>

          <p>
            <strong>Initial Deck Commit Local:</strong> {initialDeckCommitLocal}
          </p>

          <p>
            <strong>Initial Deck Proof Ready:</strong> {initialDeckProof ? "yes" : "no"}
          </p>

          <h3>Shuffle Deck</h3>

          <p>
            <strong>Shuffle Input Deck Ready:</strong> {shuffleInputDeck ? "yes" : "no"}
          </p>

          <p>
            <strong>Shuffle Input Commit:</strong> {shuffleInputCommit}
          </p>

          <p>
            <strong>Shuffled Deck Ready:</strong> {shuffledDeck ? "yes" : "no"}
          </p>

          <p>
            <strong>Shuffle Deck Commit Local:</strong> {shuffleDeckCommitLocal}
          </p>

          <p>
            <strong>Shuffle Proof Ready:</strong> {shuffleProof ? "yes" : "no"}
          </p>

          <h3>Final Shuffle + Deal</h3>

          <p>
            <strong>Final Shuffle Input Deck Ready:</strong> {finalShuffleInputDeck ? "yes" : "no"}
          </p>

          <p>
            <strong>Final Shuffle Input Commit:</strong> {finalShuffleInputCommit}
          </p>

          <p>
            <strong>Final Shuffle Deck Commit Local:</strong> {finalShuffleDeckCommitLocal}
          </p>

          <p>
            <strong>Final Shuffle Proof Ready:</strong> {finalShuffleProof ? "yes" : "no"}
          </p>

          <h3>Partial Decrypt / Private Cards</h3>

          <p>
            <strong>Partial Decrypts Submitted:</strong> {partialDecryptProofsReady ? "yes" : "no"}
          </p>

          <p>
            <strong>My Private Cards Ready:</strong> {myPrivateCards.length === 2 ? "yes" : "no"}
          </p>

          {myPrivateCards.map((card) => (
            <div key={card.index} className="mini-card">
              <p>
                <strong>Private Card Index:</strong> {card.index}
              </p>

              <p>
                <strong>Private Card:</strong> {card.label}
              </p>

              <p>
                <strong>Card ID:</strong> {card.cardId}
              </p>

              <p>
                <strong>Point X:</strong> {card.pointX}
              </p>

              <p>
                <strong>Point Y:</strong> {card.pointY}
              </p>
            </div>
          ))}

          <h3>Community Cards</h3>

            {communityCards.length === 0 && (
              <p>No community cards revealed yet.</p>
            )}

            {communityCards.map((card) => (
              <div key={card.index} className="mini-card">
                <p><strong>Index:</strong> {card.index}</p>
                <p><strong>Card:</strong> {card.label}</p>
                <p><strong>Card ID:</strong> {card.cardId}</p>
                <p><strong>Revealed Point X:</strong> {card.pointX}</p>
                <p><strong>Revealed Point Y:</strong> {card.pointY}</p>
              </div>
            ))}

          <h3>Dealt Cards</h3>

          {dealtCards.length === 0 && (
            <p>No dealt cards yet.</p>
          )}

          {dealtCards.map((card) => (
            <div key={card.index} className="mini-card">
              <p>
                <strong>Card Index:</strong> {card.index}
              </p>

              <p>
                <strong>Owner:</strong> {card.owner}
              </p>

              <p>
                <strong>Partial Count:</strong> {card.partialCount}
              </p>

              <p>
                <strong>Reveal Ready:</strong> {card.revealReady.toString()}
              </p>

              <p>
                <strong>Revealed:</strong> {card.revealed.toString()}
              </p>

              <p>
                <strong>Revealed Card ID:</strong> {card.revealedCardId}
              </p>

              <p>
                <strong>Revealed Rank:</strong> {card.revealedRank}
              </p>

            </div>
          ))}

          <h3>Showdown / Best Hand</h3>

          <p>
            <strong>Winner:</strong> {winner}
          </p>

          <p>
            <strong>Winner Seat:</strong> {winnerPlayerLabel()}
          </p>

          <p>
            <strong>Winning Hand Category:</strong> {handCategoryLabel(winningHandCategory)}
          </p>

          <p>
            <strong>Best Hand Submit Count:</strong> {bestHandSubmitCount}
          </p>

          {submittedHands.map((h) => (
            <div key={h.player} className="mini-card">
              <p><strong>{h.playerLabel}</strong></p>
              <p><strong>Submitted:</strong> {h.submitted.toString()}</p>
              <p><strong>Score:</strong> {h.score}</p>
              <p><strong>Indexes:</strong> {h.indexes.join(", ")}</p>
              <p>
                <strong>Cards:</strong>{" "}
                {h.indexes.map((idx) => getCardLabelByIndex(idx)).join(" | ")}
              </p>
            </div>
          ))}

          <hr />
          
          <h3>Token Bank</h3>

          <p>
            <strong>Token Rate:</strong> {tokenRate}
          </p>

          <p>
            <strong>ETH Reserve:</strong> {ethReserve}
          </p>

          <input
            type="text"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            placeholder="ETH amount"
          />

          <button
            onClick={buyTokens}
            disabled={txLoading}
          >
            Buy Tokens
          </button>

          <hr />

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />

          <div className="button-group">

            <button
              onClick={approveTokens}
              disabled={txLoading}
            >
              Approve Tokens
            </button>

            <button
              onClick={joinGame}
              disabled={txLoading}
            >
              Join Game
            </button>

            <button
              onClick={depositToTable}
              disabled={txLoading}
            >
              Deposit To Table
            </button>

            <button
              onClick={leaveGame}
              disabled={txLoading}
            >
              Leave Game
            </button>

            <button
              onClick={loadGameState}
              disabled={txLoading}
            >
              Refresh Game State
            </button>

            <button
              onClick={withdrawTableBalance}
              disabled={txLoading}
            >
              Withdraw Table Balance
            </button>

            <button
              onClick={withdrawWinnings}
              disabled={txLoading}
            >
              Withdraw Winnings
            </button>

            <button
              onClick={claimTimeoutVictory}
              disabled={txLoading}
            >
              Claim Timeout Victory
            </button>

            <button
              onClick={checkAction}
              disabled={txLoading}
            >
              Check
            </button>

            <button
              onClick={betAction}
              disabled={txLoading}
            >
              Bet Amount
            </button>

            <button
              onClick={callBetAction}
              disabled={txLoading}
            >
              Call Bet
            </button>

            <button
              onClick={foldAction}
              disabled={txLoading}
            >
              Fold
            </button>

            <button
              onClick={generatePublicKeyLocal}
              disabled={txLoading}
            >
              Generate Public Key
            </button>

            <button
              onClick={generatePublicKeyProof}
              disabled={txLoading}
            >
              Generate Public Key Proof
            </button>

            <button
              onClick={submitPublicKeyProof}
              disabled={txLoading}
            >
              Submit Public Key Proof
            </button>

            <button
              onClick={generateInitialDeckLocal}
              disabled={txLoading}
            >
              Generate Initial Deck
            </button>

            <button
              onClick={generateInitialDeckProof}
              disabled={txLoading}
            >
              Generate Initial Deck Proof
            </button>

            <button
              onClick={submitInitialDeckProof}
              disabled={txLoading}
            >
              Submit Initial Deck
            </button>

            <button
              onClick={loadInitialDeckFromEvent}
              disabled={txLoading}
            >
              Load Initial Deck Event
            </button>

            <button
              onClick={generateShuffleLocal}
              disabled={txLoading}
            >
              Generate Shuffle
            </button>

            <button
              onClick={generateShuffleProof}
              disabled={txLoading}
            >
              Generate Shuffle Proof
            </button>

            <button
              onClick={submitShuffleProof}
              disabled={txLoading}
            >
              Submit Shuffle
            </button>

            <button
              onClick={loadPlayer0ShuffleDeckFromEvent}
              disabled={txLoading}
            >
              Load Player 0 Shuffle Event
            </button>

            <button
              onClick={generateFinalShuffleLocal}
              disabled={txLoading}
            >
              Generate Final Shuffle
            </button>

            <button
              onClick={generateFinalShuffleProof}
              disabled={txLoading}
            >
              Generate Final Shuffle Proof
            </button>

            <button
              onClick={submitFinalShuffleProof}
              disabled={txLoading}
            >
              Submit Final Shuffle + Deal
            </button>

            <button
              onClick={submitBothPartialDecryptsForOpponent}
              disabled={txLoading}
            >
              Partial Decrypt Opponent Private Cards
            </button>

            <button
              onClick={revealMyPrivateCardsLocally}
              disabled={txLoading}
            >
              Reveal My Private Cards Locally
            </button>

            <button
              onClick={() => partialDecryptStreet("flop")}
              disabled={txLoading}
            >
              Partial Decrypt Flop
            </button>

            <button
              onClick={() => revealStreet("flop")}
              disabled={txLoading}
            >
              Reveal Flop
            </button>

            <button
              onClick={() => partialDecryptStreet("turn")}
              disabled={txLoading}
            >
              Partial Decrypt Turn
            </button>

            <button
              onClick={() => revealStreet("turn")}
              disabled={txLoading}
            >
              Reveal Turn
            </button>

            <button
              onClick={() => partialDecryptStreet("river")}
              disabled={txLoading}
            >
              Partial Decrypt River
            </button>

            <button
              onClick={() => revealStreet("river")}
              disabled={txLoading}
            >
              Reveal River
            </button>

            <button
              onClick={revealMyPrivateCardsOnChain}
              disabled={txLoading}
            >
              Reveal My Private Cards On-Chain
            </button>

            <button
              onClick={submitBestHand}
              disabled={txLoading}
            >
              Submit Best Hand
            </button>

            <button
              onClick={refreshSubmittedHands}
              disabled={txLoading}
            >
              Refresh Submitted Hands
            </button>

          </div>
          </div>
        )}
      </div>
      </div>
    )}

    {error && (
      <p className="bad">{error}</p>
    )}

  </div>
);
}

export default App;