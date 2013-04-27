var aws = require('../api.js').aws;

aws({region: 'us-east-1'});

aws('vol-02dba55b')
  .get('Size', 'AvailabilityZone', 'State', function(size,az,state,next) {
    console.log('size:',  size);
    console.log('zone:',  az);
    console.log('state:', state);
    next();
  })
  .then(function(){
    console.log('- all done');
  })
;
