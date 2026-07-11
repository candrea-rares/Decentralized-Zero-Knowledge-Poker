export default function PlayerSeat({
  address,
  tableBalance,
  active,
  secondsLeft,
  formatCountdown
}) {
  return (
    <div className={`player-seat ${active ? "active-seat" : ""}`}>
      <p className="seat-address">{address || "Empty seat"}</p>

      <p className="seat-balance">
        Balance: ${tableBalance || "0"}
      </p>

      {active && secondsLeft > 0 && (
        <p className="seat-timer">
          Time left: {formatCountdown(secondsLeft)}
        </p>
      )}
    </div>
  );
}