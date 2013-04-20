
// an experimental jquery-like library-wrapper
// around AWS SDK for node.js
// http://aws.amazon.com/sdkfornodejs/ 
// https://github.com/aws/aws-sdk-js
// (c) 2013-04-20, Ivan Kurmanov

var aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});
var ec2 = new aws.EC2;

function select(s) {
	// this could and should verify the selector string,
	// parse it and identify the object type and the object's id
}

function get_instance_details(i,cb) {
	console.log('get_instance_details('+i+'): start');
    var request = ec2.describeInstances( { InstanceIds: [i] } );

    // register callbacks on request to retrieve response data
    request.on('success', function(response) {
		console.log('get_instance_details: success');
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
function untilInstanceState(id,state,done){
    // wait until t is running
    var recursive = function () {
        console.log(".");
        get_instance_details(id, function(d) {
            if(d.State.Name==state) {
                done(null,d);
            } else {
                setTimeout(recursive,wait);
            }
        });
    }
    recursive();
}

function start(s,f) {
	console.log( 'start(): start' );
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
		untilInstanceState( iid, 'running', function(e,d) {
			s();
		})
	});
	console.log( 'start(): startInstances() request sent' );
}

function stop(s,f) {
	console.log( 'stop(): start' );
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
		untilInstanceState( iid, 'stopped', function(e,d) {
			s();
		})
	});
	console.log( 'stop(): stopInstances() request sent' );
}

function _start() {
	this._q.unshift( start );
	return this;
}

function _stop() {
	this._q.unshift( stop );
	return this;
}

// queue of actions
function _exec(s,f) {
	console.log( 'exec: start' );
	var op = this._q.pop();
	var self = this;
	if( op ) {
		op.call(this,
				function(){self.exec(s,f);},
				f);
	} else {
		s();
	}
	console.log( 'exec: done' );
	return this;
}

function _then(f) {
	this._q.push(f);
	return this;
}

function $( selector ) {
	var o = {
		start: _start,
		stop:  _stop,
		exec:  _exec,
		then:  _then,
		_: selector,
		_q: []
	};

	return o;
}

// export $ function
exports.$ = $;
