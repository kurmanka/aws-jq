// Prototype of a jQuery-style API to AWS.
// 
// an experimental, prototype jquery-like library-wrapper
// around AWS SDK for node.js
//
//   https://github.com/kurmanka/aws-jq
//   http://aws.amazon.com/sdkfornodejs/ 
//   https://github.com/aws/aws-sdk-js
/*

Copyright (c) 2013, Ivan Kurmanov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 
*/


var AWS = require('aws-sdk');
var EC2;
var async = require('async');

var jq = require( './lib/jq.js'  );
jq.ec2 = require( './lib/ec2.js' );

var o = {}; // object for methods, the prototype


// these are the methods that don't do much, but queue
// the actual actions to be executed within `this`

o.start = function () {
	return this.then( jq.ec2.start );
}

o.stop = function () {
	return this.then( jq.ec2.stop );
}

o.attach = function (p,dev) {
	if (typeof p == 'string' 
		&& dev) { 
		p = {volume: p, device: dev};
	}
	return this.then( jq.ec2.attach, p );
}

o.detach = function (p) {
	var i = jq.parse_selector(p || this._select);
	if (i && i.type == 'volume') {
		this.then( jq.ec2.detach, {volume: i.id} )		
	} else {
		console.log( 'Aaaaaaa! detach what?!' );
	}

	return this;
}

o.get = function () {
	var i = jq.parse_selector(this._select);

	if (i && i.type == 'instance') {
		return this.then( jq.ec2.instance_info_get, i.id, arguments );
	}

	if (i && i.type == 'volume') {
		return this.then( jq.ec2.volume_info_get, i.id, arguments );
	} 

	// XXX Error. Unsupported instruction.
//	if (!i || !i.type) {
	console.log( 'Aaaaaaa! get() what?!' );
//	}

	return this;
}

// run the queue-loop of actions. recursive.
// tricky. this is what makes the method chaining work.

o.exec = function (s,f) {
	// short-circuit if the loop is already running
	if( this._exec_running ) { return this; }
	// get next action
	var action = this._queue.pop();
	var params = this._params.pop();
	// save this for future use
	var self = this;
	// raise the semaphor
	this._exec_running = true;

	// arguments that would be passed to the action function
	var args = params || [];
	// add the success and failure handlers to the arguments
	args.push(
				function() { // success
					self._exec_running = false;
					self.exec(s,f);
				},
				function(err) { // failure
					self._exec_running = false;
					console.log('err: ', err )
					if(f) { f(err); }
				}
	);	

	// next action is defined?
	if( action ) {
		action.apply(this, args);
	} else {
		if(s) {s();}
		this._exec_running = false;

		// I think I should check for another item in _queue here. 
		// for example, the s() success handler could have added 
		// another item, but it wouldn't run immediately, 
		// since the _exec_running was true.
		if (this._queue.length) {return this.exec(s,f);}
	}
	return this;
}

// then (fn, arg1, arg2, ...)
// - an interface to method chain, and the action queue
o.then = function () {
	var arg = Array.prototype.slice.apply(arguments);
	this._queue.unshift(arg.shift()); // function to call
	this._params.unshift(arg);         // arguments, if any
	return this.exec();
}


// the constructor
function make(s) {
	this._select = s;
	//this._item   = null;
	this._queue  = [];
	this._params = [];

	if (this._select) {
		this._item = jq.parse_selector( this._select );
	} else {
		this._item = null;
	}

	return this;
};

make.prototype = o;

function aws( selector ) {

	if(typeof(selector)=='object') {
		// here selector is a configuration object, for AWS.Config
		_init(selector);
		return AWS.config;
	}

	if(!EC2) {
		EC2 = new AWS.EC2;
		jq.ec2.setup( {}, EC2 );
	}

	return new make(selector);
}

function _init( config ) {
	if (config) {
		// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html
		AWS.config.update(config);
	}
}

// export aws function
exports.aws = aws;
exports.ec2 = jq.ec2;
