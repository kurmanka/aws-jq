var aws = require('./api.js').aws;

aws('i-f6______')
  .start()
  .then(function(s,f){
	console.log('started');
	s();
  })
  .stop()
  .then(function(s,f){
	console.log('stopped');
	s();
  })
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
