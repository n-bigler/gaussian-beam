"use strict";

var math = require("mathjs");
var lens = require("./lens");
var $ = require("jquery");
$(document).ready(function(){
    var z_max = 1;//1 meter max TODO: allow user to change this
    var z_grid_size = $("#lensCanvas").width();
    var z_res = z_max/z_grid_size;
    var z_grid = [];
    //init z_grid
    for(var iz = 0; iz < z_grid_size; iz++){
        z_grid[iz] = iz*z_res;
    }
    
    var lensStack = [];


    var beam = {
        w0: 0.3e-3,
        q: [],
        waist: [],
        waistPx: [],
        l: 1030e-9
    };


    //create the matrix stack
    var posToPx = function(pos, z_grid){//return iz so that z_grid([iz] >= pos
        for(var iz = 0; iz < z_grid_size; iz++){
            if(z_grid[iz] >= pos){
                return iz;
            }
        }
        console.log("error");
        return "error";
    }
    var freeSpaceMat = function(d){
        return math.matrix([[1, d], [0, 1]]);
    }
    var lensMat = function(f){
        return math.matrix([[1, 0], [-1/f, 1]]);
    }
    
    var createMatStack = function(stack){
        var matStack = [];
        var z_px_curr = 0;//z in pixel space
        for(var iLens = 0; iLens < stack.length; iLens++){
            var lens_curr = stack[iLens];
            var lens_pos_px = posToPx(lens_curr.pos, z_grid);
            for(var iz = z_px_curr; iz < lens_pos_px; iz++){
                matStack[iz] = freeSpaceMat(z_res);
            }
            matStack[lens_pos_px] = lensMat(lens_curr.f);
            z_px_curr = lens_pos_px+1;
        }
        for(var iz = z_px_curr; iz < z_grid_size; iz++){
            matStack[iz] = freeSpaceMat(z_res);
        }
        return matStack;
    }

    var propFormula = math.compile('(A*q + B)/(C*q + D)'); //formula to propagate q through ABCD matrix
    var propBeam = function(matStack){
        beam.q[0]=math.complex(0, math.PI*beam.w0**2/beam.l);
        for(var iz = 1; iz < z_grid_size; iz++){
            var q_old = beam.q[iz-1];
            var mat_curr = matStack[iz];
            //beam.q[iz] = math.divide(math.add(math.multiply(A,q_old), B)/(C*q_old + D);
            var scope = {
                A: math.subset(mat_curr, math.index(0, 0)),
                B: math.subset(mat_curr, math.index(0, 1)),
                C: math.subset(mat_curr, math.index(1, 0)),
                D: math.subset(mat_curr, math.index(1, 1)),
                q: q_old
            };
            beam.q[iz] = propFormula.eval(scope);
            beam.waist[iz] = waistFromQ(beam.q[iz], beam);
            beam.waistPx[iz] = waistToPixel(beam.waist[iz], beam);
        }
    }
    var waistFromQ = function(q,beam){
        return math.sqrt(1/(math.im(math.divide(-1, q))*math.PI/beam.l));
    }
    var ymax = 2e-3;//maximum y displayed (maximum beam waist)
    var waistToPixel = function(waist){
        var canvasHeight = $("#lensCanvas").height();
        return math.floor(waist/ymax*canvasHeight/2);
    }
    var drawBeam = function(beam){
        var $canvas = $("#lensCanvas");
        var ctx = $canvas[0].getContext("2d");
        var canvasHeight = $("#lensCanvas").height();
        var middle = canvasHeight/2;
        //top
        ctx.clearRect(0, 0, $canvas.width(), canvasHeight);
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#7495B9';
        ctx.moveTo(0, middle-beam.waistPx[0]);
        for(var iz = 1; iz < z_grid_size; iz=iz+10){//only every 10 to speed up
            var waist = waistFromQ(beam.q[iz], beam);
            ctx.lineTo(iz, middle-beam.waistPx[iz]);
        }
        ctx.stroke();
        
        //bottom
        ctx.beginPath();
        ctx.moveTo(0, middle+beam.waistPx[0]);
        for(var iz = 1; iz < z_grid_size; iz=iz+10){//only every 10 speed up
            var waist = waistFromQ(beam.q[iz], beam);            
            ctx.lineTo(iz, middle+beam.waistPx[iz]);

        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#7495B9';
        ctx.stroke();
    }
    
    var drawLenses = function(stack, beam){
        var ctx = $("#lensCanvas")[0].getContext("2d");
        var center = $("#lensCanvas").height()/2;
        for(var iLens = 0; iLens < stack.length; iLens++){
            ctx.beginPath();
            var pos = posToPx(stack[iLens].pos, z_grid);
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

    var $canvas = $("#lensCanvas");
    var canvasRect = $canvas[0].getBoundingClientRect();
    var canvasHeight = $("#lensCanvas").height();
    var $waistSizeDisplay = $("#waistSizeDisplay");
    var drawWaists = function(beam){
        var waistPosPx = [];
        var prev = beam.waist[1] - beam.waist[0];
        var curr = 0;
        var txt = "Waist size: ";
        for(var iz = 2; iz < z_grid.length; iz++){
            curr = beam.waist[iz] - beam.waist[iz-1];
            if(curr*prev <= 0 && prev<0){
                waistPosPx.push(iz);
                txt = txt+math.round(beam.waist[iz]*1e6)+" um   ";
            }
            prev = curr;
        }
        var ctx = $canvas[0].getContext("2d");
        for(var iWaist = 0; iWaist < waistPosPx.length; iWaist++){
            var px = waistPosPx[iWaist];
            ctx.beginPath();
            ctx.moveTo(px,canvasHeight/2+beam.waistPx[px]);
            ctx.lineTo(px,canvasHeight/2-beam.waistPx[px]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.stroke();
        }
        $waistSizeDisplay.text(txt);
    }
            
    var updatePlot = function(beam){
        //sort the lensStack
        var sortedStack = lensStack.slice().sort(function(a, b){
            return a.pos - b.pos;
        });
        var matStack = createMatStack(sortedStack);
        propBeam(matStack);
        drawBeam(beam);
        drawLenses(lensStack, beam);
        drawWaists(beam);
   }

    var setLensDOM = function(lensID){
        var html = ['<form id="lens'+lensID+'Form">'
                    ,'<legend>Lens '+(lensID+1)+'</legend>'
                    ,'Position: '
                    ,'<input type="range" min="0" max="1" value="0.5" data-orientation="vertical" name="lens'+lensID+'Pos">'
                    , '<input name="lens'+lensID+'PosNumber" type="number" min="0" max="1" value="0.5"><br>'
                    , 'Focal: '
                    , '<input type="range" min="-1" max="1" step="0.01" value="0.1" data-orientation="vertical" name="lens'+lensID+'f">'
                    , '<input name="lens'+lensID+'fNumber" type="number" min="-1" max="1" step="0.01" value="0.1"><br>'].join("");
        $('#lenses').append(html);
    }

    var setLensListeners = function(lensID){
        var $lensPosNumber = $('input[name=lens'+lensID+'PosNumber]');
        var $lensfNumber = $('input[name=lens'+lensID+'fNumber]');
        var $lensPosRange = $('input[name=lens'+lensID+'Pos]');
        $lensPosRange.attr("step", z_res);
        $lensPosNumber.attr("step", z_res);
        $lensPosRange.attr("max", z_grid[z_grid.length-1]);
        $lensPosNumber.attr("max", z_grid[z_grid.length-1]);
        $lensPosRange.on('input change', function(){
            lensStack[lensID].pos = parseFloat($lensPosRange.val());
            $lensPosNumber.val(lensStack[lensID].pos);
            updatePlot(beam);
        });

        var $lensfRange = $('input[name=lens'+lensID+'f]');
        $lensfRange.on('input change', function(){
            lensStack[lensID].f = parseFloat($lensfRange.val());
            $lensfNumber.val(lensStack[lensID].f);                

            updatePlot(beam);
        });

        $lensPosNumber.on("input change", function(){
            lensStack[lensID].pos = parseFloat($lensPosNumber.val());
            $lensPosRange.val(lensStack[lensID].pos);

            updatePlot(beam);
        });

        $lensfNumber.on("input change", function(){
            lensStack[lensID].f = parseFloat($lensfNumber.val());
            $lensfRange.val(lensStack[lensID].f);

            updatePlot(beam);
        });
    }

    var addLens = function(){
        var newLens = new lens.Lens(100e-3, 0.5, lensStack.length);
        lensStack.push(newLens);
        setLensDOM(newLens.id);
        setLensListeners(newLens.id);
        updatePlot(beam);
    }
    

    //event management
    var $w0Number = $('input[name=w0Number]');
    var $w0Range = $('input[name=w0]');
    $w0Range.on('input change', function(){
        beam.w0 = $w0Range.val();
        $w0Number.val(beam.w0);        
        updatePlot(beam);
    });


    $w0Number.on("input change", function(){
        beam.w0 = $w0Number.val();
        $w0Range.val(beam.w0);

        updatePlot(beam);
    });

    var $ymaxNumber = $('input[name=ymaxNumber]');
    var $ymaxRange = $('input[name=ymax]');
    $ymaxRange.on('input change', function(){
        ymax = $ymaxRange.val();
        $ymaxNumber.val(ymax);        
        updatePlot(beam);
    });


    $ymaxNumber.on("input change", function(){
        ymax = $ymaxNumber.val();
        $w0Range.val(ymax);
        updatePlot(beam);
    });

    var $zmaxNumber = $('input[name=zmaxNumber]');
    var $zmaxRange = $('input[name=zmax]');
    $zmaxRange.on('input change', function(){
        z_max = $zmaxRange.val();
        $zmaxNumber.val(z_max);        
        z_res = z_max/z_grid_size;
        z_grid = [];
        for(var iz = 0; iz < z_grid_size; iz++){
            z_grid[iz] = iz*z_res;
        }
        updatePlot(beam);
    });


    $zmaxNumber.on("input change", function(){
        z_max = $zmaxNumber.val();
        z_res = z_max/z_grid_size;
        $zmaxRange.val(z_max);
        z_grid = [];
        for(var iz = 0; iz < z_grid_size; iz++){
            z_grid[iz] = iz*z_res;
        }

        updatePlot(beam);
    });


    //manage add lens button
    $('button[name=addLensButton]').on('click', function(){
        addLens();
        updatePlot(beam);
    });


    //manage mouse measurement
    var $waistSizeDisplayMouse = $("#waistSizeDisplayMouse");
    $canvas.mousemove(function(evt){
        var x = evt.clientX - canvasRect.left;
        var ctx = $canvas[0].getContext("2d");

        drawBeam(beam);
        drawLenses(lensStack, beam);
        drawWaists(beam);
        ctx.beginPath();
        ctx.moveTo(x,canvasHeight/2+beam.waistPx[x]);
        ctx.lineTo(x,canvasHeight/2-beam.waistPx[x]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#F4C8A4'
        ctx.stroke();
        
        $waistSizeDisplayMouse.text("Waist size (radius): " + math.round(beam.waist[x]*1e6) + " µm");
    });


    addLens();
    updatePlot(beam);
});
