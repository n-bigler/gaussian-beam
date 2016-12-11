/*
  Handles the drawing of canvas
*/
"use strict";
var math = require("mathjs");

var drawBeam = function(beam, ctx, prop){
    var middle = prop.canvasHeight/2;
    //top
    ctx.clearRect(0, 0, prop.canvasWidth, prop.canvasHeight);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7495B9';
    ctx.moveTo(0, middle-beam.waistPx[0]);
    for(var iz = 1; iz < prop.z_grid.length; iz=iz+5){//only every 10 to speed up
        ctx.lineTo(iz, middle-beam.waistPx[iz]);
    }
    ctx.stroke();
    
    //bottom
    ctx.beginPath();
    ctx.moveTo(0, middle+beam.waistPx[0]);
    for(var iz = 1; iz < prop.z_grid.length; iz=iz+5){//only every 5 to speed up
        ctx.lineTo(iz, middle+beam.waistPx[iz]);

    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7495B9';
    ctx.stroke();
}

var drawLenses = function(stack, beam, ctx, prop){
    var center = prop.canvasHeight/2;
    for(var iLens = 0; iLens < stack.length; iLens++){
        ctx.beginPath();
        var pos = prop.posToPx(stack[iLens].pos);
        ctx.moveTo(pos-10,center*1.8-20);
        ctx.lineTo(pos,center*1.8);
        ctx.lineTo(pos+10,center*1.8-20);
        ctx.moveTo(pos,center*1.8);
        ctx.lineTo(pos,center*0.2);
        ctx.moveTo(pos-10,center*0.2+20);
        ctx.lineTo(pos,center*0.2);
        ctx.lineTo(pos+10,center*0.2+20);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#C37E8A';
        ctx.stroke();
    }
}

var drawWaists = function(beam, ctx, prop, $waistSizeDisplay){
    var middle = prop.canvasHeight/2;
    var waistPosPx = [];
    var prev = beam.waist[1] - beam.waist[0];
    var curr = 0;
    var txt = "Waist size: ";
    for(var iz = 2; iz < prop.z_grid.length; iz++){
        curr = beam.waist[iz] - beam.waist[iz-1];
        if(curr*prev <= 0 && prev<0){
            waistPosPx.push(iz);
            txt = txt+math.round(beam.waist[iz]*1e6)+" um, at " + (math.round(prop.z_grid[iz]*1e2)/1e2) + " m";
        }
        prev = curr;
    }
    for(var iWaist = 0; iWaist < waistPosPx.length; iWaist++){
        var px = waistPosPx[iWaist];
        ctx.beginPath();
        ctx.moveTo(px,middle+beam.waistPx[px]);
        ctx.lineTo(px,middle-beam.waistPx[px]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'red';
        ctx.stroke();
    }
    $waistSizeDisplay.text(txt);
}

module.exports.drawBeam = drawBeam;
module.exports.drawLenses = drawLenses;
module.exports.drawWaists = drawWaists;

