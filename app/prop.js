"use strict";
var math = require("mathjs");
var graphic = require("./graphics");
/**
 * A prpopagation structure. Represents the space in which we will
 * propagate the beam.
 * @z_max The maximum of the grid in the propagation direction
 * @y_max The maximum of the grid in the beam waist direction
 * @canvasWidth The width of the canvas object on which the beam is drawn
 * @canvasHeight The height of the canvas object on which the beam is drawn
 */
var Prop = function(z_max, y_max, canvasWidth, canvasHeight){
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.z_grid = [];
    this.z_max = 1;
    this.z_res = z_max/this.canvasWidth;
    this.y_max = y_max;
    this.matStack = [];
    
    /**
     * Returns iz so that z_grid([iz]) >= pos
     * @pos The position of the lens in meter
     */
    this.posToPx = function(pos){
        for(var iz = 0; iz < this.z_grid.length; iz++){
            if(this.z_grid[iz] >= pos){
                return iz;
            }
        }
        console.log("error");
        return "error";
    }

    this.build_z_grid = function(){
        for(var iz = 0; iz < this.canvasWidth; iz++){
            this.z_grid[iz] = iz*this.z_res;
        }
    }

    this.freeSpaceMat = function(d){
        return math.matrix([[1, d], [0, 1]]);
    }
    this.lensMat = function(f){
        return math.matrix([[1, 0], [-1/f, 1]]);
    }

    /**
     * Create the matrix stack. We have one matrix for each pixel, either 
     * a freespace matrix or a lens matrix.
     * @stack The set of lenses ordered depending of their position
     */
    this.createMatStack = function(stack){
        var matStack = [];
        var z_px_curr = 0;//z in pixel space
        for(var iLens = 0; iLens < stack.length; iLens++){
            var lens_curr = stack[iLens];
            var lens_pos_px = this.posToPx(lens_curr.pos, this.z_grid);
            for(var iz = z_px_curr; iz < lens_pos_px; iz++){
                matStack[iz] = this.freeSpaceMat(this.z_res);
            }
            matStack[lens_pos_px] = this.lensMat(lens_curr.f);
            z_px_curr = lens_pos_px+1;
        }
        for(var iz = z_px_curr; iz < this.z_grid.length; iz++){
            matStack[iz] = this.freeSpaceMat(this.z_res);
        }
        this.matStack = matStack;
    }
    this.waistToPixel = function(waist){
        return math.floor(waist/this.y_max*this.canvasHeight/2);
    }

    this.build_z_grid();
}

module.exports.Prop = Prop;
