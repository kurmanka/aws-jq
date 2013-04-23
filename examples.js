var aws = require('./api.js')
//	.aws_debug;
	.aws;

aws('i-c7e62faa')
  .start()
  .then(function(s,f){ console.log('started'); s(); })
  .attach( {volume: 'vol-02dba55b', device: '/dev/sdg'} )
  .then(function(s,f){	console.log('attached a volume'); s(); })
  .stop()
/*  .then(function(s,f){
	console.log('stopped');
	s();
  })
*/
  .then(function(s,f){
	console.log('all done');
	s();
  })
;

/*
.then(function(s,f){
	console.log('started, now going to stop');
	s();
}).stop().exec(function(){
	console.log('success!');
},function(){
	console.log('failed!');
})

*/
