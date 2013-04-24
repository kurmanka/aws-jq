var aws = require('../api.js').aws;

aws( 'vol-02dba55b' )
  .attach({instance:'i-c7e62faa',device:'/dev/sdd'})
  .detach()
  .then(function(){
	console.log('all done');
  })
;