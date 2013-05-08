// ec2 utility functions

var async = require('async');
var jq = require( './jq.js' );

jq.ec2 = exports;

var ec2;
var settings;

exports.setup = function( s, e ) {
	settings = s;  
	ec2 = e;
}


var get_volume_details = 
exports.get_volume_details = function (v,cb) {
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

var get_instance_details =
exports.get_instance_details = function (i,cb) {
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

exports.instance_info_get = function (id,args,s,f) {
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

exports.volume_info_get = function (id,args,s,f) {
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
var until_instance_state =
exports.until_instance_state = function (id,state,done) {
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
var until_volume_state =
exports.until_volume_state = function (id,state,done) {
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
var until_volume_attachment_state =
exports.until_volume_attachment_state =
function until_volume_attachment_state(id,state,done) {
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



//// actions

// attach an EBS volume to an EC2 instance
exports.attach = function (params,s,f) {
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

	var item = jq.parse_selector( this._ );

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
			var volume = jq.ec2.get_volume_details( vol, function(d) {
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
exports.detach = function (params,s,f) {
	// stub
	var vol = params.volume;
	console.log( 'asked to detach ' + vol );

	async.waterfall( [
		function (done) {
			// check that the volume is in state 'available'
			var volume = jq.ec2.get_volume_details( vol, function(d) {
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
exports.start = function (s,f) {
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
		jq.ec2.until_instance_state( iid, 'running', function(e,d) {
			s();
		})
	});
	console.log( 'start(): startInstances() request sent' );
}

// stop an EC2 instance
exports.stop = function (s,f) {
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
		jq.ec2.until_instance_state( iid, 'stopped', function(e,d) {
			s();
		})
	});
	console.log( 'stop(): stopInstances() request sent' );
}







