// Prototype of a jQuery-style API to AWS.
// 
// an experimental, prototype jquery-like library-wrapper
// around AWS SDK for node.js
//
//   http://aws.amazon.com/sdkfornodejs/ 
//   https://github.com/aws/aws-sdk-js
// (c) 2013-04-20, Ivan Kurmanov

var AWS = require('aws-sdk');
var ec2; 
var async = require('async');

// this checks the selector string, parses it
// and identifies the object type and the object's id

function parse_selector (s) {
	var r = { type: null, id: null }; // return structure

	var instance_re = /^\s*(i-[0-9a-fA-F]{8})\s*$/;
	var volume_re   = /^\s*(vol-[0-9a-fA-F]{8})\s*$/;
	var match = s.match(instance_re);
	if (match) {
		r.type = 'instance';
		r.id   = match[0];
		return r;
	}
	match = s.match(volume_re);
	if (match) {
		r.type = 'volume';
		r.id   = match[0];
		return r;
	}
	// none of the above
	return null;
}

function get_volume_details(v,cb) {
	var request = ec2.describeVolumes( { VolumeIds: [v] } );
	request.on('success', function(response) {
	//	console.log('get_volume_details: success');
		var details = response.data.Volumes[0];
		cb(details);
	});
	request.on('error', function(response) {
		console.log('get_volume_details: error');
		cb(null);
	});

	request.send();
}

function get_instance_details(i,cb) {
//	console.log('get_instance_details('+i+'): start');
	var request = ec2.describeInstances( { InstanceIds: [i] } );

	// register callbacks on request to retrieve response data
	request.on('success', function(response) {
//		console.log('get_instance_details: success');
		var details = response.data.Reservations[0].Instances[0];
		//console.log(details);
		cb(details);
	});

	// register callbacks on request to retrieve response data
	request.on('error', function(response) {
//		console.log('get_instance_details: error');
	});

	request.send();
}

function instance_info_get(id,args,s,f) {
//	console.log( 'id: ', id)
	var params = Array.prototype.slice.apply(args);
	console.log(params);
	var cb = params.pop();

	get_instance_details(id,function(data) {
		if(!data) {return f();}

//		console.log(data);
		var values = [];
		for (var i = 0; i < params.length; i++) {
			var key = params[i];
			//console.log( 'param['+i+']: ', key, ' = ', data[key]);
			values[i] = data[key];
		}
//		console.log('values: ', values);
		values.push(s);
		cb.apply(this,values);
	});
}

function volume_info_get(id,args,s,f){
//	console.log( 'id: ', id)
	var params = Array.prototype.slice.apply(args);
//	console.log(params);
	var cb = params.pop();

	get_volume_details(id,function(data) {
		if(!data) {return f();}

//		console.log(data);
		var values = [];
		for (var i = 0; i < params.length; i++) {
			var key = params[i];
			//console.log( 'param['+i+']: ', key, ' = ', data[key]);
			values[i] = data[key];
		}
//		console.log('values: ', values);
		values.push(s);
		cb.apply(this,values);
	});

};

var wait = 2000; // milliseconds
// wait until instance id is in state state
function until_instance_state(id,state,done){
	var recursive = function () {
		console.log("... waiting for " + state);
		get_instance_details(id, function(d) {
			console.log( d.State.Name );
			if(d.State.Name==state) {
				done(null,d);
			} else {
				setTimeout(recursive,wait);
			}
		});
	}
	recursive();
}

// wait until volume id is in state state
function until_volume_state(id,state,done){
	var recursive = function () {
		console.log("... waiting for " + state);
		get_volume_details(id, function(d) {
			console.log( d.State );
			if(d.State==state) {
				done(null,d);
			} else {
				setTimeout(recursive,wait);
			}
		});
	}
	recursive();
}

// wait until volume id is in attachment with state state
function until_volume_attachment_state(id,state,done){
	var recursive = function () {
		console.log("... waiting for " + state);
		get_volume_details(id, function(d) {
			if( d && d.Attachments ) { console.log( d.Attachments[0].State ); }

			if( d && d.Attachments 
				&& d.Attachments[0].State==state ) {
				done(null,d);
			} else {
				setTimeout(recursive,wait);
			}
		});
	}
	recursive();
}


// attach an EBS volume to an EC2 instance
function attach(params,s,f) {
	//	console.log( 'attach(): start' );
	if (!this._) {
		// no object to do start on
		f('no object to run on');
	};
	// see if this._ points to an instance
	// ... selector( this._ );
	var inst;
	var vol;
	var device;

	var item = parse_selector( this._ );

	if (item && item.type == 'instance') {
		inst   = item.id;
		vol    = params.volume;
		device = params.device;

	} else if (item && item.type == 'volume') {
		vol    = item.id;
		inst   = params.instance;
		device = params.device;
	}

	if (!item || !vol || !inst || !device) {
		f( 'i need an instance and a volume and the device name'); 
		return this; 
	}

	async.waterfall( [
		function (done) {
			// check that the volume is in state 'available'
			var volume = get_volume_details( vol, function(d) {
				if (!d) { return done( 'volume is not known: ' + vol); }
				if (d.State=='available') {
					done(null);
				} else {
					done('volume is not available: ' + d.State);
				}
			});
		},
		function (done) {
			ec2.attachVolume({InstanceId:inst, VolumeId:vol, Device:device}, function(err,data) {
				if (err) { console.log( 'attachVolume error: ' + err ); f(err); }
				// wait 
				until_volume_attachment_state( vol, 'attached',
					// could be more cautious here XXX 
					function(e,d) { s(); }
				);
			});
			console.log( 'attachVolume() request sent' );
		}
	], function (err,d) {
		console.log( 'failed waterfall', err );
		if(err) { f(err); }
	});
}

// detach an EBS volume from an ec2 instance
function detach(params,s,f) {
	// stub
	var vol = params.volume;
	console.log( 'asked to detach ' + vol );

	async.waterfall( [
		function (done) {
			// check that the volume is in state 'available'
			var volume = get_volume_details( vol, function(d) {
				if (!d) { return done( 'volume is not known: ' + vol); }
				if (d.State=='in-use') {
					done(null);
				} else {
					done('volume is not attached: ' + d.State);
				}
			});
		},
		function (done) {
			ec2.detachVolume({VolumeId:vol}, function(err,data) {
				if (err) { console.log( 'detachVolume error: ' + err ); f(err); }
				// wait 
				// could be more cautious XXX
				until_volume_state( vol, 'available', function(e,d) { s(); }) 
			});
			console.log( 'detachVolume() request sent' );
		}
	], function (err,d) {
		console.log( 'failed waterfall', err );
		if(err) { f(err); }
	});
}


// start an EC2 instance (assuming to be a stopped instance)
function start(s,f) {
//	console.log( 'start(): start' );
	if (!this._) {
		// no object to do start on
		f('no object to run on');
	};
	// XXX check that this._ points to an instance
	// ... selector( this._ );
	var iid = this._;
	ec2.startInstances({InstanceIds:[iid]}, function(err,data) {
		if (err) { console.log( 'startInstances error: ' + err ); f(err); }
		// wait 
		until_instance_state( iid, 'running', function(e,d) {
			s();
		})
	});
	console.log( 'start(): startInstances() request sent' );
}

// stop an EC2 instance
function stop(s,f) {
//	console.log( 'stop(): start' );
	if (!this._) {
		// no object to do start on
		f('no object to run on');
	};
	// XXX check that this._ points to an instance
	// 
	var iid = this._;
	ec2.stopInstances({InstanceIds:[iid]}, function(err,data) {
		if (err) { console.log( 'stopInstances error: ' + err ); f(err); }
		// wait 
		until_instance_state( iid, 'stopped', function(e,d) {
			s();
		})
	});
	console.log( 'stop(): stopInstances() request sent' );
}

// these are the methods that don't do much, but queue
// the actual actions within `this`

function _start() {
	return this.then( start );
}

function _stop() {
	return this.then( stop );
}

function _attach(p,dev){
	if (typeof p == 'string' 
		&& dev) { 
		p = {volume: p, device: dev};
	}
	return this.then( attach, p );
}

function _detach(p){
	var i = parse_selector(p || this._);
	if (i && i.type == 'volume') {
		this.then( detach, {volume: i.id} )		
	} else {
		console.log( 'Aaaaaaa! detach what?!' );
	}

	return this;
}

function _get() {
	var i = parse_selector(this._);

	if (i && i.type == 'instance') {
		return this.then( instance_info_get, i.id, arguments );
	}

	if (i && i.type == 'volume') {
		return this.then( volume_info_get, i.id, arguments );
	} 

//	if (!i || !i.type) {
		console.log( 'Aaaaaaa! get() what?!' );
//	}

	return this;
}

// run the queue-loop of actions. recursive.
// tricky.
function _exec(s,f) {
	// short-circuit if the loop is already running
	if( this._exec_running ) { return this; }
	// get next action
	var op  = this._q.pop();
	var par = this._p.pop();
	// save this for future use
	var self = this;
	// raise the semaphor
	this._exec_running = true;

	var arg = par || [];
	arg.push(
				function(){ // success
					self._exec_running = false;
					self.exec(s,f);
				},
				function(err){ // failure
					self._exec_running = false;
					console.log('err: ', err )
					if(f) {f()};
				}
	);	

	// next action is defined?
	if( op ) {
		op.apply(this, arg);
	} else {
		if(s) {s();}
		this._exec_running = false;

		// I think I should check for another item in _q here. 
		// for example, the s() success handler could have added 
		// another item, but it wouldn't run immediately, 
		// since the _exec_running was true.
		if (this._q.length) {return this._exec(s,f);}
	}
	return this;
}

function _then() {
	var arg = Array.prototype.slice.apply(arguments);
	this._q.unshift(arg.shift()); // function to call
	this._p.unshift(arg);         // arguments, if any
	return this.exec();
}


// the API-root function, the constructor of the aws magic object.
function aws( selector ) {

	if(typeof(selector)=='object') {
		// selector — configuration object, for AWS.Config
		_init(selector);
		return AWS.config;
	}

	if(!ec2) {
		ec2 = new AWS.EC2;
	}

	var o = {
		start: _start,
		stop:  _stop,
		attach: _attach,
		detach: _detach,
		get:   _get,
		exec:  _exec,
		then:  _then,
		_: selector,
		_q: [],
		_p: []
	};

	return o;
}

function _init( config ) {
	if (config) {
		// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html
		AWS.config.update(config);
	}
}

// export aws function
exports.aws = aws;
exports.get_volume_details   = get_volume_details;
exports.get_instance_details = get_instance_details;
