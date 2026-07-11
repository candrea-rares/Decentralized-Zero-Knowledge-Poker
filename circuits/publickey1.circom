pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/escalarmulfix.circom";

template PublicKey1() {
    // Public input: submitted public key
    signal input pk[2];

    // Private witness: player's secret key
    signal input sk;

    // Convert sk to bits
    component skBits = Num2Bits(253);
    skBits.in <== sk;

    // BabyJub Base8 generator used by circomlibjs
    var BASE8[2];
    BASE8[0] = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
    BASE8[1] = 16950150798460657717958625567821834550301663161624707787222815936182638968203;

    // Prove pk = sk * BASE8
    component pkMul = EscalarMulFix(253, BASE8);

    for (var i = 0; i < 253; i++) {
        pkMul.e[i] <== skBits.out[i];
    }

    pkMul.out[0] === pk[0];
    pkMul.out[1] === pk[1];
}

component main { public [pk] } = PublicKey1();