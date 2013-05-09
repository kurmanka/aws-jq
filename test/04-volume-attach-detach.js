var aws = require('../api.js').aws;

aws({region: 'us-east-1'});

aws( 'vol-02dba55b' )
  .attach({instance:'i-c7e62faa',device:'/dev/sdd'})
  .detach()
  .then(function(){
	console.log('all done');
  })
;