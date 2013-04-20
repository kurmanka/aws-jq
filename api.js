
// an experimental jquery-like library-wrapper
// around AWS SDK for node.js
// http://aws.amazon.com/sdkfornodejs/ 
// https://github.com/aws/aws-sdk-js
// (c) 2013-04-20, Ivan Kurmanov

var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var ec2 = new AWS.EC2;

function select(s) {
	// this could and should verify the selector string,
	// parse it and identify the object type and the object's id
}

function get_instance_details(i,cb) {
//	this.log('get_instance_details('+i+'): start');
    var request = ec2.describeInstances( { InstanceIds: [i] } );

    // register callbacks on request to retrieve response data
    request.on('success', function(response) {
//		this.log('get_instance_details: success');
        var details = response.data.Reservations[0].Instances[0];
        //this.log(details);
        cb(details);
    });

    // register callbacks on request to retrieve response data
    request.on('failure', function(response) {
//		this.log('get_instance_details: failure');
    });

    request.send();
}


// wait until instance id is in a given state
var wait = 2000; // milliseconds
function untilInstanceState(id,state,done){
	var self = this;
    var recursive = function () {
        self.log("... waiting for " + state);
        get_instance_details(id, function(d) {
        	self.log( d.State.Name );
            if(d.State.Name==state) {
                done(null,d);
            } else {
                setTimeout(recursive,wait);
            }
        });
    }
    recursive();
}

// start instance
function start(s,f) {
//	this.log( 'start(): start' );
	if (!this._) {
		// no object to do start on
		f('no object to run on');
	};
	// XXX check that this._ points to an instance
	// ... selector( this._ );
	var iid = this._;
	var self = this;

	ec2.startInstances({InstanceIds:[iid]}, function(err,data) {
		if (err) { self.log( 'startInstances error: ' + err ); f(err); }
		// wait 
		self.untilInstanceState( iid, 'running', function(e,d) {
			s();
		})
	});
	this.log( 'start(): startInstances() request sent' );
}

// stop instance
function stop(s,f) {
//	this.log( 'stop(): start' );
	if (!this._) {
		// no object to do start on
		f('no object to run on');
	};
	// XXX check that this._ points to an instance
	// 
	var iid = this._;
	var self = this;

	ec2.stopInstances({InstanceIds:[iid]}, function(err,data) {
		if (err) { self.log( 'stopInstances error: ' + err ); f(err); }
		// wait 
		self.untilInstanceState( iid, 'stopped', function(e,d) {
			s();
		})
	});
	this.log( 'stop(): stopInstances() request sent' );
}

function _start() {
	return this.then( start );
}

function _stop() {
	return this.then( stop );
}


// run the queue-loop of actions
function _exec(s,f) {
	// short-circuit if the loop is already running
	if( this._exec_running ) { return this; }
	// get next action
	var op = this._q.pop();
	// save this for future use
	var self = this;
	// raise the semaphor
	this._exec_running = true;

	// next action is defined?
	if( op ) {
		op.call(this,
				function(){ // success
					self._exec_running = false;
					self.exec(s,f);
				},
				function(){ // failure
					self._exec_running = false;
					if(f) f();
					else self.log( 'failure' );
				}
				);
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

function _then(f) {
	this._q.unshift(f);
	return this.exec();
}

function aws(selector) {
	var o = {
		start: _start,
		stop:  _stop,
		exec:  _exec,
		then:  _then,
		log:   function(){}, // no debugging
		get_instance_details: get_instance_details,
		untilInstanceState:   untilInstanceState,
		_: selector,
		_q: []
	};
	return o;
}

function aws_debug(selector) {
	var o = aws(selector);
	o.log = console.log;
	return o;
}

// export aws functions
exports.aws       = aws;
exports.aws_debug = aws_debug;
