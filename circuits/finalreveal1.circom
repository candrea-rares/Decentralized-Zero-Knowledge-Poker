pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/babyjub.circom";
include "../node_modules/circomlib/circuits/escalarmulfix.circom";
include "../node_modules/circomlib/circuits/escalarmulany.circom";

template FinalReveal1() {
    // Public inputs
    signal input pk[2];
    signal input c1[2];
    signal input D[2];
    signal input M[2];

    // Private witness
    signal input sk;

    // Decompose secret key into bits
    component skBits = Num2Bits(253);
    skBits.in <== sk;

    // BabyJubJub Base8 generator used by circomlibjs
    var BASE8[2];
    BASE8[0] = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
    BASE8[1] = 16950150798460657717958625567821834550301663161624707787222815936182638968203;

    // 1) Prove pk = sk * BASE8
    component pkMul = EscalarMulFix(253, BASE8);
    for (var i = 0; i < 253; i++) {
        pkMul.e[i] <== skBits.out[i];
    }

    pkMul.out[0] === pk[0];
    pkMul.out[1] === pk[1];

    // 2) Compute sk * c1
    component c1Mul = EscalarMulAny(253);
    c1Mul.p[0] <== c1[0];
    c1Mul.p[1] <== c1[1];

    for (var i = 0; i < 253; i++) {
        c1Mul.e[i] <== skBits.out[i];
    }

    // 3) Enforce D = M + sk*c1
    component add = BabyAdd();
    add.x1 <== M[0];
    add.y1 <== M[1];
    add.x2 <== c1Mul.out[0];
    add.y2 <== c1Mul.out[1];

    add.xout === D[0];
    add.yout === D[1];
}

component main {public [pk, c1, D, M]} = FinalReveal1();