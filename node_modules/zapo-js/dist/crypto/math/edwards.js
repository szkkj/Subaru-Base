"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scalarMultBase = scalarMultBase;
exports.encodeExtendedPoint = encodeExtendedPoint;
const constants_1 = require("../math/constants");
const fe_1 = require("../math/fe");
const mod_1 = require("../math/mod");
// Pre-allocated temporaries for point operations (safe: JS is single-threaded)
const _a = (0, fe_1.fe)();
const _b = (0, fe_1.fe)();
const _c = (0, fe_1.fe)();
const _d = (0, fe_1.fe)();
const _e = (0, fe_1.fe)();
const _f = (0, fe_1.fe)();
const _g = (0, fe_1.fe)();
const _h = (0, fe_1.fe)();
// Pre-allocated output points for hot-path operations
function mutablePoint() {
    return { x: (0, fe_1.fe)(), y: (0, fe_1.fe)(), z: (0, fe_1.fe)(), t: (0, fe_1.fe)() };
}
const _addOut = mutablePoint();
const _dblOut = mutablePoint();
const _negOut = mutablePoint();
// Temporaries for feInv inside encodeExtendedPoint
const _invZinv = (0, fe_1.fe)();
const _invX = (0, fe_1.fe)();
const _invY = (0, fe_1.fe)();
const _invXBytes = new Uint8Array(32);
function addPointInto(out, a, b) {
    (0, fe_1.feSub)(_a, a.y, a.x);
    (0, fe_1.feSub)(_b, b.y, b.x);
    (0, fe_1.feMul)(_a, _a, _b); // aTerm
    (0, fe_1.feAdd)(_b, a.y, a.x);
    (0, fe_1.feAdd)(_c, b.y, b.x);
    (0, fe_1.feMul)(_b, _b, _c); // bTerm
    (0, fe_1.feMul)(_c, constants_1.FE_TWO_D, a.t);
    (0, fe_1.feMul)(_c, _c, b.t); // cTerm
    (0, fe_1.feAdd)(_d, a.z, a.z);
    (0, fe_1.feMul)(_d, _d, b.z); // dTerm
    (0, fe_1.feSub)(_e, _b, _a); // eTerm
    (0, fe_1.feSub)(_f, _d, _c); // fTerm
    (0, fe_1.feAdd)(_g, _d, _c); // gTerm
    (0, fe_1.feAdd)(_h, _b, _a); // hTerm
    (0, fe_1.feMul)(out.x, _e, _f);
    (0, fe_1.feMul)(out.y, _g, _h);
    (0, fe_1.feMul)(out.z, _f, _g);
    (0, fe_1.feMul)(out.t, _e, _h);
}
function doublePointInto(out, point) {
    (0, fe_1.feMul)(_a, point.x, point.x); // aTerm = x^2
    (0, fe_1.feMul)(_b, point.y, point.y); // bTerm = y^2
    (0, fe_1.feMul)(_c, point.z, point.z);
    (0, fe_1.feAdd)(_c, _c, _c); // cTerm = 2*z^2
    (0, fe_1.feNeg)(_d, _a); // dTerm = -aTerm (a=-1 for ed25519)
    (0, fe_1.feAdd)(_e, point.x, point.y);
    (0, fe_1.feMul)(_e, _e, _e);
    (0, fe_1.feAdd)(_f, _a, _b);
    (0, fe_1.feSub)(_e, _e, _f); // eTerm = (x+y)^2 - aTerm - bTerm
    (0, fe_1.feAdd)(_g, _d, _b); // gTerm = dTerm + bTerm
    (0, fe_1.feSub)(_f, _g, _c); // fTerm = gTerm - cTerm
    (0, fe_1.feSub)(_h, _d, _b); // hTerm = dTerm - bTerm
    (0, fe_1.feMul)(out.x, _e, _f);
    (0, fe_1.feMul)(out.y, _g, _h);
    (0, fe_1.feMul)(out.z, _f, _g);
    (0, fe_1.feMul)(out.t, _e, _h);
}
function negatePointInto(out, p) {
    (0, fe_1.feNeg)(out.x, p.x);
    (0, fe_1.feCopy)(out.y, p.y);
    (0, fe_1.feCopy)(out.z, p.z);
    (0, fe_1.feNeg)(out.t, p.t);
}
function clonePoint(p) {
    const x = (0, fe_1.fe)();
    const y = (0, fe_1.fe)();
    const z = (0, fe_1.fe)();
    const t = (0, fe_1.fe)();
    (0, fe_1.feCopy)(x, p.x);
    (0, fe_1.feCopy)(y, p.y);
    (0, fe_1.feCopy)(z, p.z);
    (0, fe_1.feCopy)(t, p.t);
    return { x, y, z, t };
}
// Allocating versions for precomputation (runs once at module load)
function addPoint(a, b) {
    addPointInto(_addOut, a, b);
    return clonePoint(_addOut);
}
function doublePoint(a) {
    doublePointInto(_dblOut, a);
    return clonePoint(_dblOut);
}
const W = 5;
const halfW = 1 << W;
const mask = halfW - 1;
const precomp = new Array(1 << (W - 1));
precomp[0] = constants_1.BASE_POINT;
const _dbl = doublePoint(constants_1.BASE_POINT);
for (let i = 1; i < precomp.length; i++) {
    precomp[i] = addPoint(precomp[i - 1], _dbl);
}
// Pre-allocated scratch buffers for scalarMultBase (safe: JS is single-threaded)
const _naf = new Int8Array(256);
const _loopResult = mutablePoint();
const _loopDbl = mutablePoint();
const _loopAdd = mutablePoint();
function scalarMultBase(scalar) {
    let k = (0, mod_1.modGroup)(scalar);
    if (k === 0n)
        return clonePoint(constants_1.IDENTITY_POINT);
    const naf = _naf;
    naf.fill(0);
    let nafLen = 0;
    while (k > 0n) {
        if ((k & 1n) === 1n) {
            let digit = Number(k & BigInt(mask));
            if (digit >= halfW >> 1)
                digit -= halfW;
            naf[nafLen++] = digit;
            k -= BigInt(digit);
        }
        else {
            nafLen++;
        }
        k >>= 1n;
    }
    // Copy identity into loop result
    (0, fe_1.feCopy)(_loopResult.x, constants_1.IDENTITY_POINT.x);
    (0, fe_1.feCopy)(_loopResult.y, constants_1.IDENTITY_POINT.y);
    (0, fe_1.feCopy)(_loopResult.z, constants_1.IDENTITY_POINT.z);
    (0, fe_1.feCopy)(_loopResult.t, constants_1.IDENTITY_POINT.t);
    for (let i = nafLen - 1; i >= 0; i--) {
        doublePointInto(_loopDbl, _loopResult);
        // swap dbl → result
        const tmpX = _loopResult.x;
        _loopResult.x = _loopDbl.x;
        _loopDbl.x = tmpX;
        const tmpY = _loopResult.y;
        _loopResult.y = _loopDbl.y;
        _loopDbl.y = tmpY;
        const tmpZ = _loopResult.z;
        _loopResult.z = _loopDbl.z;
        _loopDbl.z = tmpZ;
        const tmpT = _loopResult.t;
        _loopResult.t = _loopDbl.t;
        _loopDbl.t = tmpT;
        const digit = naf[i];
        if (digit > 0) {
            addPointInto(_loopAdd, _loopResult, precomp[(digit - 1) >> 1]);
            const ax = _loopResult.x;
            _loopResult.x = _loopAdd.x;
            _loopAdd.x = ax;
            const ay = _loopResult.y;
            _loopResult.y = _loopAdd.y;
            _loopAdd.y = ay;
            const az = _loopResult.z;
            _loopResult.z = _loopAdd.z;
            _loopAdd.z = az;
            const at = _loopResult.t;
            _loopResult.t = _loopAdd.t;
            _loopAdd.t = at;
        }
        else if (digit < 0) {
            negatePointInto(_negOut, precomp[(-digit - 1) >> 1]);
            addPointInto(_loopAdd, _loopResult, _negOut);
            const ax = _loopResult.x;
            _loopResult.x = _loopAdd.x;
            _loopAdd.x = ax;
            const ay = _loopResult.y;
            _loopResult.y = _loopAdd.y;
            _loopAdd.y = ay;
            const az = _loopResult.z;
            _loopResult.z = _loopAdd.z;
            _loopAdd.z = az;
            const at = _loopResult.t;
            _loopResult.t = _loopAdd.t;
            _loopAdd.t = at;
        }
    }
    return clonePoint(_loopResult);
}
function encodeExtendedPoint(point) {
    (0, fe_1.feInv)(_invZinv, point.z);
    (0, fe_1.feMul)(_invX, point.x, _invZinv);
    (0, fe_1.feMul)(_invY, point.y, _invZinv);
    const encoded = new Uint8Array(32);
    (0, fe_1.fePack)(encoded, _invY);
    (0, fe_1.fePack)(_invXBytes, _invX);
    encoded[31] = (encoded[31] & 0x7f) | ((_invXBytes[0] & 1) << 7);
    return encoded;
}
