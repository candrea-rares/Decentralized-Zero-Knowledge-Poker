pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/babyjub.circom";
include "../node_modules/circomlib/circuits/escalarmulfix.circom";
include "../node_modules/circomlib/circuits/escalarmulany.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template ReEncryptOneSelected() {
    signal input pk[2];

    signal input c1[2];
    signal input c2[2];

    signal input c1p[2];
    signal input c2p[2];

    signal input t;

    component tBits = Num2Bits(253);
    tBits.in <== t;

    var BASE8[2];
    BASE8[0] = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
    BASE8[1] = 16950150798460657717958625567821834550301663161624707787222815936182638968203;

    component baseMul = EscalarMulFix(253, BASE8);
    for (var i = 0; i < 253; i++) {
        baseMul.e[i] <== tBits.out[i];
    }

    component add1 = BabyAdd();
    add1.x1 <== c1[0];
    add1.y1 <== c1[1];
    add1.x2 <== baseMul.out[0];
    add1.y2 <== baseMul.out[1];

    add1.xout === c1p[0];
    add1.yout === c1p[1];

    component pkMul = EscalarMulAny(253);
    pkMul.p[0] <== pk[0];
    pkMul.p[1] <== pk[1];

    for (var i = 0; i < 253; i++) {
        pkMul.e[i] <== tBits.out[i];
    }

    component add2 = BabyAdd();
    add2.x1 <== c2[0];
    add2.y1 <== c2[1];
    add2.x2 <== pkMul.out[0];
    add2.y2 <== pkMul.out[1];

    add2.xout === c2p[0];
    add2.yout === c2p[1];
}

template ShuffleReencryptCommit(N) {
    // Public inputs
    signal input pk[2];
    signal input inputDeckCommit;
    signal input outputDeckCommit;

    // Private witness: full input and output decks
    signal input cin_c1[N][2];
    signal input cin_c2[N][2];
    signal input cout_c1[N][2];
    signal input cout_c2[N][2];

    // Private witness: permutation matrix and reencryption randomness
    signal input P[N][N];
    signal input t[N];

    // Permutation accumulators
    signal rowAccum[N][N + 1];
    signal colAccum[N][N + 1];

    // Selection terms
    signal term_c1x[N][N];
    signal term_c1y[N][N];
    signal term_c2x[N][N];
    signal term_c2y[N][N];

    signal selAccum_c1x[N][N + 1];
    signal selAccum_c1y[N][N + 1];
    signal selAccum_c2x[N][N + 1];
    signal selAccum_c2y[N][N + 1];

    signal sel_c1[N][2];
    signal sel_c2[N][2];

    component slots[N];

    // Commitments
    component inCardCommit[N];
    component outCardCommit[N];

    signal inCardCommits[N];
    signal outCardCommits[N];

    component inFold[N];
    component outFold[N];

    signal inRunning[N + 1];
    signal outRunning[N + 1];

    // 1) Boolean permutation matrix
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            P[i][j] * (P[i][j] - 1) === 0;
        }
    }

    // 2) Each row sums to 1
    for (var i = 0; i < N; i++) {
        rowAccum[i][0] <== 0;

        for (var j = 0; j < N; j++) {
            rowAccum[i][j + 1] <== rowAccum[i][j] + P[i][j];
        }

        rowAccum[i][N] === 1;
    }

    // 3) Each column sums to 1
    for (var j = 0; j < N; j++) {
        colAccum[j][0] <== 0;

        for (var i = 0; i < N; i++) {
            colAccum[j][i + 1] <== colAccum[j][i] + P[i][j];
        }

        colAccum[j][N] === 1;
    }

    // 4) Select input ciphertext for each output slot
    for (var i = 0; i < N; i++) {
        selAccum_c1x[i][0] <== 0;
        selAccum_c1y[i][0] <== 0;
        selAccum_c2x[i][0] <== 0;
        selAccum_c2y[i][0] <== 0;

        for (var j = 0; j < N; j++) {
            term_c1x[i][j] <== P[i][j] * cin_c1[j][0];
            term_c1y[i][j] <== P[i][j] * cin_c1[j][1];
            term_c2x[i][j] <== P[i][j] * cin_c2[j][0];
            term_c2y[i][j] <== P[i][j] * cin_c2[j][1];

            selAccum_c1x[i][j + 1] <== selAccum_c1x[i][j] + term_c1x[i][j];
            selAccum_c1y[i][j + 1] <== selAccum_c1y[i][j] + term_c1y[i][j];
            selAccum_c2x[i][j + 1] <== selAccum_c2x[i][j] + term_c2x[i][j];
            selAccum_c2y[i][j + 1] <== selAccum_c2y[i][j] + term_c2y[i][j];
        }

        sel_c1[i][0] <== selAccum_c1x[i][N];
        sel_c1[i][1] <== selAccum_c1y[i][N];

        sel_c2[i][0] <== selAccum_c2x[i][N];
        sel_c2[i][1] <== selAccum_c2y[i][N];
    }

    // 5) Re-encrypt each selected ciphertext
    for (var i = 0; i < N; i++) {
        slots[i] = ReEncryptOneSelected();

        slots[i].pk[0] <== pk[0];
        slots[i].pk[1] <== pk[1];

        slots[i].c1[0] <== sel_c1[i][0];
        slots[i].c1[1] <== sel_c1[i][1];

        slots[i].c2[0] <== sel_c2[i][0];
        slots[i].c2[1] <== sel_c2[i][1];

        slots[i].c1p[0] <== cout_c1[i][0];
        slots[i].c1p[1] <== cout_c1[i][1];

        slots[i].c2p[0] <== cout_c2[i][0];
        slots[i].c2p[1] <== cout_c2[i][1];

        slots[i].t <== t[i];
    }

    // 6) Commit private input deck
    for (var i = 0; i < N; i++) {
        inCardCommit[i] = Poseidon(4);

        inCardCommit[i].inputs[0] <== cin_c1[i][0];
        inCardCommit[i].inputs[1] <== cin_c1[i][1];
        inCardCommit[i].inputs[2] <== cin_c2[i][0];
        inCardCommit[i].inputs[3] <== cin_c2[i][1];

        inCardCommits[i] <== inCardCommit[i].out;
    }

    inRunning[0] <== 0;

    for (var i = 0; i < N; i++) {
        inFold[i] = Poseidon(2);
        inFold[i].inputs[0] <== inRunning[i];
        inFold[i].inputs[1] <== inCardCommits[i];

        inRunning[i + 1] <== inFold[i].out;
    }

    inRunning[N] === inputDeckCommit;

    // 7) Commit private output deck
    for (var i = 0; i < N; i++) {
        outCardCommit[i] = Poseidon(4);

        outCardCommit[i].inputs[0] <== cout_c1[i][0];
        outCardCommit[i].inputs[1] <== cout_c1[i][1];
        outCardCommit[i].inputs[2] <== cout_c2[i][0];
        outCardCommit[i].inputs[3] <== cout_c2[i][1];

        outCardCommits[i] <== outCardCommit[i].out;
    }

    outRunning[0] <== 0;

    for (var i = 0; i < N; i++) {
        outFold[i] = Poseidon(2);
        outFold[i].inputs[0] <== outRunning[i];
        outFold[i].inputs[1] <== outCardCommits[i];

        outRunning[i + 1] <== outFold[i].out;
    }

    outRunning[N] === outputDeckCommit;
}

component main {public [pk, inputDeckCommit, outputDeckCommit]} = ShuffleReencryptCommit(52);