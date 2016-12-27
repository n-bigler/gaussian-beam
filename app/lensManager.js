"use strict";

var math = require("mathjs");
var lens = require("./lens");
var $ = require("jquery");
var graphics = require("./graphics");
var beam_class = require("./beam");
var prop_class = require("./prop");
var ipcRenderer = require('electron').ipcRenderer;
const fs = require('fs-jetpack');

$(document).ready(function(){
    var z_max = 1;//1 meter max TODO: allow user to change this
    var z_grid = [];
    //init z_grid
    
    var lensStack = [];

    var beam = new beam_class.Beam(300e-6, 800e-9);
    var prop = new prop_class.Prop(1, 2e-3, $("#lensCanvas").width(), $("#lensCanvas").height());    
    var resonatorMode = false;

    var $canvas = $("#lensCanvas");
    var canvasHeight = $("#lensCanvas").height();
    var $waistSizeDisplay = $("#waistSizeDisplay");
         
    /**
     * Updates the beam plot by first recalculating the matrice stack and then
     * updating the graphics
     * @beam The beam object
     */
    var updatePlot = function(beam){
        //sort the lensStack
        var sortedStack = [];
        for(var iLens = 0; iLens < lensStack.length; iLens++){
            if(lensStack[iLens] != undefined && lensStack[iLens] != null){
                sortedStack.push(lensStack[iLens]);
            }
        }
        sortedStack.sort(function(a, b){
            return a.pos - b.pos;
        });
        prop.createMatStack(sortedStack);


        var ctx = $canvas[0].getContext("2d");
        beam.propBeam(prop, {resonator: resonatorMode});
        graphics.drawBeam(beam, ctx, prop, {resonator: resonatorMode});

        graphics.drawLenses(sortedStack, beam, ctx, prop);
        graphics.drawWaists(beam, ctx, prop, $waistSizeDisplay);
   }

    /**
     * Set un the range sliders and the number inputs for a new lens
     * @lensID The id of the new lens
     */
    var setLensDOM = function(lensID){
        var html = ['<div id="lens'+lensID+'" class="col-xs-6 lensGroup">'
                    ,'<div class="text-right removeButton">'
                    ,'<button type="button" name="lens'+lensID+'Remove">x</button>'                    
                    ,'</div>'
                    ,'<form id="lens'+lensID+'Form">'
                    ,'<legend>Lens '+(lensID+1)+'</legend>'
                    ,'<div class="form-group row">'
                    ,'<label class="col-xs-2 nopadding col-form-label" for="lens'+lensID+'Pos">Position:</label>'
                    ,'<div class="col-xs-7 nopadding">'
                    ,'<input class="form-control" type="range" min="0" max="1" value="0.5" data-orientation="vertical" name="lens'+lensID+'Pos">'
                    ,'</div>'
                    ,'<div class="col-xs-3">'
                    ,'<input class="form-control" name="lens'+lensID+'PosNumber" type="number" min="0" max="1" value="0.5"p>'
                    ,'</div>'
                    ,'</div>'
                    ,'<div class="form-group row">'
                    ,'<label class="col-xs-2 nopadding col-form-label" for="lens'+lensID+'f">Focal:</label> '
                    ,'<div class="col-xs-7 nopadding">'
                    ,'<input class="form-control" type="range" min="-1" max="1" step="0.01" value="0.1" name="lens'+lensID+'f">'
                    ,'</div>'
                    ,'<div class="col-xs-3">'
                    ,'<input class="form-control" name="lens'+lensID+'fNumber" type="number" min="-1" max="1" step="0.01" value="0.1">'
                    ,'</div>'
                    ,'</div>'
                    ,'</form></div>'].join("");
        $('#lenses').append(html);
    }

    var removeLensDOM = function(lensID){
        $('#lens'+lensID).remove();
    }

    var setLensListeners = function(lensID){
        var $lensPosNumber = $('input[name=lens'+lensID+'PosNumber]');
        var $lensfNumber = $('input[name=lens'+lensID+'fNumber]');
        var $lensPosRange = $('input[name=lens'+lensID+'Pos]');
        var $lensfRange = $('input[name=lens'+lensID+'f]');

        $lensPosRange.attr("step", prop.z_res);
        $lensPosNumber.attr("step", prop.z_res);
        $lensPosRange.attr("max", prop.z_grid[prop.z_grid.length-1]);
        $lensPosNumber.attr("max", prop.z_grid[prop.z_grid.length-1]);

        $lensPosNumber.val(lensStack[lensID].pos);
        $lensPosRange.val(lensStack[lensID].pos);
        $lensfNumber.val(lensStack[lensID].f);
        $lensfRange.val(lensStack[lensID].f);

        $lensPosRange.on('input change', function(){
            lensStack[lensID].pos = parseFloat($lensPosRange.val());
            $lensPosNumber.val(lensStack[lensID].pos);
            updatePlot(beam);
        });


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

        var $lensRemove = $('button[name=lens'+lensID+'Remove]');
        $lensRemove.on("click", function(){
            console.log("before");
            console.log(lensStack);
            for(var iLens = 0; iLens < lensStack.length; iLens++){
                if(lensStack[iLens] != undefined){
                    console.log(lensStack[iLens].id);
                }
            }
            // lensStack.splice(lensID, 1);
            lensStack[lensID] = undefined;
            console.log("after");
            console.log(lensStack);
            for(var iLens = 0; iLens < lensStack.length; iLens++){
                if(lensStack[iLens] != undefined){
                    console.log(lensStack[iLens].id);
                }
            }

            removeLensDOM(lensID);
            updatePlot(beam);
        });
    }

    var addLens = function(){
        //need to find a new id
        var newID = 0;
        var idFound = 0;
        //we check if some ids are free (if some lenses are set to undefined)
        for(var iLens = 0; iLens < lensStack.length && !idFound; iLens++){
            if(lensStack[iLens] === undefined){
                newID = iLens;
                idFound = 1;
            }
        }
        if(!idFound){//true if there was no "undefined", so we need to add after the last lens
            newID = lensStack.length;
        }
        console.log("new id: "+newID);
        var newLens = new lens.Lens(100e-3, 0.5, newID);
        lensStack[newLens.id] = newLens;
        console.log(lensStack);

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
        prop.y_max = $ymaxRange.val();
        $ymaxNumber.val(prop.y_max);        
        updatePlot(beam);
    });


    $ymaxNumber.on("input change", function(){
        prop.y_max = $ymaxNumber.val();
        $w0Range.val(prop.y_max);
        updatePlot(beam);
    });

    var $zmaxNumber = $('input[name=zmaxNumber]');
    var $zmaxRange = $('input[name=zmax]');
    $zmaxRange.on('input change', function(){
        prop.z_max = $zmaxRange.val();
        $zmaxNumber.val(prop.z_max);        
        prop.z_res = prop.z_max/prop.canvasWidth;
        prop.build_z_grid();
        updatePlot(beam);
    });


    $zmaxNumber.on("input change", function(){
        prop.z_max = $zmaxNumber.val();
        $zmaxRange.val(prop.z_max);
        prop.z_res = prop.z_max/prop.canvasWidth;
        prop.build_z_grid();
        updatePlot(beam);
    });

    var $lambdaNumber = $('input[name=lambdaNumber]');
    var $lambdaRange = $('input[name=lambda]');
    $lambdaRange.on('input change', function(){
        beam.l = $lambdaRange.val();
        $lambdaNumber.val(beam.l);        
        updatePlot(beam);
    });


    $lambdaNumber.on("input change", function(){
        beam.l = $lambdaNumber.val();
        $lambdaRange.val(beam.l);
        updatePlot(beam);
    });

    
    //manage resonator checkbox
    var $resonatorCB = $('#resonatorCheckbox');
    $resonatorCB.on('click', function(){
        resonatorMode = $(this).find('input[type=checkbox]').prop('checked');
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
        var canvasOffset = $canvas.offset();
        var x = math.floor(evt.clientX - canvasOffset.left);
        var ctx = $canvas[0].getContext("2d");

        graphics.drawBeam(beam, ctx, prop, {resonator: true});
        graphics.drawLenses(lensStack, beam, ctx, prop);
        graphics.drawWaists(beam, ctx, prop, $waistSizeDisplay);

        ctx.beginPath();
        ctx.moveTo(x,canvasHeight/2+beam.waistPx.forward[x]);
        ctx.lineTo(x,canvasHeight/2-beam.waistPx.forward[x]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#F4C8A4';
        ctx.stroke();
        
        $waistSizeDisplayMouse.text("Waist size (radius): " + math.round(beam.waist.forward[x]*1e6) + " µm, at " + (math.round(prop.z_grid[x]*1e2)/1e2) + " m");
    });

    ipcRenderer.on('save-file', function(evt, fileName){
        var settings = {
            z_max: prop.z_max,
            y_max: prop.y_max,
            l: beam.l,
            w0: beam.w0
        }
        fs.write(fileName, {lenses: lensStack, settings: settings});
    });

    var removeAllLenses = function(){
        for(var iLens = 0; iLens < lensStack.length; iLens++){
            if(lensStack[iLens] != undefined){
                removeLensDOM(iLens);
                lensStack[iLens] = undefined;
            }
        }
    }
    
    //modify DOM so that it follows beam properties
    var updateBeamDOM = function(beam){
        var $w0Number = $('input[name=w0Number]');
        var $w0Range = $('input[name=w0]');
        $w0Number.val(beam.w0);
        $w0Range.val(beam.w0);

        var $lambdaNumber = $('input[name=lambdaNumber]');
        var $lambdaRange = $('input[name=lambda]');
        $lambdaNumber.val(beam.l);
        $lambdaRange.val(beam.l);
    }

    var updatePropDOM = function(prop){
        var $zmaxNumber = $('input[name=zmaxNumber]');
        var $zmaxRange = $('input[name=zmax]');
        $zmaxNumber.val(prop.z_max);
        $zmaxRange.val(prop.z_max);
        var $ymaxNumber = $('input[name=ymaxNumber]');
        var $ymaxRange = $('input[name=ymax]');
        $ymaxNumber.val(prop.y_max);
        $ymaxRange.val(prop.y_max);
    }

    ipcRenderer.on('open-file', function(evt, fileName){
        var read = fs.read(fileName, 'json');
        var newLensStack = read.lenses;
        var settings = read.settings;
        //start with lenses
        removeAllLenses();
        for(var iLens = 0; iLens < newLensStack.length; iLens++){
            var lens_curr = newLensStack[iLens];
            lensStack[lens_curr.id] = lens_curr;
            setLensDOM(lens_curr.id);
            setLensListeners(lens_curr.id);
        }
        //then update the rest
        beam.w0 = settings.w0;
        beam.l = settings.l;
        updateBeamDOM(beam);
        prop.z_max = settings.z_max;
        prop.z_res = prop.z_max/prop.canvasWidth;
        prop.build_z_grid();
        prop.y_max = settings.y_max;
        updatePropDOM(prop);
        updatePlot(beam);
    });


    addLens();
    updatePlot(beam);


});

