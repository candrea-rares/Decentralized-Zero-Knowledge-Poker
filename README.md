# Decentralized Texas Hold'em Poker using Zero-Knowledge Proofs

## Overview

This repository contains the implementation developed as part of my Master's Thesis in Information Security.

The project demonstrates that a fully decentralized Texas Hold'em Poker game can be played **without relying on a trusted dealer**. Instead of trusting a central server to generate, shuffle, deal, and reveal cards, every player actively participates in each stage of the protocol using modern cryptographic techniques.

The goal of this project is to recreate the experience of a real-life poker game, where every participant contributes to the randomness of the deck while ensuring that no player can manipulate the game, discover hidden cards, or alter the final outcome.

Unlike traditional online poker platforms, the protocol distributes trust among all participants. Every player performs a cryptographic shuffle and re-encryption of the deck, proving the correctness of their actions through **Zero-Knowledge Proofs (zkSNARKs)** without revealing any secret information.

The implementation follows the official **Texas Hold'em Poker** rules, including identical betting rounds, hand rankings, and game flow.

---

## Features

- Fully decentralized game flow
- No trusted dealer required
- Multi-party deck shuffling
- ElGamal encryption over elliptic curves
- Zero-Knowledge proof verification using Groth16
- Secure card dealing
- Secure card revealing
- Smart contract enforced game phases
- On-chain proof verification
- Deterministic winner evaluation
- Frontend interaction through MetaMask

---

## Cryptographic Building Blocks

The implementation combines several modern cryptographic primitives:

- **Elliptic Curve ElGamal Encryption**
  - Encrypts every card in the deck
  - Allows re-encryption without revealing plaintext

- **Multi-Party Shuffle**
  - Every player independently shuffles and re-encrypts the deck
  - Prevents any participant from predicting card positions

- **Zero-Knowledge Proofs (Groth16)**
  - Prove that every shuffle, encryption and reveal operation is correct
  - Reveal no private information during verification

- **Poseidon Hash Function**
  - Efficient hash function designed for zkSNARK circuits
  - Used for deck commitments and public state verification

---

## Technology Stack

### Blockchain

- Solidity
- Ethereum Virtual Machine (EVM)
- Hardhat
- Ethers.js

### Zero-Knowledge

- Circom
- snarkjs
- Groth16
- Poseidon Hash

### Frontend

- React
- JavaScript
- MetaMask

---

## Game Flow

The protocol follows these phases:

1. Public key submission
2. Aggregated public key generation
3. Initial deck encryption
4. Multi-party shuffle and re-encryption
5. Card dealing through partial decryption
6. Final card reveal
7. Winner evaluation

Every sensitive operation is accompanied by a Zero-Knowledge Proof that is verified by the smart contract before the game is allowed to continue.

---

## Security Properties

The protocol guarantees:

- Fair deck generation
- Fair shuffling
- Hidden cards remain secret
- Public verification of every operation
- No trusted third party
- Resistance against malicious players attempting to manipulate the deck

---

## Educational Purpose

This repository was developed as part of a Master's Thesis in Information Security and demonstrates the practical integration of:

- Blockchain
- Smart Contracts
- Zero-Knowledge Proofs
- Modern Cryptography
- Decentralized Application Development

Although fully functional as a research prototype, the implementation focuses on demonstrating the protocol rather than production-scale performance. Proof generation time and transaction costs remain important areas for future optimization.

---

## Future Work

Potential improvements include:

- Optimizing zkSNARK proof generation
- Reducing on-chain gas consumption
- Support for additional players
- Tournament support
- Layer-2 deployment
- Improved frontend experience
- More efficient circuit design
- Better timeout and recovery mechanisms

---

## License

This repository is intended for academic and educational purposes.
