"use strict";

var Lens = function(f, pos, id){
    this.f = f;
    this.pos = pos;
    this.id = id;
    var _this = this;
}

module.exports.Lens = Lens;
