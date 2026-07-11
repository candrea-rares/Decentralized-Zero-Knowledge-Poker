import PlayerSeat from "./PlayerSeat";
import CardImage from "./CardImage";

function SeatWithCards({
  children,
  showCardBacks,
  side,
  privateCards
}) {
  return (
    <div className={`seat-stack vertical-seat-${side}`}>
      <div className="seat-top-cards">

        {privateCards && privateCards.length > 0 ? (
          privateCards.map((card) => (
            <CardImage
              key={card.index}
              label={card.label}
              half
            />
          ))
        ) : (
          showCardBacks && (
            <>
              <CardImage hidden half className="deal-private-card deal-delay-1" />
              <CardImage hidden half className="deal-private-card deal-delay-2" />
            </>
          )
        )}

      </div>

      {children}
    </div>
  );
}

export default function GameTable({
  account,
  player0,
  player1,
  actionPlayer,
  communityCards,
  myPrivateCards,
  handPot,
  phase,
  bettingStreet,
  currentBet,
  toCall,
  secondsLeft,
  formatCountdown,
  isPlayerTurnTimer,
  sharedTimerLabel,
  dealtCardCount,
  player0TableBalance,
  player1TableBalance,
  player0Committed,
  player1Committed,
  player0RevealedPrivateCards,
  player1RevealedPrivateCards,
  showdownMessage,
}) {
  const showCardBacks = Number(dealtCardCount) > 0;

  return (
  <section className="table-section">

    {!isPlayerTurnTimer && sharedTimerLabel && (
      <div className="shared-timer">
        <span>{sharedTimerLabel}</span>

        <strong>
          {secondsLeft > 0
            ? formatCountdown(secondsLeft)
            : "Timeout available"}
        </strong>
      </div>
    )}

    <div className="vertical-table-layout">

      {/* OPPONENT */}

      {account?.toLowerCase() === player0?.toLowerCase() ? (

        <SeatWithCards
          showCardBacks={showCardBacks}
          side="top"
          privateCards={player1RevealedPrivateCards}
        >
          <PlayerSeat
            address={player1}
            tableBalance={player1TableBalance}
            active={
              actionPlayer?.toLowerCase() === player1?.toLowerCase()
            }
            secondsLeft={isPlayerTurnTimer ? secondsLeft : 0}
            formatCountdown={formatCountdown}
          />
        </SeatWithCards>

      ) : (

        <SeatWithCards
          showCardBacks={showCardBacks}
          side="top"
          privateCards={player0RevealedPrivateCards}
        >
          <PlayerSeat
            address={player0}
            tableBalance={player0TableBalance}
            active={
              actionPlayer?.toLowerCase() === player0?.toLowerCase()
            }
            secondsLeft={isPlayerTurnTimer ? secondsLeft : 0}
            formatCountdown={formatCountdown}
          />
        </SeatWithCards>

      )}

      {/* TABLE */}

      <div className="poker-table">
        <div className="table-watermark">
          Heads-Up ZK
        </div>

        {(
          account?.toLowerCase() === player0?.toLowerCase()
            ? Number(player1Committed) > 0
            : Number(player0Committed) > 0
        ) && (
          <div className="bet-chip bet-chip-top">
            {account?.toLowerCase() === player0?.toLowerCase()
              ? `Bet: ${player1Committed}`
              : `Bet: ${player0Committed}`}
          </div>
        )}

        {(
          account?.toLowerCase() === player0?.toLowerCase()
            ? Number(player0Committed) > 0
            : Number(player1Committed) > 0
        ) && (
          <div className="bet-chip bet-chip-bottom">
            {account?.toLowerCase() === player0?.toLowerCase()
              ? `Bet: ${player0Committed}`
              : `Bet: ${player1Committed}`}
          </div>
        )}

        <div className="table-content">

          <div className="table-top-info">
            {showdownMessage && (
              <div className="showdown-banner">
                {showdownMessage}
              </div>
            )}
            <div className="pot-box">
              Pot: {handPot}
            </div>

          </div>

          <div className="community-row">
            {communityCards.length === 0 ? (
              <div className="empty-board">
                Waiting for community cards
              </div>
            ) : (
              communityCards.map((card) => (
                <CardImage
                  key={card.index}
                  label={card.label}
                  className={`deal-community-card deal-community-${card.index}`}
                />
              ))
            )}
          </div>

        </div>
      </div>

      {/* MY SEAT */}

      {account?.toLowerCase() === player0?.toLowerCase() ? (

        <SeatWithCards
          showCardBacks={showCardBacks}
          side="bottom"
          privateCards={
            myPrivateCards.length > 0
              ? myPrivateCards
              : player0RevealedPrivateCards
          }
        >
          <PlayerSeat
            address={player0}
            tableBalance={player0TableBalance}
            active={
              actionPlayer?.toLowerCase() === player0?.toLowerCase()
            }
            secondsLeft={isPlayerTurnTimer ? secondsLeft : 0}
            formatCountdown={formatCountdown}
          />
        </SeatWithCards>

      ) : (

        <SeatWithCards
          showCardBacks={showCardBacks}
          side="bottom"
          privateCards={
            myPrivateCards.length > 0
              ? myPrivateCards
              : player1RevealedPrivateCards
          }
        >
          <PlayerSeat
            address={player1}
            tableBalance={player1TableBalance}
            active={
              actionPlayer?.toLowerCase() === player1?.toLowerCase()
            }
            secondsLeft={isPlayerTurnTimer ? secondsLeft : 0}
            formatCountdown={formatCountdown}
          />
        </SeatWithCards>

      )}

    </div>

  </section>
);
}