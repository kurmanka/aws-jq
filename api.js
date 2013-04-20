
// an experimental jquery-like library-wrapper
// around AWS SDK for node.js
// http://aws.amazon.com/sdkfornodejs/ 
// https://github.com/aws/aws-sdk-js
// 
// 
var aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});
var ec2 = new aws.EC2;

function select(s) {
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
		console.log('get_instance_details: failure');
    });

    // register callbacks on request to retrieve response data
//    request.on('complete', function(response) {
//		console.log('get_instance_details cb: complete');
//   });

    request.send();
//	console.log('get_instance_details: end');
}

var wait = 1000; // milliseconds
function untilInstanceIsRunning(id,done){
	var timeoutid;
    // wait until t is running
        var recursive = function () {
        	if (timeoutid) {
        		clearTimeout(timeoutid);
        		timeoutid = null;
			}
            console.log(".");
            get_instance_details(id, function(d) {
                if(d.State.Name=='running') {
                    done(null,d);
                } else {
                    timeoutid = setTimeout(recursive,wait);
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
	// 
	var iid = this._;
	ec2.startInstances({InstanceIds:[iid]}, function(err,data) {
		if (err) { console.log( 'startInstances: error!' + err ); f(err); }
		// wait 
		untilInstanceIsRunning( iid, function(e,d) {
			s();
		})
	});
	console.log( 'start(): startInstances() request sent' );
}

function _start() {
	this._q.push( start );
	return this;
}

function exec(s,f) {
	console.log( 'exec: start' );
	var op = this._q.pop();
	while( op ) {
		op.call(this,s,f);
		op = this._q.pop();
	}
	console.log( 'exec: done' );
	return this;
}

function $( selector ) {
	var o = {
		start: _start,
		exec: exec,
		_: selector,
		_q: []
	};

	return o;
}


// wait until all requests are finished


