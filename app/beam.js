"use strict";
var math = require("mathjs");

var Beam = function(w0, l){
    this.w0 = w0;
    this.q = {forward: [], backward: []};
    this.waist = {forward: [], backward: []};
	this.B = {forward: [], zeroPoints: []};
    this.waistPx = {forward: [],backward: []};
    this.l = l;

    this.waistFromQ = function(q){
        return math.sqrt(1/(math.im(math.divide(-1, q))*math.PI/this.l));
    }

	this.findBzeros = function(){
		this.B.zeroPoints = [];
		for(var iz=1; iz < this.B.forward.length; iz++){
			if (this.B.forward[iz-1]*this.B.forward[iz] <= 0){
				this.B.zeroPoints.push(iz);
			}
		}
	}

    this.propFormula = math.compile('(A*q + B)/(C*q + D)'); //formula to propagate q through ABCD matrix
    /**
     * Computes the waist size (in meter and in pixels) for each z-point
     * @prop The propagation object
     */
    this.propBeam = function(prop, opt){
        var mat = prop.matStack;
        this.q.forward[0]=math.complex(0, math.PI*this.w0**2/this.l);
		this.B.forward[0] = 0;
		var mat_tot_curr = mat[0];
        //the actual matrix length is mat.length-2 because there is one prop matrix
        // less than there is z_grid. This means that if there is a lens at the last
        // position (mat.length-1) it will only have effects in resonator mode
        for(var iz = 1; iz < prop.z_grid.length; iz++){
            var q_old = this.q.forward[iz-1];
            var mat_curr = mat[iz-1];
			if(iz == prop.z_grid.length-1){
				var mat_next = mat_curr;
			}
			else{
				var mat_next = mat[iz];
			}
            var scope = {
                A: math.subset(mat_curr, math.index(0, 0)),
                B: math.subset(mat_curr, math.index(0, 1)),
                C: math.subset(mat_curr, math.index(1, 0)),
                D: math.subset(mat_curr, math.index(1, 1)),
                q: q_old
            };
           	this.q.forward[iz] = this.propFormula.eval(scope);
			mat_tot_curr = math.multiply(mat_next, mat_tot_curr); 
			this.B.forward[iz] = math.subset(mat_tot_curr, math.index(0, 1));            
			this.findBzeros();	
			this.waist.forward[iz] = this.waistFromQ(this.q.forward[iz]);
            this.waistPx.forward[iz] = prop.waistToPixel(this.waist.forward[iz]);
        }

        if('resonator' in opt && opt.resonator === true){
            mat = prop.matStack.slice(0).reverse();
            this.q.backward[0] = this.q.forward[this.q.forward.length-1];
            for(var iz = 1; iz < prop.z_grid.length; iz++){
                var q_old = this.q.backward[iz-1];
                var mat_curr = mat[iz-1];
                var scope = {
                    A: math.subset(mat_curr, math.index(0, 0)),
                    B: math.subset(mat_curr, math.index(0, 1)),
                    C: math.subset(mat_curr, math.index(1, 0)),
                    D: math.subset(mat_curr, math.index(1, 1)),
                    q: q_old
                };
                this.q.backward[iz] = this.propFormula.eval(scope);
                this.waist.backward[iz] = this.waistFromQ(this.q.backward[iz]);
                this.waistPx.backward[iz] = prop.waistToPixel(this.waist.backward[iz]);
            }
        }
    }

};

module.exports.Beam = Beam;
