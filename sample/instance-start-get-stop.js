var aws = require('../api.js').aws;

aws('i-c7e62faa')
  .start()
  .get('PublicIpAddress','PrivateIpAddress', function(ip,privateip,next) {
    console.log('public ip:', ip);
    console.log('private ip:', privateip);
    next();
  })
  .stop()
  .then(function(){
	console.log('- all done');
  })
;
