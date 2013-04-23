
// an experimental jquery-like library-wrapper
// around AWS SDK for node.js
// http://aws.amazon.com/sdkfornodejs/ 
// https://github.com/aws/aws-sdk-js
// (c) 2013-04-20, Ivan Kurmanov

var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var ec2 = new AWS.EC2;
var async = require('async');

function select(s) {
	// this could and should verify the selector string,
	// parse it and identify the object type and the object's id
}

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
    request.on('failure', function(response) {
    	console.log('get_volume_details: failure');
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
    request.on('failure', function(response) {
//		console.log('get_instance_details: failure');
    });

    request.send();
}

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
				until_volume_attachment_state( vol, 'attached', function(e,d) { s(); }) // could be more cautious XXX
			});
			console.log( 'attachVolume() request sent' );
		}
	], function (err,d) {
		console.log( 'failed waterfall', err );
		if(err) { f(err); }
	});
}

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


// run the queue-loop of actions
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
					f();
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
		if (this._q.length) {return this._exec();}
	}
	return this;
}

function _then() {
	var arg = Array.prototype.slice.apply(arguments);
	this._q.unshift(arg.shift()); // function to call
	this._p.unshift(arg);         // arguments, if any
	return this.exec();
}

function aws( selector ) {
	var o = {
		start: _start,
		stop:  _stop,
		exec:  _exec,
		then:  _then,
		attach: _attach,
		_: selector,
		_q: [],
		_p: []
	};

	return o;
}

// export aws function
exports.aws = aws;
exports.get_volume_details = get_volume_details;
