function randomScalar(subOrder) {
  const bytes = new Uint8Array(32);
  let r = 0n;

  while (r === 0n) {
    window.crypto.getRandomValues(bytes);

    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    r = BigInt("0x" + hex) % BigInt(subOrder.toString());
  }

  return r;
}

export async function generatePokerKeypair() {
  const circomlibjs = await import("circomlibjs");

  const babyjub = await circomlibjs.buildBabyjub();
  const Fr = babyjub.F;

  const sk = randomScalar(babyjub.subOrder);
  const pk = babyjub.mulPointEscalar(babyjub.Base8, sk);

  return {
    sk: sk.toString(),
    pk: {
      x: Fr.toObject(pk[0]).toString(),
      y: Fr.toObject(pk[1]).toString()
    }
  };
}

export async function buildInitialEncryptedDeck(aggregatePk) {
  const circomlibjs = await import("circomlibjs");

  const babyjub = await circomlibjs.buildBabyjub();
  const poseidon = await circomlibjs.buildPoseidon();

  const Fr = babyjub.F;
  const BASE = babyjub.Base8;
  const SUBORDER = babyjub.subOrder;

  function toBabyJubPoint(p) {
    return [
      Fr.e(p.x.toString()),
      Fr.e(p.y.toString())
    ];
  }

  function pointToArray(p) {
    return [
      Fr.toObject(p[0]).toString(),
      Fr.toObject(p[1]).toString()
    ];
  }

  function randomScalar() {
    const bytes = new Uint8Array(32);
    let r = 0n;

    while (r === 0n) {
      window.crypto.getRandomValues(bytes);

      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      r = BigInt("0x" + hex) % BigInt(SUBORDER.toString());
    }

    return r;
  }

  function poseidonHash(inputs) {
    return poseidon.F.toObject(
      poseidon(inputs)
    ).toString();
  }

  function cardIdToPoint(cardId) {
    return babyjub.mulPointEscalar(
      BASE,
      BigInt(cardId + 1)
    );
  }

  function encryptPoint(pk, M) {
    const r = randomScalar();

    const c1 = babyjub.mulPointEscalar(BASE, r);
    const rPk = babyjub.mulPointEscalar(pk, r);
    const c2 = babyjub.addPoint(M, rPk);

    return {
      c1,
      c2,
      r
    };
  }

  function commitCiphertext(ct) {
    const c1 = pointToArray(ct.c1);
    const c2 = pointToArray(ct.c2);

    return poseidonHash([
      BigInt(c1[0]),
      BigInt(c1[1]),
      BigInt(c2[0]),
      BigInt(c2[1])
    ]);
  }

  function computeDeckCommitment(deck) {
    let running = "0";

    for (const ct of deck) {
      const cardCommit = commitCiphertext(ct);

      running = poseidonHash([
        BigInt(running),
        BigInt(cardCommit)
      ]);
    }

    return running;
  }

  const pk = toBabyJubPoint(aggregatePk);

  const plainDeck = Array.from(
    { length: 52 },
    (_, i) => cardIdToPoint(i)
  );

  const encryptedDeck = plainDeck.map((M) =>
    encryptPoint(pk, M)
  );

  const deckCommit = computeDeckCommitment(encryptedDeck);

  const circuitInput = {
    pk: [
      aggregatePk.x.toString(),
      aggregatePk.y.toString()
    ],
    outputDeckCommit: deckCommit.toString(),
    r: encryptedDeck.map((ct) => ct.r.toString())
  };

  const solidityDeck = encryptedDeck.map((ct) => {
    const c1 = pointToArray(ct.c1);
    const c2 = pointToArray(ct.c2);

    return [
      [c1[0], c1[1]],
      [c2[0], c2[1]]
    ];
  });

  return {
    circuitInput,
    solidityDeck,
    deckCommit
  };
}

export async function buildShuffleReencryptDeck(inputDeck, aggregatePk, inputDeckCommit) {
  const circomlibjs = await import("circomlibjs");

  const babyjub = await circomlibjs.buildBabyjub();
  const poseidon = await circomlibjs.buildPoseidon();

  const Fr = babyjub.F;
  const BASE = babyjub.Base8;
  const SUBORDER = babyjub.subOrder;

  function toBabyJubPoint(p) {
    return [
      Fr.e(p.x.toString()),
      Fr.e(p.y.toString())
    ];
  }

  function pointToArray(p) {
    return [
      Fr.toObject(p[0]).toString(),
      Fr.toObject(p[1]).toString()
    ];
  }

  function ciphertextToPoints(ct) {
    return {
      c1: [
        Fr.e(ct.c1.x.toString()),
        Fr.e(ct.c1.y.toString())
      ],
      c2: [
        Fr.e(ct.c2.x.toString()),
        Fr.e(ct.c2.y.toString())
      ]
    };
  }

  function randomScalar() {
    const bytes = new Uint8Array(32);
    let r = 0n;

    while (r === 0n) {
      window.crypto.getRandomValues(bytes);

      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      r = BigInt("0x" + hex) % BigInt(SUBORDER.toString());
    }

    return r;
  }

  function poseidonHash(inputs) {
    return poseidon.F.toObject(
      poseidon(inputs)
    ).toString();
  }

  function commitCiphertext(ct) {
    const c1 = pointToArray(ct.c1);
    const c2 = pointToArray(ct.c2);

    return poseidonHash([
      BigInt(c1[0]),
      BigInt(c1[1]),
      BigInt(c2[0]),
      BigInt(c2[1])
    ]);
  }

  function computeDeckCommitment(deck) {
    let running = "0";

    for (const ct of deck) {
      const cardCommit = commitCiphertext(ct);

      running = poseidonHash([
        BigInt(running),
        BigInt(cardCommit)
      ]);
    }

    return running;
  }

  function shuffleArray(n) {
    const arr = Array.from({ length: n }, (_, i) => i);

    for (let i = n - 1; i > 0; i--) {
      const bytes = new Uint32Array(1);
      window.crypto.getRandomValues(bytes);

      const j = bytes[0] % (i + 1);

      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }

    return arr;
  }

  function buildPermutationMatrix(perm) {
    return perm.map((sourceIndex) => {
      const row = Array(52).fill(0);
      row[sourceIndex] = 1;
      return row;
    });
  }

  const pk = toBabyJubPoint(aggregatePk);

  const parsedInputDeck = inputDeck.map(ciphertextToPoints);

  const perm = shuffleArray(52);
  const P = buildPermutationMatrix(perm);

  const randomness = [];
  const outputDeck = [];

  for (let i = 0; i < 52; i++) {
    const source = parsedInputDeck[perm[i]];
    const r = randomScalar();

    const rG = babyjub.mulPointEscalar(BASE, r);
    const rPk = babyjub.mulPointEscalar(pk, r);

    const newC1 = babyjub.addPoint(source.c1, rG);
    const newC2 = babyjub.addPoint(source.c2, rPk);

    randomness.push(r.toString());

    outputDeck.push({
      c1: newC1,
      c2: newC2
    });
  }

  const outputDeckCommit = computeDeckCommitment(outputDeck);

  const circuitInput = {
    pk: [
      aggregatePk.x.toString(),
      aggregatePk.y.toString()
    ],
    inputDeckCommit: inputDeckCommit.toString(),
    outputDeckCommit: outputDeckCommit.toString(),
    cin_c1: parsedInputDeck.map((ct) => pointToArray(ct.c1)),
    cin_c2: parsedInputDeck.map((ct) => pointToArray(ct.c2)),
    cout_c1: outputDeck.map((ct) => pointToArray(ct.c1)),
    cout_c2: outputDeck.map((ct) => pointToArray(ct.c2)),
    P,
    t: randomness.map((x) => x.toString())
  };

  const solidityDeck = outputDeck.map((ct) => {
    const c1 = pointToArray(ct.c1);
    const c2 = pointToArray(ct.c2);

    return [
      [c1[0], c1[1]],
      [c2[0], c2[1]]
    ];
  });

  return {
    circuitInput,
    solidityDeck,
    outputDeckCommit,
    perm
  };
}

export async function buildFinalShuffleDealDeck(inputDeck, aggregatePk, inputDeckCommit) {
  const result = await buildShuffleReencryptDeck(
    inputDeck,
    aggregatePk,
    inputDeckCommit
  );

  const dealtPositions = [0, 1, 2, 3, 5, 6, 7, 9, 11];

  const dealt_c1 = dealtPositions.map((i) =>
    result.circuitInput.cout_c1[i]
  );

  const dealt_c2 = dealtPositions.map((i) =>
    result.circuitInput.cout_c2[i]
  );

  const circuitInput = {
    ...result.circuitInput,
    dealt_c1,
    dealt_c2
  };

  return {
    circuitInput,
    finalDeck: result.solidityDeck,
    outputDeckCommit: result.outputDeckCommit,
    dealt_c1,
    dealt_c2,
    perm: result.perm
  };
}

export async function partialDecryptCardLocal(card, localSk) {
  const circomlibjs = await import("circomlibjs");

  const babyjub = await circomlibjs.buildBabyjub();
  const Fr = babyjub.F;

  function toPoint(x, y) {
    return [
      Fr.e(x.toString()),
      Fr.e(y.toString())
    ];
  }

  function pointToArray(p) {
    return [
      Fr.toObject(p[0]).toString(),
      Fr.toObject(p[1]).toString()
    ];
  }

  const c1 = toPoint(card.c1x, card.c1y);

  // Must use currentPoint because the contract checks currentPoint.
  const c2 = toPoint(card.currentX, card.currentY);

  const skC1 = babyjub.mulPointEscalar(
    c1,
    BigInt(localSk)
  );

  // BabyJub / twisted Edwards inverse is (-x, y), not (x, -y)
  const negSkC1 = [
    Fr.neg(skC1[0]),
    skC1[1]
  ];

  const D = babyjub.addPoint(c2, negSkC1);

  return {
    D: pointToArray(D),
    input: {
      pk: card.myPk,
      c1: pointToArray(c1),
      c2: pointToArray(c2),
      D: pointToArray(D),
      sk: localSk
    }
  };
}

export async function locallyRevealCard(card, localSk) {
  const result = await partialDecryptCardLocal(card, localSk);

  return {
    point: result.D
  };
}

export async function buildRevealCardLocal(card, localSk) {
  const circomlibjs = await import("circomlibjs");

  const babyjub = await circomlibjs.buildBabyjub();
  const Fr = babyjub.F;

  function toPoint(x, y) {
    return [
      Fr.e(x.toString()),
      Fr.e(y.toString())
    ];
  }

  function pointToArray(p) {
    return [
      Fr.toObject(p[0]).toString(),
      Fr.toObject(p[1]).toString()
    ];
  }

  const c1 = toPoint(card.c1x, card.c1y);
  const D = toPoint(card.currentX, card.currentY);

  const skC1 = babyjub.mulPointEscalar(
    c1,
    BigInt(localSk)
  );

  // BabyJub inverse: (-x, y)
  const negSkC1 = [
    Fr.neg(skC1[0]),
    skC1[1]
  ];

  const M = babyjub.addPoint(D, negSkC1);

  return {
    M: pointToArray(M),
    input: {
      pk: card.myPk,
      c1: pointToArray(c1),
      D: pointToArray(D),
      M: pointToArray(M),
      sk: localSk
    }
  };
}

export async function privatePointToCardId(pointX, pointY) {
  const circomlibjs = await import("circomlibjs");

  const babyjub = await circomlibjs.buildBabyjub();
  const Fr = babyjub.F;
  const BASE = babyjub.Base8;

  function pointToArray(p) {
    return [
      Fr.toObject(p[0]).toString(),
      Fr.toObject(p[1]).toString()
    ];
  }

  const x = pointX.toString();
  const y = pointY.toString();

  for (let cardId = 0; cardId < 52; cardId++) {
    const p = babyjub.mulPointEscalar(
      BASE,
      BigInt(cardId + 1)
    );

    const arr = pointToArray(p);

    if (arr[0] === x && arr[1] === y) {
      return cardId;
    }
  }

  return null;
}