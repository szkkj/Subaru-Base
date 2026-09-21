"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDENTITY_POINT = exports.BASE_POINT = exports.FE_ONE = exports.FE_TWO_D = exports.GROUP_L = exports.FIELD_P = void 0;
const fe_1 = require("../math/fe");
exports.FIELD_P = (1n << 255n) - 19n;
exports.GROUP_L = (1n << 252n) + 27742317777372353535851937790883648493n;
exports.FE_TWO_D = (0, fe_1.feFromBigInt)(16295367250680780974490674513165176452449235426866156013048779062215315747161n);
exports.FE_ONE = (0, fe_1.feFromBigInt)(1n);
exports.BASE_POINT = Object.freeze({
    x: (0, fe_1.feFromBigInt)(15112221349535400772501151409588531511454012693041857206046113283949847762202n),
    y: (0, fe_1.feFromBigInt)(46316835694926478169428394003475163141307993866256225615783033603165251855960n),
    z: (0, fe_1.feFromBigInt)(1n),
    t: (0, fe_1.feFromBigInt)(46827403850823179245072216630277197565144205554125654976674165829533817101731n)
});
exports.IDENTITY_POINT = Object.freeze({
    x: (0, fe_1.feFromBigInt)(0n),
    y: (0, fe_1.feFromBigInt)(1n),
    z: (0, fe_1.feFromBigInt)(1n),
    t: (0, fe_1.feFromBigInt)(0n)
});
