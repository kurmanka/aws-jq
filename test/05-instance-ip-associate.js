
// 50.17.226.188

var aws = require('../api.js').aws;

aws({region: 'us-east-1'});

aws('i-c7e62faa')
  .start()
  .associate( '50.17.226.188' )
  .get('PublicIpAddress','PrivateIpAddress', function(ip,privateip,next) {
    console.log('public ip:', ip);
    console.log('private ip:', privateip);
    next();
  })
  .stop()
;