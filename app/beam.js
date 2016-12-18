"use strict";
var math = require("mathjs");

var Beam = function(w0, l){
    var _this = this;
    this.w0 = w0;
    this.q = [];
    this.waist = [];
    this.waistPx = [];
    this.l = l;

    this.waistFromQ = function(q){
        return math.sqrt(1/(math.im(math.divide(-1, q))*math.PI/this.l));
    }

    this.propFormula = math.compile('(A*q + B)/(C*q + D)'); //formula to propagate q through ABCD matrix
    this.propBeam = function(prop){
        this.q[0]=math.complex(0, math.PI*_this.w0**2/_this.l);
        for(var iz = 1; iz < prop.z_grid.length; iz++){
            var q_old = this.q[iz-1];
            var mat_curr = prop.matStack[iz];
            //_this.q[iz] = math.divide(math.add(math.multiply(A,q_old), B)/(C*q_old + D);
            var scope = {
                A: math.subset(mat_curr, math.index(0, 0)),
                B: math.subset(mat_curr, math.index(0, 1)),
                C: math.subset(mat_curr, math.index(1, 0)),
                D: math.subset(mat_curr, math.index(1, 1)),
                q: q_old
            };
            this.q[iz] = this.propFormula.eval(scope);
            this.waist[iz] = this.waistFromQ(this.q[iz]);
            this.waistPx[iz] = prop.waistToPixel(this.waist[iz]);
        }
    }
};

module.exports.Beam = Beam;

