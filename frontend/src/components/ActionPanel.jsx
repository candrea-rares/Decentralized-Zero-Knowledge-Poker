export default function ActionPanel({
  amount,
  setAmount,
  txLoading,

  phase,
  bettingStreet,
  bettingRoundOpen,
  shuffleCount,
  aggregatePkSubmitted,
  initialDeckSubmitted,
  myPlayerIndex,

  canBetNow,
  checkAction,
  betAction,
  callBetAction,
  foldAction,

  submitPublicKey,
  submitInitialDeck,
  submitShuffle,
  submitFinalShuffle,
  partialDecryptPrivate,
  revealPrivateLocal,
  partialDecryptFlop,
  revealFlop,
  partialDecryptTurn,
  revealTurn,
  partialDecryptRiver,
  revealRiver,
  revealPrivateOnChain,
  submitBestHand
}) {
  const needsPublicKey =
    phase === "PlayersJoined" && aggregatePkSubmitted !== "true";

  const isPlayer0 = Number(myPlayerIndex) === 0;
  const isPlayer1 = Number(myPlayerIndex) === 1;

  const canSubmitInitialDeck =
    phase === "KeysSubmitted" &&
    initialDeckSubmitted !== "true" &&
    isPlayer0;

  const canSubmitShuffle =
    phase === "PlayersShuffling" &&
    Number(shuffleCount) === 0 &&
    isPlayer0;

  const canSubmitFinalShuffle =
    phase === "PlayersShuffling" &&
    Number(shuffleCount) === 1 &&
    isPlayer1;

  let waitingMessage = "";

  if (
    phase === "KeysSubmitted" &&
    initialDeckSubmitted !== "true" &&
    !isPlayer0
  ) {
    waitingMessage = "Waiting for Player 0 to submit the initial deck.";
  }

  if (
    phase === "PlayersShuffling" &&
    Number(shuffleCount) === 0 &&
    !isPlayer0
  ) {
    waitingMessage = "Waiting for Player 0 to shuffle the deck.";
  }

  if (
    phase === "PlayersShuffling" &&
    Number(shuffleCount) === 1 &&
    !isPlayer1
  ) {
    waitingMessage = "Waiting for Player 1 to perform the final shuffle and deal.";
  }

  const canPrivateDecrypt =
    phase === "CardsDealing" &&
    bettingStreet === "0" &&
    bettingRoundOpen === "false";

  const canFlop =
    phase === "CardsDealing" &&
    bettingStreet === "2" &&
    bettingRoundOpen === "false";

  const canTurn =
    phase === "CardsDealing" &&
    bettingStreet === "3" &&
    bettingRoundOpen === "false";

  const canRiver =
    phase === "CardsDealing" &&
    bettingStreet === "4" &&
    bettingRoundOpen === "false";

  const canShowdownReveal =
    phase === "CardsDealing" &&
    bettingStreet === "5" &&
    bettingRoundOpen === "false";

  const canSubmitBestHand =
    phase === "HandScoring";

  const canRevealPrivateLocal =
    phase === "CardsDealing" ||
    bettingRoundOpen === "true";

  return (
    <section className="action-panel">
      {txLoading && <p>Processing...</p>}

      {waitingMessage && (
        <p className="waiting-action">
          {waitingMessage}
        </p>
      )}

      {needsPublicKey && (
        <button onClick={submitPublicKey} disabled={txLoading}>
          Submit Public Key
        </button>
      )}

      {canSubmitInitialDeck && (
        <button onClick={submitInitialDeck} disabled={txLoading}>
          Submit Initial Deck
        </button>
      )}

      {canSubmitShuffle && (
        <button onClick={submitShuffle} disabled={txLoading}>
          Shuffle Deck
        </button>
      )}

      {canSubmitFinalShuffle && (
        <button onClick={submitFinalShuffle} disabled={txLoading}>
          Final Shuffle + Deal
        </button>
      )}

      {canPrivateDecrypt && (
        <>
          <button onClick={partialDecryptPrivate} disabled={txLoading}>
            Decrypt Opponent Cards
          </button>
        </>
      )}

      {canRevealPrivateLocal && (
        <button onClick={revealPrivateLocal} disabled={txLoading}>
          Reveal My Cards
        </button>
      )}

      {canBetNow && (
        <>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />

          <button onClick={checkAction} disabled={txLoading}>Check</button>
          <button onClick={betAction} disabled={txLoading}>Bet / Raise</button>
          <button onClick={callBetAction} disabled={txLoading}>Call</button>
          <button onClick={foldAction} disabled={txLoading}>Fold</button>
          
        </>
      )}

      {canFlop && isPlayer1 && (
        <button onClick={partialDecryptFlop} disabled={txLoading}>
          Decrypt Flop
        </button>
      )}

      {canFlop && isPlayer0 && (
        <button onClick={revealFlop} disabled={txLoading}>
          Reveal Flop
        </button>
      )}

      {canTurn && isPlayer1 && (
        <button onClick={partialDecryptTurn} disabled={txLoading}>
          Decrypt Turn
        </button>
      )}

      {canTurn && isPlayer0 && (
        <button onClick={revealTurn} disabled={txLoading}>
          Reveal Turn
        </button>
      )}

      {canRiver && isPlayer1 && (
        <button onClick={partialDecryptRiver} disabled={txLoading}>
          Decrypt River
        </button>
      )}

      {canRiver && isPlayer0 && (
        <button onClick={revealRiver} disabled={txLoading}>
          Reveal River
        </button>
      )}

      {canShowdownReveal && (
        <button onClick={revealPrivateOnChain} disabled={txLoading}>
          Reveal Private Cards On-Chain
        </button>
      )}

      {canSubmitBestHand && (
        <button onClick={submitBestHand} disabled={txLoading}>
          Submit Best Hand
        </button>
      )}
    </section>
  );
}