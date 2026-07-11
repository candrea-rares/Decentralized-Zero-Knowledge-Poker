export default function Lobby({
  account,
  connectWallet,
  ethAmount,
  setEthAmount,
  buyTokens,
  amount,
  setAmount,
  joinTable,
  rotatePokerKey,
  txLoading,
  playerCount,
  tokenBalance,
  tableBalance,
  claimableBalance,
  withdrawWinnings,
  isSeated,
  returnToSeat
}) {
  const count = Number(playerCount || 0);

  const tableMessage =
    count === 0
      ? "0 players at the table"
      : count === 1
        ? "1 player at the table"
        : "Table is full";

  const tableFull = count >= 2;

  return (
    <section className="lobby-shell">
      <div className="lobby-card">
        <h1>Heads-Up ZK Poker</h1>

        {!account && (
          <button onClick={connectWallet}>
            Connect MetaMask
          </button>
        )}

        {isSeated && (
          <button
            className="return-seat-btn"
            onClick={returnToSeat}
            disabled={txLoading}
          >
            Return to Seat
          </button>
        )}

        {account && (
          <>
            <p>
              <strong>Wallet:</strong> {account}
            </p>

            <div className="lobby-section">
                  <h3>Withdraw Chips from the table</h3>
                  <p>
                    Available Chips To Cash Out
                    {" "}
                    <strong>{claimableBalance || "0"}</strong>
                  </p>

                  <button
                    onClick={withdrawWinnings}
                    disabled={
                      txLoading ||
                      Number(claimableBalance || "0") <= 0
                    }
                  >
                    Cash Out Chips
                  </button>
            </div>

            <div className="lobby-section">
              <h3>Buy Tokens</h3>
                <p>
                    Payment in Ether: 1 Ether = $1000
                </p>

              <input
                type="text"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                placeholder="ETH amount"
              />

              <button onClick={buyTokens} disabled={txLoading}>
                Buy Tokens
              </button>
            </div>

            <div className="lobby-section">
                <h3>Poker Key</h3>

                <p>
                    Use this only if you lost your local secret key or cleared browser storage.
                </p>

                <button onClick={rotatePokerKey} disabled={txLoading}>
                    Rotate Poker Key
                </button>
                </div>

            <div className="lobby-section">
              <h3>Join Table</h3>

              <p>{tableMessage}</p>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Token buy-in"
              />

              <button
                onClick={joinTable}
                disabled={txLoading || tableFull}
              >
                Join Game
              </button>
            </div>

            {txLoading && <p>Processing...</p>}
          </>
        )}
      </div>
    </section>
  );
}